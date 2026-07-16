"""
Labels/graph_inserts.py
All Neo4j write helpers for the pipeline.

Key design decisions:
  - No JSONB anywhere — model_fields dicts become flat node properties
    via _set_flat_props().
  - Asset attributes dict → individual properties on the Asset node.
  - ADDRESS is stored as flat properties on Person / Organization nodes
    (NOT on the PETITIONER_IN / RESPONDENT_IN relationship):
      address_raw, address_house_no, address_street, address_locality,
      address_city, address_district, address_state, address_pincode,
      address_type, address_source, address_confidence
  - Address merge uses COALESCE — existing data is never overwritten by a
    weaker source. Priority: json (high) > pdf_llm (medium) > pdf_regex (low).
  - ExtractionLog.missing_data_reasons kept as a JSON string because
    the structure is genuinely variable.
"""
import uuid
import json as _json
import logging
from datetime import datetime

from Extraction.utils.helpers import normalize_name, org_type, clean_rel_type

logger = logging.getLogger('pipeline')


# ══════════════════════════════════════════════════════════════════════════
# Internal helpers
# ══════════════════════════════════════════════════════════════════════════

def _set_flat_props(tx, node_id: str, label: str, props: dict) -> None:
    """
    Set arbitrary flat properties on a node.
    props = {'age': 45, 'occupation': 'Director', ...}
    Skips None values — only sets what we actually have.
    Serializes dicts/lists to JSON strings as Neo4j requires flat primitives.
    Keys must come from our own code (no user-supplied keys) — safe for
    dynamic Cypher construction.
    """
    if not props:
        return
        
    clean = {}
    for k, v in props.items():
        if v is None:
            continue
        if isinstance(v, (dict, list)):
            clean[k] = _json.dumps(v, ensure_ascii=False)
        else:
            clean[k] = v
            
    if not clean:
        return
    set_clause = ', '.join(f'n.{k} = ${k}' for k in clean)
    tx.run(
        f'MATCH (n:{label} {{id: $nid}}) SET {set_clause}',
        nid=node_id, **clean,
    )


# ══════════════════════════════════════════════════════════════════════════
# Address helpers
# ══════════════════════════════════════════════════════════════════════════

# Confidence rank — higher number = stronger source; COALESCE only fills nulls,
# so we use a separate guard to prevent a weaker source overwriting a stronger one.
_ADDR_CONFIDENCE_RANK = {'high': 3, 'medium': 2, 'low': 1}


def _write_address(tx, node_id: str, label: str, addr: dict) -> None:
    """
    Write structured address fields onto a Person or Organization node.

    Uses COALESCE so an existing value is NEVER overwritten — only null fields
    get filled. The one exception: if the incoming source is strictly stronger
    than what's on the node (json > pdf_llm > pdf_regex), we allow a full
    overwrite so a high-quality JSON address can replace a previously stored
    low-quality PDF guess.
    """
    if not addr:
        return

    # Determine incoming confidence rank (default to lowest)
    incoming_rank = _ADDR_CONFIDENCE_RANK.get(addr.get('address_confidence', 'low'), 1)

    # Read current confidence on the node to decide merge strategy
    row = tx.run(
        f"MATCH (n:{label} {{id: $nid}}) RETURN n.address_confidence AS conf",
        nid=node_id,
    ).single()
    existing_conf  = row['conf'] if row else None
    existing_rank  = _ADDR_CONFIDENCE_RANK.get(existing_conf, 0) if existing_conf else 0

    if incoming_rank > existing_rank:
        # Stronger source — overwrite all address fields
        tx.run(
            f"""MATCH (n:{label} {{id: $nid}})
            SET n.address_raw        = $raw,
                n.address_house_no   = $house_no,
                n.address_street     = $street,
                n.address_locality   = $locality,
                n.address_city       = $city,
                n.address_district   = $district,
                n.address_state      = $state,
                n.address_pincode    = $pincode,
                n.address_type       = $atype,
                n.address_source     = $source,
                n.address_confidence = $confidence,
                n.updated_at         = datetime()""",
            nid=node_id,
            raw=addr.get('raw'),
            house_no=addr.get('house_no'),
            street=addr.get('street'),
            locality=addr.get('locality'),
            city=addr.get('city'),
            district=addr.get('district'),
            state=addr.get('state'),
            pincode=addr.get('pincode'),
            atype=addr.get('address_type'),
            source=addr.get('address_source', 'unknown'),
            confidence=addr.get('address_confidence', 'low'),
        )
    else:
        # Same or weaker source — fill only null fields (COALESCE)
        tx.run(
            f"""MATCH (n:{label} {{id: $nid}})
            SET n.address_raw        = COALESCE(n.address_raw,        $raw),
                n.address_house_no   = COALESCE(n.address_house_no,   $house_no),
                n.address_street     = COALESCE(n.address_street,     $street),
                n.address_locality   = COALESCE(n.address_locality,   $locality),
                n.address_city       = COALESCE(n.address_city,       $city),
                n.address_district   = COALESCE(n.address_district,   $district),
                n.address_state      = COALESCE(n.address_state,      $state),
                n.address_pincode    = COALESCE(n.address_pincode,    $pincode),
                n.address_type       = COALESCE(n.address_type,       $atype),
                n.address_source     = COALESCE(n.address_source,     $source),
                n.address_confidence = COALESCE(n.address_confidence, $confidence),
                n.updated_at         = datetime()""",
            nid=node_id,
            raw=addr.get('raw'),
            house_no=addr.get('house_no'),
            street=addr.get('street'),
            locality=addr.get('locality'),
            city=addr.get('city'),
            district=addr.get('district'),
            state=addr.get('state'),
            pincode=addr.get('pincode'),
            atype=addr.get('address_type'),
            source=addr.get('address_source', 'unknown'),
            confidence=addr.get('address_confidence', 'low'),
        )


