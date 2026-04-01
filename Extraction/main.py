"""
main.py
Pipeline orchestrator — ties every module together.

Run:
    python main.py

Phases per case:
  1  JSON load + Pydantic validation
  2  PDF text extraction (digital → OCR fallback)
  3  LLM extraction (summary, judges, assets, new_parties, addresses, advocates)
  4  Neo4j graph inserts (entity resolution + multi-judge/party mapping)
  5  Document text backfill
  6  Embedding → stored on Case node in Neo4j
"""
import logging
import time
import traceback
import uuid
from pathlib import Path

from tqdm import tqdm

# ── Config ─────────────────────────────────────────────────────────────────
from config import (
    DATASET_ROOT, MANIFEST_PATH, LOG_PATH,
    EMBED_URL, NVIDIA_HEADERS, EMBEDDING_MODEL,
    N_CASES,
)

# ── Database ────────────────────────────────────────────────────────────────
from database.db_connection import neo4j_driver

# ── Labels (schema + graph writers) ────────────────────────────────────────
from database.graph_schema import setup_schema
from database.graph_inserts import (
    upsert_act, upsert_court,
    insert_person, upsert_organization, upsert_judge,
    upsert_case,
    insert_case_parties, insert_case_lawyers,
    insert_case_acts, insert_hearings,
    insert_documents, update_document_text,
    insert_assets, insert_extraction_log,
    update_case_vector,
)

# ── Text extraction ─────────────────────────────────────────────────────────
# ── Text extraction ─────────────────────────────────────────────────────────
from text_extraction.json_loader import (
    build_manifest, load_json, build_case_template_from_json,
)
from text_extraction.pdf_extractor import (
    extract_pdf_text, extract_fixed_fields,
)

# ── LLM ────────────────────────────────────────────────────────────────────
from llm_extraction import (
    run_llm_extraction,
    run_batch_adjudicator,
    get_fuzzy_candidates,
)

# ── Entity models (typed) ────────────────────────────────────────────────
from models.entities import Judge, User, Lawyer, Organization, Asset

# ── Utils ───────────────────────────────────────────────────────────────────
from utils.helpers import dedup_assets, to_none, clean_rel_type

import requests
import numpy as np
from tenacity import retry, wait_exponential, stop_after_attempt


# ══════════════════════════════════════════════════════════════════════════
# Logging
# ══════════════════════════════════════════════════════════════════════════

file_handler = logging.FileHandler(LOG_PATH, encoding='utf-8')
file_handler.setLevel(logging.DEBUG)

stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.INFO)

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
    handlers=[file_handler, stream_handler],
)
logger = logging.getLogger('pipeline')


# ══════════════════════════════════════════════════════════════════════════
# Embedding helpers
# ══════════════════════════════════════════════════════════════════════════

def embed_texts(texts: list, is_query: bool = False) -> list:
    logger.debug("Starting embed_texts")
    if not texts:
        return []
    payload = {
        'model'           : EMBEDDING_MODEL,
        'input'           : texts,
        'input_type'      : 'query' if is_query else 'passage',
        'encoding_format' : 'float',
        'truncate'        : 'END',
    }
    resp = requests.post(EMBED_URL, headers=NVIDIA_HEADERS, json=payload)
    if resp.status_code == 429:
        raise Exception('Rate limited')
    resp.raise_for_status()
    return [
        np.array(d['embedding'], dtype=np.float32)
        for d in sorted(resp.json()['data'], key=lambda x: x['index'])
    ]


@retry(wait=wait_exponential(min=2, max=60), stop=stop_after_attempt(5))
def embed_texts_retry(texts: list, is_query: bool = False) -> list:
    return embed_texts(texts, is_query)


# ══════════════════════════════════════════════════════════════════════════
# PDF path resolver
# ══════════════════════════════════════════════════════════════════════════

def resolve_pdf_path(storage_id: str, pdf_paths: list[str]) -> str | None:
    if not storage_id:
        return None
    date_stem = Path(storage_id).stem
    return next((p for p in pdf_paths if date_stem in Path(p).name), None)


