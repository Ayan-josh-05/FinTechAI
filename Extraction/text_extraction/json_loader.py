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

from Extraction.utils.helpers import (
    to_none, parse_date, is_organization, org_type,
    clean_party_name, clean_district, dedup_advocates,
    normalize_address,
)
from shared.config import JUNK_ACTS, FINANCIAL_CASE_TYPES

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


# ── Pydantic models ────────────────────────────────────────────────────────

class DiaryNote(BaseModel):
    business           : Optional[str]  = None
    next_purpose       : Optional[str]  = None
    next_hearing_date  : Optional[date] = None
    nature_of_disposal : Optional[str]  = None
    disposal_date      : Optional[date] = None

    @model_validator(mode='before')
    @classmethod
    def normalise(cls, d):
        if not isinstance(d, dict):
            return {}
        return {
            'business'          : to_none(d.get('bussiness')),   # typo in source preserved
            'next_purpose'      : to_none(d.get('next_purpose')),
            'next_hearing_date' : parse_date(d.get('next_hearing_date')),
            'nature_of_disposal': to_none(d.get('nature_of_disposal')),
            'disposal_date'     : parse_date(d.get('disposal_date')),
        }


class HearingModel(BaseModel):
    last_hearing_date : Optional[date] = None
    next_hearing_date : Optional[date] = None
    hearing_date      : Optional[date] = None
    purpose           : Optional[str]  = None
    judge_designation : Optional[str]  = None
    diary_note        : DiaryNote      = DiaryNote()

    @model_validator(mode='before')
    @classmethod
    def normalise(cls, d):
        return {
            'last_hearing_date': parse_date(d.get('last_hearing_date')),
            'next_hearing_date': parse_date(d.get('next_hearing_date')),
            'hearing_date'     : parse_date(d.get('hearing_date')),
            'purpose'          : to_none(d.get('purpose')),
            'judge_designation': to_none(d.get('judge_name')),
            'diary_note'       : d.get('diary_note', {}),
        }


class ActModel(BaseModel):
    name    : str
    section : Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def normalise(cls, d):
        name = d.get('name', '').strip()
        # fix missing spaces: 'CodeofCivilProcedure' → 'Code of Civil Procedure'
        name    = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
        section = to_none(d.get('section', ''))
        if section:
            section = section.strip(',').strip()
        return {'name': name, 'section': section}


class DocumentModel(BaseModel):
    storage_id   : Optional[str]  = None
    order_date   : Optional[date] = None
    order_number : Optional[int]  = None
    order_type   : Optional[str]  = None
    judge        : Optional[str]  = None

    @model_validator(mode='before')
    @classmethod
    def normalise(cls, d):
        try:
            num = int(d.get('order_number'))
        except (TypeError, ValueError):
            num = None
        return {
            'storage_id'  : to_none(d.get('storage_id')),
            'order_date'  : parse_date(d.get('order_date')),
            'order_number': num,
            'order_type'  : to_none(d.get('order_type')),
            'judge'       : to_none(d.get('judge')),
        }


class PersonModel(BaseModel):
    name         : str
    role         : str
    address      : Optional[dict] = None  # structured: {raw, house_no, street, locality, city, district, state, pincode, address_type, address_source, address_confidence}
    is_org       : bool           = False
    rep_name     : Optional[str]  = None  # 'Through' representative name


class CaseModel(BaseModel):
    cnr_number          : str
    csp_id              : Optional[str]  = None
    es_doc_id           : Optional[str]  = None
    es_index            : Optional[str]  = None
    case_number         : Optional[str]  = None
    filing_number       : Optional[str]  = None
    registration_number : Optional[str]  = None
    case_type           : Optional[str]  = None
    case_type_code      : Optional[str]  = None
    case_status         : Optional[str]  = None
    case_stage          : Optional[str]  = None
    court_name          : Optional[str]  = None
    court_number        : Optional[str]  = None
    court_type          : Optional[str]  = None
    district            : Optional[str]  = None
    state               : Optional[str]  = None
    filing_date         : Optional[date] = None
    registration_date   : Optional[date] = None
    first_hearing_date  : Optional[date] = None
    last_hearing_date   : Optional[date] = None
    next_hearing_date   : Optional[date] = None
    decision_date       : Optional[date] = None
    disposal_date       : Optional[date] = None
    filing_year         : Optional[int]  = None
    type_of_disposal    : Optional[str]  = None
    in_favour_of        : Optional[str]  = None
    source              : Optional[str]  = None
    hearings            : list[HearingModel]  = []
    acts                : list[ActModel]      = []
    documents           : list[DocumentModel] = []
    persons             : list[PersonModel]   = []


