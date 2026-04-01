"""
database/graph_inserts.py
All Neo4j write helpers for the pipeline.

Architecture — TWO generic primitives:
  _upsert_node()      : MERGE on unique key → dynamic SET all model fields.
  _create_child_node(): CREATE node + link to parent → dynamic SET all model fields.

Every entity function is a thin wrapper around these two primitives.
The "for loop over model fields" lives in _model_to_props() which iterates
model.model_dump() (includes extra='allow' fields from the LLM).

NO hardcoded field names in entity functions — only label, merge-key, and
minimal bootstrap identity props (name, is_judge, etc.).
"""
import uuid
import json as _json
import logging

from utils.helpers import normalize_name, org_type, clean_rel_type, to_none
from models.entities import (
    Judge, User, Organization,
    Court as CourtEntity,
    Asset,
    Document as EntityDocument,
    CaseHearing,
    Case as CaseEntity,
)

logger = logging.getLogger('pipeline')


# ══════════════════════════════════════════════════════════════════════════
# Value sanitization & serialization helpers
# ══════════════════════════════════════════════════════════════════════════

def _clean_val(v):
    """
    Sanitize one value before writing to Neo4j:
    - Strings → to_none() strips LLM placeholders ('N/A', 'Not mentioned', …)
    - dict/list → JSON string  (Neo4j only supports flat primitives)
    - None / empty → None  (caller skips)
    """
    if isinstance(v, str):
        v = to_none(v)
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return _json.dumps(v, ensure_ascii=False)
    return v


def _model_to_props(model, exclude: set = None) -> dict:
    """
    Pydantic model → flat dict of sanitized, non-None properties.
    model.model_dump() includes declared fields AND extra='allow' extras.
    """
    if model is None:
        return {}
    exclude = exclude or set()
    out = {}
    for k, v in model.model_dump().items():
        if k in exclude:
            continue
        v = _clean_val(v)
        if v is not None:
            out[k] = v
    return out


def _dict_to_props(d: dict, exclude: set = None) -> dict:
    """Raw dict → flat dict of sanitized, non-None properties."""
    if not d:
        return {}
    exclude = exclude or set()
    out = {}
    for k, v in d.items():
        if k in exclude:
            continue
        v = _clean_val(v)
        if v is not None:
            out[k] = v
    return out


def _set_props(tx, node_id: str, label: str, props: dict) -> None:
    """
    One dynamic Cypher SET for all props in one round-trip.
    Keys come from validated model dumps — safe for dynamic Cypher.
    No-ops when props is empty.
    """
    if not props:
        return
    set_clause = ', '.join(f'n.{k} = ${k}' for k in props)
    tx.run(
        f'MATCH (n:{label} {{id: $nid}}) SET {set_clause}',
        nid=node_id, **props,
    )


# ══════════════════════════════════════════════════════════════════════════
# Generic primitives — the two building blocks for every entity function
# ══════════════════════════════════════════════════════════════════════════

def _upsert_node(
    tx,
    label: str,
    merge_key: str,
    merge_val,
    model=None,
    bootstrap: dict = None,
    model_exclude: set = None,
    resolved_uuid: str = None,
) -> str:
    """
    Generic MERGE-based upsert for deduplicated entities.

    Step 1 — MERGE on merge_key; ON CREATE sets id + created_at only.
    Step 2 — _set_props writes bootstrap props + ALL model fields in one call.

    bootstrap    : static identity props (name, is_judge, …) not from model.
    model        : Pydantic model with extra='allow'; all fields are written.
    model_exclude: field names to skip from model (e.g. {'name','role_in_case'}).
    resolved_uuid: skip MERGE, patch the existing node directly.
    """
    props = {}
    if bootstrap:
        props.update({k: v for k, v in bootstrap.items() if v is not None})
    props.update(_model_to_props(model, exclude=model_exclude or set()))

    if resolved_uuid:
        _set_props(tx, resolved_uuid, label, props)
        tx.run(
            f"MATCH (n:{label} {{id: $id}}) SET n.updated_at = datetime()",
            id=resolved_uuid,
        )
        return resolved_uuid

    r = tx.run(
        f"MERGE (n:{label} {{{merge_key}: $mk}}) "
        f"ON CREATE SET n.id = $id, n.created_at = datetime() "
        f"ON MATCH  SET n.updated_at = datetime() "
        f"RETURN n.id AS id",
        mk=merge_val, id=str(uuid.uuid4()),
    )
    nid = r.single()['id']
    _set_props(tx, nid, label, props)
    return nid


