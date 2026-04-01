"""
LLM/llm_extraction.py
All interactions with the NVIDIA LLM API:
  - run_llm_extraction()     : one call per case → summary + judges + assets + new_parties
  - run_batch_adjudicator()  : batch entity resolution against graph candidates
  - run_llm_adjudicator()    : single-entity resolution (manual / fallback)
  - get_fuzzy_candidates()   : Neo4j read helper for entity-resolution candidates
  - build_llm_context()      : assembles the user prompt content
"""
import json as _json
import logging
from pathlib import Path

import requests
from tenacity import retry, wait_exponential, stop_after_attempt

from models.entities import (
    User, Judge, Lawyer, Case, Organization, Court, Act, 
    CaseHearing, Asset, Document,
    get_presence_manifest, get_model_schema_description, get_compact_schema_description
)

from config import (
    EXTRACTION_MODEL, EXTRACT_URL, NVIDIA_HEADERS,
)
from utils.helpers import org_type

logger = logging.getLogger('pipeline')


# ══════════════════════════════════════════════════════════════════════════
# Dynamic Prompt Generation
# ══════════════════════════════════════════════════════════════════════════

def generate_pdf_extraction_prompt(case_template_json: str):
    """
    Dynamically generates the extraction prompt based entirely on completing a provided state template.
    """
    prompt = f"""\
You are a legal data analyst for Indian district court cases.
Documents may contain Hindi, English, or a mix of both.
Always respond in English regardless of input language.

You are provided with a complete STATE TEMPLATE of a case. This template is generated from existing database records.
Many fields in this template will be `null` because they were not found in the initial data load. 

Your objective is to COMPLETE the State Template by reading the provided PDF ORDER TEXT.

═══════════════════════════════════════════════════════════════
A. TEMPLATE COMPLETION RULES
═══════════════════════════════════════════════════════════════
1. PRESERVE EXISTING DATA: Do not change any fields that already have a non-null value in the template.
2. FILL IN THE BLANKS: Search the PDF text carefully to find values for any fields that are currently `null`.
3. ADD MISSING ENTITIES: 
   - Judges: If you find judges in the PDF, populate the `judges` array. (A blank schema is provided). Treat Board/Panel members as Judges.
   - Assets: If you find assets (property, vehicles, etc.), populate the `assets` array. (A blank schema is provided).
   - Parties & Advocates: If you find NEW parties or advocates NOT already listed in the template, add them to their respective arrays following the existing structure.
4. NO PLACEHOLDERS: If a field is NOT found in the PDF, leave it as `null`. Do NOT return strings like "Not mentioned", "N/A", "None", or "Unknown".
5. EXTRA FIELDS: For any entity (case_details, court, parties, advocates, judges, assets), you MAY include additional key-value pairs beyond the schema fields IF they represent genuinely important identifying or factual data found in the PDF.
   - Must be directly stated in the PDF — no assumptions.
   - Key: snake_case only (e.g. "father_name", "loan_account_no").
   - Value: flat scalar only (string, number, boolean). NO nested objects or arrays.
6. MISSING DATA LOG: Every time a required field remains `null` because it's not in the PDF, add an entry to the `missing_data_log` array. Example: {{ "missing_object": "uid_number", "reason": "Not mentioned in the PDF" }}.

═══════════════════════════════════════════════════════════════
B. SEARCH SUMMARY
═══════════════════════════════════════════════════════════════
Generate a fact-dense English summary encompassing Identity, Timeline, Parties, Legal facts, Financial facts, Assets, and Proceedings. This summary is used for semantic search. Be thorough. No word limit.
Ensure the summary is placed in the `search_summary` field of the returned JSON.

The summary must include all of the following in natural flowing sentences:
IDENTITY: Case number, CNR, case type, court name, district, state.
TIMELINE: Filing date, hearings, decision date, case duration.
PARTIES: All petitioners, respondents, advocates, and judges.
LEGAL: Laws and sections invoked, dispute nature, final outcome, disposal type.
FINANCIAL: Amounts demanded/ordered, loan amounts, etc.
ASSETS: Type, identifier, address, possession orders.
PROCEEDINGS: Key events, transfers, Lok Adalat referrals, defaults.

IMPORTANT: 
- Write in plain factual English sentences.
- If something is not mentioned, skip it. Do not hallucinate.
- Divide the summary into separate paragraphs corresponding to each section (IDENTITY, TIMELINE, etc.). Do NOT write the explicit section titles, just provide clear paragraph breaks.

═══════════════════════════════════════════════════════════════
C. STATE TEMPLATE (YOUR INPUT JSON)
═══════════════════════════════════════════════════════════════
{case_template_json}

═══════════════════════════════════════════════════════════════
CRITICAL: You MUST return the EXACT SAME JSON structure as the template, just with the `null` fields filled in, any extra fields added, and new entities appended to the arrays. Do NOT change the original structure.
Return valid JSON only. Do not wrap in markdown or backticks.
═══════════════════════════════════════════════════════════════
"""
    return prompt



