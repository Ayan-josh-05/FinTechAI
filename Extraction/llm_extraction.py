"""
LLM/llm_extraction.py
All interactions with the NVIDIA LLM API:
  - run_llm_extraction()     : one call per case → summary + judge + assets + addresses
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

from config import (
    EXTRACTION_MODEL, EXTRACT_URL, NVIDIA_HEADERS,
)
from utils.helpers import org_type

logger = logging.getLogger('pipeline')


# ══════════════════════════════════════════════════════════════════════════
# System prompts
# ══════════════════════════════════════════════════════════════════════════

PDF_EXTRACTION_PROMPT = """\
You are a legal data analyst for Indian district court cases.
Documents may contain Hindi, English, or a mix of both.
Always respond in English regardless of input language.

You will receive:
  1. STRUCTURED CASE DATA — clean fields already extracted from JSON
  2. PDF ORDER TEXT — raw text from the court order document(s)

Your job is to generate a comprehensive search_summary AND extract
specific fields the JSON data does not contain.

If the script is provided in Hindi/Devangri script, Please translate
everything into english and give english output only for the below given instructions.

═══════════════════════════════════════════════════════════════
A. SEARCH SUMMARY
═══════════════════════════════════════════════════════════════
Generate a fact-dense English summary that captures EVERY important
detail about this case. This summary is used for semantic search,
so it must contain enough detail that any relevant query will match.

There is no limit to the number of words a summary can have. Summary should
be long enough to include ALL the details/facts.

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
  - The legal nature of the dispute (loan default, possession,
    cheque bounce, criminal matter, property dispute, etc.)
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
  - Any notable patterns in the proceedings (repeated non-appearances,
    prolonged adjournments, court vacancies, default situations, etc.)

IMPORTANT RULES FOR THE SUMMARY:
  - Write in plain factual English sentences, not bullet points
  - Include specific names, numbers, dates — not vague language
  - If something is not mentioned in the data, skip it — never invent
  - Length should match complexity — brief for simple cases,
    detailed for complex ones. Let content decide length.
  - Do NOT use section headers inside the summary
  - The summary should read like a dense fact sheet, not a story
  - Do not miss any important facts.
  - Do not hallucinate.
  - Do not add any extra information that is not present in the PDF.
═══════════════════════════════════════════════════════════════
B. JUDGE (from PDF only — JSON never has personal name)
═══════════════════════════════════════════════════════════════
Extract judge's personal name from PDF header or signature block.
Examples:
  Header:    'Present: Thiru. M. ZIAVUR RAHUMAN, XXV Assistant Judge'
  Signature: 'Sd/ M. A. Shinde, Chief Metropolitan Magistrate'
Return null for any field not found in the PDF.

═══════════════════════════════════════════════════════════════
C. ASSETS (from PDF only — JSON never has asset data)
═══════════════════════════════════════════════════════════════
Extract every physical or financial asset mentioned in the PDF.
Asset types: vehicle / plot / flat / commercial_property /
             bank_account / cheque / machinery / other
Identifier = the single most unique ID for each asset.
Amount rules: Rs.5,32,92,950/- → estimated_value_inr = 532929500
              1 lakh = 100000, 1 crore = 10000000

═══════════════════════════════════════════════════════════════
D. MISSING ADVOCATES (PDF only)
═══════════════════════════════════════════════════════════════
JSON already has these advocates: {json_advocates}
Extract ONLY advocates in PDF who are NOT in the above list.

═══════════════════════════════════════════════════════════════
E. PARTY ADDRESSES (PDF only)
═══════════════════════════════════════════════════════════════
JSON parties (addresses mostly empty): {json_parties}
For each party, extract their full address from the PDF if present.
Use party name EXACTLY as in JSON. Return null if not found.

═══════════════════════════════════════════════════════════════
F. ADDITIONAL INFO (PDF only)
═══════════════════════════════════════════════════════════════
Using the known case parties below:
{json_parties}
Search the PDF text to extract ANY supplementary information available
for these specific individuals or organizations (e.g., age, occupation,
registration numbers, aliases, managing directors, etc.).
Output this as JSON key-value pairs assigned to the EXACT party name.