def _create_child_node(
    tx,
    label: str,
    parent_id: str,
    rel_type: str,
    model=None,
    bootstrap: dict = None,
    model_exclude: set = None,
) -> str:
    """
    Generic CREATE for one-to-many children (Hearing, Document, Asset).

    Step 1 — CREATE node with id + created_at only; link to parent.
    Step 2 — _set_props writes bootstrap props + ALL model fields in one call.
    """
    node_id = str(uuid.uuid4())
    tx.run(
        f"MATCH (p {{id: $pid}}) "
        f"CREATE (n:{label} {{id: $id, created_at: datetime()}}) "
        f"CREATE (p)-[:{rel_type}]->(n)",
        pid=parent_id, id=node_id,
    )
    props = {}
    if bootstrap:
        props.update({k: v for k, v in bootstrap.items() if v is not None})
    props.update(_model_to_props(model, exclude=model_exclude or set()))
    _set_props(tx, node_id, label, props)
    return node_id


# ══════════════════════════════════════════════════════════════════════════
# 1. Act  (no Pydantic model — name dedup with longest-name logic)
# ══════════════════════════════════════════════════════════════════════════

def upsert_act(tx, name: str) -> str | None:
    norm = normalize_name(name)
    if not norm:
        return None
    r = tx.run("""
        MERGE (a:Act {name_norm: $norm})
        ON CREATE SET a.id = $id, a.name = $name, a.created_at = datetime()
        ON MATCH  SET a.name = CASE WHEN size($name) > size(a.name)
                                    THEN $name ELSE a.name END,
                      a.updated_at = datetime()
        RETURN a.id AS id""",
        norm=norm, name=name, id=str(uuid.uuid4()))
    return r.single()['id']


# ══════════════════════════════════════════════════════════════════════════
# 2. Court
# ══════════════════════════════════════════════════════════════════════════

def upsert_court(tx, court_model: CourtEntity | None) -> str | None:
    """
    court_model: CourtEntity — all fields written dynamically.
    """
    if not court_model or not court_model.name:
        return None
    bootstrap = {
        'name': court_model.name,
    }
    return _upsert_node(
        tx, 'Court', 'name', court_model.name,
        model=court_model, bootstrap=bootstrap, model_exclude={'name'},
    )


# ══════════════════════════════════════════════════════════════════════════
# 3. Person
# ══════════════════════════════════════════════════════════════════════════

def insert_person(
    tx,
    name: str,
    name_source: str = 'json',
    person_model=None,          # User | Lawyer | any BaseModel
    resolved_uuid: str = None,
    address: str | None = None,
) -> str:
    """person_model can be User, Lawyer, or any Pydantic model."""
    norm = normalize_name(name)
    if not norm:
        return str(uuid.uuid4())
    bootstrap = {
        'name'       : name,
        'name_source': name_source,
        'is_judge'   : False,
        'address'    : address,   # explicit arg wins over model field
    }
    return _upsert_node(
        tx, 'Person', 'name_norm', norm,
        model=person_model, bootstrap=bootstrap,
        model_exclude={'name', 'role_in_case'},
        resolved_uuid=resolved_uuid,
    )


# ══════════════════════════════════════════════════════════════════════════
# 4. Organization
# ══════════════════════════════════════════════════════════════════════════

def upsert_organization(
    tx,
    name: str,
    org_model=None,
    resolved_uuid: str = None,
    address: str | None = None,
) -> str | None:
    norm = normalize_name(name)
    if not norm:
        return None
    bootstrap = {
        'name'             : name,
        'organization_type': org_type(name),
        'address'          : address,
    }
    return _upsert_node(
        tx, 'Organization', 'name_norm', norm,
        model=org_model, bootstrap=bootstrap,
        model_exclude={'name', 'organization_type'},
        resolved_uuid=resolved_uuid,
    )


# ══════════════════════════════════════════════════════════════════════════
# 5. Judge  (Person node with is_judge = true)
# ══════════════════════════════════════════════════════════════════════════

def upsert_judge(
    tx,
    name: str,
    judge_model=None,
    resolved_uuid: str = None,
) -> str:
    """
    uid_number secondary lookup prevents duplicate nodes when the same judge
    appears under variant name spellings.  All model fields — designation,
    current_court, uid_number, bar_enrollment_number, status, LLM extras —
    flow through _upsert_node with zero hardcoded field names.
    """
    norm       = normalize_name(name) if name else None
    uid_number = getattr(judge_model, 'uid_number', None) if judge_model else None

    if uid_number and not resolved_uuid:
        row = tx.run(
            "MATCH (p:Person {uid_number: $uid}) RETURN p.id AS id LIMIT 1",
            uid=uid_number,
        ).single()
        if row:
            resolved_uuid = row['id']

    bootstrap = {'name': name, 'is_judge': True, 'name_source': 'pdf'}
    return _upsert_node(
        tx, 'Person', 'name_norm', norm,
        model=judge_model, bootstrap=bootstrap, model_exclude={'name'},
        resolved_uuid=resolved_uuid,
    )


