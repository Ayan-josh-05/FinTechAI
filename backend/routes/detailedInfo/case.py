from fastapi import APIRouter, Depends, HTTPException
from neo4j import Session
from shared.database import get_db

router = APIRouter()

@router.get("/{case_id}")
def get_case_details(case_id: str, db: Session = Depends(get_db)):
    query = """
    MATCH (c:Case)
    WHERE c.cnr_number = $case_id OR c.case_number = $case_id
    
    OPTIONAL MATCH (p)-[r:COMPLAINANT_IN|DIRECTOR_DEFENDANT_IN|DIRECTOR_PETITIONER_IN|DIRECTOR_WITNESS_PETITIONER_IN|ESTABLISHMENT_IN|NGO_IN|PETITIONER_IN|RELATED_PERSON_IN|RESPONDENT_IN|SENIOR_MANAGER_WITNESS_DEFENDANT_IN|VICTIM_IN|WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN|WITNESS_IN]-(c)
    WITH c, collect(DISTINCT {node: p, role: type(r)}) AS involved_parties_raw
    
    OPTIONAL MATCH (l)-[:ADVOCATE_FOR]-(c)
    WITH c, involved_parties_raw, collect(DISTINCT l) AS lawyers
    
    OPTIONAL MATCH (j)-[:JUDGE_IN]-(c)
    WITH c, involved_parties_raw, lawyers, collect(DISTINCT j) AS judges
    
    OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
    WITH c, involved_parties_raw, lawyers, judges, court
    
    OPTIONAL MATCH (c)-[r_a:INVOKES]->(act:Act)
    WITH c, involved_parties_raw, lawyers, judges, court, collect(DISTINCT {act: act, invokes: r_a}) AS acts
    
    OPTIONAL MATCH (c)-[:HAS_DOCUMENT]->(d:Document)
    WITH c, involved_parties_raw, lawyers, judges, court, acts, collect(DISTINCT d) AS documents
    
    OPTIONAL MATCH (c)-[:HAS_HEARING|HAS_LOG]->(h)
    WITH c, involved_parties_raw, lawyers, judges, court, acts, documents, collect(DISTINCT h) AS hearings
    
    OPTIONAL MATCH (c)-[:HAS_ASSET]->(a)
    WITH c, involved_parties_raw, lawyers, judges, court, acts, documents, hearings, collect(DISTINCT a) AS assets
    
    RETURN c, involved_parties_raw, lawyers, judges, court, acts, documents, hearings, assets
    LIMIT 1
    """
    
    result = db.run(query, case_id=case_id).single()
        
    if not result:
        raise HTTPException(status_code=404, detail="Case not found")
        
    c = dict(result["c"])
    
    import re
    
    involved_parties = []
    for p in result["involved_parties_raw"]:
        node = p["node"]
        if not node: continue
        node_dict = dict(node)
        labels = list(node.labels)
        party_type = "Company" if "Organization" in labels else "Individual"
        
        raw_role = p["role"]
        readable_role = raw_role.replace("_IN", "").replace("_", " ").title()
        
        raw_name = node_dict.get("name", "Unknown")
        # Strip prefixes like "1) ", "2) ", "10) "
        clean_name = re.sub(r'^\d+\)\s*', '', raw_name)
        
        raw_address = ""
        if party_type == "Company":
            raw_address = node_dict.get("registered_office_address") or node_dict.get("branch_office_address") or node_dict.get("address", "")
        else:
            raw_address = node_dict.get("address", "")
            
        clean_address = re.sub(r'^\d+\)\s*', '', raw_address)
        
        involved_parties.append({
            "type": party_type,
            "name": clean_name,
            "role": readable_role,
            "entity_id": node_dict.get("pan") or node_dict.get("cin") or "",
            "identificationNumber": [{"type": "PAN", "value": node_dict.get("pan")}] if node_dict.get("pan") else [],
            "address": clean_address,
            "contactInfo": {},
            "statusBadge": [{"type": "default", "text": "Active"}]
        })
        
    involved_lawyers = []
    for l in result["lawyers"]:
        if not l: continue
        ld = dict(l)
        raw_name = ld.get("name", "Unknown")
        clean_name = re.sub(r'^\d+\)\s*', '', raw_name)
        # Sometime lawyers have "Advocate - Name". Let's try to extract just name if possible, or leave it.
        # It's better to just leave "Advocate - " because they might want to know it's an advocate entry.
        
        involved_lawyers.append({
            "name": clean_name,
            "lawyer_id": str(l.element_id),
            "bar_number": ld.get("bar_number", ""),
            "specialization": ld.get("specialization", "")
        })
        
    legal_sections = {}
    for a_data in result["acts"]:
        act = a_data["act"]
        rel = a_data["invokes"]
        if not act: continue
        act_name = dict(act).get("name", "Unknown Act")
        sections = dict(rel).get("section", "")
        legal_sections[act_name] = [s.strip() for s in sections.split(",")] if sections else []
        
    judges_list = []
    for j in result["judges"]:
        if not j: continue
        jd = dict(j)
        judges_list.append({
            "name": jd.get("name", "Unknown"),
            "judge_id": str(j.element_id)
        })
        
    court_node = result["court"]
    if court_node:
        cd = dict(court_node)
        court_data = {
            "name": cd.get("name", "Unknown Court"),
            "court_id": cd.get("court_code") or str(court_node.element_id),
            "location": cd.get("location") or cd.get("district", ""),
            "room": "",
            "judge": judges_list,
            "jurisdiction": ""
        }
    else:
        court_data = {
            "name": "Unknown",
            "court_id": "",
            "location": "",
            "judge": judges_list
        }
        
    docs = []
    for d in result["documents"]:
        if not d: continue
        dd = dict(d)
        docs.append({
            "id": str(d.element_id),
            "name": dd.get("order_type", "Document") + " " + dd.get("order_date", ""),
            "size": "Unknown",
            "type": "PDF",
            "url": dd.get("storage_id", "")
        })
        
    timeline = []
    for h in result["hearings"]:
        if not h: continue
        hd = dict(h)
        timeline.append({
            "title": hd.get("purpose") or "Hearing / Log",
            "description": hd.get("business_notes") or hd.get("remarks", ""),
            "date": hd.get("date", ""),
            "status": "completed" if hd.get("nature_of_disposal") else "upcoming"
        })
        
    timeline.sort(key=lambda x: x["date"] or "", reverse=True)
    
    # Process assets into a financial summary block
    financial_summary_parts = []
    if c.get("alleged_amount"):
        financial_summary_parts.append(f"Alleged Amount: {c.get('alleged_amount')}")
        
    for a in result.get("assets", []):
        if not a: continue
        ad = dict(a)
        asset_info = f"{ad.get('type', 'Asset')} - Value: {ad.get('value', 'Unknown')}"
        financial_summary_parts.append(asset_info)
        
    financial_summary = " | ".join(financial_summary_parts) if financial_summary_parts else None
        
    response = {
        "id": case_id,
        "title": c.get("title") or c.get("case_number", "Unknown Case"),
        "caseNumber": c.get("case_number", ""),
        "cnrNumber": c.get("cnr_number", ""),
        "filingDate": c.get("filing_date", ""),
        "riskScore": "Medium",
        "status": [{"text": c.get("status", "Pending"), "type": "warning" if c.get("status", "").lower() == "pending" else "success"}],
        "summary": {
            "description": c.get("search_summary", "No summary available"),
            "allegedAmount": str(c.get("alleged_amount", "")) if c.get("alleged_amount") else "",
            "casePeriod": "",
            "keyIssues": []
        },
        "involvedParties": involved_parties,
        "involveLawyers": involved_lawyers,
        "timeline": timeline,
        "documents": docs,
        "legalSections": legal_sections,
        "court": court_data,
        "currentStatus": {
            "stage": c.get("stage", ""),
            "nextAction": "",
            "expectedDuration": "",
            "nextHearingDate": c.get("next_hearing_date", "")
        },
        "financialSummary": financial_summary
    }
    
    return response
