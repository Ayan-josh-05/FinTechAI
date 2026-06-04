from fastapi import APIRouter, HTTPException, Depends
from typing import Dict
from shared.database import get_db
import uuid

from .schemas import LegalDiscoverySearchRequest, LegalDiscoverySearchResponse

router = APIRouter()

# In-memory store for search queries (temporary solution for UI flow)
search_sessions: Dict[str, LegalDiscoverySearchRequest] = {}

def execute_search(request: LegalDiscoverySearchRequest, db, query_id: str):
    query = """
    MATCH (c:Case)
    """
    
    conditions = []
    params = {}
    
    if request.fields.case_number:
        conditions.append("(c.case_number CONTAINS $case_number OR c.cnr_number CONTAINS $case_number)")
        params['case_number'] = request.fields.case_number

    if request.fields.cnr_number:
        conditions.append("c.cnr_number CONTAINS $cnr_number")
        params['cnr_number'] = request.fields.cnr_number
        
    if getattr(request.fields, "name", None) or getattr(request.fields, "address", None):
        query += """
    MATCH (p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)
        """
        if getattr(request.fields, "name", None):
            conditions.append("toLower(p.name) CONTAINS toLower($party_name)")
            params['party_name'] = request.fields.name
        if getattr(request.fields, "address", None):
            conditions.append("toLower(p.address) CONTAINS toLower($party_address)")
            params['party_address'] = request.fields.address
            
    if getattr(request.fields, "judge_name", None):
        query += """
    MATCH (c)-[:JUDGE_IN]-(j_search)
        """
        conditions.append("toLower(j_search.name) CONTAINS toLower($judge_name)")
        params['judge_name'] = request.fields.judge_name
        
    if getattr(request.fields, "advocate_name", None):
        query += """
    MATCH (c)-[:ADVOCATE_FOR]-(adv_search)
        """
        conditions.append("toLower(adv_search.name) CONTAINS toLower($advocate_name)")
        params['advocate_name'] = request.fields.advocate_name
            
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    with_vars = ["c"]
    return_vars = ["c", "court", "judge"]
    
    if getattr(request.fields, "name", None) or getattr(request.fields, "address", None):
        with_vars.append("collect(DISTINCT p) AS matched_parties")
        return_vars.append("matched_parties")
    if getattr(request.fields, "judge_name", None):
        with_vars.append("collect(DISTINCT j_search) AS matched_judges")
        return_vars.append("matched_judges")
    if getattr(request.fields, "advocate_name", None):
        with_vars.append("collect(DISTINCT adv_search) AS matched_advocates")
        return_vars.append("matched_advocates")

    if len(with_vars) > 1:
        query += "\n    WITH " + ", ".join(with_vars)
    else:
        query += "\n    WITH c"
        
    query += """
    OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
    OPTIONAL MATCH (c)-[:JUDGE_IN]-(judge)
    """
    
    query += f"\n    RETURN {', '.join(return_vars)}"
    query += "\n    SKIP $skip LIMIT $limit"
    
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
        if not c_node: continue
        
        court_node = r.get("court") or {}
        judge_node = r.get("judge") or {}
        
        import re
        
        # If case doesn't have a title, we don't really have a name. We can just leave it blank to avoid 'Unknown Case' UI clutter,
        # or use "Vs." if we had parties. For now, empty string is better than "Unknown Case" which looks like an error.
        case_name = c_node.get("case_name") or c_node.get("title") or ""
        
        raw_judge_name = judge_node.get("name", "Unknown Judge")
        clean_judge_name = re.sub(r'^[\d\)]+\s*', '', raw_judge_name).strip(" (")
        
        case_summary_parts = []
        
        # Parse matched parties
        matched_parties = r.get("matched_parties", [])
        if matched_parties:
            names = [re.sub(r'^[\d\)]+\s*', '', dict(p).get("name", "")).strip(" (") for p in matched_parties if dict(p).get("name")]
            if names:
                names = sorted(list(set(names)))
                case_summary_parts.append("Matched Party: " + ", ".join(names))
                
        # Parse matched judges
        matched_judges = r.get("matched_judges", [])
        if matched_judges:
            names = [re.sub(r'^[\d\)]+\s*', '', dict(j).get("name", "")).strip(" (") for j in matched_judges if dict(j).get("name")]
            if names:
                names = sorted(list(set(names)))
                case_summary_parts.append("Matched Judge: " + ", ".join(names))
                
        # Parse matched advocates
        matched_advocates = r.get("matched_advocates", [])
        if matched_advocates:
            names = [re.sub(r'^[\d\)]+\s*', '', dict(a).get("name", "")).strip(" (") for a in matched_advocates if dict(a).get("name")]
            if names:
                names = sorted(list(set(names)))
                case_summary_parts.append("Matched Advocate: " + ", ".join(names))
                
        if getattr(request.fields, "case_number", None):
            case_summary_parts.append(f"Matched Case No.: {request.fields.case_number}")
        if getattr(request.fields, "cnr_number", None):
            case_summary_parts.append(f"Matched CNR: {request.fields.cnr_number}")
            
        if case_summary_parts:
            case_summary = " | ".join(case_summary_parts)
        else:
            case_summary = c_node.get("search_summary") or "Details available in the case profile."
        
        cases.append({
            "case_id": c_node.get("cnr_number", c_node.get("case_number", "Unknown")),
            "case_name": case_name,
            "case_number": c_node.get("case_number", "Unknown"),
            "cnr_number": c_node.get("cnr_number", ""),
            "status": "closed" if c_node.get("status", "").lower() == "disposed" else "active",
            "risk": "Medium",
            "court": {
                "name": court_node.get("name", "Unknown Court"),
                "court_id": court_node.get("court_code", "Unknown Court")
            },
            "judge": {
                "name": clean_judge_name,
                "judge_id": str(judge_node.get("id", "Unknown Judge"))
            },
            "location": court_node.get("district", court_node.get("state", "Unknown Location")),
            "case_summary": case_summary
        })
        
    # Build count query similarly
    count_query = "MATCH (c:Case)"
    if getattr(request.fields, "name", None) or getattr(request.fields, "address", None):
        count_query += "\nMATCH (p)-[:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)"
    
    if getattr(request.fields, "judge_name", None):
        count_query += "\nMATCH (c)-[:JUDGE_IN]-(j_search)"
        
    if getattr(request.fields, "advocate_name", None):
        count_query += "\nMATCH (c)-[:ADVOCATE_FOR]-(adv_search)"
        
    if conditions:
        count_query += " WHERE " + " AND ".join(conditions)
        
    count_query += " RETURN count(c) as total"
    
    try:
        total_count = db.run(count_query, **params).single()["total"]
    except Exception:
        total_count = len(cases)
        
    search_query = {
        "type": request.type,
        "fields": request.fields.dict(),
        "filters": request.filters.dict() if request.filters else {}
    }
        
    return {
        "total": total_count,
        "page": request.page,
        "query_id": query_id,
        "cases": cases,
        "search_query": search_query
    }

@router.post("/legal-discovery")
def search_legal_data(request: LegalDiscoverySearchRequest, db = Depends(get_db)):
    query_id = str(uuid.uuid4())
    search_sessions[query_id] = request
    return execute_search(request, db, query_id)

@router.get("/legal-discovery/{query_id}")
def get_search_results(query_id: str, page: int = 1, page_size: int = 10, db = Depends(get_db)):
    if query_id in search_sessions:
        request = search_sessions[query_id]
        request.page = page
        request.page_size = page_size
        return execute_search(request, db, query_id)
    
    return {
        "total": 0,
        "page": page,
        "query_id": query_id,
        "cases": []
    }

@router.get("/options")
def get_search_options():
    return {
        "STATES": [{"label": "Maharashtra", "value": "MH"}],
        "CASE_TYPE": [{"label": "Criminal Case", "value": "CC"}],
        "COURTS": [{"label": "CMM COURT, ESPLANADE COURT, MUMBAI", "value": "CMM COURT, ESPLANADE COURT, MUMBAI"}],
        "SECTIONS": [{"label": "Section 138", "value": "138"}]
    }