BATCH_RESOLUTION_PROMPT = """
You are an expert Master Data Management Batch Adjudicator for a legal system.
Receive NEW entities under 'entities_to_adjudicate', each with 'db_candidates' from the graph.
For each: if a candidate is 100% the same real-world entity return EXACT + its UUID.
Otherwise return NONE.

Return ONLY valid JSON:
{
  "resolutions": [
    {"extracted_name": "Jon Doe", "entity_type": "person",
     "match_confidence": "EXACT", "matched_uuid": "uuid-or-null",
     "reasoning": "Brief reason."}
  ]
}
"""

SINGLE_ENTITY_RESOLUTION_PROMPT = """
You are an expert Master Data Management Adjudicator for a legal graph database.
You will receive ONE new entity and a list of existing candidates from the graph.

Compare the new entity against each candidate carefully:
- Protect against typos and abbreviations (e.g. 'Kotak Mahindra Bk' vs 'Kotak Mahindra Bank')
- Two people with the same name are DIFFERENT if their roles or contexts clearly differ
- If a candidate is 100% the same real-world entity, return EXACT and its UUID
- Otherwise return NONE

Return ONLY valid JSON:
{
  "match_confidence": "EXACT" or "NONE",
  "matched_uuid": "uuid-string or null",
  "reasoning": "Brief explanation"
}
"""


# ══════════════════════════════════════════════════════════════════════════
# Context builder
# ══════════════════════════════════════════════════════════════════════════

def build_llm_context(pdf_texts: dict, case_template) -> tuple[str, str]:
    """
    Build (filled_system_prompt, user_content).
    user_content = PDF text combined.
    """
    logger.debug(f"Starting build_llm_context for {case_template.case_details.cnr_number}")
    
    # Generate Case Template JSON
    case_template_json = _json.dumps(case_template.model_dump(), indent=2, ensure_ascii=False)
    
    filled_prompt = generate_pdf_extraction_prompt(
        case_template_json=case_template_json
    )

    lines = ['=== PDF ORDER TEXT ===']
    for storage_id, text in pdf_texts.items():
        if not text or not text.strip():
            continue
        fname = Path(storage_id).name
        lines.append(f'--- {fname} ---')
        lines.append(text)
        lines.append('')

    return filled_prompt, '\n'.join(lines)


# ══════════════════════════════════════════════════════════════════════════
# LLM extraction
# ══════════════════════════════════════════════════════════════════════════