# ══════════════════════════════════════════════════════════════════════════
# 1. Act
# ══════════════════════════════════════════════════════════════════════════

def upsert_act(tx, name: str) -> str | None:
    norm = normalize_name(name)
    if not norm:
        return None
    r = tx.run("""
        MERGE (a:Act {name_norm: $norm})
        ON CREATE SET a.id = $id, a.name = $name, a.created_at = datetime()
        ON MATCH  SET a.name = CASE WHEN size($name) > size(a.name)
                                    THEN $name ELSE a.name END
        RETURN a.id AS id""",
        norm=norm, name=name, id=str(uuid.uuid4()))
    return r.single()['id']


# ══════════════════════════════════════════════════════════════════════════
# 2. Court
# ══════════════════════════════════════════════════════════════════════════

def upsert_court(tx, case) -> str | None:
    if not case.court_name:
        return None
    r = tx.run("""
        MERGE (c:Court {name: $name})
        ON CREATE SET c.id = $id, c.court_type = $ct, c.court_code = $cc,
                      c.district = $dist, c.state = $state,
                      c.created_at = datetime()
        ON MATCH  SET c.court_code = $cc, c.updated_at = datetime()
        RETURN c.id AS id""",
        name=case.court_name, id=str(uuid.uuid4()), ct=case.court_type,
        cc=case.court_number, dist=case.district, state=case.state)
    return r.single()['id']


# ══════════════════════════════════════════════════════════════════════════
# 3. Person
# model_fields dict keys → direct node properties
# address is stored as p.address on the Person node (NOT on the relationship)
# ══════════════════════════════════════════════════════════════════════════

def insert_person(
    tx,
    name: str,
    name_source: str = 'json',
    model_fields: dict | None = None,
    resolved_uuid: str = None,
    address: dict | None = None,
) -> str:
    norm = normalize_name(name)
    if not norm:
        return str(uuid.uuid4())

    if resolved_uuid:
        _set_flat_props(tx, resolved_uuid, 'Person', model_fields)
        if address:
            _write_address(tx, resolved_uuid, 'Person', address)
        else:
            tx.run("MATCH (p:Person {id: $id}) SET p.updated_at = datetime()", id=resolved_uuid)
        return resolved_uuid

    r = tx.run("""
        MERGE (p:Person {name_norm: $norm})
        ON CREATE SET p.id = $id, p.name = $name, p.name_source = $src,
                      p.is_judge = false, p.created_at = datetime()
        ON MATCH  SET p.updated_at = datetime()
        RETURN p.id AS id""",
        norm=norm, id=str(uuid.uuid4()), name=name, src=name_source)
    pid = r.single()['id']

    _set_flat_props(tx, pid, 'Person', model_fields)
    if address:
        _write_address(tx, pid, 'Person', address)
    return pid


# ══════════════════════════════════════════════════════════════════════════
# 4. Organization
# model_fields dict keys → direct node properties
# address is stored as o.address on the Organization node (NOT on the relationship)
# ══════════════════════════════════════════════════════════════════════════

