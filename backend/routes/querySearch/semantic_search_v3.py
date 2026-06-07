"""
semantic_search_v3.py

6-stage approval-gated Legal AI RAG pipeline.

Stages (each requires explicit user approval before the next executes):
  Stage 1 : Query Understanding Plan     — intent, entities, sub-queries, scope
  Stage 2 : Retrieval Plan               — vector strategy, graph traversal, filters
  Stage 3 : Retrieved Context Review     — case table, quality flags, coverage
  Stage 4 : Generation Plan              — answer structure, source allocation, citations
  Final   : Generate Answer              — grounded, citation-rich legal prose

Session state machine per chat_id:
  idle -> stage1_shown -> stage2_shown -> stage3_shown -> stage4_shown -> final_shown -> idle

Rules:
  - If the user's message is exactly "approve" (case-insensitive) the current stage advances.
  - Any other text is treated as a correction and re-generates the current stage plan.
  - A fresh query on an idle session always starts at Stage 1.

SSE event format (identical to v2 — no frontend changes needed):
  data: {"mode": "thinking",  "message": "<progress text>"}
  data: {"mode": "response",  "message": "<text token>"}
  data: {"mode": "metadata",  "message": "<json string>"}
  data: [DONE]
"""

from __future__ import annotations

import json
import logging
import os
import re
import uuid
from datetime import datetime
from typing import Generator, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()
logger = logging.getLogger(__name__)

router = APIRouter()

# ---------------------------------------------------------------------------
# NVIDIA / LangChain config
# ---------------------------------------------------------------------------

NVIDIA_API_KEY  = os.getenv("NVIDIA_API_KEY", "")
EMBED_MODEL     = "nvidia/nv-embedqa-e5-v5"
PLAN_MODEL      = "meta/llama-3.3-70b-instruct"   # all stage plans
ANSWER_MODEL    = "meta/llama-3.3-70b-instruct"   # final answer

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings

    _plan_llm = ChatNVIDIA(
        model=PLAN_MODEL, api_key=NVIDIA_API_KEY,
        max_tokens=1500, temperature=0.1,
    )
    _answer_llm = ChatNVIDIA(
        model=ANSWER_MODEL, api_key=NVIDIA_API_KEY,
        max_tokens=3000, temperature=0.15,
    )
    _cypher_llm = ChatNVIDIA(
        model=PLAN_MODEL, api_key=NVIDIA_API_KEY,
        max_tokens=600, temperature=0.0,
    )
    _embeddings = NVIDIAEmbeddings(
        model=EMBED_MODEL, api_key=NVIDIA_API_KEY, truncate="END",
    )
    LANGCHAIN_OK = True
except Exception as _lc_err:
    logger.error("LangChain/NVIDIA init failed: %s", _lc_err)
    LANGCHAIN_OK = False

# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

# chat_id -> session dict
chat_sessions: dict = {}

# Possible stage values
STAGE_IDLE         = "idle"
STAGE_1_SHOWN      = "stage1_shown"
STAGE_2_SHOWN      = "stage2_shown"
STAGE_3_SHOWN      = "stage3_shown"
STAGE_4_SHOWN      = "stage4_shown"
STAGE_FINAL_DONE   = "final_done"

# Simple lookup path (neo4j_direct): after Stage 2 approval the answer
# is generated directly without Stage 3 or Stage 4.
STAGE_LOOKUP_SHOWN = "lookup_shown"

# Bucket values stored in session["bucket"]
BUCKET_METADATA = "METADATA_LOOKUP"
BUCKET_SEMANTIC = "SEMANTIC_SEARCH"
BUCKET_HYBRID   = "HYBRID"

TOP_N_CASES  = 7
TOTAL_BUDGET = 14_000  # max chars for synthesis context

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class CreateSearchRequest(BaseModel):
    query: str
    filters: Optional[dict] = None
    limit: Optional[int] = 10
    offset: Optional[int] = 0

class ChatMessageRequest(BaseModel):
    chat_id: str
    query: str

# ---------------------------------------------------------------------------
# SSE helpers
# ---------------------------------------------------------------------------

def _sse(mode: str, message: str) -> str:
    return f"data: {json.dumps({'mode': mode, 'message': message})}\n\n"

def _thinking(msg: str) -> str:
    return _sse("thinking", msg)

def _token(text: str) -> str:
    return _sse("response", text)

def _metadata_event(job_id: str, enriched: list[dict]) -> str:
    sources = [
        {
            "case_id":   c.get("cnr", ""),
            "case_no":   c.get("case_number", ""),
            "case_type": c.get("case_type", ""),
            "court":     c.get("court_name", ""),
            "title":     f"{c.get('case_number','?')} ({c.get('cnr','')})",
        }
        for c in enriched
    ]
    citations = [
        {"title": s["title"], "url": f"/entity/case/{s['case_id']}"}
        for s in sources
    ]
    payload = {"job_id": job_id, "citations": citations, "sources": sources}
    return _sse("metadata", json.dumps(payload))

# ---------------------------------------------------------------------------
# Graph schema (used in Cypher prompt)
# ---------------------------------------------------------------------------

_GRAPH_SCHEMA = """\
=== NODE LABELS & PROPERTIES ===

Case
  id, cnr_number, case_number, case_type, status, stage, district, state,
  filing_date, filing_year, registration_date, decision_date,
  first_hearing_date, last_hearing_date, next_hearing_date,
  type_of_disposal, search_summary

Person
  id, name, name_norm, is_judge, name_source

Court
  id, name, court_code, court_type, district, state

Act
  id, name, name_norm

Hearing
  id, last_hearing_date, purpose, business_notes, nature_of_disposal, judge_designation

Document
  id, order_number, order_type, order_date, extraction_status, storage_id

Asset
  id, asset_type, description, identifier, chassis_number, engine_number

Chunk
  id, text, cnr_number, chunk_index

=== RELATIONSHIPS ===

(Person)-[:JUDGE_IN]-(Case)
(Person)-[:PETITIONER_IN]-(Case)
(Person)-[:RESPONDENT_IN]-(Case)
(Person)-[:ADVOCATE_FOR]-(Case)
(Person)-[:WITNESS_IN]-(Case)
(Person)-[:VICTIM_IN]-(Case)
(Person)-[:COMPLAINANT_IN]-(Case)
(Person)-[:RELATED_PERSON_IN]-(Case)
(Person)-[:ESTABLISHMENT_IN]-(Case)
(Person)-[:NGO_IN]-(Case)
(Person)-[:DIRECTOR_PETITIONER_IN]-(Case)
(Person)-[:DIRECTOR_DEFENDANT_IN]-(Case)

(Case)-[:HEARD_IN]->(Court)
(Case)-[:INVOKES]->(Act)
(Case)-[:HAS_HEARING]->(Hearing)
(Case)-[:HAS_DOCUMENT]->(Document)
(Case)-[:HAS_ASSET]->(Asset)
(Case)-[:HAS_CHUNK]->(Chunk)"""

# ---------------------------------------------------------------------------
# Stage 1 prompt — Query Understanding Plan
# ---------------------------------------------------------------------------

_STAGE1_SYSTEM = """\
You are an expert Legal AI assistant for Indian law.
Your task is to analyse a user's legal query and produce a Query Understanding Plan.
Do NOT execute any retrieval. Only analyse and plan.
Output ONLY the plan — no preamble, no extra text outside the plan."""

