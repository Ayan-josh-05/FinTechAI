"""
semantic_search_v2.py
Multilevel RAG semantic search — replaces the v1 semantic_search.py pipeline.

Pipeline per query:
  Stage 0 : Intent classification  (fast LLM call)
  Stage 1a: Vector search          (NVIDIAEmbeddings → Neo4j vector indexes)
  Stage 1b: LLM-generated Cypher  (ChatNVIDIA → validated Neo4j query)  [relational/analytical only]
  Stage 2 : Full subgraph enrich  (one big Cypher per top-N case)
  Stage 3 : Synthesis streaming   (ChatNVIDIA stream → SSE events)

All "thinking" progress events are emitted to the frontend in real time.
Context budget is allocated proportional to each case's relevance score.
Chat memory uses a sliding window of the last 5 turns per chat_id.
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

# ── NVIDIA / LangChain config ────────────────────────────────────────────────

NVIDIA_API_KEY  = os.getenv("NVIDIA_API_KEY", "")
EMBED_MODEL     = "nvidia/nv-embedqa-e5-v5"

# Small fast model — intent classification only (4-category, max 15 tokens output)
INTENT_MODEL    = "meta/llama-3.1-8b-instruct"

# Larger model — Cypher generation + synthesis.
# Nemotron-70B is NVIDIA's own instruction-tuned 70B: better structured output,
# stronger multi-document reasoning, more reliable Cypher syntax.
REASONING_MODEL = "meta/llama-3.3-70b-instruct"

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings

    _intent_llm = ChatNVIDIA(
        model=INTENT_MODEL, api_key=NVIDIA_API_KEY,
        max_tokens=15, temperature=0.0,
    )
    _cypher_llm = ChatNVIDIA(
        model=REASONING_MODEL, api_key=NVIDIA_API_KEY,
        max_tokens=600, temperature=0.0,   # 0-temp for deterministic valid Cypher
    )
    _synthesis_llm = ChatNVIDIA(
        model=REASONING_MODEL, api_key=NVIDIA_API_KEY,
        max_tokens=2048, temperature=0.2,  # slightly lower than before for factuality
    )
    _embeddings = NVIDIAEmbeddings(
        model=EMBED_MODEL, api_key=NVIDIA_API_KEY, truncate="END",
    )
    LANGCHAIN_OK = True
except Exception as _lc_err:
    logger.error("LangChain/NVIDIA init failed: %s", _lc_err)
    LANGCHAIN_OK = False

# ── In-memory stores ─────────────────────────────────────────────────────────

chat_sessions: dict = {}   # chat_id → session metadata
chat_memories: dict = {}   # chat_id → list of {"user": ..., "assistant": ...}

MEMORY_WINDOW = 5           # number of conversation turns to keep
TOP_N_CASES   = 7           # fixed: 5 from vector + up to 2 from Cypher
TOTAL_BUDGET  = 14_000      # max chars for full multi-case context string

# ── Pydantic models ───────────────────────────────────────────────────────────

class CreateSearchRequest(BaseModel):
    query: str
    filters: Optional[dict] = None
    limit: Optional[int] = 10
    offset: Optional[int] = 0

class ChatMessageRequest(BaseModel):
    chat_id: str
    query: str

# ── Memory helpers ────────────────────────────────────────────────────────────

def _get_history(chat_id: str) -> str:
    """Return last MEMORY_WINDOW turns as a plain-text string."""
    turns = chat_memories.get(chat_id, [])[-MEMORY_WINDOW:]
    if not turns:
        return ""
    lines = []
    for t in turns:
        lines.append(f"User: {t['user']}")
        lines.append(f"Assistant: {t['assistant'][:400]}")
    return "\n".join(lines)


def _get_prev_cases(chat_id: str) -> str:
    """
    Return a summary of cases discussed in the last MEMORY_WINDOW turns.
    Injected into the Cypher prompt so the LLM can resolve references like
    'that case', 'the bank in the previous answer', etc.
    """
    turns = chat_memories.get(chat_id, [])[-MEMORY_WINDOW:]
    cases = []
    for t in turns:
        for c in t.get("cases", []):
            entry = f"- {c.get('case_number','?')} (CNR: {c.get('cnr','?')}): {c.get('summary','')[:200]}"
            if entry not in cases:
                cases.append(entry)
    if not cases:
        return "(none)"
    return "\n".join(cases)


def _save_turn(chat_id: str, query: str, answer: str, cases: list = None) -> None:
    if chat_id not in chat_memories:
        chat_memories[chat_id] = []
    chat_memories[chat_id].append({
        "user": query,
        "assistant": answer,
        "cases": cases or [],   # list of {cnr, case_number, summary}
    })

# ── SSE helpers ───────────────────────────────────────────────────────────────

def _sse(mode: str, message: str) -> str:
    return f"data: {json.dumps({'mode': mode, 'message': message})}\n\n"

def _thinking(msg: str) -> str:
    return _sse("thinking", msg)

def _response_token(token: str) -> str:
    return _sse("response", token)

def _metadata_event(job_id: str, sources: list, enriched: list) -> str:
    citations = [
        {"title": f"{c.get('case_number','?')} ({c.get('cnr','')})",
         "url": f"/entity/case/{c.get('cnr','')}"}
        for c in enriched
    ]
    payload = {"job_id": job_id, "citations": citations, "sources": sources}
    return _sse("metadata", json.dumps(payload))


# ── Stage 0: Intent classification ───────────────────────────────────────────

_INTENT_PROMPT = """\
Classify this legal database query into exactly one intent word.
Intents:
  lookup        – asking about one specific case by number or CNR
  relational    – asking about connections between people, courts, acts across cases
  analytical    – asking for counts, statistics, or aggregations
  conversational– follow-up that refers to something already discussed

