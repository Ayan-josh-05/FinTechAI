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

# ── Address normalisation constants ────────────────────────────────────────

_ADDRESS_JUNK = re.compile(
    r'^[\s.,\-/\\|_]+$'
    r'|^(address|addr|n/?a|nil|none|null|unknown|not\s+available'
    r'|not\s+mentioned|not\s+found|same\s+as\s+above|as\s+above'
    r'|see\s+above|\-+|\.+)$',
    re.IGNORECASE,
)
_PINCODE_RE   = re.compile(r'\b([1-9][0-9]{5})\b')

# First 3 digits of Indian pincode → state name
# Source: India Post pincode zones
_PINCODE_STATE: dict[str, str] = {
    '110': 'Delhi',       '111': 'Delhi',
    '112': 'Delhi',       '113': 'Delhi',
    '114': 'Delhi',       '121': 'Haryana',
    '122': 'Haryana',     '123': 'Haryana',
    '124': 'Haryana',     '125': 'Haryana',
    '126': 'Haryana',     '127': 'Haryana',
    '128': 'Haryana',     '129': 'Haryana',
    '131': 'Haryana',     '132': 'Haryana',
    '133': 'Haryana',     '134': 'Haryana',
    '135': 'Haryana',     '136': 'Haryana',
    '140': 'Punjab',      '141': 'Punjab',
    '142': 'Punjab',      '143': 'Punjab',
    '144': 'Punjab',      '145': 'Punjab',
    '146': 'Punjab',      '147': 'Punjab',
    '148': 'Punjab',      '149': 'Punjab',
    '151': 'Punjab',      '152': 'Punjab',
    '153': 'Punjab',      '154': 'Punjab',
    '155': 'Punjab',      '156': 'Punjab',
    '160': 'Chandigarh',  '161': 'Chandigarh',
    '162': 'Chandigarh',  '163': 'Chandigarh',
    '164': 'Chandigarh',  '165': 'Chandigarh',
    '166': 'Chandigarh',
    '170': 'Himachal Pradesh', '171': 'Himachal Pradesh',
    '172': 'Himachal Pradesh', '173': 'Himachal Pradesh',
    '174': 'Himachal Pradesh', '175': 'Himachal Pradesh',
    '176': 'Himachal Pradesh', '177': 'Himachal Pradesh',
    '178': 'Himachal Pradesh',
    '180': 'Jammu And Kashmir', '181': 'Jammu And Kashmir',
    '182': 'Jammu And Kashmir', '183': 'Jammu And Kashmir',
    '184': 'Jammu And Kashmir', '185': 'Jammu And Kashmir',
    '186': 'Jammu And Kashmir', '187': 'Jammu And Kashmir',
    '188': 'Jammu And Kashmir', '189': 'Jammu And Kashmir',
    '190': 'Jammu And Kashmir', '191': 'Jammu And Kashmir',
    '192': 'Jammu And Kashmir', '193': 'Jammu And Kashmir',
    '194': 'Jammu And Kashmir', '195': 'Jammu And Kashmir',
    '201': 'Uttar Pradesh', '202': 'Uttar Pradesh',
    '203': 'Uttar Pradesh', '204': 'Uttar Pradesh',
    '205': 'Uttar Pradesh', '206': 'Uttar Pradesh',
    '207': 'Uttar Pradesh', '208': 'Uttar Pradesh',
    '209': 'Uttar Pradesh', '210': 'Uttar Pradesh',
    '211': 'Uttar Pradesh', '212': 'Uttar Pradesh',
    '213': 'Uttar Pradesh', '214': 'Uttar Pradesh',
    '215': 'Uttar Pradesh', '216': 'Uttar Pradesh',
    '221': 'Uttar Pradesh', '222': 'Uttar Pradesh',
    '223': 'Uttar Pradesh', '224': 'Uttar Pradesh',
    '225': 'Uttar Pradesh', '226': 'Uttar Pradesh',
    '227': 'Uttar Pradesh', '228': 'Uttar Pradesh',
    '229': 'Uttar Pradesh', '231': 'Uttar Pradesh',
    '232': 'Uttar Pradesh', '233': 'Uttar Pradesh',
    '241': 'Uttar Pradesh', '242': 'Uttar Pradesh',
    '243': 'Uttar Pradesh', '244': 'Uttar Pradesh',
    '245': 'Uttar Pradesh', '246': 'Uttarakhand',
    '247': 'Uttarakhand',   '248': 'Uttarakhand',
    '249': 'Uttarakhand',   '250': 'Uttar Pradesh',
    '251': 'Uttar Pradesh', '261': 'Uttar Pradesh',
    '262': 'Uttar Pradesh', '263': 'Uttarakhand',
    '271': 'Uttar Pradesh', '272': 'Uttar Pradesh',
    '273': 'Uttar Pradesh', '274': 'Uttar Pradesh',
    '275': 'Uttar Pradesh', '276': 'Uttar Pradesh',
    '281': 'Uttar Pradesh', '282': 'Uttar Pradesh',
    '283': 'Uttar Pradesh', '284': 'Uttar Pradesh',
    '285': 'Uttar Pradesh',
    '301': 'Rajasthan',    '302': 'Rajasthan',
    '303': 'Rajasthan',    '304': 'Rajasthan',
    '305': 'Rajasthan',    '306': 'Rajasthan',
    '307': 'Rajasthan',    '311': 'Rajasthan',
    '312': 'Rajasthan',    '313': 'Rajasthan',
    '314': 'Rajasthan',    '321': 'Rajasthan',
    '322': 'Rajasthan',    '323': 'Rajasthan',
    '324': 'Rajasthan',    '325': 'Rajasthan',
    '326': 'Rajasthan',    '327': 'Rajasthan',
    '328': 'Rajasthan',    '331': 'Rajasthan',
    '332': 'Rajasthan',    '333': 'Rajasthan',
    '334': 'Rajasthan',    '335': 'Rajasthan',
    '341': 'Rajasthan',    '342': 'Rajasthan',
    '343': 'Rajasthan',    '344': 'Rajasthan',
    '345': 'Rajasthan',    '346': 'Rajasthan',
    '360': 'Gujarat',      '361': 'Gujarat',
    '362': 'Gujarat',      '363': 'Gujarat',
    '364': 'Gujarat',      '365': 'Gujarat',
    '370': 'Gujarat',      '380': 'Gujarat',
    '381': 'Gujarat',      '382': 'Gujarat',
    '383': 'Gujarat',      '384': 'Gujarat',
    '385': 'Gujarat',      '387': 'Gujarat',
    '388': 'Gujarat',      '389': 'Gujarat',
    '390': 'Gujarat',      '391': 'Gujarat',
    '392': 'Gujarat',      '393': 'Gujarat',
    '394': 'Gujarat',      '395': 'Gujarat',
    '396': 'Gujarat',
    '400': 'Maharashtra',  '401': 'Maharashtra',
    '402': 'Maharashtra',  '403': 'Goa',
    '410': 'Maharashtra',  '411': 'Maharashtra',
    '412': 'Maharashtra',  '413': 'Maharashtra',
    '414': 'Maharashtra',  '415': 'Maharashtra',
    '416': 'Maharashtra',  '417': 'Maharashtra',
    '421': 'Maharashtra',  '422': 'Maharashtra',
    '423': 'Maharashtra',  '424': 'Maharashtra',
    '425': 'Maharashtra',  '431': 'Maharashtra',
    '432': 'Maharashtra',  '433': 'Maharashtra',
    '440': 'Maharashtra',  '441': 'Maharashtra',
    '442': 'Maharashtra',  '443': 'Maharashtra',
    '444': 'Maharashtra',  '445': 'Maharashtra',
    '500': 'Telangana',    '501': 'Telangana',
    '502': 'Telangana',    '503': 'Telangana',
    '504': 'Telangana',    '505': 'Telangana',
    '506': 'Telangana',    '507': 'Telangana',
    '508': 'Telangana',    '509': 'Telangana',
    '515': 'Andhra Pradesh', '516': 'Andhra Pradesh',
    '517': 'Andhra Pradesh', '518': 'Andhra Pradesh',
    '519': 'Andhra Pradesh', '521': 'Andhra Pradesh',
    '522': 'Andhra Pradesh', '523': 'Andhra Pradesh',
    '524': 'Andhra Pradesh', '530': 'Andhra Pradesh',
    '531': 'Andhra Pradesh', '532': 'Andhra Pradesh',
    '533': 'Andhra Pradesh', '534': 'Andhra Pradesh',
    '535': 'Andhra Pradesh',
    '560': 'Karnataka',    '561': 'Karnataka',
    '562': 'Karnataka',    '563': 'Karnataka',
    '564': 'Karnataka',    '565': 'Karnataka',
    '566': 'Karnataka',    '570': 'Karnataka',
    '571': 'Karnataka',    '572': 'Karnataka',
    '573': 'Karnataka',    '574': 'Karnataka',
    '575': 'Karnataka',    '576': 'Karnataka',
    '577': 'Karnataka',    '580': 'Karnataka',
    '581': 'Karnataka',    '582': 'Karnataka',
    '583': 'Karnataka',    '584': 'Karnataka',
    '585': 'Karnataka',    '586': 'Karnataka',
    '587': 'Karnataka',
    '600': 'Tamil Nadu',   '601': 'Tamil Nadu',
    '602': 'Tamil Nadu',   '603': 'Tamil Nadu',
    '604': 'Tamil Nadu',   '605': 'Tamil Nadu',
    '606': 'Tamil Nadu',   '607': 'Tamil Nadu',
    '608': 'Tamil Nadu',   '609': 'Tamil Nadu',
    '610': 'Tamil Nadu',   '611': 'Tamil Nadu',
    '612': 'Tamil Nadu',   '613': 'Tamil Nadu',
    '614': 'Tamil Nadu',   '620': 'Tamil Nadu',
    '621': 'Tamil Nadu',   '622': 'Tamil Nadu',
    '623': 'Tamil Nadu',   '624': 'Tamil Nadu',
    '625': 'Tamil Nadu',   '626': 'Tamil Nadu',
    '627': 'Tamil Nadu',   '628': 'Tamil Nadu',
    '629': 'Tamil Nadu',   '630': 'Tamil Nadu',
    '631': 'Tamil Nadu',   '632': 'Tamil Nadu',
    '635': 'Tamil Nadu',   '636': 'Tamil Nadu',
    '637': 'Tamil Nadu',   '638': 'Tamil Nadu',
    '639': 'Tamil Nadu',   '641': 'Tamil Nadu',
    '642': 'Tamil Nadu',   '643': 'Tamil Nadu',
    '700': 'West Bengal',  '711': 'West Bengal',
    '712': 'West Bengal',  '713': 'West Bengal',
    '721': 'West Bengal',  '722': 'West Bengal',
    '723': 'West Bengal',  '731': 'West Bengal',
    '732': 'West Bengal',  '733': 'West Bengal',
    '734': 'West Bengal',  '735': 'West Bengal',
    '736': 'West Bengal',  '737': 'Sikkim',
    '741': 'West Bengal',  '742': 'West Bengal',
    '743': 'West Bengal',  '744': 'Andaman And Nicobar Islands',
    '751': 'Madhya Pradesh', '752': 'Madhya Pradesh',
    '753': 'Madhya Pradesh', '754': 'Madhya Pradesh',
    '755': 'Madhya Pradesh', '756': 'Madhya Pradesh',
    '760': 'Odisha',        '761': 'Odisha',
    '762': 'Odisha',        '763': 'Odisha',
    '764': 'Odisha',        '765': 'Odisha',
    '766': 'Odisha',        '767': 'Odisha',
    '768': 'Odisha',        '769': 'Odisha',
    '770': 'Odisha',        '771': 'Odisha',
    '800': 'Bihar',         '801': 'Bihar',
    '802': 'Bihar',         '803': 'Bihar',
    '804': 'Bihar',         '811': 'Bihar',
    '812': 'Bihar',         '813': 'Bihar',
    '814': 'Bihar',         '821': 'Bihar',
    '822': 'Bihar',         '823': 'Bihar',
    '824': 'Bihar',         '825': 'Jharkhand',
    '826': 'Jharkhand',     '827': 'Jharkhand',
    '828': 'Jharkhand',     '829': 'Jharkhand',
    '831': 'Jharkhand',     '832': 'Jharkhand',
    '833': 'Jharkhand',     '834': 'Jharkhand',
    '835': 'Jharkhand',
    '841': 'Bihar',         '842': 'Bihar',
    '843': 'Bihar',         '844': 'Bihar',
    '845': 'Bihar',         '846': 'Bihar',
    '847': 'Bihar',         '848': 'Bihar',
    '851': 'Bihar',         '852': 'Bihar',
    '853': 'Bihar',         '854': 'Bihar',
    '855': 'Bihar',         '856': 'Assam',
    '781': 'Assam',         '782': 'Assam',
    '783': 'Assam',         '784': 'Assam',
    '785': 'Assam',         '786': 'Assam',
    '787': 'Arunachal Pradesh', '788': 'Assam',
    '790': 'Arunachal Pradesh', '791': 'Arunachal Pradesh',
    '792': 'Arunachal Pradesh', '793': 'Meghalaya',
    '794': 'Meghalaya',     '795': 'Manipur',
    '796': 'Mizoram',       '797': 'Nagaland',
    '798': 'Nagaland',      '799': 'Tripura',
    '670': 'Kerala',        '671': 'Kerala',
    '672': 'Kerala',        '673': 'Kerala',
    '674': 'Kerala',        '675': 'Kerala',
    '676': 'Kerala',        '677': 'Kerala',
    '678': 'Kerala',        '679': 'Kerala',
    '680': 'Kerala',        '681': 'Kerala',
    '682': 'Kerala',        '683': 'Kerala',
    '684': 'Kerala',        '685': 'Kerala',
    '686': 'Kerala',        '687': 'Kerala',
    '688': 'Kerala',        '689': 'Kerala',
    '690': 'Kerala',        '691': 'Kerala',
    '692': 'Kerala',        '693': 'Kerala',
    '694': 'Kerala',        '695': 'Kerala',
    '450': 'Madhya Pradesh', '451': 'Madhya Pradesh',
    '452': 'Madhya Pradesh', '453': 'Madhya Pradesh',
    '454': 'Madhya Pradesh', '455': 'Madhya Pradesh',
    '456': 'Madhya Pradesh', '457': 'Madhya Pradesh',
    '458': 'Madhya Pradesh', '460': 'Madhya Pradesh',
    '461': 'Madhya Pradesh', '462': 'Madhya Pradesh',
    '463': 'Madhya Pradesh', '464': 'Madhya Pradesh',
    '465': 'Madhya Pradesh', '466': 'Madhya Pradesh',
    '467': 'Madhya Pradesh', '470': 'Madhya Pradesh',
    '471': 'Madhya Pradesh', '472': 'Madhya Pradesh',
    '473': 'Madhya Pradesh', '474': 'Madhya Pradesh',
    '475': 'Madhya Pradesh', '476': 'Madhya Pradesh',
    '477': 'Madhya Pradesh', '480': 'Madhya Pradesh',
    '481': 'Madhya Pradesh', '482': 'Madhya Pradesh',
    '483': 'Madhya Pradesh', '484': 'Madhya Pradesh',
    '485': 'Madhya Pradesh', '486': 'Madhya Pradesh',
    '487': 'Madhya Pradesh', '488': 'Madhya Pradesh',
    '489': 'Madhya Pradesh', '491': 'Chhattisgarh',
    '492': 'Chhattisgarh',  '493': 'Chhattisgarh',
    '494': 'Chhattisgarh',  '495': 'Chhattisgarh',
    '496': 'Chhattisgarh',  '497': 'Chhattisgarh',
    '498': 'Chhattisgarh',
}