def upsert_organization(
    tx,
    name: str,
    model_fields: dict | None = None,
    resolved_uuid: str = None,
    address: dict | None = None,
) -> str | None:
    norm = normalize_name(name)
    if not norm:
        return None

    if resolved_uuid:
        _set_flat_props(tx, resolved_uuid, 'Organization', model_fields)
        if address:
            _write_address(tx, resolved_uuid, 'Organization', address)
        else:
            tx.run("MATCH (o:Organization {id: $id}) SET o.updated_at = datetime()", id=resolved_uuid)
        return resolved_uuid

    r = tx.run("""
        MERGE (o:Organization {name_norm: $norm})
        ON CREATE SET o.id = $id, o.name = $name,
                      o.organization_type = $otype,
                      o.created_at = datetime()
        ON MATCH  SET o.updated_at = datetime()
        RETURN o.id AS id""",
        norm=norm, id=str(uuid.uuid4()), name=name, otype=org_type(name))
    oid = r.single()['id']

    _set_flat_props(tx, oid, 'Organization', model_fields)
    if address:
        _write_address(tx, oid, 'Organization', address)
    return oid


# ══════════════════════════════════════════════════════════════════════════
# 5. Judge  (always a Person node — is_judge = true)
# ══════════════════════════════════════════════════════════════════════════

def upsert_judge(
    tx,
    name: str,
    designation=None,
    uid_number=None,
    court=None,
    model_fields: dict | None = None,
    resolved_uuid: str = None,
) -> str:
    norm = normalize_name(name) if name else None

    if resolved_uuid:
        tx.run("""MATCH (p:Person {id: $id})
                   SET p.is_judge      = true,
                       p.designation   = COALESCE($desig, p.designation),
                       p.current_court = COALESCE($court, p.current_court),
                       p.updated_at    = datetime()""",
               id=resolved_uuid, desig=designation, court=court)
        _set_flat_props(tx, resolved_uuid, 'Person', model_fields)
        return resolved_uuid

    if uid_number:
        row = tx.run(
            "MATCH (p:Person {uid_number: $uid}) RETURN p.id AS id LIMIT 1",
            uid=uid_number,
        ).single()
        if row:
            tx.run("""MATCH (p:Person {id: $id})
                       SET p.designation   = COALESCE($desig, p.designation),
                           p.current_court = COALESCE($court, p.current_court),
                           p.updated_at    = datetime()""",
                   id=row['id'], desig=designation, court=court)
            _set_flat_props(tx, row['id'], 'Person', model_fields)
            return row['id']

    # Soft-insert guard: prevent false merges for common short judge names
    # (e.g. "R. Sharma" at Delhi HC vs "R. Sharma" at Bombay HC).
    # If existing judge nodes with this name_norm all have a *known* different
    # court, CREATE a new node rather than MERGEing into the wrong one.
    # We only bypass MERGE when there is positive evidence of a conflict —
    # if court is unknown, or any existing node lacks a court, we fall through
    # to the normal MERGE so we don't create spurious duplicates.
    if norm and court:
        existing_rows = tx.run(
            """MATCH (p:Person {name_norm: $norm, is_judge: true})
               RETURN p.id AS id, p.current_court AS current_court""",
            norm=norm,
        ).data()
        if existing_rows:
            known_courts = [r['current_court'] for r in existing_rows if r['current_court']]
            # Only force CREATE when ALL existing nodes have a different known court
            if known_courts and len(known_courts) == len(existing_rows) and all(c != court for c in known_courts):
                new_id = str(uuid.uuid4())
                tx.run("""
                    CREATE (p:Person {
                        id: $id, name: $name, name_norm: $norm,
                        name_source: 'pdf', is_judge: true,
                        designation: $desig, uid_number: $uid,
                        current_court: $court, created_at: datetime()
                    })""",
                    id=new_id, name=name, norm=norm,
                    desig=designation, uid=uid_number, court=court)
                logger.debug(
                    f"Soft-insert: created new judge node for {name!r} at {court!r} "
                    f"(existing nodes have different courts: {known_courts})"
                )
                _set_flat_props(tx, new_id, 'Person', model_fields)
                return new_id

    r = tx.run("""
        MERGE (p:Person {name_norm: $norm})
        ON CREATE SET p.id = $id, p.name = $name, p.name_source = 'pdf',
                      p.is_judge = true, p.designation = $desig,
                      p.uid_number = $uid, p.current_court = $court,
                      p.created_at = datetime()
        ON MATCH  SET p.is_judge      = true,
                      p.designation   = COALESCE($desig,  p.designation),
                      p.uid_number    = COALESCE($uid,    p.uid_number),
                      p.current_court = COALESCE($court,  p.current_court),
                      p.updated_at    = datetime()
        RETURN p.id AS id""",
        norm=norm, id=str(uuid.uuid4()), name=name,
        desig=designation, uid=uid_number, court=court)
    jid = r.single()['id']
    _set_flat_props(tx, jid, 'Person', model_fields)
    return jid


