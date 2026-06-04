"""
Utils/helpers.py
Shared helper functions used across the pipeline:
  - string normalisation
  - date parsing
  - organisation detection / classification
  - party-name cleaning
  - advocate deduplication
  - asset deduplication
  - district overrides
"""
import re
import uuid
import logging
from typing import Optional
from datetime import date

import dateutil.parser

from shared.config import ORG_KEYWORDS, DISTRICT_OVERRIDES

logger = logging.getLogger('pipeline')


# ── Null-safe coercion ─────────────────────────────────────────────────────

def to_none(v):
    """Return None for empty / null-like strings or placeholders."""
    if v is None:
        return None
    s = str(v).strip()
    low = s.lower()
    if low in ('', 'none', 'null', 'n/a', 'not mentioned', 'not found', 'unknown', 'not mentioned in pdf', 'not mentioned in the pdf'):
        return None
    return s


# ── Date parsing ───────────────────────────────────────────────────────────

def parse_date(v) -> Optional[date]:
    if not v:
        return None
    s = str(v).strip()
    if s in ('', 'None', 'null'):
        return None
    try:
        return dateutil.parser.parse(s).date()
    except Exception:
        return None


# ── Organisation helpers ───────────────────────────────────────────────────

def is_organization(name: str) -> bool:
    """Return True if the name looks like a company / institution."""
    if not name:
        return False
    words = {w.strip('.,()/') for w in name.upper().split()}
    return bool(words & ORG_KEYWORDS)


def org_type(name: str) -> str:
    """Classify an organisation name into a broad category string."""
    u = name.upper()
    if any(w in u for w in ['BANK', 'FINANCE', 'FINANCIAL', 'CAPITAL', 'NBFC']):
        return 'bank_finance'
    if any(w in u for w in ['HOSPITAL', 'CLINIC', 'HEALTH']):
        return 'healthcare'
    if any(w in u for w in ['SCHOOL', 'COLLEGE', 'UNIVERSITY', 'INSTITUTE', 'ACADEMY']):
        return 'education'
    if any(w in u for w in ['BOARD', 'AUTHORITY', 'DEPARTMENT', 'DEPT', 'COUNCIL']):
        return 'government'
    if any(w in u for w in ['HOSTEL', 'HOTEL', 'LODGE']):
        return 'hospitality'
    if any(w in u for w in ['COOPERATIVE', 'SOCIETY', 'TRUST', 'FOUNDATION', 'ASSOCIATION']):
        return 'ngo_trust'
    return 'company'


# ── Name cleaning ──────────────────────────────────────────────────────────

def clean_party_name(name: str) -> tuple[str, str | None]:
    """
    Split 'KOTAK MAHINDRA BANK LTD. TH RENY THOMAS'
    into  ('KOTAK MAHINDRA BANK LTD.', 'RENY THOMAS').

    'TH' / 'TH.' means 'Through [authorised representative]'.
    Returns (clean_name, rep_name).
    """
    if not name:
        return name, None
    parts = re.split(r'\s+TH\.?\s+', name, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return name, None


def normalize_name(name: str) -> str:
    """
    Normalise a person / org name for deduplication:
    upper-case, strip 'TH …' suffixes, standardise LTD/PVT abbreviations,
    collapse whitespace, then lower-case.
    """
    if not name:
        return ''
    n = name.upper().strip()
    n = re.sub(r'\s+TH\.?\s+.*$', '', n, flags=re.IGNORECASE)
    n = re.sub(r'\bPRIVATE\b', 'PVT', n)
    n = re.sub(r'\bLIMITED\b', 'LTD', n)
    n = re.sub(r'\bPVT\.?\s*LTD\.?\b', 'PVT LTD', n)
    n = re.sub(r'\bLTD\.?\b', 'LTD', n)
    n = re.sub(r'\bBANK\s+LTD\b', 'BANK', n)
    n = re.sub(r'[^\w\s]', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n.lower()


# ── Advocate deduplication ─────────────────────────────────────────────────

def dedup_advocates(advocates: list[dict]) -> list[dict]:
    """
    Remove duplicate advocates within the same case using token-overlap.
    'SHINDE RAJESHREE' and 'RAJESHREE RAJESH SHINDE' resolve to the
    longer / more complete form.
    """
    seen:   list[str]  = []
    result: list[dict] = []

    for adv in advocates:
        name = to_none(adv.get('name', ''))
        if not name:
            continue
        name_tokens = set(name.upper().split())
        is_dup = False
        for i, existing in enumerate(seen):
            existing_tokens = set(existing.upper().split())
            shorter = name_tokens if len(name_tokens) <= len(existing_tokens) else existing_tokens
            longer  = existing_tokens if len(name_tokens) <= len(existing_tokens) else name_tokens
            if shorter.issubset(longer):
                is_dup = True
                if len(name) > len(existing):
                    seen[i]         = name
                    result[i]['name'] = name
                break
        if not is_dup:
            seen.append(name)
            result.append(adv)

    return result


# ── Asset deduplication ────────────────────────────────────────────────────

def dedup_assets(assets: list) -> list:
    """
    Deduplicate assets extracted from multiple PDFs for the same case.
    Key: (asset_type, identifier).
    Merges attributes dicts and keeps the longest description.
    """
    seen = {}
    for a in assets:
        key = (
            (a.get('asset_type') or 'other').lower().strip(),
            (a.get('identifier') or '').lower().strip(),
        )
        if not key[1]:
            seen[id(a)] = a
            continue
        if key not in seen:
            seen[key] = a
        else:
            existing = seen[key]
            existing['attributes'] = {
                **(existing.get('attributes') or {}),
                **(a.get('attributes') or {}),
            }
            if len(a.get('description') or '') > len(existing.get('description') or ''):
                existing['description'] = a['description']
            if not existing.get('estimated_value_inr') and a.get('estimated_value_inr'):
                existing['estimated_value_inr'] = a['estimated_value_inr']
    return list(seen.values())


# ── District normalisation ─────────────────────────────────────────────────

def clean_district(raw: str) -> str:
    """
    Fix eCourts district field that sometimes contains court complex names.
    e.g. 'mumbai cmm courts' → 'Mumbai'
    """
    if not raw:
        return raw
    override = DISTRICT_OVERRIDES.get(raw.lower().strip())
    if override:
        return override
    return raw.title()
def clean_rel_type(role: str) -> str:
    """
    Sanitise a role string into a Cypher-safe relationship type.
    e.g. 'Police Sub-Inspector' -> 'POLICE_SUB_INSPECTOR_IN'
    """
    if not role:
        return 'PARTY_IN'
    # Upper case and replace non-alphanumeric with underscore
    clean = re.sub(r'[^A-Z0-9]+', '_', role.upper())
    # Strip leading/trailing underscores and add suffix
    clean = clean.strip('_')
    return f"{clean}_IN" if clean else "PARTY_IN"