def infer_state_from_pincode(pincode: str) -> Optional[str]:
    """Return state name inferred from the first 3 digits of an Indian pincode."""
    if pincode and len(pincode) == 6:
        return _PINCODE_STATE.get(pincode[:3])
    return None


def normalize_address(raw: Optional[str]) -> Optional[dict]:
    """
    Parse a raw address string into a structured dict ready for AddressModel.

    - Filters junk/placeholder strings (returns None).
    - Extracts pincode via regex.
    - Infers state from pincode when state is not present in the raw string.
    - Always preserves the original string in 'raw'.

    Returns None when the input is empty or clearly a placeholder.
    Does NOT split into street/locality/city — those require the LLM.
    """
    if not raw:
        return None
    s = raw.strip()
    if not s or _ADDRESS_JUNK.fullmatch(s.lower()):
        return None

    result: dict = {'raw': s}

    m = _PINCODE_RE.search(s)
    if m:
        result['pincode'] = m.group(1)
        inferred_state = infer_state_from_pincode(result['pincode'])
        if inferred_state:
            result['state'] = inferred_state

    return result

_TITLES = re.compile(
    r'\b(Justice|Hon(?:ourable)?\.?|Mr\.?|Ms\.?|Mrs\.?|Dr\.?|Shri|Smt\.?|Adv\.?|Advocate)\b\s*',
    re.IGNORECASE,
)


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
    strip titles, upper-case, strip 'TH …' suffixes, standardise LTD/PVT
    abbreviations, collapse whitespace, then lower-case.
    Used as the Neo4j MERGE key (name_norm) — do not change output format.
    """
    if not name:
        return ''
    n = _TITLES.sub('', name).strip()
    n = n.upper()
    n = re.sub(r'\s+TH\.?\s+.*$', '', n, flags=re.IGNORECASE)
    n = re.sub(r'\bPRIVATE\b', 'PVT', n)
    n = re.sub(r'\bLIMITED\b', 'LTD', n)
    n = re.sub(r'\bPVT\.?\s*LTD\.?\b', 'PVT LTD', n)
    n = re.sub(r'\bLTD\.?\b', 'LTD', n)
    n = re.sub(r'\bBANK\s+LTD\b', 'BANK', n)
    n = re.sub(r'[^\w\s]', ' ', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n.lower()


def normalize_name_canonical(name: str) -> dict:
    """
    Produce a token-sorted canonical form for fuzzy scoring and blocking.
    Never used as a Neo4j MERGE key — only for comparison.

    Returns:
      canonical — sorted tokens joined (handles word-order swaps)
      surname   — last token before sort (blocking key)
      initials  — first char of each unsorted token
    """
    cleaned = normalize_name(name)
    tokens = [t for t in cleaned.split() if len(t) > 1]
    if not tokens:
        return {"canonical": cleaned, "surname": "", "initials": ""}
    tokens_sorted = sorted(tokens)
    return {
        "canonical": " ".join(tokens_sorted),
        "surname":   tokens[-1],
        "initials":  "".join(t[0] for t in tokens),
    }


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
        name_upper  = name.upper()
        name_parts  = name_upper.split()
        name_tokens = set(name_parts)
        is_dup = False
        for i, existing in enumerate(seen):
            existing_parts  = existing.upper().split()
            existing_tokens = set(existing_parts)
            shorter = name_tokens if len(name_tokens) <= len(existing_tokens) else existing_tokens
            longer  = existing_tokens if len(name_tokens) <= len(existing_tokens) else name_tokens
            # Require surnames (last tokens) to match before allowing subset merge,
            # otherwise "Suresh Patil" would wrongly collapse with "Suresh Kumar Singh".
            last_new      = name_parts[-1]      if name_parts      else ''
            last_existing = existing_parts[-1]  if existing_parts  else ''
            if shorter.issubset(longer) and last_new == last_existing:
                is_dup = True
                if len(name) > len(existing):
                    seen[i]           = name
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
