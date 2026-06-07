from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from backend.database import get_db
import uuid
import re

from .schemas import LegalDiscoverySearchRequest, LegalDiscoverySearchResponse

router = APIRouter()

# In-memory store for search queries
search_sessions: Dict[str, LegalDiscoverySearchRequest] = {}

_NUM_RE = re.compile(r'^[\d\)]+\s*')


def _clean_name(raw: str) -> str:
    return _NUM_RE.sub('', raw).strip(' (')


def execute_search(request: LegalDiscoverySearchRequest, db, query_id: str):
    query = "MATCH (c:Case)\n"

    conditions = []
    params = {}

    # ── Case / CNR number ────────────────────────────────────────────────
    if request.fields.case_number:
        conditions.append(
            "(c.case_number CONTAINS $case_number OR c.cnr_number CONTAINS $case_number)"
        )
        params['case_number'] = request.fields.case_number

    if request.fields.cnr_number:
        conditions.append("c.cnr_number CONTAINS $cnr_number")
        params['cnr_number'] = request.fields.cnr_number

    # ── Party name / address ─────────────────────────────────────────────
    if getattr(request.fields, 'name', None) or getattr(request.fields, 'address', None):
        query += """MATCH (p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)
"""
        if getattr(request.fields, 'name', None):
            conditions.append("toLower(p.name) CONTAINS toLower($party_name)")
            params['party_name'] = request.fields.name
        if getattr(request.fields, 'address', None):
            conditions.append("toLower(p.address) CONTAINS toLower($party_address)")
            params['party_address'] = request.fields.address

    # ── Judge name ───────────────────────────────────────────────────────
    if getattr(request.fields, 'judge_name', None):
        query += "MATCH (c)-[:JUDGE_IN]-(j_search)\n"
        conditions.append("toLower(j_search.name) CONTAINS toLower($judge_name)")
        params['judge_name'] = request.fields.judge_name

    # ── Advocate name ────────────────────────────────────────────────────
    if getattr(request.fields, 'advocate_name', None):
        query += "MATCH (c)-[:ADVOCATE_FOR]-(adv_search)\n"
        conditions.append("toLower(adv_search.name) CONTAINS toLower($advocate_name)")
        params['advocate_name'] = request.fields.advocate_name

    # ── PAN number ───────────────────────────────────────────────────────
    if getattr(request.fields, 'pan_num', None):
        query += """MATCH (pan_p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)
"""
        conditions.append("toLower(pan_p.pan_number) CONTAINS toLower($pan_num)")
        params['pan_num'] = request.fields.pan_num
        if getattr(request.fields, 'case_type', None):
            conditions.append("toLower(c.case_type) CONTAINS toLower($pan_case_type)")
            params['pan_case_type'] = request.fields.case_type

    # ── Aadhaar number ───────────────────────────────────────────────────
    if getattr(request.fields, 'aadhaar_number', None):
        query += """MATCH (aad_p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)
"""
        # Strip spaces for comparison
        aadhaar_clean = request.fields.aadhaar_number.replace(' ', '').replace('-', '')
        conditions.append(
            "replace(replace(aad_p.aadhaar_number, ' ', ''), '-', '') CONTAINS $aadhaar_number"
        )
        params['aadhaar_number'] = aadhaar_clean
        if getattr(request.fields, 'case_type', None):
            conditions.append("toLower(c.case_type) CONTAINS toLower($aad_case_type)")
            params['aad_case_type'] = request.fields.case_type
        if getattr(request.fields, 'state', None):
            conditions.append("toLower(c.state) CONTAINS toLower($aad_state)")
            params['aad_state'] = request.fields.state

    # ── Section Wise ─────────────────────────────────────────────────────
    if getattr(request.fields, 'legal_section', None):
        query += "MATCH (c)-[:INVOKES]->(act_search:Act)\n"
        conditions.append(
            "toLower(act_search.name) CONTAINS toLower($legal_section) "
            "OR toLower(coalesce(act_search.section, '')) CONTAINS toLower($legal_section)"
        )
        params['legal_section'] = request.fields.legal_section
        if getattr(request.fields, 'state', None):
            conditions.append("toLower(c.state) CONTAINS toLower($section_state)")
            params['section_state'] = request.fields.state

    # ── Case Type ────────────────────────────────────────────────────────
    if getattr(request.fields, 'case_type', None) and not getattr(request.fields, 'pan_num', None) and not getattr(request.fields, 'aadhaar_number', None):
        conditions.append("toLower(c.case_type) CONTAINS toLower($case_type)")
        params['case_type'] = request.fields.case_type
        if getattr(request.fields, 'court_name', None):
            query += "MATCH (c)-[:HEARD_IN]->(ct_search:Court)\n"
            conditions.append("toLower(ct_search.name) CONTAINS toLower($ct_court_name)")
            params['ct_court_name'] = request.fields.court_name
        if getattr(request.fields, 'state', None):
            conditions.append("toLower(c.state) CONTAINS toLower($ct_state)")
            params['ct_state'] = request.fields.state
        if getattr(request.fields, 'filing_year', None):
            conditions.append("c.filing_year = $filing_year OR toString(c.filing_date) STARTS WITH $filing_year")
            params['filing_year'] = request.fields.filing_year

    # ── WHERE clause ─────────────────────────────────────────────────────
    if conditions:
        query += "WHERE " + " AND ".join(conditions) + "\n"

    # ── WITH collectors ──────────────────────────────────────────────────
    with_vars = ["c"]
    return_vars = ["c", "court", "judge"]

    if getattr(request.fields, 'name', None) or getattr(request.fields, 'address', None):
        with_vars.append("collect(DISTINCT p) AS matched_parties")
        return_vars.append("matched_parties")
    if getattr(request.fields, 'judge_name', None):
        with_vars.append("collect(DISTINCT j_search) AS matched_judges")
        return_vars.append("matched_judges")
    if getattr(request.fields, 'advocate_name', None):
        with_vars.append("collect(DISTINCT adv_search) AS matched_advocates")
        return_vars.append("matched_advocates")
    if getattr(request.fields, 'pan_num', None):
        with_vars.append("collect(DISTINCT pan_p) AS matched_pan_parties")
        return_vars.append("matched_pan_parties")
    if getattr(request.fields, 'aadhaar_number', None):
        with_vars.append("collect(DISTINCT aad_p) AS matched_aad_parties")
        return_vars.append("matched_aad_parties")
    if getattr(request.fields, 'legal_section', None):
        with_vars.append("collect(DISTINCT act_search) AS matched_acts")
        return_vars.append("matched_acts")

    if len(with_vars) > 1:
        query += "WITH " + ", ".join(with_vars) + "\n"
    else:
        query += "WITH c\n"

    query += """OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
OPTIONAL MATCH (c)-[:JUDGE_IN]-(judge)
"""
    query += "RETURN " + ", ".join(return_vars) + "\n"
    query += "SKIP $skip LIMIT $limit"

    skip = (request.page - 1) * request.page_size
    params['skip'] = skip
    params['limit'] = request.page_size

    try:
        results = db.run(query, **params).data()
    except Exception as e:
        print(f"Error querying Neo4j: {e}")
        results = []

    cases = []
    for r in results:
        c_node = r.get("c", {})
        if not c_node:
            continue

        court_node = r.get("court") or {}
        judge_node = r.get("judge") or {}

        case_name = c_node.get("case_name") or c_node.get("title") or ""
        raw_judge_name = judge_node.get("name", "Unknown Judge")
        clean_judge_name = _clean_name(raw_judge_name)

        case_summary_parts = []

        # Matched parties (name/address search)
        matched_parties = r.get("matched_parties", [])
        if matched_parties:
            names = sorted({_clean_name(dict(p).get("name", "")) for p in matched_parties if dict(p).get("name")})
            if names:
                case_summary_parts.append("Matched Party: " + ", ".join(names))

        # Matched judges
        matched_judges = r.get("matched_judges", [])
        if matched_judges:
            names = sorted({_clean_name(dict(j).get("name", "")) for j in matched_judges if dict(j).get("name")})
            if names:
                case_summary_parts.append("Matched Judge: " + ", ".join(names))

        # Matched advocates
        matched_advocates = r.get("matched_advocates", [])
        if matched_advocates:
            names = sorted({_clean_name(dict(a).get("name", "")) for a in matched_advocates if dict(a).get("name")})
            if names:
                case_summary_parts.append("Matched Advocate: " + ", ".join(names))

        # Matched PAN parties
        matched_pan_parties = r.get("matched_pan_parties", [])
        if matched_pan_parties:
            names = sorted({_clean_name(dict(p).get("name", "")) for p in matched_pan_parties if dict(p).get("name")})
            if names:
                case_summary_parts.append("Matched PAN Holder: " + ", ".join(names))

        # Matched Aadhaar parties
        matched_aad_parties = r.get("matched_aad_parties", [])
        if matched_aad_parties:
            names = sorted({_clean_name(dict(p).get("name", "")) for p in matched_aad_parties if dict(p).get("name")})
            if names:
                case_summary_parts.append("Matched Aadhaar Holder: " + ", ".join(names))

        # Matched acts (section wise)
        matched_acts = r.get("matched_acts", [])
        if matched_acts:
            act_labels = sorted({dict(a).get("name", "") for a in matched_acts if dict(a).get("name")})
            if act_labels:
                case_summary_parts.append("Matched Act/Section: " + ", ".join(act_labels))

        if getattr(request.fields, 'case_number', None):
            case_summary_parts.append(f"Matched Case No.: {request.fields.case_number}")
        if getattr(request.fields, 'cnr_number', None):
            case_summary_parts.append(f"Matched CNR: {request.fields.cnr_number}")
        if getattr(request.fields, 'pan_num', None):
            case_summary_parts.append(f"Matched PAN: {request.fields.pan_num}")
        if getattr(request.fields, 'aadhaar_number', None):
            case_summary_parts.append("Matched Aadhaar holder in case")
        if getattr(request.fields, 'legal_section', None):
            case_summary_parts.append(f"Matched Section: {request.fields.legal_section}")
        if getattr(request.fields, 'case_type', None):
            case_summary_parts.append(f"Case Type: {c_node.get('case_type', '')}")

        case_summary = (
            " | ".join(case_summary_parts)
            if case_summary_parts
            else (c_node.get("search_summary") or "Details available in the case profile.")
        )

        cases.append({
            "case_id":     c_node.get("cnr_number", c_node.get("case_number", "Unknown")),
            "case_name":   case_name,
            "case_number": c_node.get("case_number", "Unknown"),
            "cnr_number":  c_node.get("cnr_number", ""),
            "status":      "closed" if c_node.get("status", "").lower() == "disposed" else "active",
            "risk":        "Medium",
            "court": {
                "name":     court_node.get("name", "Unknown Court"),
                "court_id": court_node.get("court_code", "Unknown Court"),
            },
            "judge": {
                "name":     clean_judge_name,
                "judge_id": str(judge_node.get("id", "Unknown Judge")),
            },
            "location":     court_node.get("district", court_node.get("state", "Unknown Location")),
            "case_summary": case_summary,
        })

    # ── Count query ──────────────────────────────────────────────────────
    count_query = "MATCH (c:Case)\n"
    if getattr(request.fields, 'name', None) or getattr(request.fields, 'address', None):
        count_query += "MATCH (p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)\n"
    if getattr(request.fields, 'judge_name', None):
        count_query += "MATCH (c)-[:JUDGE_IN]-(j_search)\n"
    if getattr(request.fields, 'advocate_name', None):
        count_query += "MATCH (c)-[:ADVOCATE_FOR]-(adv_search)\n"
    if getattr(request.fields, 'pan_num', None):
        count_query += "MATCH (pan_p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)\n"
    if getattr(request.fields, 'aadhaar_number', None):
        count_query += "MATCH (aad_p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)\n"
    if getattr(request.fields, 'legal_section', None):
        count_query += "MATCH (c)-[:INVOKES]->(act_search:Act)\n"
    if getattr(request.fields, 'case_type', None) and not getattr(request.fields, 'pan_num', None) and not getattr(request.fields, 'aadhaar_number', None):
        if getattr(request.fields, 'court_name', None):
            count_query += "MATCH (c)-[:HEARD_IN]->(ct_search:Court)\n"

    if conditions:
        count_query += "WHERE " + " AND ".join(conditions) + "\n"
    count_query += "RETURN count(DISTINCT c) AS total"

    try:
        total_count = db.run(count_query, **params).single()["total"]
    except Exception:
        total_count = len(cases)

    search_query = {
        "type":    request.type,
        "fields":  request.fields.dict(),
        "filters": request.filters.dict() if request.filters else {},
    }

    return {
        "total":        total_count,
        "page":         request.page,
        "query_id":     query_id,
        "cases":        cases,
        "search_query": search_query,
    }


