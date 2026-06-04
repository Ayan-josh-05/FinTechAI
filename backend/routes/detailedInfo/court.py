from fastapi import APIRouter, Depends, HTTPException
from neo4j import Session
from shared.database import get_db

router = APIRouter()

@router.get("/{court_id}")
def get_court_details(court_id: str, db: Session = Depends(get_db)):
    query = """
    MATCH (court:Court)
    WHERE court.court_code = $court_id OR court.name = $court_id OR toString(id(court)) = $court_id
    
    OPTIONAL MATCH (c:Case)-[:HEARD_IN]->(court)
    WITH court, collect(c) AS cases
    
    OPTIONAL MATCH (c:Case)-[:HEARD_IN]->(court)
    OPTIONAL MATCH (j:Judge)-[:JUDGE_IN]->(c)
    WITH court, cases, collect(DISTINCT j) AS judges
    
    RETURN court, cases, judges
    """
    
    result = db.run(query, court_id=court_id).single()
    if not result or not result["court"]:
        raise HTTPException(status_code=404, detail="Court not found")
        
    court = dict(result["court"])
    
    cases = [dict(c) for c in result["cases"] if c]
    total_cases = len(cases)
    
    open_cases = sum(1 for c in cases if c.get("status", "").lower() == "pending")
    closed_cases = total_cases - open_cases
    
    # Calculate case types
    type_counts = {}
    for c in cases:
        t = c.get("case_type", "Other")
        type_counts[t] = type_counts.get(t, 0) + 1
        
    case_types_res = [{"label": k, "value": v} for k, v in type_counts.items()]
    
    case_status_data = [
        {"label": "Pending", "value": open_cases, "color": "#f59e0b", "percentage": (open_cases/total_cases*100) if total_cases else 0},
        {"label": "Disposed", "value": closed_cases, "color": "#10b981", "percentage": (closed_cases/total_cases*100) if total_cases else 0}
    ]
    
    judges_res = []
    for j in result["judges"]:
        if not j: continue
        jd = dict(j)
        judges_res.append({
            "name": jd.get("name", "Unknown"),
            "position": jd.get("designation", "Judge"),
            "experience": "Unknown",
            "specialization": "General",
            "activeCases": 0,
            "courtRoom": "",
            "status": [{"text": jd.get("status", "Active"), "type": "success"}]
        })
        
    response = {
        "courtInfo": {
            "code": court.get("court_code", court_id),
            "established": "Unknown",
            "jurisdiction": court.get("jurisdiction", "General"),
            "courtBadges": [{"text": court.get("court_type", "Court"), "type": "info"}]
        },
        "statistics": {
            "totalCases": total_cases,
            "openCases": open_cases,
            "closedCases": closed_cases
        },
        "overview": court.get("court_overview", "No overview available."),
        "location": {
            "name": court.get("location", court.get("district", "Unknown Location")),
            "address": [court.get("address", "")]
        },
        "judges": judges_res,
        "caseStatusData": case_status_data,
        "caseTypes": case_types_res
    }
    
    return response