# ── CaseModel builder ──────────────────────────────────────────────────────

def build_case_model(outer: dict, raw: dict) -> CaseModel:
    """Construct and validate a CaseModel from raw JSON dicts."""
    logger.debug("Starting build_case_model")
    persons = []

    for p in raw.get('petitioners', []):
        raw_name = to_none(p.get('name', ''))
        if not raw_name:
            continue
        clean_name, rep_name = clean_party_name(raw_name)
        addr = normalize_address(p.get('address'))
        if addr:
            addr['address_source']     = 'json'
            addr['address_confidence'] = 'high'
        persons.append(PersonModel(
            name     = clean_name,
            role     = 'petitioner',
            address  = addr,
            is_org   = is_organization(clean_name),
            rep_name = rep_name,
        ))

    for r in raw.get('respondents', []):
        raw_name = to_none(r.get('name', ''))
        if not raw_name:
            continue
        clean_name, rep_name = clean_party_name(raw_name)
        addr = normalize_address(r.get('address'))
        if addr:
            addr['address_source']     = 'json'
            addr['address_confidence'] = 'high'
        persons.append(PersonModel(
            name     = clean_name,
            role     = 'respondent',
            address  = addr,
            is_org   = is_organization(clean_name),
            rep_name = rep_name,
        ))

    pet_advocates  = dedup_advocates(raw.get('petitioner_advocates', []))
    resp_advocates = dedup_advocates(raw.get('respondent_advocates', []))

    for a in pet_advocates:
        name = to_none(a.get('name', ''))
        if name and name.lower() not in ('none', 'n/a'):
            persons.append(PersonModel(name=name, role='petitioner_advocate', is_org=False))

    for a in resp_advocates:
        name = to_none(a.get('name', ''))
        if name and name.lower() not in ('none', 'n/a'):
            persons.append(PersonModel(name=name, role='respondent_advocate', is_org=False))

    hearings = [HearingModel(**h) for h in raw.get('case_history', [])]
    acts_raw = [ActModel(**a) for a in raw.get('acts', []) if a.get('name')]

    case_type_lower = (outer.get('case_type') or '').lower().strip()
    acts = [
        a for a in acts_raw
        if not (a.name.lower() in JUNK_ACTS and case_type_lower in FINANCIAL_CASE_TYPES)
    ]

    docs_source = outer.get('documents') or raw.get('order_details', [])
    documents   = [DocumentModel(**d) for d in docs_source]

    try:
        filing_year = int(outer.get('filing_year') or raw.get('filing_year') or 0) or None
    except (ValueError, TypeError):
        filing_year = None

    district = clean_district(to_none(outer.get('district')) or '')

    return CaseModel(
        cnr_number          = outer.get('cnr_number') or raw.get('cnr_number', ''),
        csp_id              = to_none(outer.get('csp_id')),
        es_doc_id           = to_none(outer.get('es_doc_id')),
        es_index            = to_none(outer.get('es_index')),
        case_number         = to_none(outer.get('case_no') or raw.get('case_number')),
        filing_number       = to_none(outer.get('filing_number')),
        registration_number = to_none(raw.get('registration_number')),
        case_type           = to_none((outer.get('case_type') or '').upper()) or None,
        case_type_code      = to_none(raw.get('case_type_code')),
        case_status         = to_none((outer.get('case_status') or '').lower()) or None,
        case_stage          = to_none((raw.get('case_stage') or '').strip()),
        court_name          = to_none(raw.get('court')),
        court_number        = to_none(raw.get('court_number')),
        court_type          = to_none(outer.get('court')),
        district            = to_none(district) or None,
        state               = to_none((outer.get('state') or '').title()) or None,
        filing_date         = parse_date(raw.get('filing_date')),
        registration_date   = parse_date(raw.get('registration_date')),
        first_hearing_date  = parse_date(raw.get('first_hearing_date')),
        last_hearing_date   = parse_date(raw.get('last_hearing_date')),
        next_hearing_date   = parse_date(raw.get('next_hearing_date')),
        decision_date       = parse_date(raw.get('decision_date')),
        disposal_date       = parse_date(raw.get('disposal_date')),
        filing_year         = filing_year,
        type_of_disposal    = to_none(raw.get('type_of_disposal')),
        in_favour_of        = to_none(raw.get('in_favour_of')),
        source              = to_none(raw.get('source')),
        hearings            = hearings,
        acts                = acts,
        documents           = documents,
        persons             = persons,
    )