@retry(wait=wait_exponential(min=2, max=60), stop=stop_after_attempt(5))
def run_llm_extraction(pdf_texts: dict, case_template) -> dict:
    """
    One LLM call per case.
    Returns: search_summary, judges, assets, missing_advocates,
             party_addresses, party_additional_info, missing_data_log, new_parties.
    """
    cnr = case_template.case_details.cnr_number
    logger.debug(f"Starting run_llm_extraction for {cnr}")
    filled_prompt, user_content = build_llm_context(pdf_texts, case_template)

    if not pdf_texts:
        logger.warning(f'No PDF text for {cnr} — skipping LLM')
        return {
            'search_summary'     : '',
            'case_details'       : {},
            'court'              : {},
            'acts'               : [],
            'hearings'           : [],
            'documents'          : [],
            'parties'            : [],
            'advocates'          : [],
            'judges'             : [],
            'assets'             : [],
            'missing_data_log'   : [],
        }

    payload = {
        'model'            : EXTRACTION_MODEL,
        'messages'         : [
            {'role': 'system', 'content': filled_prompt},
            {'role': 'user',   'content': user_content},
        ],
        'max_tokens'       : 8000,
        'temperature'      : 0,
        'top_p'            : 0.95,
        'frequency_penalty': 0.0,
        'presence_penalty' : 0.0,
        'stream'           : True,
    }

    import time
    start_time = time.time()
    logger.info(f"Sending LLM request for {cnr} (System: {len(filled_prompt)}, User: {len(user_content)})")
    
    full_response_text = ""
    try:
        with requests.post(EXTRACT_URL, headers=NVIDIA_HEADERS, json=payload, timeout=240, stream=True) as resp:
            if resp.status_code in (401, 403):
                logger.error(f"NVIDIA API Authentication/Permission Error {resp.status_code}")
                raise Exception(f"Auth error {resp.status_code}")
            
            if resp.status_code != 200:
                logger.error(f'NVIDIA API error {resp.status_code}: {resp.text[:300]}')
                raise Exception(f'API error {resp.status_code}')

            logger.info("Connection established. Streaming LLM response...")
            last_log_time = time.time()
            char_count = 0
            
            for line in resp.iter_lines():
                if line:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith('data: '):
                        data_str = decoded_line[len('data: '):]
                        if data_str.strip() == '[DONE]':
                            break
                        try:
                            chunk = _json.loads(data_str)
                            content = chunk['choices'][0]['delta'].get('content', '')
                            full_response_text += content
                            char_count += len(content)
                            
                            # Log progress every 15 seconds
                            if time.time() - last_log_time > 15:
                                elapsed = time.time() - start_time
                                logger.debug(f"Streaming progress for {cnr}: {char_count} chars received in {elapsed:.1f}s...")
                                last_log_time = time.time()
                        except:
                            continue

        elapsed = time.time() - start_time
        logger.info(f"LLM extraction complete for {cnr} in {elapsed:.2f}s. Total characters received: {len(full_response_text)}")
        
    except requests.exceptions.Timeout:
        logger.warning(f"LLM request timed out for {cnr} after {time.time() - start_time:.2f}s")
        raise
    except Exception as e:
        logger.error(f"LLM request system error for {cnr}: {e}")
        raise

    raw = full_response_text.strip()
    if '```' in raw:
        raw = raw.split('```')[1]
        if raw.startswith('json'):
            raw = raw[4:]
        raw = raw.split('```')[0]
    raw = raw.strip()

    try:
        result = _json.loads(raw)
        result.setdefault('search_summary',    '')
        result.setdefault('case_details',      {})
        result.setdefault('court',             {})
        result.setdefault('acts',              [])
        result.setdefault('hearings',          [])
        result.setdefault('documents',         [])
        result.setdefault('parties',           [])
        result.setdefault('advocates',         [])
        result.setdefault('judges',            [])
        result.setdefault('assets',            [])
        result.setdefault('missing_data_log',  [])
        
        return result
    except _json.JSONDecodeError as e:
        logger.error(f'LLM returned invalid JSON for {cnr}: {e}')
        logger.debug(f'Raw output: {raw[:500]}')
        raise


# ══════════════════════════════════════════════════════════════════════════
# Entity resolution — batch (primary)
# ══════════════════════════════════════════════════════════════════════════

@retry(wait=wait_exponential(min=2, max=60), stop=stop_after_attempt(5))
def run_batch_adjudicator(batch_payload: dict) -> dict:
    """
    Resolve multiple entities against graph candidates in one LLM call.
    """
    logger.debug("Starting run_batch_adjudicator")
    if not batch_payload.get('entities_to_adjudicate'):
        return {'resolutions': []}

    payload = {
        'model'          : EXTRACTION_MODEL,
        'messages'       : [
            {'role': 'system', 'content': BATCH_RESOLUTION_PROMPT},
            {'role': 'user',   'content': _json.dumps(batch_payload, ensure_ascii=False)},
        ],
        'response_format': {'type': 'json_object'},
        'max_tokens'     : 2000,
        'temperature'    : 0.1,
    }
    resp = requests.post(EXTRACT_URL, headers=NVIDIA_HEADERS, json=payload, timeout=60)
    if resp.status_code == 429:
        raise Exception('Rate limited')
    resp.raise_for_status()
    raw = resp.json()['choices'][0]['message']['content'].strip()
    if '```' in raw:
        raw = raw.split('```')[1]
        if raw.startswith('json'):
            raw = raw[4:]
    return _json.loads(raw.strip())