# ══════════════════════════════════════════════════════════════════════════
# 6. Case
# ══════════════════════════════════════════════════════════════════════════

def upsert_case(tx, case_model: CaseEntity, court_id: str | None, summary: str | None = None) -> str:
    """
    case_model: CaseEntity (extra='allow') → all dynamic keys are written to the database.
    """
    r = tx.run("""
        MERGE (c:Case {cnr_number: $cnr})
        ON CREATE SET c.id = $id, c.created_at = datetime()
        ON MATCH  SET c.updated_at = datetime()
        RETURN c.id AS id""",
        cnr=case_model.cnr_number, id=str(uuid.uuid4()))
    case_id = r.single()['id']

    # Convert CaseEntity to props, injecting the manual summary if present
    case_props = _model_to_props(case_model, exclude={'cnr_number'})
    if summary:
        case_props['search_summary'] = summary
        
    _set_props(tx, case_id, 'Case', case_props)

    if court_id:
        tx.run("""
            MATCH (c:Case {id: $cid}) WITH c
            MATCH (ct:Court {id: $ctid})
            MERGE (c)-[:HEARD_IN]->(ct)""",
            cid=case_id, ctid=court_id)

    return case_id


# ══════════════════════════════════════════════════════════════════════════
# 7. Case parties (petitioners + respondents)
# ══════════════════════════════════════════════════════════════════════════

def insert_case_parties(tx, case_id, persons, person_id_map) -> dict:
    """persons : list[PersonModel]  (text_extraction.json_loader)"""
    party_id_map = {}
    for p in persons:
        if p.role not in ('petitioner', 'respondent'):
            continue
        entity_id = person_id_map.get(f'{p.role}::{p.name}')
        if not entity_id:
            continue
        rel   = clean_rel_type(p.role)
        label = 'Organization' if p.is_org else 'Person'
        tx.run(
            f"MATCH (e:{label} {{id: $eid}}) WITH e "
            f"MATCH (c:Case {{id: $cid}}) MERGE (e)-[:{rel}]->(c)",
            eid=entity_id, cid=case_id,
        )
        party_id_map[f'{p.role}::{p.name}'] = str(uuid.uuid4())
    return party_id_map


# ══════════════════════════════════════════════════════════════════════════
# 8. Case lawyers (advocates)
# ══════════════════════════════════════════════════════════════════════════

def insert_case_lawyers(tx, case_id, persons, person_id_map, party_id_map, missing_advocates) -> None:
    def _link(pid, side, dname, src):
        tx.run("""
            MATCH (p:Person {id: $pid}) WITH p
            MATCH (c:Case {id: $cid})
            MERGE (p)-[r:ADVOCATE_FOR]->(c)
            SET r.side = $side, r.display_name = $dname, r.name_source = $src""",
            pid=pid, cid=case_id, side=side, dname=dname, src=src)

    for p in persons:
        if p.role not in ('petitioner_advocate', 'respondent_advocate'):
            continue
        eid = person_id_map.get(f'{p.role}::{p.name}')
        if not eid:
            continue
        _link(eid, 'petitioner' if 'petitioner' in p.role else 'respondent', p.name, 'json')

    for adv in missing_advocates:
        name = to_none(adv) if isinstance(adv, str) else to_none(adv.get('name'))
        side = 'petitioner' if isinstance(adv, str) else adv.get('side', 'petitioner')
        if not name:
            continue
        _link(insert_person(tx, name, name_source='pdf'), side, name, 'pdf')


# ══════════════════════════════════════════════════════════════════════════
# 9. Acts
# ══════════════════════════════════════════════════════════════════════════

def insert_case_acts(tx, case_id, acts) -> None:
    for a in acts:
        tx.run("""
            MATCH (c:Case {id: $cid}) WITH c
            MATCH (act:Act {name_norm: $norm})
            MERGE (c)-[r:INVOKES]->(act)
            SET r.section = $section""",
            cid=case_id, norm=normalize_name(a.name), section=a.section)


# ══════════════════════════════════════════════════════════════════════════
# 10. Hearings
# ══════════════════════════════════════════════════════════════════════════

