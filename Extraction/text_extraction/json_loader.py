"""
Text_Extraction/Json_extraction/json_loader.py
Reads a case JSON file and returns the outer envelope dict and the
parsed raw_details sub-document.

Also contains:
  - build_manifest()  — crawls the dataset directory and builds/updates
                        the CSV manifest that tracks processing status.
  - Pydantic models   — DiaryNote, HearingModel, ActModel, DocumentModel,
                        PersonModel, CaseModel
  - build_case_model() — constructs a validated CaseModel from outer + raw dicts
"""
import re
import logging
from pathlib import Path
from typing import Optional
from datetime import date

import orjson
import pandas as pd
from pydantic import BaseModel, model_validator

from utils.helpers import (
    to_none, parse_date, is_organization, org_type,
    clean_party_name, clean_district, dedup_advocates,
)
from config import JUNK_ACTS, FINANCIAL_CASE_TYPES

logger = logging.getLogger('pipeline')


# ── Manifest ───────────────────────────────────────────────────────────────

def build_manifest(dataset_root: Path, manifest_path: Path) -> pd.DataFrame:
    """
    Crawl *dataset_root* for JSON + PDF pairs and write/update *manifest_path*.
    Returns the manifest DataFrame (includes previously processed rows).
    """
    logger.debug(f"Starting build_manifest on {dataset_root}")
    rows = []
    for json_file in sorted(dataset_root.rglob('*.json')):
        folder  = json_file.parent
        doc_dir = folder / 'documents'
        pdfs    = sorted(doc_dir.glob('*.pdf')) if doc_dir.exists() \
                  else [p for p in sorted(folder.glob('*.pdf'))]
        rows.append({
            'case_folder': str(folder),
            'json_path'  : str(json_file),
            'pdf_paths'  : '|'.join(str(p) for p in pdfs),
            'pdf_count'  : len(pdfs),
            'status'     : 'pending',
            'error_msg'  : '',
        })

    new_df = pd.DataFrame(rows)

    if manifest_path.exists():
        existing = pd.read_csv(manifest_path, dtype=str).fillna('')
        merged   = new_df.merge(
            existing[['json_path', 'status', 'error_msg']],
            on='json_path', how='left', suffixes=('', '_old'),
        )
        merged['status'] = merged['status_old'].where(
            merged['status_old'].notna() & (merged['status_old'] != ''),
            merged['status'],
        )
        merged['error_msg'] = merged['error_msg_old'].where(
            merged['error_msg_old'].notna(), merged['error_msg'],
        )
        merged.drop(columns=['status_old', 'error_msg_old'], inplace=True)
        new_df = merged

    new_df.to_csv(manifest_path, index=False)
    return new_df


# ── Raw JSON loader ────────────────────────────────────────────────────────

def load_json(json_path: str) -> tuple[dict, dict]:
    """
    Load a case JSON file.
    Returns (outer_dict, raw_details_dict).
    """
    logger.debug(f"Starting load_json for {json_path}")
    with open(json_path, 'rb') as f:
        outer = orjson.loads(f.read())
    raw = orjson.loads(outer.get('raw_details', '{}'))
    return outer, raw


# ── Pydantic models removed structure ────────────────────────────────────────
# Now directly parsing into models.entities.CaseStateTemplate

from models.entities import CaseStateTemplate, Case, Court, Act, CaseHearing, Document, Organization, User, Lawyer, Judge, Asset