Reply with ONLY the single intent word.

Conversation so far (may be empty):
{history}

Query: {query}
Intent:"""

_VALID_INTENTS = {"lookup", "relational", "analytical", "conversational"}


def classify_intent(query: str, history: str) -> str:
    """Stage 0: classify user intent with a tiny LLM call."""
    if not LANGCHAIN_OK:
        return "lookup"
    try:
        prompt = _INTENT_PROMPT.format(
            history=history[-300:] if history else "(none)",
            query=query,
        )
        result = _intent_llm.invoke(prompt)
        word = result.content.strip().lower().split()[0] if result.content.strip() else ""
        return word if word in _VALID_INTENTS else "lookup"
    except Exception as e:
        logger.warning("Intent classification failed: %s", e)
        return "lookup"


# ── Stage 1: Qdrant RAG (Simple RAG on Document full-text chunks) ─────────────

def qdrant_rag(
    query: str,
    top_k: int = 20,
    payload_filter: dict = None,
) -> list[tuple[str, float, str]]:
    """
    Embed query → search Qdrant full-text chunks → return [(case_id, score, chunk_text)].
    top_k=20 by default — we want broad candidate coverage before scoring.
    payload_filter: optional Qdrant filter dict e.g. {"district": "Delhi"}
    """
    if not LANGCHAIN_OK:
        return []
    try:
        from backend.qdrant_store import get_qdrant, COLLECTION
        from qdrant_client.http.models import Filter, FieldCondition, MatchValue

        vec = _embeddings.embed_query(query)
        qdrant = get_qdrant()

        q_filter = None
        if payload_filter:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in payload_filter.items() if v
            ]
            if conditions:
                q_filter = Filter(must=conditions)

        results = qdrant.query_points(
            collection_name=COLLECTION,
            query=vec,
            limit=top_k,
            with_payload=True,
            query_filter=q_filter,
        ).points
        return [
            (r.payload["case_id"], float(r.score), r.payload["chunk_text"])
            for r in results
            if r.payload and r.payload.get("case_id")
        ]
    except Exception as e:
        logger.error("Qdrant RAG failed: %s", e)
        return []


def qdrant_case_chunks(case_id: str, query: str, top_k: int = 3) -> list[str]:
    """
    Retrieve the most query-relevant chunks for a specific case from Qdrant.
    Used during enrichment to give the synthesis LLM the best passages.
    """
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


# ── Stage 1b: LLM-generated Cypher ───────────────────────────────────────────

_GRAPH_SCHEMA = """\
=== NODE LABELS & PROPERTIES ===

