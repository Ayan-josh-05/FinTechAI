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
from text_extraction.json_loader import (
    build_manifest, load_json, build_case_model,
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
from validate_llm.core import validate_case_delta
from validate_llm.metrics import generate_validation_summary

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
    case       = build_case_model(outer, raw)
    result['cnr'] = case.cnr_number
    #print case filing number and case number
    print(f"Case filing number: {case.filing_number}")
    print(f"Case number: {case.case_number}")
    
    # ── PHASE 2: PDF extraction ─────────────────────────────────────────
    logger.debug(f"Starting PHASE 2: PDF extraction for {result['cnr']}")
    pdf_texts   : dict = {}
    pdf_fields  : dict = {}
    pdf_methods : dict = {}

    for doc in case.documents:
        if not doc.storage_id:
            continue
        fpath = resolve_pdf_path(doc.storage_id, pdf_paths)
        if not fpath:
            logger.warning(f'PDF not found: {Path(doc.storage_id).name} ({case.cnr_number})')
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
    llm_result        = run_llm_extraction(pdf_texts, case)
    
    # NEW: Targeted delta-validation
    llm_result, val_stats = validate_case_delta(llm_result, pdf_texts)
    generate_validation_summary(case.cnr_number, val_stats)
    result['val_stats'] = val_stats   # carry forward for run-level reporting
    
    summary           = llm_result.get('search_summary') or ''
    judges_data       = llm_result.get('judges', [])
    raw_assets        = llm_result.get('assets', [])
    missing_advocates = llm_result.get('missing_advocates', [])
    missing_log       = llm_result.get('missing_data_log', [])
    new_parties       = llm_result.get('new_parties', [])
    additional_acts   = llm_result.get('additional_acts', [])

    summary = str(summary)
    result['summary_words'] = len(summary.split())
    result['assets']            = len(raw_assets)
    result['missing_advocates'] = len(missing_advocates)
    result['judges_found']      = len(judges_data)

    for asset in raw_assets:
        asset['_source_storage_id'] = next(iter(pdf_texts), None)
    deduped_assets = dedup_assets(raw_assets)

    # ── Merge additional Acts ───────────────────────────────────────────
    from text_extraction.json_loader import ActModel
    from utils.helpers import normalize_name
    act_map = {}
    
    for a in case.acts:
        norm = normalize_name(a.name)
        if norm not in act_map:
            act_map[norm] = a
        else:
            s1 = act_map[norm].section or ""
            s2 = a.section or ""
            merged = ", ".join(sorted(list(set([s.strip() for s in (s1 + "," + s2).split(",") if s.strip()]))))
            act_map[norm].section = merged
            
    for a in additional_acts:
        name = to_none(a.get('name'))
        section = to_none(a.get('section'))
        if not name: continue
        norm = normalize_name(name)
        if norm in act_map:
            s1 = act_map[norm].section or ""
            s2 = section or ""
            merged = ", ".join(sorted(list(set([s.strip() for s in (s1 + "," + s2).split(",") if s.strip()]))))
            act_map[norm].section = merged
        else:
            act_map[norm] = ActModel(name=name, section=section)
            
    case.acts = list(act_map.values())

    # ── PHASE 4: Neo4j graph inserts ────────────────────────────────────
    logger.debug(f"Starting PHASE 4: Neo4j graph inserts for {result['cnr']}")
    with neo4j_driver.session() as session:

        def _write(tx):
            # Acts
            for a in case.acts:
                upsert_act(tx, a.name)

            # Court
            court_id = upsert_court(tx, case)

            # ── Entity resolution (batch) ──────────────────────────────
            entities_to_batch = []

            for j in judges_data:
                if j.get('name'):
                    cands = get_fuzzy_candidates(tx, j['name'], 'judge')
                    if cands:
                        entities_to_batch.append({
                            'extracted_name': j['name'],
                            'entity_type'   : 'judge',
                            'db_candidates' : cands,
                        })

            for p in case.persons:
                etype = 'organization' if p.is_org else 'person'
                cands = get_fuzzy_candidates(tx, p.name, etype)
                if cands:
                    entities_to_batch.append({
                        'extracted_name': p.name,
                        'entity_type'   : etype,
                        'db_candidates' : cands,
                    })
            
            for np in new_parties:
                # Handle both string and dict formats from LLM
                np_name = np if isinstance(np, str) else np.get('name')
                if np_name:
                    etype = 'person' if isinstance(np, str) else np.get('type', 'person').lower()
                    cands = get_fuzzy_candidates(tx, np_name, etype)
                    if cands:
                        entities_to_batch.append({
                            'extracted_name': np_name,
                            'entity_type'   : etype,
                            'db_candidates' : cands,
                        })

            for m in missing_advocates:
                # Handle both string and dict formats from LLM
                m_name = m if isinstance(m, str) else m.get('name')
                if m_name:
                    cands = get_fuzzy_candidates(tx, m_name, 'lawyer')
                    if cands:
                        entities_to_batch.append({
                            'extracted_name': m_name,
                            'entity_type'   : 'person',
                            'db_candidates' : cands,
                        })

            resolved_uuids_map: dict = {}
            if entities_to_batch:
                try:
                    verdict = run_batch_adjudicator(
                        {'entities_to_adjudicate': entities_to_batch}
                    )
                    for res in verdict.get('resolutions', []):
                        if (res.get('match_confidence') == 'EXACT'
                                and res.get('matched_uuid')):
                            resolved_uuids_map[res['extracted_name']] = res['matched_uuid']
                except Exception as e:
                    logger.error(f'Batch AI failed: {e}. Using default matching.')

            # ── Additional info lookup ─────────────────────────────────
            party_info_list = llm_result.get('party_additional_info', [])
            info_lookup = {
                (p.get('name') or '').lower(): p.get('info')
                for p in party_info_list
                if p.get('info')
            }

            # ── Upsert persons / organizations ─────────────────────────
            person_id_map: dict = {}
            for p in case.persons:
                p_info       = info_lookup.get(p.name.lower())
                mistral_uuid = resolved_uuids_map.get(p.name)

                if p.role in ('petitioner_advocate', 'respondent_advocate'):
                    pid = insert_person(
                        tx, p.name, 'json', p_info, mistral_uuid,
                    )
                elif p.is_org:
                    pid = upsert_organization(
                        tx, p.name, p_info, mistral_uuid, address=p.address_text,
                    )
                else:
                    pid = insert_person(
                        tx, p.name, 'json', p_info, mistral_uuid,
                        address=p.address_text,
                    )
                person_id_map[f'{p.role}::{p.name}'] = pid

            # ── Case node ──────────────────────────────────────────────
            case_updates = llm_result.get('case_updates', {})
            case_id = upsert_case(tx, case, court_id, outer, summary, case_updates)
            result['hearings']  = len(case.hearings)
            result['documents'] = len(case.documents)

            # ── Judges ─────────────────────────────────────────────────
            for j in judges_data:
                j_name = j.get('name')
                if not j_name: continue
                
                from_date = j.get('heard_from_date')
                to_date = j.get('heard_to_date')
                
                # These ARE the concrete data fields from entities.py
                model_fields = {k: v for k, v in j.items() if k not in ('name', 'heard_from_date', 'heard_to_date')}
                
                # If LLM finds extra info NOT in the 14 models, it goes here
                extra_info = info_lookup.get(j_name.lower()) or {}
                # Merge: model fields take precedence
                model_fields.update(extra_info)

                mistral_uuid = resolved_uuids_map.get(j_name)
                jpid = upsert_judge(
                    tx,
                    name            = j_name,
                    designation     = j.get('designation'),
                    uid_number      = j.get('uid_number'),
                    court           = j.get('court'),
                    model_fields = model_fields, # These become hard node properties
                    resolved_uuid   = mistral_uuid,
                )
                # Link Judge → Case
                tx.run("""
                    MATCH (p:Person {id: $pid})
                    WITH p
                    MATCH (c:Case {id: $cid})
                    MERGE (p)-[r:JUDGE_IN]->(c)
                    SET r.designation = COALESCE($desig, r.designation),
                        r.heard_from_date = COALESCE($from_date, r.heard_from_date),
                        r.heard_to_date = COALESCE($to_date, r.heard_to_date)""",
                    pid=jpid, cid=case_id,
                    desig=j.get('designation'),
                    from_date=from_date,
                    to_date=to_date)
            
            # ── New Parties ────────────────────────────────────────────
            for np in new_parties:
                np_name = np.get('name')
                if not np_name: continue
                np_type = np.get('type', 'person').lower()
                np_role = np.get('role', 'party')
                
                # These ARE the concrete data fields from entities.py
                model_fields = {k: v for k, v in np.items() if k not in ('type', 'name', 'role')}
                # Also merge if LLM put extra info in a sub-dict
                if 'info' in np and isinstance(np['info'], dict):
                    model_fields.update(np['info'])
                    model_fields.pop('info', None)

                mistral_uuid = resolved_uuids_map.get(np_name)
                
                rel = clean_rel_type(np_role)
                if np_type == 'organization':
                    nid = upsert_organization(tx, np_name, model_fields, mistral_uuid)
                    tx.run(f"MATCH (o:Organization {{id: $oid}}) MATCH (c:Case {{id: $cid}}) MERGE (o)-[:{rel}]->(c)",
                           oid=nid, cid=case_id)
                else:
                    nid = insert_person(tx, np_name, 'pdf', model_fields, mistral_uuid)
                    tx.run(f"MATCH (p:Person {{id: $pid}}) MATCH (c:Case {{id: $cid}}) MERGE (p)-[:{rel}]->(c)",
                           pid=nid, cid=case_id)

            # ── Parties, lawyers, acts, hearings, docs, assets, log ────
            party_id_map = insert_case_parties(
                tx, case_id, case.persons, person_id_map,
            )
            insert_case_lawyers(
                tx, case_id, case.persons, person_id_map,
                party_id_map, missing_advocates,
            )
            insert_case_acts(tx, case_id, case.acts)
            insert_hearings(tx, case_id, case.hearings)
            doc_id_map = insert_documents(tx, case_id, case.documents)
            insert_assets(tx, case_id, deduped_assets, doc_id_map)
            insert_extraction_log(tx, case_id, case.cnr_number, missing_log)

            return case_id, doc_id_map

        case_id, doc_id_map = session.execute_write(_write)

    # ── PHASE 5: Backfill Document nodes with extracted PDF text ────────
    logger.debug(f"Starting PHASE 5: Backfilling Document nodes for {result['cnr']}")
    with neo4j_driver.session() as session:
        def _update_docs(tx):
            for doc in case.documents:
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
            logger.warning(f'Vector store failed for {case.cnr_number}: {e}')

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

    # Validation report path (next to manifest)
    import json as _json_mod
    from datetime import datetime as _dt
    val_report_path = MANIFEST_PATH.parent / 'validation_report.jsonl'

    run_verified  = 0
    run_extracted = 0

    for idx, row in tqdm(pending.iterrows(), total=len(pending), desc='Cases'):
        pdf_paths = row['pdf_paths'].split('|') if row['pdf_paths'] else []
        t0 = time.time()
        try:
            result  = process_case(row['json_path'], pdf_paths)
            elapsed = round(time.time() - t0, 1)

            # ── Accumulate validation stats ────────────────────────────────
            vs = result.get('val_stats', {})
            run_verified  += vs.get('total_verified', 0)
            run_extracted += vs.get('total_extracted', 0)

            # Write one JSON line to validation_report.jsonl
            report_entry = {
                'cnr'            : result['cnr'],
                'timestamp'      : _dt.now().isoformat(),
                'total_extracted': vs.get('total_extracted', 0),
                'total_verified' : vs.get('total_verified', 0),
                'total_rejected' : vs.get('total_rejected', 0),
                'accuracy_score' : vs.get('accuracy_score', 100.0),
            }
            with open(val_report_path, 'a', encoding='utf-8') as vf:
                vf.write(_json_mod.dumps(report_entry) + '\n')

            logger.info(
                f"[{result['cnr']}] done | "
                f"{result['hearings']}h | "
                f"{result['assets']} assets | "
                f"{result['summary_words']}w | "
                f"{elapsed}s | "
                f"val={vs.get('accuracy_score', 100.0):.1f}%"
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

    # ── Run-level validation totals ────────────────────────────────────────
    if run_extracted > 0:
        run_accuracy = round((run_verified / run_extracted) * 100, 2)
        logger.info(
            f"VALIDATION TOTALS FOR THIS RUN — "
            f"Verified: {run_verified}/{run_extracted} entities | "
            f"Run Accuracy: {run_accuracy}%"
        )
        logger.info(f"Detailed report written to: {val_report_path}")

    if failed:
        for _, row in manifest[manifest['status'] == 'failed'].iterrows():
            logger.error(f'  FAILED: {row["json_path"]} — {row["error_msg"]}')


if __name__ == '__main__':
    main()