@router.post("/legal-discovery")
def search_legal_data(request: LegalDiscoverySearchRequest, db=Depends(get_db)):
    query_id = str(uuid.uuid4())
    search_sessions[query_id] = request
    return execute_search(request, db, query_id)


@router.get("/legal-discovery/{query_id}")
def get_search_results(query_id: str, page: int = 1, page_size: int = 10, db=Depends(get_db)):
    if query_id in search_sessions:
        request = search_sessions[query_id]
        request.page = page
        request.page_size = page_size
        return execute_search(request, db, query_id)

    return {
        "total":    0,
        "page":     page,
        "query_id": query_id,
        "cases":    [],
    }


@router.get("/options")
def get_search_options(db=Depends(get_db)):
    """Return distinct states, case types, courts, and act names from Neo4j."""
    try:
        states_raw = db.run(
            "MATCH (c:Case) WHERE c.state IS NOT NULL AND c.state <> '' "
            "RETURN DISTINCT c.state AS s ORDER BY s"
        ).data()
        states = [{"label": r["s"], "value": r["s"]} for r in states_raw]
    except Exception:
        states = []

    try:
        case_types_raw = db.run(
            "MATCH (c:Case) WHERE c.case_type IS NOT NULL AND c.case_type <> '' "
            "RETURN DISTINCT c.case_type AS t ORDER BY t"
        ).data()
        case_types = [{"label": r["t"], "value": r["t"]} for r in case_types_raw]
    except Exception:
        case_types = []

    try:
        courts_raw = db.run(
            "MATCH (ct:Court) WHERE ct.name IS NOT NULL AND ct.name <> '' "
            "RETURN DISTINCT ct.name AS n ORDER BY n"
        ).data()
        courts = [{"label": r["n"], "value": r["n"]} for r in courts_raw]
    except Exception:
        courts = []

    try:
        sections_raw = db.run(
            "MATCH (a:Act) WHERE a.name IS NOT NULL AND a.name <> '' "
            "RETURN DISTINCT a.name AS n ORDER BY n LIMIT 200"
        ).data()
        sections = [{"label": r["n"], "value": r["n"]} for r in sections_raw]
    except Exception:
        sections = []

    return {
        "STATES":    states,
        "CASE_TYPE": case_types,
        "COURTS":    courts,
        "SECTIONS":  sections,
    }


@router.get("/districts")
def get_districts(state: str, db=Depends(get_db)):
    """Return distinct districts for a given state from Neo4j."""
    try:
        rows = db.run(
            "MATCH (c:Case) WHERE toLower(c.state) CONTAINS toLower($state) "
            "AND c.district IS NOT NULL AND c.district <> '' "
            "RETURN DISTINCT c.district AS d ORDER BY d",
            state=state,
        ).data()
        districts = [{"label": r["d"], "value": r["d"]} for r in rows]
    except Exception:
        districts = []
    return {"DISTRICTS": districts}


@router.get("/state/district")
def get_state_district_by_pincode(pincode: str):
    """Placeholder — pincode lookup not yet implemented."""
    return {"state": "", "district": ""}
