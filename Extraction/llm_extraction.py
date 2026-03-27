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

def generate_pdf_extraction_prompt(json_advocates, json_parties, case_manifest):
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
Documents may contain Hindi, English, or a mix of both.
Always respond in English regardless of input language.

You will receive:
  1. STRUCTURED CASE DATA — clean fields already extracted from JSON
  2. PDF ORDER TEXT — raw text from the court order document(s)

Your job is to generate a comprehensive search_summary AND extract 
specific fields the JSON data does not contain.

═══════════════════════════════════════════════════════════════
A. TARGET FIELDS FOR EXTRACTION
═══════════════════════════════════════════════════════════════
- If the document is from a **Lok Adalat**, extraction is special.
- Treat **Board Members** or **Panel Members** as Judges. 
- A case may have multiple Judges / Board Members across different orders.
- Extract ALL unique judges found across all provided texts.

═══════════════════════════════════════════════════════════════
B. SEARCH SUMMARY
═══════════════════════════════════════════════════════════════
Generate a fact-dense English summary that captures EVERY important detail about this case. This summary is used for semantic search, so it must contain enough detail that any relevant query will match.

There is no limit to the number of words a summary can have. Summary should be long enough to include ALL the details/facts.

The summary must include all of the following in natural flowing sentences:

IDENTITY:
  - Case number, CNR, case type, current status
  - Court name, district, state
  - The reason this case happened, and how did proceedings take place, summary of full case document.

TIMELINE:
  - Filing date, first hearing, last hearing, decision date
  - Duration in plain language (e.g. 'ran for 2 years 3 months')
  - Total number of hearings
  - Whether the case is still pending or has been decided

PARTIES:
  - All petitioners with their type (bank, company, individual)
  - All respondents with their type
  - All advocates and which side they represent
  - Judge name and designation if found in PDF (Mostly found at the very end of the text extracted)

LEGAL:
  - All laws and sections invoked
  - The legal nature of the dispute (loan default, possession, cheque bounce, criminal matter, property dispute, etc.)
  - The final outcome or order passed
  - Disposal type (dismissed, allowed, settled, acquitted, etc.)
  - Who the decision was in favour of

FINANCIAL (if present in PDF):
  - Any amounts demanded or claimed (with both raw and numeric form)
  - Any amounts ordered to be paid
  - Loan amounts, outstanding dues, court fees
  - Notices issued under specific sections and whether complied

ASSETS (if present in PDF):
  - Type of secured asset (flat, plot, vehicle, machinery, etc.)
  - Asset identifier (flat number, vehicle registration, khasra number)
  - Full address of the asset
  - Whether possession was ordered and what type
  - Court commissioner details if appointed

PROCEEDINGS:
  - Key events across the hearings in brief
  - Whether the case was transferred between courts
  - Whether it went to Lok Adalat or alternate dispute resolution
  - Any notable patterns in the proceedings (repeated non-appearances, prolonged adjournments, court vacancies, default situations, etc.)

IMPORTANT RULES FOR THE SUMMARY:
  - Write in plain factual English sentences, not bullet points
  - Include specific names, numbers, dates — not vague language
  - If something is not mentioned in the data, skip it — never invent
  - Length should match complexity — brief for simple cases, detailed for complex ones. Let content decide length.
  - Do NOT use section headers inside the summary
  - The summary should read like a dense fact sheet, not a story
  - Do not miss any important facts.
  - Do not hallucinate.
  - Do not add any extra information that is not present in the PDF.

═══════════════════════════════════════════════════════════════
C. TARGET FIELDS FOR EXTRACTION
═══════════════════════════════════════════════════════════════
Search the PDF carefully for the following entities.

1. CASE DATA PRESENCE MANIFEST (Fill 'Missing' fields if found in PDF)
{case_manifest}
Schema for Case Updates:
{case_schema}

2. JUDGES (PDF only)
   Required Fields:
{judge_schema}

3. ASSETS (PDF only)
   Required Fields:
{asset_schema}

4. NEW PARTIES & ADDITIONAL INFO (PDF only)
   JSON parties already known: {json_parties}
   - For KNOWN parties: Extract additional details ( Aadhaar, PAN, Age, etc.)
   - For UNKNOWN parties: Extract full details for any People or Organizations 
     mentioned in the PDF that are NOT in the JSON list above.
   
   Schema Descriptions:
   Person:
{party_schema}

   Organization:
{org_schema}

5. MISSING ADVOCATES (PDF only)
   JSON advocates already known: {json_advocates}
   Extract ONLY those in PDF who are NOT in the above list.

═══════════════════════════════════════════════════════════════
B. SEARCH SUMMARY
═══════════════════════════════════════════════════════════════
Generate a fact-dense English summary encompassing Identity, Timeline, Parties, Legal facts, Financial facts, Assets, and Proceedings. This summary is used for semantic search. Be thorough. No word limit.

═══════════════════════════════════════════════════════════════
C. CRITICAL RULES (Strict Compliance Required)
═══════════════════════════════════════════════════════════════
1. NO PLACEHOLDERS: If a field is NOT found in the PDF, do NOT return strings like "Not mentioned", "N/A", "None", or "Unknown". You MUST set the value to null.
2. EXTRACTION LOGS: Every time a required field is null, you MUST add an entry to the "missing_data_log" explaining why (e.g. {{ "missing_object": "uid_number", "reason": "Not mentioned in the PDF" }}).
3. TRUTH ONLY: Do not hallucinate. If it's not in the PDF, it's null.
4. CONSISTENCY: Use ONLY the field names defined in the schemas above.