# ══════════════════════════════════════════════════════════════════════════
# Entity resolution — single (fallback / manual)
# ══════════════════════════════════════════════════════════════════════════

@retry(wait=wait_exponential(min=2, max=60), stop=stop_after_attempt(5))
def run_llm_adjudicator(new_entity: dict, db_candidates: list) -> dict:
    """
    Resolve a single entity against graph candidates.
    """
    logger.debug(f"Starting run_llm_adjudicator for entity: {new_entity.get('name')}")
    user_string = (
        "--- NEW ENTITY ---\n"
        f"{_json.dumps(new_entity, indent=2)}\n\n"
        "--- GRAPH CANDIDATES ---\n"
    )
    for i, cand in enumerate(db_candidates):
        user_string += (
            f"Candidate {i+1}: UUID {cand['id']} | "
            f"Name: {cand['name']} | "
            f"Info: {cand.get('additional_info') or cand.get('type', '')}\n"
        )

    payload = {
        'model'          : EXTRACTION_MODEL,
        'messages'       : [
            {'role': 'system', 'content': SINGLE_ENTITY_RESOLUTION_PROMPT},
            {'role': 'user',   'content': user_string},
        ],
        'response_format': {'type': 'json_object'},
        'max_tokens'     : 500,
        'temperature'    : 0.1,
    }
    resp = requests.post(EXTRACT_URL, headers=NVIDIA_HEADERS, json=payload, timeout=60)
    if resp.status_code == 429:
        raise Exception('Rate limited')
    resp.raise_for_status()
    raw = resp.json()['choices'][0]['message']['content'].strip()
    if '```' in raw:
        raw = raw.split('```')[1]
        if raw.startswith('json'):
            raw = raw[4:]
    return _json.loads(raw.strip())


# ══════════════════════════════════════════════════════════════════════════
# Fuzzy candidate lookup (Neo4j read — used during entity resolution)
# ══════════════════════════════════════════════════════════════════════════

def get_fuzzy_candidates(tx, name: str, entity_type: str) -> list[dict]:
    """
    Query Neo4j for candidate nodes that might match *name*.
    """
    logger.debug(f"Starting get_fuzzy_candidates for name: {name}, type: {entity_type}")
    from utils.helpers import normalize_name
    norm     = normalize_name(name)
    fragment = norm[:12]
    if not norm:
        return []
    candidates = []

    if entity_type == 'organization':
        rows = tx.run("""
            MATCH (o:Organization)
            WHERE o.name_norm CONTAINS $f OR $f CONTAINS o.name_norm
            RETURN o.id AS id, o.name AS name,
                   coalesce(o.organization_type, '') AS type,
                   coalesce(o.additional_info, '') AS info""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'],
                                'type': r['type'], 'info': r['info']})

    elif entity_type == 'judge':
        rows = tx.run("""
            MATCH (p:Person)
            WHERE (p.name_norm CONTAINS $f OR $f CONTAINS p.name_norm)
              AND coalesce(p.is_judge, false) = true
            RETURN p.id AS id, p.name AS name,
                   coalesce(p.designation, '') AS designation""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'],
                                'designation': r['designation']})

    elif entity_type in ('person', 'lawyer', 'respondent', 'petitioner'):
        rows = tx.run("""
            MATCH (p:Person)
            WHERE p.name_norm CONTAINS $f OR $f CONTAINS p.name_norm
            RETURN p.id AS id, p.name AS name,
                   coalesce(p.additional_info, '') AS info""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'], 'info': r['info']})

    elif entity_type == 'court':
        rows = tx.run("""
            MATCH (c:Court)
            WHERE toLower(c.name) CONTAINS $f OR $f CONTAINS toLower(c.name)
            RETURN c.id AS id, c.name AS name,
                   coalesce(c.district, '') AS district,
                   coalesce(c.state, '') AS state""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'],
                                'district': r['district'], 'state': r['state']})

    return candidates