# ══════════════════════════════════════════════════════════════════════════
# 6. Case
# ══════════════════════════════════════════════════════════════════════════

def upsert_case(tx, case, court_id: str | None, outer: dict, summary=None, case_updates=None) -> str:
    r = tx.run("""
        MERGE (c:Case {cnr_number: $cnr})
        ON CREATE SET
            c.id = $id, c.case_number = $case_number,
            c.filing_number = $filing_number,
            c.registration_number = $reg_num,
            c.case_type = $case_type,
            c.status = $status, c.stage = $stage,
            c.district = $district, c.state = $state,
            c.filing_date = $filing_date,
            c.registration_date = $registration_date,
            c.first_hearing_date = $first_hearing_date,
            c.last_hearing_date = $last_hearing_date,
            c.next_hearing_date = $next_hearing_date,
            c.decision_date = $decision_date,
            c.disposal_date = $disposal_date,
            c.filing_year = $filing_year,
            c.type_of_disposal = $type_of_disposal,
            c.in_favour_of = $in_favour_of,
            c.search_summary = $summary,
            c.created_at = datetime()
        ON MATCH SET
            c.status = $status,
            c.last_hearing_date = $last_hearing_date,
            c.decision_date = $decision_date,
            c.search_summary = CASE WHEN $summary IS NOT NULL
                             THEN $summary ELSE c.search_summary END,
            c.updated_at = datetime()
        RETURN c.id AS id""",
        cnr=case.cnr_number, id=str(uuid.uuid4()),
        case_number=case.case_number,
        filing_number=case.filing_number, reg_num=case.registration_number,
        case_type=case.case_type,
        status=case.case_status, stage=case.case_stage,
        district=case.district, state=case.state,
        filing_date=str(case.filing_date) if case.filing_date else None,
        registration_date=str(case.registration_date) if case.registration_date else None,
        first_hearing_date=str(case.first_hearing_date) if case.first_hearing_date else None,
        last_hearing_date=str(case.last_hearing_date) if case.last_hearing_date else None,
        next_hearing_date=str(case.next_hearing_date) if case.next_hearing_date else None,
        decision_date=str(case.decision_date) if case.decision_date else None,
        disposal_date=str(case.disposal_date) if case.disposal_date else None,
        filing_year=case.filing_year,
        type_of_disposal=case.type_of_disposal,
        in_favour_of=case.in_favour_of,
        summary=summary,
    )
    case_id = r.single()['id']
    
    if court_id:
        tx.run("""
            MATCH (c:Case {id: $cid})
            WITH c
            MATCH (ct:Court {id: $ctid})
            MERGE (c)-[:HEARD_IN]->(ct)""",
            cid=case_id, ctid=court_id)
            
    if case_updates:
        _set_flat_props(tx, case_id, 'Case', case_updates)
        
    return case_id


# ══════════════════════════════════════════════════════════════════════════
# 7. Case parties (petitioners + respondents)
# ══════════════════════════════════════════════════════════════════════════

def insert_case_parties(
    tx,
    case_id: str,
    persons,
    person_id_map: dict,
) -> dict:
    """
    Link petitioners / respondents to the Case node.
    Returns party_id_map: {'petitioner::NAME': party_uuid, ...}
    """
    party_id_map: dict = {}

    for p in persons:
        if p.role not in ('petitioner', 'respondent'):
            continue
        entity_id = person_id_map.get(f'{p.role}::{p.name}')
        if not entity_id:
            continue

        rel        = clean_rel_type(p.role)
        label      = 'Organization' if p.is_org else 'Person'
        party_uuid = str(uuid.uuid4())

        tx.run(f"""
            MATCH (e:{label} {{id: $eid}})
            WITH e
            MATCH (c:Case {{id: $cid}})
            MERGE (e)-[r:{rel}]->(c)""",
            eid=entity_id, cid=case_id)

        party_id_map[f'{p.role}::{p.name}'] = party_uuid

    return party_id_map