Case
  id, cnr_number, case_number, case_type, status, stage, district, state,
  filing_date, filing_number, filing_year, registration_date, registration_number,
  decision_date, first_hearing_date, last_hearing_date, next_hearing_date,
  type_of_disposal, search_summary
  (search_summary is a human-readable case summary — most useful for context)

Person
  id, name, name_norm, is_judge, name_source
  (is_judge=true means this person appeared as a judge)

Court
  id, name, court_code, court_type, district, state

Act
  id, name, name_norm
  (legal statutes/acts invoked in a case, e.g. "SARFAESI Act", "NI Act Section 138")

Hearing
  id, last_hearing_date, purpose, business_notes, nature_of_disposal, judge_designation

Document
  id, order_number, order_type, order_date, extraction_status, extraction_method, storage_id
  (court orders / judgments — full_text available but very large)

Asset
  id, asset_type, description, identifier, chassis_number, engine_number
  (description: free-text, e.g. "Flat No. 42, Plot No. 12, Sector 4...")
  (identifier: registration number or survey number)

Chunk
  id, text, cnr_number, chunk_index
  (semantic text chunks extracted from case documents)

=== RELATIONSHIPS ===

Party roles — Person to Case (all undirected, use either direction):
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
  (Person)-[:DIRECTOR_WITNESS_PETITIONER_IN]-(Case)
  (Person)-[:SENIOR_MANAGER_WITNESS_DEFENDANT_IN]-(Case)
  (Person)-[:WITNESS_AUTHORIZED_REPRESENTATIVE_DEFENDANT_IN]-(Case)

Case to entity relationships (directed):
  (Case)-[:HEARD_IN]->(Court)
  (Case)-[:INVOKES]->(Act)
  (Case)-[:HAS_HEARING]->(Hearing)
  (Case)-[:HAS_DOCUMENT]->(Document)
  (Case)-[:HAS_ASSET]->(Asset)
  (Case)-[:HAS_CHUNK]->(Chunk)"""

_CYPHER_PROMPT = """\
You are a Neo4j Cypher expert for an Indian legal case knowledge graph.

{schema}

Rules:
- Use ONLY MATCH, OPTIONAL MATCH, WHERE, WITH, RETURN, ORDER BY, LIMIT, COLLECT, COUNT.
- NEVER use CREATE, MERGE, SET, DELETE, REMOVE, DROP.
- Always include in RETURN: c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary
- End with LIMIT 10. Use toLower() for ALL text comparisons.
- Data quality is mixed — always use broad CONTAINS matching, never assume exact field values.
- Output ONLY the raw Cypher query. No markdown fences, no comments, no explanation.
- Write one single Cypher query that best answers the user's question.

Pattern examples (the <placeholders> must be replaced with keywords derived from the user query):

# Asset / property search — search both description AND asset_type broadly:
MATCH (c:Case)-[:HAS_ASSET]->(a:Asset)
WHERE toLower(a.description) CONTAINS '<keyword>' OR toLower(a.asset_type) CONTAINS '<keyword>'
RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

# Person name + any role relationship:
MATCH (p:Person)-[:<ROLE>]-(c:Case)
WHERE toLower(p.name) CONTAINS '<name>'
RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

# Legal Act invoked:
MATCH (c:Case)-[:INVOKES]->(a:Act)
WHERE toLower(a.name) CONTAINS '<act_keyword>'
RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

# Court name or location:
MATCH (c:Case)-[:HEARD_IN]->(court:Court)
WHERE toLower(court.name) CONTAINS '<keyword>' OR toLower(court.district) CONTAINS '<keyword>'
RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

# Case field (status, type, district, stage, etc.):
MATCH (c:Case)
WHERE toLower(c.case_type) CONTAINS '<keyword>'
RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

# Keyword in hearing notes or purpose:
MATCH (c:Case)-[:HAS_HEARING]->(h:Hearing)
WHERE toLower(h.business_notes) CONTAINS '<keyword>' OR toLower(h.purpose) CONTAINS '<keyword>'
RETURN DISTINCT c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