def insert_hearings(tx, case_id, hearings) -> None:
    """
    CaseHearing (models.entities) — all fields via _model_to_props (dynamic).
    HearingModel (json_loader)    — different attribute names; mapped manually.
    """
    for h in hearings:
        if isinstance(h, CaseHearing):
            _create_child_node(tx, 'Hearing', case_id, 'HAS_HEARING', model=h)
        else:
            diary = h.diary_note
            props = _dict_to_props({
                'date'              : str(h.hearing_date)              if h.hearing_date              else None,
                'last_hearing_date' : str(h.last_hearing_date)         if h.last_hearing_date         else None,
                'next_hearing_date' : str(h.next_hearing_date)         if h.next_hearing_date         else None,
                'purpose'           : h.purpose,
                'judge_designation' : h.judge_designation,
                'business_notes'    : diary.business                   if diary else None,
                'next_purpose'      : diary.next_purpose               if diary else None,
                'nature_of_disposal': diary.nature_of_disposal         if diary else None,
            })
            _create_child_node(tx, 'Hearing', case_id, 'HAS_HEARING', bootstrap=props)


# ══════════════════════════════════════════════════════════════════════════
# 11. Documents
# ══════════════════════════════════════════════════════════════════════════

def insert_documents(tx, case_id, documents) -> dict:
    """
    EntityDocument (models.entities) — all fields dynamic.
    DocumentModel  (json_loader)     — mapped manually (different shape).
    Returns {storage_id: doc_uuid}.
    """
    id_map = {}
    for doc in documents:
        if isinstance(doc, EntityDocument):
            doc_id = _create_child_node(
                tx, 'Document', case_id, 'HAS_DOCUMENT',
                model=doc,
                bootstrap={'extraction_status': 'pending'},
                model_exclude={'extraction_status'},
            )
        else:
            props = _dict_to_props({
                'storage_id'  : doc.storage_id,
                'order_date'  : str(doc.order_date) if doc.order_date else None,
                'order_number': doc.order_number,
                'order_type'  : doc.order_type,
            })
            doc_id = _create_child_node(
                tx, 'Document', case_id, 'HAS_DOCUMENT',
                bootstrap={'extraction_status': 'pending', **props},
            )
        id_map[doc.storage_id or ''] = doc_id
    return id_map


def update_document_text(tx, doc_id, full_text, method) -> None:
    tx.run("""
        MATCH (d:Document {id: $id})
        SET d.full_text = $ft,
            d.extraction_status = 'done',
            d.extraction_method = $method,
            d.updated_at = datetime()""",
        id=doc_id, ft=full_text, method=method)


# ══════════════════════════════════════════════════════════════════════════
# 12. Assets
# ══════════════════════════════════════════════════════════════════════════

_VALID_ASSET_TYPES = {
    'vehicle', 'plot', 'flat', 'commercial_property',
    'bank_account', 'cheque', 'machinery', 'other',
}


def insert_assets(tx, case_id, assets, doc_id_map) -> None:
    """
    Asset (models.entities) — all fields dynamic; attributes dict exploded.
    dict (legacy)            — _dict_to_props handles sanitization.
    """
    for a in assets:
        if isinstance(a, Asset):
            attributes = a.attributes or {}
            raw_type   = (a.asset_type or 'other').lower().strip()
            asset_id   = _create_child_node(
                tx, 'Asset', case_id, 'HAS_ASSET',
                model=a,
                bootstrap={'asset_type': raw_type if raw_type in _VALID_ASSET_TYPES else 'other'},
                model_exclude={'attributes', 'asset_type'},
            )
        else:
            attributes = a.get('attributes') or {}
            raw_type   = (a.get('asset_type') or 'other').lower().strip()
            props      = _dict_to_props(a, exclude={'attributes', '_source_storage_id', 'asset_type'})
            props['asset_type'] = raw_type if raw_type in _VALID_ASSET_TYPES else 'other'
            asset_id   = _create_child_node(tx, 'Asset', case_id, 'HAS_ASSET', bootstrap=props)

        # Explode attributes dict → individual flat node properties
        if attributes:
            _set_props(tx, asset_id, 'Asset', {
                k: _clean_val(v) for k, v in attributes.items() if _clean_val(v) is not None
            })


# ══════════════════════════════════════════════════════════════════════════
# 13. Extraction log
# ══════════════════════════════════════════════════════════════════════════

def insert_extraction_log(tx, case_id, cnr_number, missing_log) -> None:
    if not missing_log:
        return
    tx.run("""
        MATCH (c:Case {id: $cid})
        CREATE (log:ExtractionLog {
            id: $id, cnr_number: $cnr,
            missing_data_reasons: $reasons,
            created_at: datetime()
        })
        CREATE (c)-[:HAS_LOG]->(log)""",
        id=str(uuid.uuid4()), cid=case_id,
        cnr=cnr_number, reasons=_json.dumps(missing_log))


# ══════════════════════════════════════════════════════════════════════════
# 14. Case vector
# ══════════════════════════════════════════════════════════════════════════

def update_case_vector(tx, case_id, vector) -> None:
    tx.run(
        "MATCH (c:Case {id: $id}) SET c.search_vector = $vec",
        id=case_id, vec=vector,
    )