_STAGE1_PROMPT = """\
The user has submitted the following legal query:
\"\"\"{user_query}\"\"\"

{correction_note}

Analyse this query and produce the Query Understanding Plan in the exact format below.
Use plain text — no emojis.

---
QUERY UNDERSTANDING PLAN - Please Review

Query received: "{user_query}"

STEP A - QUERY BUCKET
Classify into exactly one of:

  METADATA_LOOKUP   - asks for a specific stored field value
                      (CNR number, filing date, judge name, case status,
                       party list, next hearing date, case number, court name)
                      Answer is a direct database field, not document text.
                      Signal words: "what is the CNR", "who is the judge of",
                      "when was filed", "case number of", "list cases of party X"

  SEMANTIC_SEARCH   - asks for meaning, reasoning, interpretation, or patterns
                      Answer lives in document text content.
                      Signal words: "how did", "what was the reasoning",
                      "explain", "held", "argued", "compare", "correlate"

  HYBRID            - needs both a specific case by ID AND its document content
                      Example: "What was the judgment reasoning in Case 102/2019?"

Query bucket: [METADATA_LOOKUP / SEMANTIC_SEARCH / HYBRID]
Reason: [one sentence]

STEP B - RETRIEVAL STRATEGY

Based on bucket assign strategy:
  METADATA_LOOKUP -> neo4j_direct
  SEMANTIC_SEARCH -> vector_then_graph OR vector_only
  HYBRID          -> neo4j_direct_then_vector

Retrieval strategy: [neo4j_direct / vector_only / vector_then_graph / neo4j_direct_then_vector]
Why: [one sentence]

STEP C - ENTITIES

  Case identifiers  : [exact case numbers, CNR numbers, or "None"]
  Metadata fields   : [exact field names being asked for, or "None"
                       e.g. cnr_number / filing_date / judge_name /
                       case_status / next_hearing_date / act_name]
  Statutes          : [list or "None"]
  Concepts          : [list or "None"]
  Courts            : [list or "All"]
  Parties           : [list or "None"]
  Time range        : [range or "None"]

STEP D - SUB-QUERIES

[If METADATA_LOOKUP write:]
  No sub-queries needed. Single direct lookup:
    identifier: [case_number / cnr_number / party_name etc. = value]
    return field: [field being asked for]

[If SEMANTIC_SEARCH or HYBRID write 2-3 sub-queries:]
  1. [sub-query 1]
  2. [sub-query 2]

STEP E - PIPELINE ROUTE

  neo4j_direct             -> SIMPLE   (2 steps total: this plan + direct answer)
  vector_only              -> MODERATE (4 steps)
  vector_then_graph        -> FULL     (6 steps)
  neo4j_direct_then_vector -> MODERATE (4 steps)

Pipeline route: [SIMPLE / MODERATE / FULL]
Steps remaining after approval: [number]

Ambiguities (if any):
  - [ambiguity] -> Assumed: [assumption]

Does this match your intent?
  [approve] to proceed to retrieval plan
  [correction text] to revise this plan
---"""

# ---------------------------------------------------------------------------
# Stage 2 prompt — Retrieval Plan
# ---------------------------------------------------------------------------

_STAGE2_SYSTEM = """\
You are an expert Legal AI assistant for Indian law.
Given an approved Query Understanding Plan, produce the exact Retrieval Plan.
Do NOT retrieve anything yet. Only plan.
Output ONLY the plan — no preamble, no extra text outside the plan."""

_STAGE2_PROMPT = """\
The user has approved the following Query Understanding Plan:
\"\"\"{stage1_plan}\"\"\"

{correction_note}

Read the "Retrieval strategy" field from Stage 1 carefully before writing anything.

CORE RULE:
  If strategy = neo4j_direct:
    DO NOT write any vector search section.
    DO NOT set any similarity threshold.
    DO NOT plan any reranking.
    Write ONLY the Cypher query plan.

  If strategy involves vector:
    Write the vector search section.
    Skip vector section if strategy = neo4j_direct.

Produce the Retrieval Plan in the exact format below.
Use plain text — no emojis.

---
RETRIEVAL PLAN - Please Review

Strategy: [copy strategy value from Stage 1]

[SECTION A — only if strategy = neo4j_direct OR neo4j_direct_then_vector]
CYPHER QUERY PLAN

  Primary query:
    MATCH (c:Case)
    WHERE [most specific condition using identifier from Stage 1]
       OR [fallback CONTAINS condition]
    RETURN [only the field(s) the user asked for, plus c.case_number for confirmation]
    LIMIT 5

  Fallback query (runs automatically if primary returns 0 results):
    MATCH (c:Case)
    WHERE [fuzzy regex condition e.g. c.case_number =~ ".*102.*2019.*"]
    RETURN [same fields]
    LIMIT 10

  Vector search : Not needed
  Reranking     : Not needed
  Threshold     : Not applicable
  Reason        : [field name] is a stored node property — direct lookup is exact and instant.

[SECTION B — only if strategy involves vector search]
VECTOR SEARCH PLAN

  Node level     : [Chunk / Document / Case]
  Top-K raw      : [20-50]
  Min threshold  : [0.65-0.75]

  Per sub-query (copy text from Stage 1 sub-queries section):
    1. [sub-query 1 text] -> node: [X], threshold: [Y]
    2. [sub-query 2 text] -> node: [X], threshold: [Y]

  Graph expansion:
    Edges  : [list or "None"]
    Depth  : [1-3]

  Filters:
    Court    : [value or "None"]
    Year     : [range or "None"]
    Doc type : [value or "None"]

  Reranking:
    Method   : cross-encoder
    Final K  : [15-25]
    Boosts   : [list or "None"]

ESTIMATED RESULT
  [if neo4j_direct:]
    Expected output : 1 node, field: [field name]
    If 0 results    : fallback query runs automatically

  [if vector:]
    Raw candidates  : ~[N] chunks
    After reranking : top [K]
    Expected cases  : ~[N]

Should I proceed with this retrieval?
  [approve] to execute retrieval
  [correction text] to adjust this plan
---"""

# ---------------------------------------------------------------------------
# Stage 3 prompt — Context Review
# ---------------------------------------------------------------------------

_STAGE3_SYSTEM = """\
You are an expert Legal AI assistant for Indian law.
Given retrieved case data, produce a Context Review summary for the user.
Do NOT generate a final answer yet.
Output ONLY the review — no preamble, no extra text outside the review."""

_STAGE3_PROMPT = """\
The retrieval has been executed. Here is a summary of the retrieved cases:

{retrieved_summary}

Original query: "{user_query}"
Approved intent: {intent}

{jurisdiction_warning}

Produce the Context Review in the exact format below.
Apply these quality flags automatically:
  - Semantic similarity < 0.70 -> LOW_RELEVANCE (use the "Semantic similarity" field, not Signal)
  - Signal = "graph-only" (no Qdrant match) -> STRUCTURAL_ONLY — mention this means no semantic text match
  - year < 2000 (if a time filter was active) -> OLD_PRECEDENT
  - graph_distance > 1 -> INDIRECT
Use plain text — no emojis.

---
RETRIEVED CONTEXT SUMMARY - Please Review Before Generation

NOTE: Cases with semantic similarity below 0.70 have been AUTO-EXCLUDED and will NOT appear
in the final answer. Only the cases listed below passed the relevance threshold and will be used.

Cases retained for generation: [N]
Cases auto-excluded (low relevance): [list their case numbers, or "None"]

Case breakdown (retained cases only):
Use the "Semantic similarity" and "Chunks retrieved" values from the data above — do not invent numbers.
| Case (Court, Year)    | Semantic Similarity | Chunks | Relevance reason                  |
|-----------------------|---------------------|--------|-----------------------------------|
| [Case A] (SC, 2021)   | 0.847               |   3    | [why this case matches the query] |

Flags on retained cases (if any):
  - [Case Y] -> STRUCTURAL_ONLY — no text match, structural signal only
  - [Case Z] -> OLD_PRECEDENT — include with caution

Relationships:
  - [Case A] invokes [Act/Section] relevant to query
  - [Case B] and [Case C] both involve [common element]

Coverage:
  - Sub-query 1: [covered by which retained cases or "Not covered"]
  - Sub-query 2: [covered by which retained cases or "Partially covered"]

Proceed to generate?
  [approve] to generate answer using retained cases only
  [correction text] to override exclusions or retrieve more
---"""