# For follow-up questions: if user refers to a specific case discussed before,
# use that CNR number directly to traverse its relationships:
MATCH (c:Case {{cnr_number: '<CNR_FROM_PREV_CASES>'}})-[r]-(n)
RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number, c.search_summary AS summary LIMIT 10

Conversation history (may be empty):
{history}

Previously discussed cases (use CNR numbers above to resolve follow-up references):
{prev_cases}

User query: {query}

Cypher:"""

_CYPHER_FIX_PROMPT = """\
This Neo4j Cypher query produced an error. Fix and return ONLY corrected Cypher.

Original:
{cypher}

Error: {error}

User intent: {query}

Corrected Cypher:"""

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


def cypher_search(db, query: str, history: str, prev_cases: str = "") -> list[tuple[str, float]]:
    """Stage 2: Generate Cypher via LLM (with full context), validate, run, self-correct once."""
    if not LANGCHAIN_OK:
        return []
    try:
        prompt = _CYPHER_PROMPT.format(
            schema=_GRAPH_SCHEMA,
            history=history[-400:] if history else "(none)",
            prev_cases=prev_cases or "(none)",
            query=query,
        )
        raw = _cypher_llm.invoke(prompt).content
        cypher = _extract_cypher(raw)

        if not _validate_cypher(cypher):
            logger.warning("Cypher safety check failed")
            return []

        try:
            rows = db.run(cypher).data()[:10]
        except Exception as run_err:
            logger.warning("Cypher run error: %s — self-correcting", run_err)
            fix_prompt = _CYPHER_FIX_PROMPT.format(
                cypher=cypher, error=str(run_err), query=query
            )
            fixed = _extract_cypher(_cypher_llm.invoke(fix_prompt).content)
            if not _validate_cypher(fixed):
                return []
            try:
                rows = db.run(fixed).data()[:10]
            except Exception:
                return []

        return [(str(r["case_id"]), 0.7)
                for r in rows if r.get("case_id")]
    except Exception as e:
        logger.warning("Cypher search failed entirely: %s", e)
        return []


# ── Stage 3: Agentic Self-Reflection ─────────────────────────────────────────

_CONFIDENCE_PROMPT = """\
You are a legal research assistant evaluating retrieved case relevance.

User question: {query}

Retrieved case summaries:
{brief_summaries}

Do these cases contain enough information to answer the user's question?

If YES — respond with exactly the word: SUFFICIENT
If NO — respond with a single improved search query that would find more relevant cases.
     Just the query text, nothing else. No explanation.