═══════════════════════════════════════════════════════════════
RETURN THIS EXACT JSON SCHEMA — complete all fields:
═══════════════════════════════════════════════════════════════
    {{
  "case_updates": {{ "field_name": "value" }},
  "missing_data_log": [ {{ "missing_object": "field_name", "reason": "why" }} ],
  "judges": [ {{ "name": "...", "designation": "...", "uid_number": "..." }} ],
  "assets": [ {{ "asset_type": "...", "identifier": "...", "attributes": {{}} }} ],
  "new_parties": [
     {{ "type": "person", "name": "...", "role": "...", "info": {{}} }},
     {{ "type": "organization", "name": "...", "role": "...", "info": {{}} }}
  ],
  "party_additional_info": [
     {{ "name": "...", "info": {{}} }}
  ],
  "missing_advocates": [
     {{ "name": "...", "side": "petitioner/respondent" }}
  ]
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
        stage       = case.case_stage
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
    
    filled_prompt = generate_pdf_extraction_prompt(
        json_advocates=json_advocates if json_advocates else '[]',
        json_parties  =_json.dumps(json_parties, ensure_ascii=False),
        case_manifest = _json.dumps(case_manifest, indent=2)
    )

    lines = ['=== STRUCTURED CASE DATA ===']
    lines.append(f'CNR: {case.cnr_number}')
    lines.append(f'Case number: {case.case_number}')
    lines.append(f'Case type: {case.case_type}')
    lines.append(f'Status: {case.case_status}')
    if case.case_stage:
        lines.append(f'Stage: {case.case_stage}')
    lines.append(f'Court: {case.court_name}')
    lines.append(f'Court number: {case.court_number}')
    lines.append(f'District: {case.district}')
    lines.append(f'State: {case.state}')
    lines.append(f'Filing date: {case.filing_date}')
    if case.registration_date:
        lines.append(f'Registration date: {case.registration_date}')
    lines.append(f'First hearing: {case.first_hearing_date}')
    lines.append(f'Last hearing: {case.last_hearing_date}')
    lines.append(f'Decision date: {case.decision_date}')
    if case.disposal_date:
        lines.append(f'Disposal date: {case.disposal_date}')
    if case.in_favour_of:
        lines.append(f'In favour of: {case.in_favour_of}')
    if case.type_of_disposal:
        lines.append(f'Disposal code: {case.type_of_disposal}')

    if case.filing_date and case.decision_date:
        days   = (case.decision_date - case.filing_date).days
        years  = days // 365
        months = (days % 365) // 30
        if years > 0:
            dur = f'{years} year{"s" if years > 1 else ""} {months} month{"s" if months != 1 else ""}'
        else:
            dur = f'{months} month{"s" if months != 1 else ""} ({days} days)'
        lines.append(f'Case duration: {dur}')

    lines.append(f'Total hearings: {len(case.hearings)}')
    lines.append('')

    lines.append('Petitioners:')
    for p in case.persons:
        if p.role == 'petitioner':
            otype = f' ({org_type(p.name)})' if p.is_org else ' (individual)'
            rep   = f' through {p.rep_name}' if p.rep_name else ''
            lines.append(f'  - {p.name}{otype}{rep}')

    lines.append('Respondents:')
    for p in case.persons:
        if p.role == 'respondent':
            otype = f' ({org_type(p.name)})' if p.is_org else ' (individual)'
            rep   = f' through {p.rep_name}' if p.rep_name else ''
            lines.append(f'  - {p.name}{otype}{rep}')

    lines.append('Advocates (petitioner side):')
    for p in case.persons:
        if p.role == 'petitioner_advocate':
            lines.append(f'  - {p.name}')

    lines.append('Advocates (respondent side):')
    for p in case.persons:
        if p.role == 'respondent_advocate':
            lines.append(f'  - {p.name}')

    if case.acts:
        lines.append('')
        lines.append('Acts and sections invoked:')
        for a in case.acts:
            lines.append(f'  - {a.name} section {a.section or "(unspecified)"}')

    if case.hearings:
        lines.append('')
        purposes = list(dict.fromkeys(h.purpose for h in case.hearings if h.purpose))
        lines.append(f'Hearing purposes (in order): {" -> ".join(purposes)}')
        last = case.hearings[-1]
        if last.diary_note.business:
            lines.append(f'Final order/diary note: {last.diary_note.business}')
        if last.diary_note.nature_of_disposal:
            lines.append(f'Nature of disposal: {last.diary_note.nature_of_disposal}')
        notes = ' '.join(
            h.diary_note.business for h in case.hearings if h.diary_note.business
        ).lower()
        if 'transfer' in notes or 'transferred' in notes:
            lines.append('Case was transferred between courts during proceedings.')
        if 'lok adalat' in notes or 'lokadalat' in notes:
            lines.append('Case was referred to or settled before Lok Adalat.')
        if 'default' in notes:
            lines.append('Action or dismissal for default was noted in proceedings.')

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