# ---------------------------------------------------------------------------
# Stage 4 prompt — Generation Plan
# ---------------------------------------------------------------------------

_STAGE4_SYSTEM = """\
You are an expert Legal AI assistant for Indian law.
Given approved context cases, produce a Generation Plan.
Do NOT write the final answer yet.
Output ONLY the plan — no preamble, no extra text outside the plan."""

_STAGE4_PROMPT = """\
The user has approved the following cases for use in the final answer:

{approved_cases_summary}

Context review flags from Stage 3 (these directly inform your Confidence rating):
{stage3_flags_summary}

Original query: "{user_query}"
Intent: {intent}

Produce the Generation Plan in the exact format below.
Use plain text — no emojis.

---
GENERATION PLAN - Please Review

Answer structure (based on intent "{intent}"):
  1. [Section name] — [what this section will cover]
  2. [Section name] — [what this section will cover]
  3. [Section name] — [what this section will cover]

Source allocation:
  Section 1 -> [Case A] + [Case B]
  Section 2 -> [Case C]
  Section 3 -> [all cases]

Citation format: Inline
  Example: "...the court held that... [Case Number, Court, Year]"

Conflict handling:
  - [Case A] (Supreme Court) vs [Case B] (High Court) on [point] -> SC view prevails
  - (or "No conflicts detected")

Confidence: [HIGH / MEDIUM / LOW] — [reason based on the Stage 3 flags above;
  if most cases were flagged LOW_RELEVANCE or STRUCTURAL_ONLY, confidence must be LOW or MEDIUM]

Generate the final answer?
  [approve] to generate
  [correction text] to change structure or add/remove sections
---"""

# ---------------------------------------------------------------------------
# Final answer prompt
# ---------------------------------------------------------------------------

_FINAL_SYSTEM = """\
You are an expert Legal AI assistant for Indian law.
Generate the final legal answer following ALL rules below strictly.

ACCURACY RULES:
1. Every factual claim MUST be backed by a specific case in the provided context.
2. Do NOT infer, extrapolate, or introduce any case, statute, or holding not present in the approved context.
3. If context is insufficient for a section, write: "Note: Insufficient retrieved context to answer this aspect reliably."

CITATION RULES:
4. Every holding or legal principle must have an inline citation.
   Use EXACTLY the text on the "CITE-AS:" line of that case block — copy it character for character.
   Example: if the block says  CITE-AS: [CC/100/2020, CMM Court Mumbai, 2020]
            your citation must be  [CC/100/2020, CMM Court Mumbai, 2020]
   NEVER substitute a different year, court name, or case number.
   NEVER derive the year from the filing date, decision date, or any other field.
   If the CITE-AS tag contains "year-unknown", write "year-unknown" in the citation.
5. Stay close to the actual language of the retrieved case data. Do not over-paraphrase.

CONFLICT RULES:
6. If cases conflict: state both positions clearly, identify which prevails by court hierarchy (Supreme Court > High Court > District Court). If same level, state the point is unsettled.

STRUCTURE RULES:
7. Follow the approved answer structure exactly. Use the approved section headings.

CONFIDENCE FOOTER:
8. End every answer with:
   ---
   Answer confidence: [HIGH / MEDIUM / LOW]
   Sources used: {case_count} cases, {chunk_count} chunks
   Auto-excluded (low relevance): {excluded_nos}
   Gaps: [unresolved sub-queries or "None"]
   ---
   Use EXACTLY the numbers {case_count} and {chunk_count} and the excluded list {excluded_nos} — do not change them.

Write in clear, formal legal prose suitable for a practising lawyer."""

_FINAL_PROMPT = """\
Original query: "{user_query}"
Intent: {intent}
Approved answer structure:
{generation_plan}

Case context (approved only):
{context}

Generate the final answer following all rules in the system prompt."""

# ---------------------------------------------------------------------------
# Cypher generation (same safe pattern as v2)
# ---------------------------------------------------------------------------

_CYPHER_PROMPT = """\
You are a Neo4j Cypher expert for an Indian legal case knowledge graph.

{schema}

Rules:
- Use ONLY MATCH, OPTIONAL MATCH, WHERE, WITH, RETURN, ORDER BY, LIMIT, COLLECT, COUNT.
- NEVER use CREATE, MERGE, SET, DELETE, REMOVE, DROP.
- Always include in RETURN: c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary
- End with LIMIT 10. Use toLower() for ALL text comparisons.
- Output ONLY the raw Cypher query. No markdown fences, no comments.

User query: {query}

Cypher:"""

_DANGEROUS_KW = ("create ", "merge ", "set ", "delete ", "detach ", "remove ", "drop ")


def _validate_cypher(cypher: str) -> bool:
    low = cypher.lower()
    return not any(kw in low for kw in _DANGEROUS_KW)


