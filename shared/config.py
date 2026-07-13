"""
shared/config.py
Single source of truth for all environment variables and application constants.

All os.environ[] calls are intentionally unguarded — the application will raise
a clear KeyError at startup if a required variable is missing from .env.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

# ── Paths ──────────────────────────────────────────────────────────────────
DATASET_ROOT  = Path(os.environ["DATASET_ROOT"])
MANIFEST_PATH = Path("./manifest.csv")
LOG_PATH      = Path("./pipeline.log")

# ── Neo4j ──────────────────────────────────────────────────────────────────
NEO4J_URI      = os.environ["NEO4J_URI"]
NEO4J_USER     = os.environ["NEO4J_USER"]
NEO4J_PASSWORD = os.environ["NEO4J_PASSWORD"]
NEO4J_DATABASE = os.environ["NEO4J_DATABASE"]

# ── Qdrant ─────────────────────────────────────────────────────────────────
QDRANT_URL        = os.environ["QDRANT_URL"]
QDRANT_COLLECTION = os.environ["QDRANT_COLLECTION"]

# ── NVIDIA / LLM ───────────────────────────────────────────────────────────
NVIDIA_API_KEY   = os.environ["NVIDIA_API_KEY"]
EXTRACTION_MODEL = "qwen/qwen3.5-397b-a17b"
VALIDATION_MODEL = "meta/llama-3.1-8b-instruct"
EMBEDDING_MODEL  = "nvidia/nv-embedqa-e5-v5"            # confirmed working
AGENT_MODEL      = "qwen/qwen3.5-122b-a10b"         # supports function calling, fast
INTENT_MODEL     = "meta/llama-3.1-8b-instruct"
REASONING_MODEL  = "qwen/qwen3-coder-480b-a35b-instruct"
EMBED_DIM        = 2048
EXTRACT_URL      = "https://integrate.api.nvidia.com/v1/chat/completions"
EMBED_URL        = "https://integrate.api.nvidia.com/v1/embeddings"
RERANK_URL       = "https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking"
NVIDIA_HEADERS   = {
    "Authorization": f"Bearer {NVIDIA_API_KEY}",
    "Accept"       : "application/json",
    "Content-Type" : "application/json",
}

# ── Domain constants ───────────────────────────────────────────────────────
DISTRICT_OVERRIDES = {
    "mumbai cmm courts"          : "Mumbai",
    "mumbai city civil courts"   : "Mumbai",
    "chennai city civil courts"  : "Chennai",
    "delhi district courts"      : "Delhi",
    "bangalore city civil courts": "Bangalore",
}

JUNK_ACTS = {}

FINANCIAL_CASE_TYPES = {
    "secu. case", "securitisation", "ep", "cs", "coma", "arb", "execution",
}

ORG_KEYWORDS = {
    "LTD", "LIMITED", "PVT", "PRIVATE", "BANK", "SERVICES", "HOSTEL",
    "CORPORATION", "CORP", "BOARD", "AUTHORITY", "DEPARTMENT", "DEPT",
    "SOCIETY", "TRUST", "COOPERATIVE", "FIRM", "COMPANY", "INDUSTRIES",
    "ENTERPRISES", "FINANCE", "CAPITAL", "FINANCIAL", "INSURANCE",
    "ASSOCIATION", "COMMITTEE", "COUNCIL", "FOUNDATION", "INSTITUTE",
    "UNIVERSITY", "HOSPITAL", "CLINIC", "SCHOOL", "COLLEGE", "ACADEMY",
    "NBFC", "HOLDINGS",
}

# ── Pipeline ───────────────────────────────────────────────────────────────
N_CASES = 1  # number of pending cases to process per run