# ══════════════════════════════════════════════════════════════════════════
# 8. Case lawyers (advocates)
# ══════════════════════════════════════════════════════════════════════════

def insert_case_lawyers(
    tx,
    case_id: str,
    persons,
    person_id_map: dict,
    party_id_map: dict,
    missing_advocates: list,
) -> None:
    def _link(person_id, side, display_name, name_source):
        tx.run("""
            MATCH (p:Person {id: $pid})
            WITH p
            MATCH (c:Case {id: $cid})
            MERGE (p)-[r:ADVOCATE_FOR]->(c)
            SET r.side = $side, r.display_name = $dname,
                r.name_source = $src""",
            pid=person_id, cid=case_id,
            side=side, dname=display_name, src=name_source)

    for p in persons:
        if p.role not in ('petitioner_advocate', 'respondent_advocate'):
            continue
        entity_id = person_id_map.get(f'{p.role}::{p.name}')
        if not entity_id:
            continue
        side = 'petitioner' if 'petitioner' in p.role else 'respondent'
        _link(entity_id, side, p.name, 'json')

    for adv in missing_advocates:
        from Extraction.utils.helpers import to_none
        if isinstance(adv, str):
            name = to_none(adv)
            side = 'petitioner'
        else:
            name = to_none(adv.get('name'))
            side = adv.get('side', 'petitioner')

        if not name:
            continue
        pid = insert_person(tx, name, name_source='pdf')
        _link(pid, side, name, 'pdf')


# ══════════════════════════════════════════════════════════════════════════
# 9. Acts
# ══════════════════════════════════════════════════════════════════════════

def insert_case_acts(tx, case_id: str, acts) -> None:
    for a in acts:
        tx.run("""
            MATCH (c:Case {id: $cid})
            WITH c
            MATCH (act:Act {name_norm: $norm})
            MERGE (c)-[r:INVOKES]->(act)
            SET r.section = $section""",
            cid=case_id, norm=normalize_name(a.name), section=a.section)


# ══════════════════════════════════════════════════════════════════════════
# 10. Hearings
# ══════════════════════════════════════════════════════════════════════════

def insert_hearings(tx, case_id: str, hearings) -> None:
    for h in hearings:
        tx.run("""
            MATCH (c:Case {id: $cid})
            CREATE (h:Hearing {
                id: $id,
                date: $date,
                last_hearing_date: $last,
                next_hearing_date: $next,
                purpose: $purpose,
                next_purpose: $npurpose,
                judge_designation: $jdesig,
                business_notes: $notes,
                nature_of_disposal: $disposal,
                created_at: datetime()
            })
            CREATE (c)-[:HAS_HEARING]->(h)""",
            id=str(uuid.uuid4()), cid=case_id,
            date=str(h.hearing_date or h.last_hearing_date) if (h.hearing_date or h.last_hearing_date) else None,
            last=str(h.last_hearing_date) if h.last_hearing_date else None,
            next=str(h.next_hearing_date) if h.next_hearing_date else None,
            purpose=h.purpose, jdesig=h.judge_designation,
            notes=h.diary_note.business,
            npurpose=h.diary_note.next_purpose,
            disposal=h.diary_note.nature_of_disposal)


# ══════════════════════════════════════════════════════════════════════════
# 11. Documents
# ══════════════════════════════════════════════════════════════════════════

def insert_documents(tx, case_id: str, documents) -> dict:
    """Insert Document nodes and return {storage_id: doc_uuid} map."""
    id_map: dict = {}
    for doc in documents:
        doc_id = str(uuid.uuid4())
        id_map[doc.storage_id or ''] = doc_id
        tx.run("""
            MATCH (c:Case {id: $cid})
            CREATE (d:Document {
                id: $id,
                storage_id: $sid,
                order_date: $odate,
                order_number: $onum,
                order_type: $otype,
                extraction_status: 'pending',
                created_at: datetime()
            })
            CREATE (c)-[:HAS_DOCUMENT]->(d)""",
            id=doc_id, cid=case_id,
            sid=doc.storage_id,
            odate=str(doc.order_date) if doc.order_date else None,
            onum=doc.order_number,
            otype=doc.order_type)
    return id_map