# ══════════════════════════════════════════════════════════════════════════
# Core case processor
# ══════════════════════════════════════════════════════════════════════════

def process_case(json_path: str, pdf_paths: list[str]) -> dict:
    logger.debug(f"Starting process_case for {json_path}")
    result = {
        'cnr': None, 'hearings': 0, 'documents': 0,
        'pdfs_extracted': 0, 'ocr_count': 0,
        'assets': 0, 'missing_advocates': 0,
        'party_addresses': 0, 'judges_found': 0,
        'summary_words': 0, 'errors': [],
    }

    # ── PHASE 1: JSON load + validation ────────────────────────────────
    logger.debug(f"Starting PHASE 1: JSON load for {json_path}")
    outer, raw = load_json(json_path)
    case_template = build_case_template_from_json(outer, raw)
    result['cnr'] = case_template.case_details.cnr_number

    # ── PHASE 2: PDF extraction ─────────────────────────────────────────
    logger.debug(f"Starting PHASE 2: PDF extraction for {result['cnr']}")
    pdf_texts   : dict = {}
    pdf_fields  : dict = {}
    pdf_methods : dict = {}

    for doc in case_template.documents:
        if not doc.storage_id:
            continue
        fpath = resolve_pdf_path(doc.storage_id, pdf_paths)
        if not fpath:
            logger.warning(f"PDF not found: {Path(doc.storage_id).name} ({case_template.case_details.cnr_number})")
            continue
        pdf_text, method = extract_pdf_text(fpath)
        pdf_texts[doc.storage_id]   = pdf_text
        pdf_methods[doc.storage_id] = method
        if method == 'ocr':
            result['ocr_count'] += 1
        if pdf_text:
            pdf_fields[doc.storage_id] = extract_fixed_fields(pdf_text)
            result['pdfs_extracted'] += 1

    # ── PHASE 3: LLM extraction ─────────────────────────────────────────
    logger.debug(f"Starting PHASE 3: LLM extraction for {result['cnr']}")
    llm_result        = run_llm_extraction(pdf_texts, case_template)
    summary           = llm_result.get('search_summary') or ''
    judges_data       = llm_result.get('judges', [])
    raw_assets        = llm_result.get('assets', [])
    parties_data      = llm_result.get('parties', [])
    advocates_data    = llm_result.get('advocates', [])
    missing_log       = llm_result.get('missing_data_log', [])
    acts_data         = llm_result.get('acts', [])
    hearings_data     = llm_result.get('hearings', [])
    docs_data         = llm_result.get('documents', [])
    court_data        = llm_result.get('court', {})
    case_updates      = llm_result.get('case_details', {})

    result['summary_words']     = len(summary.split())
    result['assets']            = len(raw_assets)
    result['missing_advocates'] = len(advocates_data)
    result['judges_found']      = len(judges_data)

    for asset in raw_assets:
        asset['_source_storage_id'] = next(iter(pdf_texts), None)
    deduped_assets = dedup_assets(raw_assets)

    # ── PHASE 4: Neo4j graph inserts ────────────────────────────────────
    logger.debug(f"Starting PHASE 4: Neo4j graph inserts for {result['cnr']}")
    with neo4j_driver.session() as session:

        def _write(tx):
            from models.entities import (
                Case as CaseEntity, Court as CourtEntity, Act as ActEntity,
                CaseHearing as HearingEntity, Document as DocEntity,
                Asset as AssetEntity, Organization, Lawyer, User, Judge
            )

            # Acts
            acts_models = [ActEntity(**a) for a in acts_data if a.get('name')]
            for a in acts_models:
                upsert_act(tx, a.name)

            # Court
            court_id = upsert_court(tx, CourtEntity(**court_data) if court_data else None)

            # ── Entity resolution (batch) ──────────────────────────────
            entities_to_batch = []

            for j in judges_data:
                if j.get('name'):
                    cands = get_fuzzy_candidates(tx, j['name'], 'judge')
                    if cands:
                        entities_to_batch.append({'extracted_name': j['name'], 'entity_type': 'judge', 'db_candidates': cands})

            for p in parties_data:
                p_name = p.get('info', {}).get('name')
                if p_name:
                    etype = p.get('type', 'person').lower()
                    cands = get_fuzzy_candidates(tx, p_name, etype)
                    if cands:
                        entities_to_batch.append({'extracted_name': p_name, 'entity_type': etype, 'db_candidates': cands})

            for a in advocates_data:
                a_name = a.get('info', {}).get('name')
                if a_name:
                    cands = get_fuzzy_candidates(tx, a_name, 'person')
                    if cands:
                        entities_to_batch.append({'extracted_name': a_name, 'entity_type': 'person', 'db_candidates': cands})

            resolved_uuids_map: dict = {}
            if entities_to_batch:
                try:
                    verdict = run_batch_adjudicator({'entities_to_adjudicate': entities_to_batch})
                    for res in verdict.get('resolutions', []):
                        if (res.get('match_confidence') == 'EXACT' and res.get('matched_uuid')):
                            resolved_uuids_map[res['extracted_name']] = res['matched_uuid']
                except Exception as e:
                    logger.error(f'Batch AI failed: {e}. Using default matching.')

            # ── Case node ──────────────────────────────────────────────
            case_id = upsert_case(tx, CaseEntity(**case_updates) if case_updates else case_template.case_details, court_id, summary)
            result['hearings']  = len(hearings_data)
            result['documents'] = len(docs_data)

            # ── Upsert persons / organizations ─────────────────────────
            for adv in advocates_data:
                info = adv.get('info', {})
                a_name = info.get('name')
                if not a_name: continue
                side = adv.get('side', 'petitioner')
                mistral_uuid = resolved_uuids_map.get(a_name)
                lawyer_model = Lawyer(**info)
                pid = insert_person(tx, a_name, 'pdf', lawyer_model, mistral_uuid)

                tx.run("""
                    MATCH (p:Person {id: $pid}) WITH p
                    MATCH (c:Case {id: $cid})
                    MERGE (p)-[r:ADVOCATE_FOR]->(c)
                    SET r.side = $side, r.display_name = $dname, r.name_source = 'pdf'""",
                    pid=pid, cid=case_id, side=side, dname=a_name)

            for pt in parties_data:
                info = pt.get('info', {})
                p_name = info.get('name')
                if not p_name: continue
                role = pt.get('role', 'party')
                pt_type = pt.get('type', 'person').lower()
                mistral_uuid = resolved_uuids_map.get(p_name)
                rel = clean_rel_type(role)
                
                if pt_type == 'organization':
                    org_model = Organization(**info)
                    pid = upsert_organization(tx, p_name, org_model, mistral_uuid, address=info.get('address'))
                    tx.run(f"MATCH (o:Organization {{id: $oid}}) MATCH (c:Case {{id: $cid}}) MERGE (o)-[:{rel}]->(c)",
                           oid=pid, cid=case_id)
                else:
                    user_model = User(**info)
                    pid = insert_person(tx, p_name, 'pdf', user_model, mistral_uuid, address=info.get('address'))
                    tx.run(f"MATCH (p:Person {{id: $pid}}) MATCH (c:Case {{id: $cid}}) MERGE (p)-[:{rel}]->(c)",
                           pid=pid, cid=case_id)

            # ── Judges ─────────────────────────────────────────────────
            for j in judges_data:
                j_name = j.get('name')
                if not j_name: continue
                judge_model = Judge(**j)
                mistral_uuid = resolved_uuids_map.get(j_name)
                jpid = upsert_judge(tx, name=j_name, judge_model=judge_model, resolved_uuid=mistral_uuid)
                tx.run("""
                    MATCH (p:Person {id: $pid})
                    WITH p
                    MATCH (c:Case {id: $cid})
                    MERGE (p)-[r:JUDGE_IN]->(c)
                    SET r.designation = $desig""",
                    pid=jpid, cid=case_id, desig=judge_model.designation)
            
            # ── Acts, Hearings, Docs, Assets, Log ──────────────────────
            insert_case_acts(tx, case_id, acts_models)
            insert_hearings(tx, case_id, [HearingEntity(**h) for h in hearings_data])
            doc_id_map = insert_documents(tx, case_id, [DocEntity(**d) for d in docs_data])
            insert_assets(tx, case_id, deduped_assets, doc_id_map)
            insert_extraction_log(tx, case_id, result['cnr'], missing_log)

            return case_id, doc_id_map

        case_id, doc_id_map = session.execute_write(_write)

    # ── PHASE 5: Backfill Document nodes with extracted PDF text ────────
    logger.debug(f"Starting PHASE 5: Backfilling Document nodes for {result['cnr']}")
    with neo4j_driver.session() as session:
        def _update_docs(tx):
            for doc in case_template.documents:
                sid = doc.storage_id
                if not sid or sid not in doc_id_map:
                    continue
                update_document_text(
                    tx,
                    doc_id   = doc_id_map[sid],
                    full_text= pdf_texts.get(sid, ''),
                    method   = pdf_methods.get(sid, 'digital'),
                )
        session.execute_write(_update_docs)

    # ── PHASE 6: Embed summary → store on Case node ─────────────────────
    logger.debug(f"Starting PHASE 6: Embedding summary for {result['cnr']}")
    if summary:
        try:
            vec = embed_texts_retry([summary])[0]
            with neo4j_driver.session() as session:
                session.execute_write(
                    lambda tx: update_case_vector(tx, case_id, vec.tolist())
                )
        except Exception as e:
            logger.warning(f"Vector store failed for {result['cnr']}: {e}")

    return result