def _extract_cypher(text: str) -> str:
    text = text.strip()
    m = re.search(r"```(?:cypher)?\s*([\s\S]+?)```", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    m2 = re.search(r"(?i)((?:MATCH|CALL)\b[\s\S]+)", text)
    if m2:
        return m2.group(1).strip()
    return text


def _cypher_search(db, query: str) -> list[tuple[str, float]]:
    if not LANGCHAIN_OK:
        return []
    try:
        prompt = _CYPHER_PROMPT.format(schema=_GRAPH_SCHEMA, query=query)
        raw = _cypher_llm.invoke(prompt).content
        cypher = _extract_cypher(raw)
        if not _validate_cypher(cypher):
            logger.warning("Cypher safety check failed")
            return []
        try:
            rows = db.run(cypher).data()[:10]
        except Exception as run_err:
            logger.warning("Cypher run error: %s", run_err)
            return []
        return [(str(r["case_id"]), 0.7) for r in rows if r.get("case_id")]
    except Exception as e:
        logger.warning("Cypher search failed: %s", e)
        return []

# ---------------------------------------------------------------------------
# Qdrant helpers (same as v2)
# ---------------------------------------------------------------------------

def _qdrant_rag(query: str, top_k: int = 20) -> list[tuple[str, float, str]]:
    if not LANGCHAIN_OK:
        return []
    try:
        from backend.qdrant_store import get_qdrant, COLLECTION
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue

        vec = _embeddings.embed_query(query)
        results = get_qdrant().query_points(
            collection_name=COLLECTION,
            query=vec,
            limit=top_k,
            with_payload=True,
        ).points
        return [
            (r.payload["case_id"], float(r.score), r.payload["chunk_text"])
            for r in results
            if r.payload and r.payload.get("case_id")
        ]
    except Exception as e:
        logger.error("Qdrant RAG failed: %s", e)
        return []


def _qdrant_case_chunks(case_id: str, query: str, top_k: int = 3) -> list[str]:
    if not LANGCHAIN_OK:
        return []
    try:
        from backend.qdrant_store import get_qdrant, COLLECTION
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue

        vec = _embeddings.embed_query(query)
        results = get_qdrant().query_points(
            collection_name=COLLECTION,
            query=vec,
            limit=top_k,
            with_payload=["chunk_text"],
            query_filter=Filter(must=[FieldCondition(key="case_id", match=MatchValue(value=case_id))]),
        ).points
        return [r.payload["chunk_text"] for r in results if r.payload]
    except Exception as e:
        logger.warning("qdrant_case_chunks failed for %s: %s", case_id, e)
        return []

# ---------------------------------------------------------------------------
# Neo4j enrichment (same subgraph query as v2)
# ---------------------------------------------------------------------------

_ENRICH_CYPHER = """\
MATCH (c:Case {id: $cid})
OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
OPTIONAL MATCH (judge:Person)-[:JUDGE_IN]-(c)
OPTIONAL MATCH (pet:Person)-[:PETITIONER_IN]-(c)
OPTIONAL MATCH (resp:Person)-[:RESPONDENT_IN]-(c)
OPTIONAL MATCH (adv:Person)-[:ADVOCATE_FOR]-(c)
OPTIONAL MATCH (wit:Person)-[:WITNESS_IN]-(c)
OPTIONAL MATCH (vict:Person)-[:VICTIM_IN]-(c)
OPTIONAL MATCH (comp:Person)-[:COMPLAINANT_IN]-(c)
OPTIONAL MATCH (c)-[:INVOKES]->(act:Act)
OPTIONAL MATCH (c)-[:HAS_HEARING]->(h:Hearing)
OPTIONAL MATCH (c)-[:HAS_ASSET]->(asset:Asset)
RETURN
  c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number,
  c.case_type AS case_type, c.status AS status, c.stage AS stage,
  c.district AS district, c.state AS state,
  c.filing_date AS filing_date, c.search_summary AS summary,
  court.name AS court_name, court.court_type AS court_type, court.district AS court_district,
  collect(DISTINCT judge.name)  AS judges,
  collect(DISTINCT pet.name)    AS petitioners,
  collect(DISTINCT resp.name)   AS respondents,
  collect(DISTINCT adv.name)    AS advocates,
  collect(DISTINCT wit.name)    AS witnesses,
  collect(DISTINCT vict.name)   AS victims,
  collect(DISTINCT comp.name)   AS complainants,
  collect(DISTINCT act.name)    AS acts,
  collect(DISTINCT {date: h.last_hearing_date, purpose: h.purpose,
                    notes: h.business_notes, disposal: h.nature_of_disposal}) AS hearings,
  collect(DISTINCT {type: asset.asset_type, description: asset.description,
                    identifier: asset.identifier}) AS assets
"""


def _clean_names(lst: list) -> list[str]:
    seen, out = set(), []
    for item in (lst or []):
        s = str(item).strip() if item else ""
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def _enrich_case(db, case_id: str, query: str = "") -> dict:
    try:
        row = db.run(_ENRICH_CYPHER, cid=case_id).single()
        if not row:
            return {}
        d = dict(row)
        d["chunks"] = _qdrant_case_chunks(case_id, query, top_k=3) if query else []
        for f in ("judges", "petitioners", "respondents", "advocates",
                  "witnesses", "victims", "complainants", "acts"):
            d[f] = _clean_names(d.get(f) or [])
        d["hearings"] = [h for h in (d.get("hearings") or []) if any(v for v in h.values())]
        d["assets"]   = [a for a in (d.get("assets")   or []) if any(v for v in a.values())]
        return d
    except Exception as e:
        logger.warning("Enrich failed for %s: %s", case_id, e)
        return {}

# ---------------------------------------------------------------------------
# Context builder (proportional budget, same as v2)
# ---------------------------------------------------------------------------

def _fmt_list(label: str, items: list[str]) -> str:
    if not items:
        return ""
    return f"  {label}: {', '.join(items[:8])}\n"


def _fmt_hearings(hearings: list[dict]) -> str:
    if not hearings:
        return ""
    lines = ["  Hearings:"]
    for h in hearings[:5]:
        parts = []
        if h.get("date"):   parts.append(h["date"])
        if h.get("purpose"):parts.append(h["purpose"])
        if h.get("notes"):  parts.append(h["notes"][:120])
        if parts:
            lines.append("    - " + " | ".join(parts))
    return "\n".join(lines) + "\n"


def _fmt_assets(assets: list[dict]) -> str:
    if not assets:
        return ""
    lines = ["  Assets:"]
    for a in assets[:4]:
        desc = a.get("description") or a.get("type") or ""
        idf  = a.get("identifier") or ""
        if desc or idf:
            lines.append(f"    - {desc} {idf}".strip())
    return "\n".join(lines) + "\n"


_KNOWN_JURISDICTIONS = [
    "delhi", "mumbai", "maharashtra", "pune", "nagpur", "aurangabad",
    "kolkata", "bengaluru", "bangalore", "chennai", "hyderabad",
    "ahmedabad", "gujarat", "rajasthan", "kerala", "punjab", "haryana",
    "uttar pradesh", "madhya pradesh", "bihar", "jharkhand", "odisha",
]


def _jurisdiction_gap_warning(stage1_plan: str, enriched: list[dict]) -> str:
    """
    Compare the jurisdictions mentioned in the Stage 1 plan against the
    district/state fields of every retrieved case.
    Returns a warning string if any mentioned jurisdiction has zero retrieved cases,
    empty string otherwise.
    """
    plan_lower = stage1_plan.lower()
    mentioned = [j for j in _KNOWN_JURISDICTIONS if j in plan_lower]
    if not mentioned:
        return ""

    # Build a set of all location tokens present in enriched cases
    retrieved_locations: set[str] = set()
    for c in enriched:
        for field in (c.get("district") or "", c.get("state") or "",
                      c.get("court_name") or "", c.get("court_district") or ""):
            retrieved_locations.add(field.lower())

    missing = [
        j for j in mentioned
        if not any(j in loc for loc in retrieved_locations)
    ]
    if not missing:
        return ""

    return (
        "JURISDICTION GAP DETECTED: The query mentions the following jurisdiction(s) "
        f"that have NO retrieved cases: {', '.join(missing).title()}. "
        "Flag this explicitly in the Coverage section and recommend the user either "
        "correct the retrieval or acknowledge the gap before generating."
    )


def _all_flagged_warning(
    enriched: list[dict],
    scores: dict[str, float],
    vec_scores: dict[str, float],
) -> str:
    """
    Returns a hard warning if every retrieved case has a Qdrant cosine
    similarity below 0.70 (all LOW_RELEVANCE). This tells the LLM to
    surface a strong caution in the Coverage section rather than
    silently proceeding.
    """
    if not enriched:
        return ""
    low_threshold = 0.70
    flagged = [
        c for c in enriched
        if vec_scores.get(c.get("case_id", ""), 1.0) < low_threshold
    ]
    if len(flagged) == len(enriched):
        return (
            "ALL-CASES-LOW-RELEVANCE WARNING: Every retrieved case has a semantic "
            f"similarity score below {low_threshold}. This means the vector search "
            "did not find any strongly matching case text for this query. "
            "The cases were retrieved structurally via Cypher, not semantically. "
            "You MUST prominently state this limitation in the Coverage section "
            "and strongly recommend the user either rephrase the query or acknowledge "
            "that the answer will be based on structural matches only, not text similarity."
        )
    return ""


LOW_RELEVANCE_THRESHOLD = 0.70


def _filter_relevant_cases(
    enriched: list[dict],
    vec_scores: dict[str, float],
    override_threshold: bool = False,
) -> tuple[list[dict], list[dict]]:
    """
    Split enriched cases into (relevant, excluded).

    Kept:   cosine score >= LOW_RELEVANCE_THRESHOLD
    Kept:   graph-only cases (no cosine score) ONLY when no cosine-scored case exists at all
    Dropped: cosine score < LOW_RELEVANCE_THRESHOLD (LOW_RELEVANCE)

    Returns (relevant_cases, excluded_cases).
    """
    # When user explicitly overrides, keep everything regardless of score
    if override_threshold:
        return enriched, []

    has_any_cosine = any(c.get("case_id", "") in vec_scores for c in enriched)

    relevant, excluded = [], []
    for c in enriched:
        cid    = c.get("case_id", "")
        cosine = vec_scores.get(cid, None)

        if cosine is None:
            # Graph-only case: keep only when there are zero cosine matches
            if has_any_cosine:
                excluded.append(c)
            else:
                relevant.append(c)
        elif cosine >= LOW_RELEVANCE_THRESHOLD:
            relevant.append(c)
        else:
            excluded.append(c)

    return relevant, excluded


def _extract_year(date_str: str) -> str:
    """Pull a 4-digit year out of any date string. Returns '' if none found."""
    m = re.search(r"\b(19|20)\d{2}\b", date_str)
    return m.group(0) if m else ""


def _build_synthesis_context(enriched: list[dict], scores: dict[str, float]) -> str:
    if not enriched:
        return "No relevant cases found."
    total_score = sum(scores.get(c.get("case_id", ""), 0.5) for c in enriched) or 1.0
    parts = []
    for i, c in enumerate(enriched, 1):
        cid    = c.get("case_id", "")
        score  = scores.get(cid, 0.5)
        budget = max(int(TOTAL_BUDGET * (score / total_score)), 800)

        decision_year = _extract_year(str(c.get("decision_date") or ""))
        filing_year   = _extract_year(str(c.get("filing_date") or ""))
        cite_year     = decision_year or filing_year or "year-unknown"

        block  = f"### Case {i}: {c.get('case_number', 'N/A')} | CNR: {c.get('cnr', 'N/A')}\n"
        block += f"  CITE-AS: [{c.get('case_number','N/A')}, {c.get('court_name','?')}, {cite_year}]\n"
        block += f"  Status: {c.get('status','?')} | Stage: {c.get('stage','?')} | Type: {c.get('case_type','?')}\n"
        block += f"  Court: {c.get('court_name','?')} ({c.get('court_district','?')})\n"
        block += f"  Filed: {c.get('filing_date') or '?'} | Decision: {c.get('decision_date') or 'not recorded'} | District: {c.get('district','?')}\n"
        block += _fmt_list("Judges",      c.get("judges", []))
        block += _fmt_list("Petitioners", c.get("petitioners", []))
        block += _fmt_list("Respondents", c.get("respondents", []))
        block += _fmt_list("Advocates",   c.get("advocates", []))
        block += _fmt_list("Acts",        c.get("acts", []))
        block += _fmt_list("Witnesses",   c.get("witnesses", []))
        block += _fmt_list("Victims",     c.get("victims", []))
        block += _fmt_list("Complainants",c.get("complainants", []))
        block += _fmt_hearings(c.get("hearings", []))
        block += _fmt_assets(c.get("assets", []))

        summary = (c.get("summary") or "")
        if summary:
            block += f"  Summary: {summary[:400]}\n"

        chunks = c.get("chunks", [])
        remaining = budget - len(block)
        if chunks and remaining > 100:
            block += "  Relevant Excerpts:\n"
            for ch in chunks:
                excerpt = ch[:min(len(ch), remaining // max(len(chunks), 1))]
                block += f"    - {excerpt}\n"

        parts.append(block[:budget])
    return "\n---\n".join(parts)


def _brief_retrieved_summary(
    relevant: list[dict],
    scores: dict[str, float],
    vec_scores: dict[str, float] | None = None,
    excluded: list[dict] | None = None,
) -> str:
    """Summary for Stage 3 prompt. Shows retained cases with real scores,
    and lists auto-excluded cases separately so the user sees both clearly."""
    vec_scores = vec_scores or {}
    excluded   = excluded or []

    def _case_line(c: dict, label: str = "") -> str:
        cid        = c.get("case_id", "")
        merged     = scores.get(cid, 0.0)
        cosine     = vec_scores.get(cid, None)
        acts       = ", ".join(c.get("acts", [])[:3]) or "N/A"
        court      = c.get("court_name", "?")
        n_chunks   = len(c.get("chunks", []))
        signal     = "vector+graph" if cosine and merged == 0.97 else ("graph-only" if not cosine else "vector-only")
        cosine_str = f"{cosine:.3f}" if cosine is not None else "n/a (graph-only)"
        prefix     = f"[{label}] " if label else ""
        return (
            f"{prefix}- {c.get('case_number','?')} | CNR: {c.get('cnr','?')} "
            f"| Court: {court} | Semantic similarity: {cosine_str} | Signal: {signal} "
            f"| Chunks: {n_chunks} | Acts: {acts} "
            f"| Summary: {(c.get('summary') or '')[:200]}"
        )

    lines = ["=== RETAINED CASES (will be used in the answer) ==="]
    if relevant:
        lines += [_case_line(c) for c in relevant]
    else:
        lines.append("None — all cases were below the relevance threshold.")

    if excluded:
        lines.append("\n=== AUTO-EXCLUDED CASES (below 0.70 similarity — will NOT be used) ===")
        lines += [_case_line(c, label="EXCLUDED") for c in excluded]

    return "\n".join(lines)


def _brief_approved_summary(enriched: list[dict]) -> str:
    """For Stage 4 prompt — lists approved cases concisely."""
    lines = []
    for c in enriched:
        lines.append(
            f"- {c.get('case_number','?')} (CNR: {c.get('cnr','?')}) "
            f"| Court: {c.get('court_name','?')} "
            f"| Acts: {', '.join(c.get('acts',[])[:3]) or 'N/A'}"
        )
    return "\n".join(lines) if lines else "No cases."

# ---------------------------------------------------------------------------
# LLM call helpers
# ---------------------------------------------------------------------------

def _invoke_plan(system: str, prompt: str) -> str:
    """Non-streaming plan generation with the 70B model."""
    if not LANGCHAIN_OK:
        return "LangChain/NVIDIA not initialised. Cannot generate plan."
    try:
        full_prompt = f"{system}\n\n{prompt}"
        result = _plan_llm.invoke(full_prompt)
        return result.content.strip()
    except Exception as e:
        logger.error("Plan LLM call failed: %s", e)
        return f"Error generating plan: {e}"


def _stream_answer(system: str, prompt: str) -> Generator[str, None, None]:
    """Streaming final answer generation."""
    if not LANGCHAIN_OK:
        yield _sse("error", "LangChain/NVIDIA not initialised.")
        return
    try:
        full_prompt = f"{system}\n\n{prompt}"
        for chunk in _answer_llm.stream(full_prompt):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                yield _token(token)
    except Exception as e:
        logger.error("Answer streaming error: %s", e)
        yield _sse("error", f"Answer generation error: {e}")

# ---------------------------------------------------------------------------
# Retrieval (Qdrant + Cypher, merged — no self-reflection in approval pipeline)
# ---------------------------------------------------------------------------

def _do_retrieval(db, query: str) -> tuple[list[dict], dict[str, float], dict[str, float]]:
    """
    Run Qdrant RAG + LLM Cypher, enrich top-N cases.
    Returns (enriched_cases, merged_scores, raw_vec_scores).
    merged_scores  — used for context budget allocation (0.97 / 0.88 / cosine).
    raw_vec_scores — the true cosine similarity from Qdrant, shown to the user in Stage 3.
    """
    vec_scores: dict[str, float] = {}

    for cid, score, _ in _qdrant_rag(query, top_k=20):
        if cid not in vec_scores or score > vec_scores[cid]:
            vec_scores[cid] = score

    cyp_scores: dict[str, float] = {}
    for cid, s in _cypher_search(db, query):
        cyp_scores[cid] = max(s, 0.88)

    merged: dict[str, float] = {}
    for cid in set(vec_scores) | set(cyp_scores):
        v = vec_scores.get(cid, 0.0)
        c = cyp_scores.get(cid, 0.0)
        if v > 0 and c > 0:
            merged[cid] = 0.97
        elif c > 0:
            merged[cid] = c
        else:
            merged[cid] = v

    top_ids  = sorted(merged, key=lambda x: merged[x], reverse=True)[:TOP_N_CASES]
    enriched = [_enrich_case(db, cid, query) for cid in top_ids]
    enriched = [c for c in enriched if c]
    return enriched, merged, vec_scores

# ---------------------------------------------------------------------------
# Stage handlers — each yields SSE events
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Direct lookup answer prompt (neo4j_direct path only)
# ---------------------------------------------------------------------------

_LOOKUP_ANSWER_SYSTEM = """\
You are a precise legal data assistant.
You have been given the raw results of a direct Neo4j database query.
Your job is to present the answer clearly and concisely.

Rules:
1. Report ONLY what the query result contains. Do not add, infer, or guess.
2. If the result is empty, say so clearly and suggest the user check the case number.
3. Format the answer as a short structured response — not a legal essay.
4. If multiple rows are returned, list all of them.
5. End with: Source: direct database lookup (no semantic search used)."""

_LOOKUP_ANSWER_PROMPT = """\
User query: "{user_query}"

Database query executed:
{cypher_executed}

Raw result from database:
{raw_result}

Present the answer clearly."""


# ---------------------------------------------------------------------------
# Helpers: bucket detection, Cypher extraction from Stage 2, direct execution
# ---------------------------------------------------------------------------

def _detect_bucket(stage1_plan: str) -> str:
    """Read the bucket classification from the Stage 1 plan text."""
    m = re.search(r"Query bucket\s*:\s*(METADATA_LOOKUP|SEMANTIC_SEARCH|HYBRID)", stage1_plan)
    if m:
        return m.group(1).strip()
    # Fallback: check retrieval strategy field
    m2 = re.search(r"Retrieval strategy\s*:\s*(\S+)", stage1_plan)
    if m2:
        strat = m2.group(1).strip()
        if strat == "neo4j_direct":
            return BUCKET_METADATA
        if strat == "neo4j_direct_then_vector":
            return BUCKET_HYBRID
    return BUCKET_SEMANTIC


def _extract_cypher_from_plan(stage2_plan: str) -> tuple[str, str]:
    """
    Pull the primary and fallback Cypher queries out of the Stage 2 plan text.
    Returns (primary_cypher, fallback_cypher). Either may be empty string.
    """
    primary = ""
    fallback = ""

    # Try to find Primary query block
    m_primary = re.search(
        r"Primary query:\s*\n((?:\s+.+\n)+)",
        stage2_plan, re.IGNORECASE
    )
    if m_primary:
        primary = m_primary.group(1).strip()

    # Try to find Fallback query block
    m_fallback = re.search(
        r"Fallback query.*?:\s*\n((?:\s+.+\n)+)",
        stage2_plan, re.IGNORECASE
    )
    if m_fallback:
        fallback = m_fallback.group(1).strip()

    # If the indented-block approach missed, try code-fence style
    if not primary:
        m_fence = re.search(r"```(?:cypher)?\s*([\s\S]+?)```", stage2_plan, re.IGNORECASE)
        if m_fence:
            primary = m_fence.group(1).strip()

    # If still nothing, try MATCH keyword scan
    if not primary:
        m_match = re.search(r"(?i)(MATCH\b[\s\S]+?LIMIT\s+\d+)", stage2_plan)
        if m_match:
            primary = m_match.group(1).strip()

    return primary, fallback


def _run_direct_cypher(db, primary: str, fallback: str) -> tuple[list[dict], str]:
    """
    Execute primary Cypher; if it returns 0 rows run fallback.
    Returns (rows, executed_query_string).
    """
    if not primary:
        return [], "(no query extracted from plan)"

    if not _validate_cypher(primary):
        logger.warning("Direct Cypher safety check failed: %s", primary[:100])
        return [], primary

    try:
        rows = db.run(primary).data()
        if rows:
            return rows, primary
    except Exception as e:
        logger.warning("Primary direct Cypher failed: %s", e)

    # Try fallback
    if fallback and _validate_cypher(fallback):
        try:
            rows = db.run(fallback).data()
            return rows, fallback
        except Exception as e:
            logger.warning("Fallback direct Cypher failed: %s", e)

    return [], primary


def _run_simple_lookup(db, session: dict) -> Generator[str, None, None]:
    """
    Execute the direct Cypher from Stage 2 plan and stream the answer.
    Used for METADATA_LOOKUP bucket — skips Stage 3, Stage 4 entirely.
    """
    yield _thinking("Executing direct database lookup...")

    stage2_plan = session.get("stage2_plan", "")
    query       = session.get("query", "")

    primary, fallback = _extract_cypher_from_plan(stage2_plan)

    if not primary:
        yield _token(
            "Could not extract a Cypher query from the retrieval plan.\n"
            "Please correct the retrieval plan and try again."
        )
        session["stage"] = STAGE_2_SHOWN
        return

    rows, executed = _run_direct_cypher(db, primary, fallback)

    if not rows:
        yield _token(
            f"No records found in the database for this query.\n\n"
            f"Query executed:\n{executed}\n\n"
            "Please check the case number or identifier and try again.\n"
            "You can also type a correction to adjust the retrieval plan."
        )
        session["stage"] = STAGE_LOOKUP_SHOWN
        return

    raw_result = json.dumps(rows, indent=2, default=str)

    prompt = _LOOKUP_ANSWER_PROMPT.format(
        user_query=query,
        cypher_executed=executed,
        raw_result=raw_result,
    )

    full_answer = ""
    for event in _stream_answer(_LOOKUP_ANSWER_SYSTEM, prompt):
        token_text = json.loads(event[6:]).get("message", "")
        full_answer += token_text
        yield event

    session["final_answer"] = full_answer
    session["stage"]        = STAGE_FINAL_DONE


def _run_stage1(session: dict, query: str, correction: str = "") -> Generator[str, None, None]:
    """Generate and emit Stage 1 (Query Understanding Plan)."""
    yield _thinking("Analysing your query...")

    correction_note = (
        f"The user provided this correction to the previous plan:\n\"{correction}\"\nRevise accordingly."
        if correction else ""
    )
    prompt = _STAGE1_PROMPT.format(user_query=query, correction_note=correction_note)
    plan = _invoke_plan(_STAGE1_SYSTEM, prompt)

    session["stage1_plan"] = plan
    session["bucket"]      = _detect_bucket(plan)
    session["stage"]       = STAGE_1_SHOWN

    yield _token(plan)


def _run_stage2(session: dict, correction: str = "") -> Generator[str, None, None]:
    """Generate and emit Stage 2 (Retrieval Plan)."""
    yield _thinking("Building retrieval strategy...")

    stage1 = session.get("stage1_plan", "")
    query  = session.get("query", "")

    correction_note = (
        f"The user provided this correction:\n\"{correction}\"\nRevise accordingly."
        if correction else ""
    )

    prompt = _STAGE2_PROMPT.format(
        stage1_plan=stage1,
        correction_note=correction_note,
    )
    plan = _invoke_plan(_STAGE2_SYSTEM, prompt)

    session["stage2_plan"] = plan
    session["stage"]       = STAGE_2_SHOWN

    yield _token(plan)


def _run_stage3(db, session: dict, correction: str = "") -> Generator[str, None, None]:
    """Execute retrieval and emit Stage 3 (Context Review)."""
    yield _thinking("Executing retrieval (vector search + graph query)...")

    query = session.get("query", "")
    enriched, scores, vec_scores = _do_retrieval(db, query)

    # Auto-filter before showing Stage 3 — irrelevant cases never reach Stage 4
    override = "include structural" in correction.lower() or "include all" in correction.lower()
    relevant, excluded = _filter_relevant_cases(enriched, vec_scores, override_threshold=override)

    session["enriched"]   = relevant
    session["excluded"]   = excluded
    session["scores"]     = scores
    session["vec_scores"] = vec_scores

    # Hard stop: if every case was filtered out, tell the user and stay at Stage 3.
    # Do NOT proceed to Stage 4 with zero good cases.
    if not relevant:
        excluded_list = ", ".join(
            f"{c.get('case_number','?')} (score: {vec_scores.get(c.get('case_id',''), 0):.3f})"
            for c in excluded
        )
        no_results_msg = (
            "NO RELEVANT CASES FOUND\n\n"
            f"Retrieval returned {len(excluded)} case(s), but all scored below the "
            f"{LOW_RELEVANCE_THRESHOLD} relevance threshold:\n"
            f"{excluded_list}\n\n"
            "This means the database does not contain case text that closely matches "
            "your query as phrased. The cases above were found only through structural "
            "graph matching (statute/court names), not through semantic text similarity.\n\n"
            "Please try one of the following:\n"
            "  1. Rephrase your query using different keywords\n"
            "  2. Simplify — ask about one aspect at a time\n"
            "  3. Type: [include structural matches] to proceed with low-confidence results\n"
            "  4. Type: [retrieve more] to expand the search"
        )
        session["stage"] = STAGE_3_SHOWN   # stay here so correction loop works
        yield _token(no_results_msg)
        return

    yield _thinking(
        f"Retrieved {len(enriched)} case(s). "
        f"Kept {len(relevant)} relevant (auto-excluded {len(excluded)} below threshold). "
        "Generating context review..."
    )

    # Extract intent from Stage 1 plan
    intent = "cross_case_semantic"
    m = re.search(r"Intent classified as:\s*(\S+)", session.get("stage1_plan", ""))
    if m:
        intent = m.group(1).strip()
    session["intent"] = intent

    correction_note = (
        f"The user provided this correction:\n\"{correction}\"\nRevise accordingly."
        if correction else ""
    )

    jurisdiction_warning = _jurisdiction_gap_warning(
        session.get("stage1_plan", ""), relevant
    )
    all_flagged_warning  = _all_flagged_warning(relevant, scores, vec_scores)

    retrieved_summary = _brief_retrieved_summary(relevant, scores, vec_scores, excluded=excluded)
    prompt = _STAGE3_PROMPT.format(
        retrieved_summary=retrieved_summary,
        user_query=query,
        intent=intent,
        jurisdiction_warning="\n".join(filter(None, [jurisdiction_warning, all_flagged_warning])),
    )
    if correction_note:
        prompt = correction_note + "\n\n" + prompt

    plan = _invoke_plan(_STAGE3_SYSTEM, prompt)

    session["stage3_plan"] = plan
    session["stage"]       = STAGE_3_SHOWN

    yield _token(plan)


def _extract_stage3_flags(stage3_plan: str) -> str:
    """Extract the Flags section from the Stage 3 plan text for injection into Stage 4."""
    if not stage3_plan:
        return "No Stage 3 flags available."
    m = re.search(r"Flags:(.*?)(?:Relationships:|Coverage:|$)", stage3_plan, re.DOTALL | re.IGNORECASE)
    if m:
        flags_text = m.group(1).strip()
        return flags_text if flags_text else "No flags raised in Stage 3."
    return "No flags section found in Stage 3 plan."


def _run_stage4(session: dict, correction: str = "") -> Generator[str, None, None]:
    """Generate and emit Stage 4 (Generation Plan)."""
    yield _thinking("Building generation plan...")

    query    = session.get("query", "")
    intent   = session.get("intent", "cross_case_semantic")
    enriched = session.get("enriched", [])

    correction_note = (
        f"The user provided this correction:\n\"{correction}\"\nRevise accordingly."
        if correction else ""
    )

    approved_summary    = _brief_approved_summary(enriched)
    stage3_flags_summary = _extract_stage3_flags(session.get("stage3_plan", ""))

    prompt = _STAGE4_PROMPT.format(
        approved_cases_summary=approved_summary,
        stage3_flags_summary=stage3_flags_summary,
        user_query=query,
        intent=intent,
        correction_note=correction_note,
    )
    if correction_note:
        prompt = correction_note + "\n\n" + prompt

    plan = _invoke_plan(_STAGE4_SYSTEM, prompt)

    session["stage4_plan"] = plan
    session["stage"]       = STAGE_4_SHOWN

    yield _token(plan)


def _run_final(session: dict) -> Generator[str, None, None]:
    """Generate and stream the final answer."""
    yield _thinking("Generating final legal answer...")

    query     = session.get("query", "")
    intent    = session.get("intent", "cross_case_semantic")
    gen_plan  = session.get("stage4_plan", "")
    enriched  = session.get("enriched", [])
    scores    = session.get("scores", {})

    excluded    = session.get("excluded", [])
    # Compute real counts — injected into the system prompt so the model
    # cannot fabricate them in the confidence footer.
    case_count   = len(enriched)
    chunk_count  = sum(len(c.get("chunks", [])) for c in enriched)
    excluded_nos = ", ".join(c.get("case_number", "?") for c in excluded) or "None"

    context = _build_synthesis_context(enriched, scores)

    # Format the counts into the system prompt before the LLM sees it.
    system = _FINAL_SYSTEM.format(
        case_count=case_count,
        chunk_count=chunk_count,
        excluded_nos=excluded_nos,
    )

    prompt = _FINAL_PROMPT.format(
        user_query=query,
        intent=intent,
        generation_plan=gen_plan,
        context=context,
    )

    full_answer = ""
    for event in _stream_answer(system, prompt):
        token_text = json.loads(event[6:]).get("message", "")
        full_answer += token_text
        yield event

    session["final_answer"] = full_answer
    session["stage"]        = STAGE_FINAL_DONE

# ---------------------------------------------------------------------------
# Pipeline router — decides which stage to run
# ---------------------------------------------------------------------------

def _is_approval(text: str) -> bool:
    return text.strip().lower() == "approve"


def run_pipeline(
    db,
    chat_id: str,
    query: str,
    session: dict,
    job_id: str,
) -> Generator[str, None, None]:
    """
    Route the user's message to the correct stage handler and yield SSE events.
    """
    current_stage = session.get("stage", STAGE_IDLE)

    # ── Idle: start fresh at Stage 1 ─────────────────────────────────────
    if current_stage == STAGE_IDLE or current_stage == STAGE_FINAL_DONE:
        session["query"] = query
        session["stage"] = STAGE_IDLE
        yield from _run_stage1(session, query)
        return

    # ── Stage 1 shown — awaiting approval or correction ──────────────────
    if current_stage == STAGE_1_SHOWN:
        if _is_approval(query):
            yield _thinking("Stage 1 approved. Building retrieval plan...")
            yield from _run_stage2(session)
        else:
            # Correction: re-run stage 1 with correction
            original_query = session.get("query", query)
            yield from _run_stage1(session, original_query, correction=query)
        return

    # ── Stage 2 shown — dispatch based on bucket ─────────────────────────
    if current_stage == STAGE_2_SHOWN:
        if _is_approval(query):
            bucket = session.get("bucket", BUCKET_SEMANTIC)
            if bucket == BUCKET_METADATA:
                yield _thinking("Stage 2 approved. Running direct database lookup...")
                yield from _run_simple_lookup(db, session)
            else:
                yield _thinking("Stage 2 approved. Executing retrieval...")
                yield from _run_stage3(db, session)
        else:
            yield from _run_stage2(session, correction=query)
        return

    # ── Lookup shown (neo4j_direct path) — user can correct or start fresh ──
    if current_stage == STAGE_LOOKUP_SHOWN:
        # Any reply here is treated as a new correction to the retrieval plan
        yield from _run_stage2(session, correction=query)
        return

    # ── Stage 3 shown — awaiting approval or correction ──────────────────
    if current_stage == STAGE_3_SHOWN:
        if _is_approval(query):
            yield _thinking("Context approved. Building generation plan...")
            yield from _run_stage4(session)
        else:
            yield from _run_stage3(db, session, correction=query)
        return

    # ── Stage 4 shown — awaiting approval or correction ──────────────────
    if current_stage == STAGE_4_SHOWN:
        if _is_approval(query):
            yield _thinking("Generation plan approved. Generating final answer...")
            yield from _run_final(session)
        else:
            yield from _run_stage4(session, correction=query)
        return

    # ── Fallback: treat as new query ─────────────────────────────────────
    session["query"] = query
    session["stage"] = STAGE_IDLE
    yield from _run_stage1(session, query)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("")
def create_search(request: CreateSearchRequest):
    """Create a new semantic search chat session."""
    chat_id = str(uuid.uuid4())
    chat_sessions[chat_id] = {
        "id":         chat_id,
        "query":      request.query,
        "stage":      STAGE_IDLE,
        "messages":   [],
        "created_at": datetime.utcnow().isoformat(),
    }
    return {"chatId": chat_id}


@router.post("/chat")
def chat(request: ChatMessageRequest):
    """Main semantic search endpoint — approval-gated 6-stage RAG pipeline with SSE."""
    from backend.database import driver as _driver

    chat_id = request.chat_id
    query   = request.query
    job_id  = str(uuid.uuid4())

    if chat_id not in chat_sessions:
        chat_sessions[chat_id] = {
            "id":         chat_id,
            "query":      query,
            "stage":      STAGE_IDLE,
            "messages":   [],
            "created_at": datetime.utcnow().isoformat(),
        }

    session = chat_sessions[chat_id]

    session["messages"].append({
        "id":        str(uuid.uuid4()),
        "role":      "user",
        "query":     query,
        "timestamp": datetime.utcnow().isoformat(),
    })

    def generate_sse():
        with _driver.session() as db:
            try:
                for event in run_pipeline(db, chat_id, query, session, job_id):
                    yield event
            except Exception as e:
                logger.error("Pipeline error: %s", e)
                yield _sse("error", f"Pipeline error: {e}")
                yield "data: [DONE]\n\n"
                return

        # After pipeline completes, emit metadata if we have enriched cases
        enriched = session.get("enriched", [])
        if enriched and session.get("stage") == STAGE_FINAL_DONE:
            yield _metadata_event(job_id, enriched)

        yield "data: [DONE]\n\n"

        # Store assistant message
        session["messages"].append({
            "id":        job_id,
            "role":      "assistant",
            "output":    session.get("final_answer", ""),
            "stage":     session.get("stage", ""),
            "timestamp": datetime.utcnow().isoformat(),
        })

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":     "no-cache",
            "Connection":        "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/history")
def get_chat_history(page: int = 1, page_size: int = 20):
    sessions = sorted(
        chat_sessions.values(),
        key=lambda x: x.get("created_at", ""),
        reverse=True,
    )
    start = (page - 1) * page_size
    return {
        "results":   [{"id": s["id"], "title": s.get("query", "Untitled")}
                      for s in sessions[start: start + page_size]],
        "page":      page,
        "page_size": page_size,
        "total":     len(sessions),
    }


@router.get("/chat/{chat_id}/history")
def get_chat_messages(chat_id: str, page: int = 1, page_size: int = 50):
    session = chat_sessions.get(chat_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat not found")
    messages = session.get("messages", [])
    start = (page - 1) * page_size
    return {
        "results":   messages[start: start + page_size],
        "page":      page,
        "page_size": page_size,
    }


@router.delete("/chat/{chat_id}")
def delete_chat(chat_id: str):
    chat_sessions.pop(chat_id, None)
    return {"message": "Chat deleted"}


@router.post("/chat/stop-conversation")
def stop_conversation(body: dict):
    return {"message": "Conversation stopped"}


@router.get("/suggestions")
def get_suggestions(query: str = ""):
    suggestions = [
        "Cases involving loan default under SARFAESI Act",
        "Cases with property disputes in Mumbai",
        "Cases involving cheque bounce under Section 138 NI Act",
        "Cases where bank sought possession of secured assets",
        "Cases involving fraud and financial misrepresentation",
        "Who are the most common advocates in disposed cases?",
        "Cases where the same person appears as both petitioner and respondent",
    ]
    if query:
        suggestions = [s for s in suggestions if query.lower() in s.lower()]
    return suggestions


@router.get("/job/{job_id}")
def get_job_result(job_id: str):
    """Legacy polling endpoint."""
    return StreamingResponse(
        iter([
            f"data: {json.dumps({'mode': 'response', 'message': 'This result was previously generated. Please start a new search.'})}\n\n",
            "data: [DONE]\n\n",
        ]),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/jobs/{job_id}/feedback")
def submit_feedback(job_id: str, body: dict):
    return {"message": "Feedback received", "feedbackId": str(uuid.uuid4())}


@router.delete("/jobs/{job_id}/feedback/{feedback_id}")
def delete_feedback(job_id: str, feedback_id: str):
    return {"message": "Feedback deleted"}
