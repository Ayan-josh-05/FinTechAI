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

def generate_pdf_extraction_prompt(json_advocates, json_parties, json_acts, missing_fields):
    """
    Dynamically generates the extraction prompt based on entity models.
    """
    case_schema  = get_compact_schema_description(Case)
    judge_schema = get_compact_schema_description(Judge)
    asset_schema = get_compact_schema_description(Asset)
    party_schema = get_compact_schema_description(User)
    org_schema   = get_compact_schema_description(Organization)
    
    prompt = f"""\
You are a legal data analyst for Indian district court cases.
Documents may contain Hindi, English, or a mix of both. Always respond in English.

CONTEXT:
Clean data has already been extracted from structured JSON. Your task is to:
1. Generate a fact-dense English summary for semantic search (Search Summary).
2. Extract specific MISSING fields and entities found ONLY in the PDF text.

═══════════════════════════════════════════════════════════════
A. SEARCH SUMMARY INSTRUCTIONS
═══════════════════════════════════════════════════════════════
Generate a fact-dense summary covering IDENTITY, TIMELINE, PARTIES, LEGAL, FINANCIAL, ASSETS, and PROCEEDINGS.
- Write in plain factual English sentences (no bullets, no headers).
- Divide into separate paragraphs for each category above.
- Maintain natural flow; include specific names, dates, and amounts.

═══════════════════════════════════════════════════════════════
B. TARGET ENTITIES FOR EXTRACTION (PDF ONLY)
═══════════════════════════════════════════════════════════════
Extract the following ONLY if present in the PDF and NOT already known.

1. MISSING CASE FIELDS
The following fields are currently null/missing. Extract them if found:
{missing_fields}

Schema descriptions for these fields:
{case_schema}

2. JUDGES: Extract all presiding judges/board members mentioned.
{judge_schema}

3. ASSETS: Extract any secured assets, properties, or vehicles mentioned.
{asset_schema}

4. NEW PARTIES & INFO: 
- Known JSON parties: {json_parties}
- For KNOWN parties: Extract additional info (PAN, Aadhaar, Age, etc.) if found.
- For UNKNOWN parties: Extract full details for any person/org NOT listed above.
Schemas:
Person: {party_schema}
Org: {org_schema}

5. MISSING ADVOCATES: 
- Known JSON advocates: {json_advocates}
- Extract ONLY those advocates in PDF who are NOT in the above list.

6. ADDITIONAL ACTS & SECTIONS:
- Known JSON Acts: {json_acts}
- Extract any ADDITIONAL Acts (and their sections) mentioned in the PDF not listed above.
- Also, if you find sections for Known Acts that were missing from JSON, list them too!
- Ensure section numbers are returned as a single comma-separated string (e.g. "302, 307, 34").

═══════════════════════════════════════════════════════════════
C. CRITICAL RULES
1. DO NOT OVERWRITE: Data already present in the JSON (listed as 'Known') is the primary truth. Do not replace it with different values found in the PDF.
2. NO PLACEHOLDERS: If a field is not found, return null. Do not use "Not found", "N/A", etc.
3. EXTRACTION LOGS: Log every null field in "missing_data_log" with a reason.
4. CONSISTENCY: Use ONLY the field names defined in the schemas above.
═══════════════════════════════════════════════════════════════

RETURN THIS EXACT JSON SCHEMA:
{{
  "search_summary": "fact-dense paragraph-based summary",
  "case_updates": {{ "field_name": "value" }},
  "missing_data_log": [ {{ "missing_object": "field_name", "reason": "why" }} ],
  "judges": [ {{ "name": "...", "designation": "...", "uid_number": "...", "heard_from_date": "...", "heard_to_date": "..." }} ],
  "assets": [ {{ "asset_type": "...", "identifier": "...", "attributes": {{}} }} ],
  "new_parties": [ {{ "type": "person/organization", "name": "...", "role": "...", "info": {{}} }} ],
  "party_additional_info": [ {{ "name": "...", "info": {{}} }} ],
  "missing_advocates": [ {{ "name": "...", "side": "petitioner/respondent" }} ],
  "additional_acts": [ {{ "name": "...", "section": "..." }} ]
}}
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

def build_llm_context(pdf_texts: dict, case) -> tuple[str, str]:
    """
    Build (filled_system_prompt, user_content).
    user_content = structured case data + PDF text combined.
    """
    logger.debug(f"Starting build_llm_context for {case.cnr_number}")
    
    # Generate Case Manifest for LLM
    case_entity = Case(
        case_number = case.case_number,
        cnr_number  = case.cnr_number,
        case_type   = case.case_type,
        status      = case.case_status,
        filing_date = str(case.filing_date) if case.filing_date else None,
        disposal_date = str(case.disposal_date) if case.disposal_date else None,
        stage       = case.case_stage,
        filing_number = case.filing_number,
        registration_number = case.registration_number,
        district    = case.district,
        state       = case.state
    )
    case_manifest = get_presence_manifest(case_entity)
    
    json_advocates = [
        p.name for p in case.persons
        if p.role in ('petitioner_advocate', 'respondent_advocate')
    ]
    json_parties = [
        {'name': p.name, 'role': p.role}
        for p in case.persons
        if p.role in ('petitioner', 'respondent')
    ]
    json_acts = [
        {'name': a.name, 'section': a.section}
        for a in case.acts
    ]
    
    # Filter manifest to only show missing fields
    missing_fields = {k: v for k, v in case_manifest.items() if v is None}
    
    filled_prompt = generate_pdf_extraction_prompt(
        json_advocates=json_advocates if json_advocates else '[]',
        json_parties  =_json.dumps(json_parties, ensure_ascii=False),
        json_acts     =_json.dumps(json_acts, ensure_ascii=False),
        missing_fields=_json.dumps(missing_fields, indent=2)
    )

    lines = ['=== CASE CONTEXT ===']
    lines.append(f'CNR: {case.cnr_number}')
    lines.append(f'Case number: {case.case_number}')
    lines.append(f'Court: {case.court_name}')
    lines.append('')

    lines.append('')
    lines.append('=== PDF ORDER TEXT ===')
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
def run_llm_extraction(pdf_texts: dict, case) -> dict:
    """
    One LLM call per case.
    Returns: search_summary, judges, assets, missing_advocates,
             party_addresses, party_additional_info, missing_data_log, new_parties.
    """
    logger.debug(f"Starting run_llm_extraction for {case.cnr_number}")
    filled_prompt, user_content = build_llm_context(pdf_texts, case)

    if not pdf_texts:
        logger.warning(f'No PDF text for {case.cnr_number} — skipping LLM')
        return {
            'judges'             : [],
            'assets'             : [],
            'missing_advocates'  : [],
            'party_additional_info': [],
            'missing_data_log'   : [],
            'case_updates'       : {},
            'new_parties'        : [],
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
    logger.info(f"Sending LLM request for {case.cnr_number} (System: {len(filled_prompt)}, User: {len(user_content)})")
    
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
                                logger.debug(f"Streaming progress for {case.cnr_number}: {char_count} chars received in {elapsed:.1f}s...")
                                last_log_time = time.time()
                        except:
                            continue

        elapsed = time.time() - start_time
        logger.info(f"LLM extraction complete for {case.cnr_number} in {elapsed:.2f}s. Total characters received: {len(full_response_text)}")
        
    except requests.exceptions.Timeout: 
        logger.warning(f"LLM request timed out for {case.cnr_number} after {time.time() - start_time:.2f}s")
        raise
    except Exception as e:
        logger.error(f"LLM request system error for {case.cnr_number}: {e}")
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
        result.setdefault('judges',              [])
        result.setdefault('assets',              [])
        result.setdefault('missing_advocates',   [])
        result.setdefault('party_additional_info', [])
        result.setdefault('missing_data_log',    [])
        result.setdefault('case_updates',        {})
        result.setdefault('new_parties',         [])
        result.setdefault('additional_acts',     [])
        
        # Guardrail: Only allow updates for fields that were actually missing
        case_manifest = {
            'filing_number': case.filing_number,
            'filing_date': case.filing_date,
            'registration_date': case.registration_date,
            'registration_number': case.registration_number,
            'first_hearing_date': case.first_hearing_date,
            'decision_date': case.decision_date,
            'case_status': case.case_status,
            'case_type': case.case_type,
            'case_stage': case.case_stage,
            'court_name': case.court_name,
            'court_number': case.court_number,
            'district': case.district,
            'state': case.state,
        }
        missing_keys = {k for k, v in case_manifest.items() if v is None}
        updates = result.get('case_updates', {})
        if isinstance(updates, dict):
            filtered_updates = {k: v for k, v in updates.items() if k in missing_keys}
            result['case_updates'] = filtered_updates

        # Backward compatibility for 'search_summary' mapping
        if 'case_updates' in result and 'search_summary' in result['case_updates']:
             result['search_summary'] = result['case_updates']['search_summary']
        
        return result
    except _json.JSONDecodeError as e:
        logger.error(f'LLM returned invalid JSON for {case.cnr_number}: {e}')
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
