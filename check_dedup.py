"""
check_dedup.py
Quick smoke-check for the name deduplication logic.
No Neo4j or API needed.

Run:
    source Extraction/venv/bin/activate
    python check_dedup.py
"""
import sys, types, unittest.mock as mock
sys.path.insert(0, '.')

# --- stub the env-dependent imports so we don't need .env ---
dotenv_mod = mock.MagicMock(); dotenv_mod.load_dotenv = lambda: None
sys.modules['dotenv'] = dotenv_mod
config_stub = types.ModuleType('shared.config')
config_stub.ORG_KEYWORDS = {'LTD','PVT','BANK','CORP','LIMITED','INC','TRUST','HOSPITAL'}
config_stub.DISTRICT_OVERRIDES = {}
config_stub.EXTRACTION_MODEL = 'test'; config_stub.EXTRACT_URL = 'http://test'; config_stub.NVIDIA_HEADERS = {}
sys.modules['shared'] = types.ModuleType('shared'); sys.modules['shared.config'] = config_stub
for m in ['requests','tenacity','Extraction.models','Extraction.models.entities']:
    sys.modules[m] = mock.MagicMock()

from Extraction.utils.helpers import normalize_name, normalize_name_canonical, dedup_advocates
from Extraction.llm_extraction import score_pair

SEP = "-" * 60

# ── 1. normalize_name: title stripping ──────────────────────────
print(SEP)
print("1. TITLE STRIPPING  (normalize_name)")
print(SEP)
names = [
    "Justice M. A. Shinde",
    "Shri Ramesh Kumar",
    "Smt. Priya Devi",
    "Adv. R. K. Joshi",
    "Dr. Ajay Mehta",
    "M. A. Shinde",          # no title — should be unchanged in structure
]
for n in names:
    print(f"  {n!r:40s}  →  {normalize_name(n)!r}")

# ── 2. normalize_name_canonical: blocking key (surname) ─────────
print()
print(SEP)
print("2. BLOCKING KEY  (normalize_name_canonical)")
print(SEP)
pairs = [
    ("M. A. Shinde",         "Madhav Arvind Shinde"),
    ("Arvind Madhav Shinde", "Madhav Arvind Shinde"),
    ("Justice R. K. Sharma", "R. K. Sharma"),
]
for a, b in pairs:
    ca = normalize_name_canonical(a)
    cb = normalize_name_canonical(b)
    same_surname = ca['surname'] == cb['surname']
    same_canonical = ca['canonical'] == cb['canonical']
    print(f"  A: {a!r:40s}  surname={ca['surname']!r}  canonical={ca['canonical']!r}")
    print(f"  B: {b!r:40s}  surname={cb['surname']!r}  canonical={cb['canonical']!r}")
    print(f"     same surname={same_surname}   same canonical={same_canonical}")
    print()

# ── 3. score_pair: routing ───────────────────────────────────────
print(SEP)
print("3. FUZZY SCORE + ROUTING  (score_pair)")
print(SEP)
print(f"  {'Score':>6}  {'Route':22}  Pair")
cases = [
    ("M. A. Shinde",          "Madhav Arvind Shinde",   "← THE BUG: initials vs full name"),
    ("Arvind Madhav Shinde",  "Madhav Arvind Shinde",   "word-order swap"),
    ("Justice R. K. Sharma",  "R. K. Sharma",           "title stripped"),
    ("Shri Ramesh Kumar",     "Ramesh Kumar",            "Shri stripped"),
    ("Suresh Kumar Patil",    "Suresh Anil Patil",       "different middle name → LLM"),
    ("Ramesh Kumar",          "Priya Mehta",             "completely different → reject"),
]
for a, b, label in cases:
    s = score_pair(a, b)
    route = "AUTO MERGE" if s >= 0.92 else ("LLM REVIEW" if s >= 0.60 else "AUTO REJECT")
    print(f"  {s:>6.3f}  {route:22}  {a!r} vs {b!r}  {label}")

# ── 4. dedup_advocates: surname guard ───────────────────────────
print()
print(SEP)
print("4. ADVOCATE DEDUP  (dedup_advocates)")
print(SEP)
advs = [
    {"name": "Suresh Patil"},
    {"name": "Suresh Kumar Singh"},   # different surname — must NOT merge
    {"name": "Suresh Kumar Patil"},   # same surname, longer — should replace Suresh Patil
    {"name": "Priya Mehta"},
]
result = dedup_advocates(advs)
print("  Input: ", [a['name'] for a in advs])
print("  Output:", [a['name'] for a in result])
print("  (Suresh Patil + Suresh Kumar Patil → merged to longer)")
print("  (Suresh Kumar Singh kept separate — different surname)")