Response:"""


def agentic_self_reflect(query: str, candidate_summaries: list[str]) -> str | None:
    """
    Stage 3: Ask the LLM to evaluate retrieved candidates.
    Returns None if sufficient, or a refined query string if not.
    Max 1 retry in pipeline to keep latency bounded.
    """
    if not LANGCHAIN_OK or not candidate_summaries:
        return None
    try:
        brief = "\n".join(
            f"- {s[:200]}" for s in candidate_summaries[:7]
        )
        prompt = _CONFIDENCE_PROMPT.format(query=query, brief_summaries=brief)
        resp = _cypher_llm.invoke(prompt).content.strip()
        if resp.upper() == "SUFFICIENT" or not resp:
            return None
        # It's a refined query
        logger.info("Self-reflect: refining query to: %s", resp[:100])
        return resp
    except Exception as e:
        logger.warning("Self-reflect failed: %s", e)
        return None



# ── Stage 2: Full subgraph enrichment ────────────────────────────────────────

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

_CHUNK_CYPHER = """\
MATCH (c:Case {id: $cid})-[:HAS_CHUNK]->(ch:Chunk)
RETURN ch.text AS text ORDER BY ch.chunk_index LIMIT 3
"""


def _clean_names(lst: list) -> list[str]:
    seen, out = set(), []
    for item in (lst or []):
        s = str(item).strip() if item else ""
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def enrich_case(db, case_id: str, query: str = "") -> dict:
    """Pull complete subgraph for a single case + best chunks from Qdrant."""
    try:
        row = db.run(_ENRICH_CYPHER, cid=case_id).single()
        if not row:
            return {}
        d = dict(row)
        # Fetch query-relevant chunks from Qdrant (not Neo4j HAS_CHUNK anymore)
        d["chunks"] = qdrant_case_chunks(case_id, query, top_k=3) if query else []
        for f in ("judges", "petitioners", "respondents", "advocates",
                  "witnesses", "victims", "complainants", "acts"):
            d[f] = _clean_names(d.get(f) or [])
        d["hearings"] = [h for h in (d.get("hearings") or []) if any(v for v in h.values())]
        d["assets"]   = [a for a in (d.get("assets")   or []) if any(v for v in a.values())]
        return d
    except Exception as e:
        logger.warning("Enrich failed for %s: %s", case_id, e)
        return {}


# ── Context builder with dynamic budget ──────────────────────────────────────

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
        if h.get("date"):
            parts.append(h["date"])
        if h.get("purpose"):
            parts.append(h["purpose"])
        if h.get("notes"):
            parts.append(h["notes"][:120])
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


def build_context(enriched: list[dict], scores: dict[str, float]) -> str:
    """
    Format all enriched cases into a single prompt-ready string.
    Each case receives a character budget proportional to its relevance score.
    """
    if not enriched:
        return "No relevant cases found."

    total_score = sum(scores.get(c.get("case_id", ""), 0.5) for c in enriched) or 1.0
    parts = []

    for i, c in enumerate(enriched, 1):
        cid   = c.get("case_id", "")
        score = scores.get(cid, 0.5)
        budget = int(TOTAL_BUDGET * (score / total_score))
        budget = max(budget, 800)  # minimum per case

        block = f"### Case {i}: {c.get('case_number', 'N/A')} | CNR: {c.get('cnr', 'N/A')}\n"
        block += f"  Status: {c.get('status','?')} | Stage: {c.get('stage','?')} | Type: {c.get('case_type','?')}\n"
        block += f"  Court: {c.get('court_name','?')} ({c.get('court_district','?')})\n"
        block += f"  Filed: {c.get('filing_date','?')} | District: {c.get('district','?')}\n"
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

        # Add semantic chunks proportionally
        chunks = c.get("chunks", [])
        remaining = budget - len(block)
        if chunks and remaining > 100:
            block += "  Relevant Excerpts:\n"
            for ch in chunks:
                excerpt = ch[:min(len(ch), remaining // len(chunks))]
                block += f"    • {excerpt}\n"

        parts.append(block[:budget])

    return "\n---\n".join(parts)


# ── Stage 3: Synthesis with streaming ────────────────────────────────────────

_SYNTHESIS_SYSTEM = """\
You are an expert legal research assistant for Indian courts.
You analyse case data from a knowledge graph and give comprehensive, accurate answers.

The case data includes: parties (petitioners, respondents, judges, advocates, witnesses),
courts, legal acts invoked, hearing notes, assets, and semantic excerpts.

IMPORTANT: Cases are listed in no particular order of importance.
Treat ALL provided cases equally and determine which ones are most relevant to the user's question yourself.