═══════════════════════════════════════════════════════════════
RETURN THIS EXACT JSON — complete all fields:
═══════════════════════════════════════════════════════════════

{{
  "search_summary": "comprehensive fact-dense English summary here",

  "missing_data_log": [
    {{
      "missing_object": "judge_name",
      "reason": "Not mentioned in the attached order"
    }}
  ],

  "judge": {{
    "name": "personal name or null",
    "designation": "official title or null",
    "uid_number": "UID number or null",
    "court": "court name from PDF or null"
  }},

  "assets": [
    {{
      "asset_type": "flat",
      "identifier": "Flat No. 42",
      "description": "exact description as written in PDF",
      "address": "full address string or null",
      "estimated_value_inr": null,
      "attributes": {{
        "floor": "4th",
        "wing": "B",
        "building_name": "Rustomjee Adarsh Dugdhalay Lane",
        "locality": "Malad (West)",
        "city": "Mumbai",
        "pincode": "400064"
      }}
    }}
  ],

  "missing_advocates": [
    {{
      "name": "advocate name exactly as in PDF",
      "side": "petitioner or respondent"
    }}
  ],

  "party_addresses": [
    {{
      "name": "party name exactly as in JSON",
      "address": "full address from PDF or null"
    }}
  ],

  "party_additional_info": [
    {{
      "name": "party name exactly as in JSON",
      "info": {{
        "age": 45,
        "occupation": "Director",
        "registration_number": "XYZ123"
      }}
    }}
  ]
}}

Return ONLY valid JSON. No markdown fences. No explanation outside the JSON.
""".strip()


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
    logger.info(f"Starting build_llm_context for {case.cnr_number}")
    json_advocates = [
        p.name for p in case.persons
        if p.role in ('petitioner_advocate', 'respondent_advocate')
    ]
    json_parties = [
        {'name': p.name, 'role': p.role}
        for p in case.persons
        if p.role in ('petitioner', 'respondent')
    ]
    filled_prompt = PDF_EXTRACTION_PROMPT.format(
        json_advocates=json_advocates if json_advocates else '[]',
        json_parties  =_json.dumps(json_parties, ensure_ascii=False),
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
    Returns: search_summary, judge, assets, missing_advocates,
             party_addresses, party_additional_info, missing_data_log.
    """
    logger.info(f"Starting run_llm_extraction for {case.cnr_number}")
    filled_prompt, user_content = build_llm_context(pdf_texts, case)

    if not pdf_texts:
        logger.warning(f'No PDF text for {case.cnr_number} — skipping LLM')
        return {
            'search_summary'     : None,
            'judge'              : None,
            'assets'             : [],
            'missing_advocates'  : [],
            'party_addresses'    : [],
            'party_additional_info': [],
        }

    payload = {
        'model'            : EXTRACTION_MODEL,
        'messages'         : [
            {'role': 'system', 'content': filled_prompt},
            {'role': 'user',   'content': user_content},
        ],
        'max_tokens'       : 15000,
        'temperature'      : 0,
        'top_p'            : 0.95,
        'frequency_penalty': 0.0,
        'presence_penalty' : 0.0,
        'stream'           : True,
    }

    resp = requests.post(EXTRACT_URL, headers=NVIDIA_HEADERS, json=payload, timeout=120, stream=True)

    if resp.status_code == 429:
        logger.warning('NVIDIA rate limit — retrying...')
        raise Exception('Rate limited')
    if resp.status_code != 200:
        # For non-streaming error, we can read the text. For streaming, we might need to handle differently
        # but here we just failed to start the stream.
        logger.error(f'NVIDIA API error {resp.status_code}: {resp.text[:300]}')
        raise Exception(f'API error {resp.status_code}')

    full_response = ""
    print(f"\n--- LLM Streaming Extraction for {case.cnr_number} ---\n")
    for line in resp.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                data_str = line_str[6:]
                if data_str.strip() == '[DONE]':
                    break
                try:
                    data = _json.loads(data_str)
                    if 'choices' in data and len(data['choices']) > 0:
                        delta = data['choices'][0].get('delta', {})
                        content = delta.get('content', '')
                        if content:
                            print(content, end='', flush=True)
                            full_response += content
                except _json.JSONDecodeError:
                    continue
    print("\n\n--- Streaming Complete ---\n")

    raw = full_response.strip()
    if '```' in raw:
        # Handle cases where LLM wraps JSON in markdown fences
        parts = raw.split('```')
        for part in parts:
            part = part.strip()
            if part.startswith('json'):
                raw = part[4:].strip()
                break
            elif part.startswith('{'):
                raw = part.strip()
                break
    
    raw = raw.strip()

    try:
        result = _json.loads(raw)
        result.setdefault('search_summary',      None)
        result.setdefault('judge',               None)
        result.setdefault('assets',              [])
        result.setdefault('missing_advocates',   [])
        result.setdefault('party_addresses',     [])
        result.setdefault('party_additional_info', [])
        return result
    except _json.JSONDecodeError as e:
        logger.error(f'LLM returned invalid JSON for {case.cnr_number}: {e}')
        logger.debug(f'Raw output: {raw[:1000]}')
        raise