def update_document_text(tx, doc_id: str, full_text: str, method: str) -> None:
    tx.run("""
        MATCH (d:Document {id: $id})
        SET d.full_text = $ft,
            d.extraction_status = 'done',
            d.extraction_method = $method,
            d.updated_at = datetime()""",
        id=doc_id, ft=full_text, method=method)


# ══════════════════════════════════════════════════════════════════════════
# 12. Assets
# attributes dict keys → flat Asset node properties
# ══════════════════════════════════════════════════════════════════════════

def insert_assets(tx, case_id: str, assets: list, doc_id_map: dict) -> None:
    VALID = {
        'vehicle', 'plot', 'flat', 'commercial_property',
        'bank_account', 'cheque', 'machinery', 'other',
    }
    for a in assets:
        atype = (a.get('asset_type') or 'other').lower().strip()
        if atype not in VALID:
            atype = 'other'
        src_doc    = doc_id_map.get(a.get('_source_storage_id', ''))
        asset_id   = str(uuid.uuid4())
        attributes = a.get('attributes') or {}

        raw_addr = a.get('address')
        addr_dict = raw_addr if isinstance(raw_addr, dict) else (
            {'raw': raw_addr, 'address_source': 'pdf_llm', 'address_confidence': 'medium'}
            if raw_addr else None
        )

        tx.run("""
            MATCH (c:Case {id: $cid})
            CREATE (asset:Asset {
                id: $id,
                asset_type: $atype,
                identifier: $identifier,
                description: $desc,
                estimated_value_inr: $value,
                created_at: datetime()
            })
            CREATE (c)-[:HAS_ASSET]->(asset)""",
            id=asset_id, cid=case_id, atype=atype,
            identifier=a.get('identifier'),
            desc=a.get('description'),
            value=a.get('estimated_value_inr'))

        _set_flat_props(tx, asset_id, 'Asset', attributes)
        if addr_dict:
            _write_address(tx, asset_id, 'Asset', addr_dict)


# ══════════════════════════════════════════════════════════════════════════
# 13. Extraction log
# ══════════════════════════════════════════════════════════════════════════

def insert_extraction_log(
    tx,
    case_id: str,
    cnr_number: str,
    missing_log: list,
) -> None:
    if not missing_log:
        return
    tx.run("""
        MATCH (c:Case {id: $cid})
        CREATE (log:ExtractionLog {
            id: $id,
            cnr_number: $cnr,
            missing_data_reasons: $reasons,
            created_at: datetime()
        })
        CREATE (c)-[:HAS_LOG]->(log)""",
        id=str(uuid.uuid4()), cid=case_id,
        cnr=cnr_number,
        reasons=_json.dumps(missing_log))


# ══════════════════════════════════════════════════════════════════════════
# 14. Case vector
# ══════════════════════════════════════════════════════════════════════════

def update_case_vector(tx, case_id: str, vector: list) -> None:
    """Store the embedding for a Case node."""
    tx.run(
        "MATCH (c:Case {id: $id}) SET c.search_vector = $vec",
        id=case_id, vec=vector,
    )


# ══════════════════════════════════════════════════════════════════════════
# 15. Chunk nodes (sentence-level embeddings)
# ══════════════════════════════════════════════════════════════════════════

def insert_chunks(tx, case_id: str, cnr_number: str, chunks: list[dict]) -> None:
    """
    Insert Chunk nodes for sentence-level embeddings.
    Each chunk dict must have: {text: str, chunk_index: int, vector: list[float]}
    Links each Chunk to its parent Case via HAS_CHUNK.
    """
    for chunk in chunks:
        chunk_id = str(uuid.uuid4())
        tx.run("""
            MATCH (c:Case {id: $cid})
            CREATE (ch:Chunk {
                id: $id,
                cnr_number: $cnr,
                text: $text,
                chunk_index: $idx,
                chunk_vector: $vec,
                created_at: datetime()
            })
            CREATE (c)-[:HAS_CHUNK]->(ch)""",
            id=chunk_id, cid=case_id, cnr=cnr_number,
            text=chunk['text'], idx=chunk['chunk_index'],
            vec=chunk['vector'])


def delete_case_chunks(tx, case_id: str) -> None:
    """Delete all existing Chunk nodes for a case (for re-processing)."""
    tx.run("""
        MATCH (c:Case {id: $cid})-[:HAS_CHUNK]->(ch:Chunk)
        DETACH DELETE ch""",
        cid=case_id)