# ══════════════════════════════════════════════════════════════════════════
# Entry point
# ══════════════════════════════════════════════════════════════════════════

def main():
    logger.info('Pipeline initialised.')

    # Schema (idempotent — safe to run every time)
    setup_schema()

    # Build / reload manifest
    manifest = build_manifest(DATASET_ROOT, MANIFEST_PATH)
    logger.info(f'Total cases in manifest : {len(manifest)}')
    logger.info(f'Status counts:\n{manifest["status"].value_counts().to_string()}')

    pending = manifest[manifest['status'] == 'pending'].head(N_CASES)
    logger.info(f'Processing {len(pending)} pending cases')

    for idx, row in tqdm(pending.iterrows(), total=len(pending), desc='Cases'):
        pdf_paths = row['pdf_paths'].split('|') if row['pdf_paths'] else []
        t0 = time.time()
        try:
            result  = process_case(row['json_path'], pdf_paths)
            elapsed = round(time.time() - t0, 1)
            logger.info(
                f"[{result['cnr']}] done | "
                f"{result['hearings']}h | "
                f"{result['assets']} assets | "
                f"{result['summary_words']}w | "
                f"{elapsed}s"
            )
            manifest.at[idx, 'status']    = 'done'
            manifest.at[idx, 'error_msg'] = ''
        except Exception as e:
            err = f'{type(e).__name__}: {e}'
            logger.error(f'FAILED {row["json_path"]}: {err}')
            logger.error(traceback.format_exc())
            manifest.at[idx, 'status']    = 'failed'
            manifest.at[idx, 'error_msg'] = err

        manifest.to_csv(MANIFEST_PATH, index=False)

    done         = len(manifest[manifest['status'] == 'done'])
    failed       = len(manifest[manifest['status'] == 'failed'])
    pending_left = len(manifest[manifest['status'] == 'pending'])
    logger.info(f'Done: {done}  Failed: {failed}  Remaining: {pending_left}')

    if failed:
        for _, row in manifest[manifest['status'] == 'failed'].iterrows():
            logger.error(f'  FAILED: {row["json_path"]} — {row["error_msg"]}')


if __name__ == '__main__':
    main()