# ══════════════════════════════════════════════════════════════════════════
# Entity resolution — batch (primary)
# ══════════════════════════════════════════════════════════════════════════

@retry(wait=wait_exponential(min=2, max=60), stop=stop_after_attempt(5))
def run_batch_adjudicator(batch_payload: dict) -> dict:
    """
    Resolve multiple entities against graph candidates in one LLM call.
    batch_payload = {'entities_to_adjudicate': [...]}
    Returns {'resolutions': [...]}
    """
    logger.info("Starting run_batch_adjudicator")
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
    new_entity    : {'name': ..., 'entity_type': ..., 'context': ...}
    db_candidates : list of dicts from get_fuzzy_candidates()
    Returns {'match_confidence': 'EXACT'|'NONE', 'matched_uuid': str|None, 'reasoning': str}
    """
    logger.info(f"Starting run_llm_adjudicator for entity: {new_entity.get('name')}")
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
    entity_type: 'organization' | 'judge' | 'person' | 'lawyer' |
                 'respondent' | 'petitioner' | 'court'
    """
    logger.info(f"Starting get_fuzzy_candidates for name: {name}, type: {entity_type}")
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
                   coalesce(o.additional_info, '') AS info
            LIMIT 3""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'],
                                'type': r['type'], 'info': r['info']})

    elif entity_type == 'judge':
        rows = tx.run("""
            MATCH (p:Person)
            WHERE (p.name_norm CONTAINS $f OR $f CONTAINS p.name_norm)
              AND coalesce(p.is_judge, false) = true
            RETURN p.id AS id, p.name AS name,
                   coalesce(p.designation, '') AS designation
            LIMIT 3""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'],
                                'designation': r['designation']})

    elif entity_type in ('person', 'lawyer', 'respondent', 'petitioner'):
        rows = tx.run("""
            MATCH (p:Person)
            WHERE p.name_norm CONTAINS $f OR $f CONTAINS p.name_norm
            RETURN p.id AS id, p.name AS name,
                   coalesce(p.additional_info, '') AS info
            LIMIT 3""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'], 'info': r['info']})

    elif entity_type == 'court':
        rows = tx.run("""
            MATCH (c:Court)
            WHERE toLower(c.name) CONTAINS $f OR $f CONTAINS toLower(c.name)
            RETURN c.id AS id, c.name AS name,
                   coalesce(c.district, '') AS district,
                   coalesce(c.state, '') AS state
            LIMIT 3""", f=fragment)
        for r in rows:
            candidates.append({'id': r['id'], 'name': r['name'],
                                'district': r['district'], 'state': r['state']})

    return candidates