def build_case_template_from_json(outer: dict, raw: dict) -> CaseStateTemplate:
    """Construct a full CaseStateTemplate directly from raw JSON dicts."""
    logger.debug("Starting build_case_template_from_json")
    
    # ── Court
    district = clean_district(to_none(outer.get('district')) or '')
    court = Court(
        name=to_none(raw.get('court')),
        court_number=to_none(raw.get('court_number')),
        court_type=to_none(outer.get('court')),
        district=to_none(district) or None,
        state=to_none((outer.get('state') or '').title()) or None,
    )
    
    # ── Case
    try:
        filing_year = int(outer.get('filing_year') or raw.get('filing_year') or 0) or None
    except (ValueError, TypeError):
        filing_year = None

    c_file_d = parse_date(raw.get('filing_date'))
    c_disp_d = parse_date(raw.get('disposal_date'))
    c_reg_d  = parse_date(raw.get('registration_date'))
    c_1st_d  = parse_date(raw.get('first_hearing_date'))
    c_last_d = parse_date(raw.get('last_hearing_date'))
    c_nxt_d  = parse_date(raw.get('next_hearing_date'))
    c_dec_d  = parse_date(raw.get('decision_date'))
    
    case = Case(
        case_number=to_none(outer.get('case_no') or raw.get('case_number')),
        cnr_number=outer.get('cnr_number') or raw.get('cnr_number', ''),
        case_type=to_none((outer.get('case_type') or '').upper()) or None,
        status=to_none((outer.get('case_status') or '').lower()) or None,
        stage=to_none((raw.get('case_stage') or '').strip()),
        filing_date=str(c_file_d) if c_file_d else None,
        disposal_date=str(c_disp_d) if c_disp_d else None,
        registration_date=str(c_reg_d) if c_reg_d else None,
        first_hearing_date=str(c_1st_d) if c_1st_d else None,
        last_hearing_date=str(c_last_d) if c_last_d else None,
        next_hearing_date=str(c_nxt_d) if c_nxt_d else None,
        decision_date=str(c_dec_d) if c_dec_d else None,
        filing_year=filing_year,
        filing_number=to_none(outer.get('filing_number')),
        registration_number=to_none(raw.get('registration_number')),
        district=court.district,
        state=court.state,
        type_of_disposal=to_none(raw.get('type_of_disposal')),
        in_favour_of=to_none(raw.get('in_favour_of')),
    )

    # ── Acts
    acts = []
    case_type_lower = (outer.get('case_type') or '').lower().strip()
    for a in raw.get('acts', []):
        name = a.get('name', '').strip()
        if not name: continue
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
        if name.lower() in JUNK_ACTS and case_type_lower in FINANCIAL_CASE_TYPES:
            continue
        section = to_none(a.get('section', ''))
        if section: section = section.strip(',').strip()
        acts.append(Act(name=name, section=section))

    # ── Hearings
    hearings = []
    for h in raw.get('case_history', []):
        d_raw = h.get('diary_note')
        diary = d_raw if isinstance(d_raw, dict) else {}
        
        h_d = parse_date(h.get('hearing_date'))
        lh_d = parse_date(h.get('last_hearing_date'))
        nh_d = parse_date(h.get('next_hearing_date'))
        
        hearings.append(CaseHearing(
            date=str(h_d) if h_d else None,
            last_hearing_date=str(lh_d) if lh_d else None,
            next_hearing_date=str(nh_d) if nh_d else None,
            purpose=to_none(h.get('purpose')),
            judge_designation=to_none(h.get('judge_name')),
            business_notes=to_none(diary.get('bussiness')),
            next_purpose=to_none(diary.get('next_purpose')),
            nature_of_disposal=to_none(diary.get('nature_of_disposal')),
        ))

    # ── Documents
    documents = []
    docs_source = outer.get('documents') or raw.get('order_details', [])
    for d in docs_source:
        try: num = str(int(d.get('order_number')))
        except (TypeError, ValueError): num = None
        
        o_date = parse_date(d.get('order_date'))
        documents.append(Document(
            storage_id=to_none(d.get('storage_id')),
            order_date=str(o_date) if o_date else None,
            order_number=num,
            order_type=to_none(d.get('order_type'))
        ))

    # ── Parties
    parties = []
    for p in raw.get('petitioners', []):
        raw_name = to_none(p.get('name', ''))
        if not raw_name: continue
        clean_name, rep_name = clean_party_name(raw_name)
        is_org = is_organization(clean_name)
        info = Organization(name=clean_name, address=to_none(p.get('address'))).model_dump() if is_org \
               else User(name=clean_name, address=to_none(p.get('address'))).model_dump()
        parties.append({"type": "organization" if is_org else "person", "role": "petitioner", "info": info})

    for r in raw.get('respondents', []):
        raw_name = to_none(r.get('name', ''))
        if not raw_name: continue
        clean_name, rep_name = clean_party_name(raw_name)
        is_org = is_organization(clean_name)
        info = Organization(name=clean_name, address=to_none(r.get('address'))).model_dump() if is_org \
               else User(name=clean_name, address=to_none(r.get('address'))).model_dump()
        parties.append({"type": "organization" if is_org else "person", "role": "respondent", "info": info})

    # ── Advocates
    advocates = []
    pet_advocates = dedup_advocates(raw.get('petitioner_advocates', []))
    for a in pet_advocates:
        name = to_none(a.get('name', ''))
        if name and name.lower() not in ('none', 'n/a'):
            advocates.append({"side": "petitioner", "info": Lawyer(name=name).model_dump()})

    resp_advocates = dedup_advocates(raw.get('respondent_advocates', []))
    for a in resp_advocates:
        name = to_none(a.get('name', ''))
        if name and name.lower() not in ('none', 'n/a'):
            advocates.append({"side": "respondent", "info": Lawyer(name=name).model_dump()})

    return CaseStateTemplate(
        search_summary=None,
        case_details=case,
        court=court,
        acts=acts,
        hearings=hearings,
        documents=documents,
        parties=parties,
        advocates=advocates,
        judges=[Judge()],  # Empty patterns for LLM context
        assets=[Asset()],
        missing_data_log=[]
    )