Instructions:
- Answer using ONLY the provided case data. Never fabricate.
- Start with the case(s) that are most directly relevant to the question.
- Reference specific case numbers or CNRs when citing facts.
- For relational/analytical queries, synthesise across ALL provided cases.
- Highlight cross-case patterns when they exist.
- Use markdown with headers and bullet points.
- If context is insufficient, clearly say so.
- For follow-up questions, resolve references using the conversation history."""


def stream_synthesis(context: str, query: str, history: str) -> Generator[str, None, None]:
    """Stage 3: Stream the synthesis response token by token."""
    if not LANGCHAIN_OK:
        yield _sse("error", "LangChain/NVIDIA not initialised.")
        return

    messages_text = _SYNTHESIS_SYSTEM
    if history:
        messages_text += f"\n\nConversation History:\n{history}"
    messages_text += f"\n\nCase Data:\n{context}\n\nQuestion: {query}\n\nAnswer:"

    try:
        for chunk in _synthesis_llm.stream(messages_text):
            token = chunk.content if hasattr(chunk, "content") else str(chunk)
            if token:
                yield _response_token(token)
    except Exception as e:
        logger.error("Synthesis streaming error: %s", e)
        yield _sse("error", f"Synthesis error: {e}")


# ── Pipeline orchestrator ─────────────────────────────────────────────────────

def run_pipeline(db, chat_id: str, query: str, shared: dict):
    """
    5-stage agentic RAG pipeline. Yields SSE strings throughout.

    Stage 0: Intent classification (8B LLM)
    Stage 1: Qdrant RAG — full-text chunk retrieval (Simple RAG foundation)
    Stage 2: LLM Cypher — structural graph traversal with prev-case context
    Stage 3: Agentic self-reflection — refine if underconfident (max 1 retry)
    Stage 4: Full subgraph enrichment (Neo4j) + Qdrant chunk retrieval per case
    Stage 5: Streaming synthesis (Nemotron-70B)
    """
    history    = _get_history(chat_id)
    prev_cases = _get_prev_cases(chat_id)

    # ─ Stage 0: Intent ──────────────────────────────────────────────────
    yield _thinking("Classifying your query…")
    intent = classify_intent(query, history)
    logger.info("Intent: %s | query: %s", intent, query[:80])

    def _do_retrieval(q: str) -> tuple[dict[str, float], dict[str, str]]:
        """Run Stage 1 (Qdrant) + Stage 2 (Cypher) for query q.
        Returns (case_scores, case_chunks) where case_chunks[case_id] = chunk_text."""
        vec_scores: dict[str, float] = {}
        chunk_hits: dict[str, str]   = {}   # case_id -> best chunk for quick summary

        # Stage 1: Qdrant Simple RAG
        for cid, score, chunk_text in qdrant_rag(q, top_k=20):
            if cid not in vec_scores or score > vec_scores[cid]:
                vec_scores[cid] = score
                chunk_hits[cid] = chunk_text

        # Stage 2: LLM Cypher (with full context)
        cyp_scores: dict[str, float] = {}
        for cid, s in cypher_search(db, q, history, prev_cases):
            cyp_scores[cid] = max(s, 0.88)

        # Score merge with cross-signal boost
        merged: dict[str, float] = {}
        for cid in set(vec_scores) | set(cyp_scores):
            v = vec_scores.get(cid, 0.0)
            c = cyp_scores.get(cid, 0.0)
            if v > 0 and c > 0:
                merged[cid] = 0.97        # found by both — highest confidence
            elif c > 0:
                merged[cid] = c           # Cypher-only: 0.88
            else:
                merged[cid] = v           # vector-only: natural score
        return merged, chunk_hits

    # ─ Stage 1+2: Initial retrieval ─────────────────────────────────────
    yield _thinking("Searching document database (RAG)…")
    case_scores, chunk_hits = _do_retrieval(query)

    yield _thinking("Running structured graph query…")
    # (Cypher already ran inside _do_retrieval; thinking event for UX)

    if not case_scores:
        yield _sse("response", "No relevant cases found for your query. Please try rephrasing.")
        shared["enriched"] = []
        return

    # ─ Stage 3: Agentic self-reflection ───────────────────────────────
    top_ids    = sorted(case_scores, key=lambda x: case_scores[x], reverse=True)[:TOP_N_CASES]
    cand_summs = [chunk_hits.get(cid, "") for cid in top_ids]

    yield _thinking("Evaluating retrieval quality…")
    refined_query = agentic_self_reflect(query, cand_summs)
    if refined_query:
        yield _thinking(f"Broadening search with refined query…")
        refined_scores, refined_hits = _do_retrieval(refined_query)
        # Merge refined results in with slightly lower weight
        for cid, s in refined_scores.items():
            if cid not in case_scores:
                case_scores[cid] = s * 0.9   # slight discount for retry results
            else:
                case_scores[cid] = max(case_scores[cid], s)
            if cid not in chunk_hits:
                chunk_hits[cid] = refined_hits.get(cid, "")
        top_ids = sorted(case_scores, key=lambda x: case_scores[x], reverse=True)[:TOP_N_CASES]

    # ─ Stage 4: Full subgraph enrichment ──────────────────────────────
    yield _thinking(f"Enriching {len(top_ids)} case(s) with graph relationships…")
    enriched = [enrich_case(db, cid, query) for cid in top_ids]
    enriched = [c for c in enriched if c]
    shared["enriched"] = enriched
    shared["scores"]   = case_scores

    # ─ Stage 5: Synthesis ────────────────────────────────────────────
    yield _thinking("Synthesising your answer…")
    context = build_context(enriched, case_scores)

    full_answer = ""
    for token_event in stream_synthesis(context, query, history):
        full_answer_part = json.loads(token_event[6:]).get("message", "")
        full_answer += full_answer_part
        yield token_event

    shared["answer"] = full_answer

    # Save turn with case refs for context-aware follow-up Cypher
    case_refs = [
        {
            "cnr":         c.get("cnr", ""),
            "case_number": c.get("case_number", ""),
            "summary":     (c.get("summary") or "")[:200],
        }
        for c in enriched
    ]
    _save_turn(chat_id, query, full_answer, cases=case_refs)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("")
def create_search(request: CreateSearchRequest):
    """Create a new semantic search chat session."""
    chat_id = str(uuid.uuid4())
    chat_sessions[chat_id] = {
        "id": chat_id,
        "query": request.query,
        "messages": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    return {"chatId": chat_id}


@router.post("/chat")
def chat(request: ChatMessageRequest):
    """Main semantic search endpoint — multilevel RAG pipeline with SSE streaming."""
    from backend.database import driver as _driver

    chat_id = request.chat_id
    query   = request.query
    job_id  = str(uuid.uuid4())

    if chat_id not in chat_sessions:
        chat_sessions[chat_id] = {
            "id": chat_id, "query": query, "messages": [],
            "created_at": datetime.utcnow().isoformat(),
        }

    # Store user message
    chat_sessions[chat_id]["messages"].append({
        "id": str(uuid.uuid4()), "role": "user",
        "query": query, "timestamp": datetime.utcnow().isoformat(),
    })

    def generate_sse():
        # Open a fresh session IN THIS THREAD — avoids the cross-thread
        # "Session closed" error that occurs when Depends(get_db) creates
        # the session in the request thread but the generator runs in a
        # different Starlette streaming thread-pool thread.
        with _driver.session() as db:
            shared: dict = {"answer": "", "enriched": [], "scores": {}}
            try:
                gen = run_pipeline(db, chat_id, query, shared)
                for event in gen:
                    yield event
            except Exception as e:
                logger.error("SSE generation error: %s", e)
                yield _sse("error", f"Search error: {e}")
                yield "data: [DONE]\n\n"
                return

        # --- session is closed here, but we still have 'shared' ---

        # Metadata event
        enriched = shared.get("enriched", [])
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
        yield _metadata_event(job_id, sources, enriched)
        yield "data: [DONE]\n\n"

        # Memory is saved inside run_pipeline (with case refs for follow-up Cypher)
        chat_sessions[chat_id]["messages"].append({
            "id": job_id, "role": "assistant",
            "output": shared.get("answer", ""),
            "sources": sources,
            "timestamp": datetime.utcnow().isoformat(),
        })

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection":    "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/history")
def get_chat_history(page: int = 1, page_size: int = 20):
    sessions = sorted(chat_sessions.values(),
                      key=lambda x: x.get("created_at", ""), reverse=True)
    start = (page - 1) * page_size
    return {
        "results":   [{"id": s["id"], "title": s.get("query", "Untitled")}
                      for s in sessions[start: start + page_size]],
        "page": page, "page_size": page_size, "total": len(sessions),
    }


@router.get("/chat/{chat_id}/history")
def get_chat_messages(chat_id: str, page: int = 1, page_size: int = 50):
    session = chat_sessions.get(chat_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat not found")
    messages = session.get("messages", [])
    start = (page - 1) * page_size
    return {"results": messages[start: start + page_size],
            "page": page, "page_size": page_size}


@router.delete("/chat/{chat_id}")
def delete_chat(chat_id: str):
    chat_sessions.pop(chat_id, None)
    chat_memories.pop(chat_id, None)
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
    """Legacy polling endpoint — tells client to use the /chat endpoint."""
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
