"""
config/config.py
All environment variables, API keys, model names, and domain constants.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ── Paths ──────────────────────────────────────────────────────────────────
DATASET_ROOT  = Path(os.getenv('DATASET_ROOT'))
MANIFEST_PATH = Path('./manifest.csv')
LOG_PATH      = Path('./pipeline.log')

# ── Neo4j ──────────────────────────────────────────────────────────────────
NEO4J_URI      = os.getenv('NEO4J_URI',      'bolt://localhost:7687')
NEO4J_USER     = os.getenv('NEO4J_USER',     'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'password')

# ── NVIDIA / LLM ───────────────────────────────────────────────────────────
NVIDIA_API_KEY   = os.getenv('NVIDIA_API_KEY', 'nvapi-...')
EXTRACTION_MODEL = 'mistralai/mistral-large-3-675b-instruct-2512'
VALIDATION_MODEL = 'meta/llama-3.1-8b-instruct'
EMBEDDING_MODEL  = 'nvidia/llama-3.2-nemoretriever-300m-embed-v1'
EMBED_DIM        = 2048
EXTRACT_URL      = 'https://integrate.api.nvidia.com/v1/chat/completions'
EMBED_URL        = 'https://integrate.api.nvidia.com/v1/embeddings'
RERANK_URL       = 'https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking'
NVIDIA_HEADERS   = {
    'Authorization': f'Bearer {NVIDIA_API_KEY}',
    'Accept'       : 'application/json',
    'Content-Type' : 'application/json',
}

# ── Domain constants ───────────────────────────────────────────────────────
DISTRICT_OVERRIDES = {
    'mumbai cmm courts'         : 'Mumbai',
    'mumbai city civil courts'  : 'Mumbai',
    'chennai city civil courts' : 'Chennai',
    'delhi district courts'     : 'Delhi',
    'bangalore city civil courts': 'Bangalore',
}

JUNK_ACTS = {}

FINANCIAL_CASE_TYPES = {
    'secu. case', 'securitisation', 'ep', 'cs', 'coma', 'arb', 'execution',
}

ORG_KEYWORDS = {
    'LTD', 'LIMITED', 'PVT', 'PRIVATE', 'BANK', 'SERVICES', 'HOSTEL',
    'CORPORATION', 'CORP', 'BOARD', 'AUTHORITY', 'DEPARTMENT', 'DEPT',
    'SOCIETY', 'TRUST', 'COOPERATIVE', 'FIRM', 'COMPANY', 'INDUSTRIES',
    'ENTERPRISES', 'FINANCE', 'CAPITAL', 'FINANCIAL', 'INSURANCE',
    'ASSOCIATION', 'COMMITTEE', 'COUNCIL', 'FOUNDATION', 'INSTITUTE',
    'UNIVERSITY', 'HOSPITAL', 'CLINIC', 'SCHOOL', 'COLLEGE', 'ACADEMY',
    'NBFC', 'HOLDINGS',
}

# ── Pipeline ───────────────────────────────────────────────────────────────
N_CASES = 5 # number of pending cases to process per run
