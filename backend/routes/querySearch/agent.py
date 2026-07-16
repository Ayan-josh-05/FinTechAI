"""
backend/routes/querySearch/agent.py
------------------------------------
LegalAI – Agentic Search Buddy

Architecture
============
One LangGraph react agent per session backed by two tools:

  1. semantic_search      – Qdrant vector search, returns matching cases + CNRs
  2. run_neo4j_query      – LLM writes any read-only Cypher and executes it directly

The LLM is the Cypher author.  When the user asks "what acts apply to these cases?"
the agent writes its own MATCH query using the CNRs it already has in context and
calls run_neo4j_query — no separate Cypher-generating LLM, no pre-enrichment,
no hardcoded query patterns.

Design rules
------------
• One agent instance per chat session (stateless graph, stateful history list).
• The LLM fetches exactly the data it needs for each question — nothing more.
• Conversation history gives the LLM the CNRs it needs for follow-up queries.
• No internal IDs (UUIDs) are ever exposed to the LLM or the user.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from shared.config import NVIDIA_API_KEY, NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, QDRANT_URL, QDRANT_COLLECTION, AGENT_MODEL, EMBEDDING_MODEL
EMBED_MODEL = EMBEDDING_MODEL
from datetime import datetime
from typing import Any, Generator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import sys

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
if not logger.handlers:
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - [StrategyBuddy] - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

router = APIRouter()

# ── Config ────────────────────────────────────────────────────────────────────

MEMORY_WINDOW = 8     # conversation turns kept in context
TOP_K_QDRANT  = 40    # Qdrant candidates before dedup + rank
PAGE_SIZE     = 20    # default results per page

# ── Lazy imports ──────────────────────────────────────────────────────────────

try:
    from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings
    from langchain_core.tools import tool
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, BaseMessage
    from langgraph.prebuilt import create_react_agent
    from qdrant_client import QdrantClient
    from neo4j import GraphDatabase

    _agent_llm  = ChatNVIDIA(model=AGENT_MODEL, api_key=NVIDIA_API_KEY,
                              temperature=0.2, max_completion_tokens=2048,
                              timeout=300)
    _embeddings = NVIDIAEmbeddings(model=EMBED_MODEL, api_key=NVIDIA_API_KEY, truncate="END")
    _qdrant     = QdrantClient(url=QDRANT_URL)
    _neo4j      = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    DEPS_OK = True
except Exception as _err:
    logger.error("Dependency init failed: %s", _err)
    DEPS_OK = False

    def tool(func):      # type: ignore
        return func

    class BaseMessage:   # type: ignore
        pass

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are LegalAI Search Buddy — a knowledgeable, friendly legal research assistant.
You help users explore Indian court case records conversationally, like a colleague
with direct access to a legal database.

── Personality ──
• Warm, direct, genuinely helpful. Speak naturally — not like a report generator.
• Write in fluid, natural paragraphs. Group similar cases together instead of listing them one by one.
• DO NOT USE REPETITIVE TEMPLATES. Synthesize the information naturally and organically.
• Show at most 10 cases per response unless the user explicitly asks for more.
• NEVER reveal: internal IDs, UUIDs, or anything that looks like a database identifier.
• NEVER mention tool names, "Qdrant", "Neo4j", "Cypher", "vectors", or any tech detail.
• Never start a response with phrases like "Based on the search results" or "Here are some cases". Just answer naturally.
• STRICT RULE: DO NOT write general legal essays, define laws, or provide generic hypothetical examples (like "For instance, under the IPC..."). You MUST ONLY discuss actual, specific cases fetched from the database using run_neo4j_query.

── Your two tools ──

1. semantic_search(query, limit, offset)
   → Gets you cnr_numbers as starting points from the vector index.
   → IMPORTANT: Set 'query' to the FULL, exact user question (e.g. "What are some cases which involves deaths or road accidents?"). Do NOT summarize or extract keywords.
   → Returns ONLY surface metadata: cnr_number, case_number, state, status.
   → It does NOT return parties, acts, court names, or judges.
   → NEVER present results directly from this tool. Always enrich first (see below).
   → For pagination: call again with offset = previous offset + limit.

2. run_neo4j_query(cypher)
   → The workhorse. Use this to fetch ANYTHING from the knowledge graph.
   → YOU write the Cypher. Use the schema and examples below.
   → RULES: Read-only only.
     Allowed: MATCH, OPTIONAL MATCH, WHERE, WITH, RETURN, ORDER BY, LIMIT, COLLECT, COUNT.
     NEVER: CREATE, MERGE, SET, DELETE, REMOVE, DROP.
     Always include a LIMIT clause.

── Neo4j Schema ──

Nodes:
  Case         : id, cnr_number, case_number, case_type, district, state, status, stage
  Person       : name, role
  Court        : name, district, state
  Act          : name, section, description
  Asset        : description, value
  Hearing      : date, purpose, next_date
  Organization : name

Relationships:
  (Person)-[:JUDGE_IN]→(Case)
  (Person)-[:PETITIONER_IN]→(Case)
  (Person)-[:RESPONDENT_IN]→(Case)
  (Person)-[:ADVOCATE_FOR]→(Case)
  (Person)-[:COMPLAINANT_IN]→(Case)
  (Person)-[:VICTIM_IN]→(Case)
  (Person)-[:WITNESS_IN]→(Case)
  (Case)-[:INVOKES]→(Act)
  (Case)-[:HAS_ASSET]→(Asset)
  (Case)-[:HAS_HEARING]→(Hearing)
  (Case)-[:HEARD_IN]→(Court)
  (Organization)-[:ESTABLISHMENT_IN]→(Case)

── MANDATORY multi-step workflow — read this carefully ──

semantic_search = starting point only. It gives you CNRs. That's it.
You are NOT done after semantic_search. You MUST call run_neo4j_query next.

THE RULE: You must NEVER answer the user using only semantic_search output.
           Always chain a run_neo4j_query call to get the real data first.

Required chain for "find me cases about X":
  CALL 1 → semantic_search("X")              -- gets cnr_numbers
  CALL 2 → run_neo4j_query(enrichment query) -- gets parties, acts, court, status
  ANSWER → compose from CALL 2 results only

Enrichment Cypher (replace CNR list with actual values from CALL 1):
  MATCH (c:Case)
  WHERE c.cnr_number IN ['CNR1', 'CNR2', 'CNR3']
  OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
  OPTIONAL MATCH (pet:Person)-[:PETITIONER_IN]->(c)
  OPTIONAL MATCH (resp:Person)-[:RESPONDENT_IN]->(c)
  OPTIONAL MATCH (c)-[:INVOKES]->(act:Act)
  RETURN c.cnr_number AS cnr, c.case_number AS case_number,
         c.case_type AS case_type, c.district AS district,
         c.state AS state, c.status AS status,
         court.name AS court,
         collect(DISTINCT pet.name)  AS petitioners,
         collect(DISTINCT resp.name) AS respondents,
         collect(DISTINCT act.name + COALESCE(' s.' + act.section, '')) AS acts

The same rule applies when run_neo4j_query is used for initial filtering
(e.g. filter by act/location): if the first query only returns CNRs, run the
enrichment query as a second step before answering.

── Other Cypher patterns ──

Get judges for known cases:
  MATCH (p:Person)-[:JUDGE_IN]->(c:Case)
  WHERE c.cnr_number IN ['CNR1', 'CNR2']
  RETURN c.cnr_number AS cnr, collect(DISTINCT p.name) AS judges

Find related cases (2-hop proximity):
  MATCH (anchor:Case {cnr_number: 'TARGET_CNR'})-[*1..2]-(related:Case)
  WHERE related.cnr_number <> 'TARGET_CNR'
  RETURN DISTINCT related.cnr_number AS cnr, related.case_number AS case_number,
         related.district AS district, related.state AS state, related.status AS status
  LIMIT 10

Filter by act/section (then enrich!):
  MATCH (c:Case)-[:INVOKES]->(a:Act)
  WHERE toLower(a.name) CONTAINS 'ipc' AND a.section = '420'
  LIMIT 10

Full case details (all relationships):
  MATCH (c:Case {cnr_number: 'TARGET_CNR'})
  OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
  OPTIONAL MATCH (judge:Person)-[:JUDGE_IN]->(c)
  OPTIONAL MATCH (pet:Person)-[:PETITIONER_IN]->(c)
  OPTIONAL MATCH (resp:Person)-[:RESPONDENT_IN]->(c)
  OPTIONAL MATCH (c)-[:INVOKES]->(act:Act)
  RETURN c.case_number AS case_number, c.status AS status,
         court.name AS court,
         collect(DISTINCT judge.name) AS judges,
         collect(DISTINCT pet.name) AS petitioners,
         collect(DISTINCT resp.name) AS respondents,
         collect(DISTINCT act.name + COALESCE(' s.' + act.section, '')) AS acts

── When to use which tool ──
• Open-ended topic search → semantic_search
• "What acts apply to these cases?" → run_neo4j_query with CNRs from context
• "Who are the judges in these cases?" → run_neo4j_query
• Filter by law/section/person/court → run_neo4j_query
• Find related/similar cases → run_neo4j_query (proximity pattern)
• "Show more results" → semantic_search with incremented offset

── Conversation ──
• CNR numbers from previous turns are KEY — use them in your Cypher for follow-ups.
• When user asks about already-discussed cases (acts, parties, judges, etc.),
  use run_neo4j_query with those CNRs rather than re-running semantic_search.
• Ask ONE clarifying question if query is truly too vague. Then search anyway.
• Never fabricate details not returned by the tools.

── Suggestions (REQUIRED at end of every response) ──
After your answer, always append a <suggestions> block containing 2-4 short follow-up
actions the user could take next. These must be:
  • Specific to what you just found — not generic.
  • Phrased as things the user might say to you (natural language).
  • Varied in direction (one goes further into the results, one pivots, one explores adjacent).
  • Never use the words "deep dive" or "broaden".

── Search strategies (emit on NEW search queries only, NOT on follow-up questions) ──
When the user submits a new search query (not asking about already-found cases), also append
a <strategies> block with 2-4 alternative search approaches tailored to their query.
Each strategy is a different axis to search the legal dataset:
  • By meaning/topic (semantic similarity)
  • By legal act or section
  • By location (state/district/court)
  • By person (judge, advocate, party name, organization)
  • By case status or type
  • By graph traversal from a known CNR

Format: one strategy per line, as: Display label: short description|type_hint
type_hint must be one of: semantic, act_filter, location_filter, person_filter, status_filter, graph

Example:
<strategies>
Search by meaning: find cases semantically similar to 'property flat land plot'|semantic
Filter by act: look specifically under Transfer of Property Act or SARFAESI Act|act_filter
Filter by court: narrow to district civil courts in Haryana|location_filter
Graph traversal: start from a known case CNR and explore related cases|graph
</strategies>

Do NOT emit <strategies> on follow-up questions like "what acts?", "who are the judges?", etc.

Format the blocks exactly like this, always at the very end of your response in this order:
  1. Your answer
  2. <suggestions>...</suggestions>
  3. <strategies>...</strategies>  (only on new search queries)
"""

# ── Session store ─────────────────────────────────────────────────────────────
# Shared with history.py — imported from there to keep a single source of truth.
# chat_id → {
#   "agent":      compiled langgraph agent,
#   "history":    list[BaseMessage]  (trimmed to MEMORY_WINDOW*2 pairs),
#   "created_at": str,
# }

from backend.routes.querySearch.history import _sessions

# ── Cypher safety guard ───────────────────────────────────────────────────────

_CYPHER_WRITE_KW = ("create ", "merge ", "set ", "delete ", "detach ", "remove ", "drop ")

def _safe_cypher(cypher: str) -> bool:
    return not any(kw in cypher.lower() for kw in _CYPHER_WRITE_KW)

# ── Tools ─────────────────────────────────────────────────────────────────────

@tool
def clarify_query(question: str) -> str:
    """
    Ask the user a short clarifying question when their query is too vague to search.
    Use AT MOST ONCE per turn. The question is shown directly to the user.
    """
    return f"__CLARIFY__:{question}"


@tool
def semantic_search(query: str, limit: int = PAGE_SIZE, offset: int = 0) -> str:
    """
    Search cases by topic or free-text meaning using vector similarity.
    CRITICAL: Pass the FULL, exact user question as the 'query' argument. 
    DO NOT summarize or extract keywords. Vector search works best with the full sentence.
    Returns matching cases with cnr_number, case_number, court info, and status.

    limit:  number of cases to return (default 5).
    offset: number of cases to skip — use for pagination.
            First call: offset=0. Second call: offset=5. Third: offset=10.
    """
    if not DEPS_OK:
        return json.dumps({"error": "Search service unavailable"})
    try:
        vec = _embeddings.embed_query(query)
        fetch_limit = max(TOP_K_QDRANT, offset + limit * 4)
        resp = _qdrant.query_points(
            collection_name=QDRANT_COLLECTION,
            query=vec,
            limit=fetch_limit,
            with_payload=True,
        )
        # Deduplicate by case_id, keep highest score
        seen: dict[str, dict] = {}
        for h in resp.points:
            p = h.payload or {}
            cid = p.get("case_id", "")
            if not cid:
                continue
            if cid not in seen or h.score > seen[cid]["score"]:
                seen[cid] = {
                    "_case_id":    cid,          # internal — stripped below
                    "cnr_number":  p.get("cnr_number", ""),
                    "case_number": p.get("case_number", ""),
                    "state":       p.get("state", ""),
                    "status":      p.get("status", ""),
                    "score":       round(h.score, 4),
                }
        ranked = sorted(seen.values(), key=lambda x: x["score"], reverse=True)
        page   = ranked[offset: offset + limit]
        total  = len(ranked)
        # Strip internal fields and force enrichment
        cnr_list = [c["cnr_number"] for c in page if c.get("cnr_number")]
        return json.dumps({
            "SYSTEM_ERROR": "STOP! YOU HAVE NO CASE DETAILS TO SHOW THE USER YET.",
            "REQUIRED_ACTION": "You MUST IMMEDIATELY call run_neo4j_query using the cnr_numbers below to fetch the parties, acts, and courts. Do NOT answer the user until you do.",
            "cnr_numbers": cnr_list,
        }, ensure_ascii=False)
    except Exception as e:
        logger.error("semantic_search failed: %s", e)
        return json.dumps({"error": str(e)})


@tool
def run_neo4j_query(cypher: str) -> str:
    """
    Execute a read-only Cypher query against the legal knowledge graph.
    YOU write the Cypher based on what the user is asking.

    Use this for:
    - Getting acts/judges/parties/hearings/assets for cases already in conversation
    - Filtering cases by act, section, person name, court, location, status
    - Finding related cases via graph traversal (2-hop proximity)
    - Any structured knowledge-graph query

    RULES — strictly enforced:
    - Read-only: MATCH, OPTIONAL MATCH, WHERE, WITH, RETURN, ORDER BY, LIMIT, COLLECT, COUNT.
    - NEVER use CREATE, MERGE, SET, DELETE, REMOVE, DROP.
    - Always include a LIMIT clause.
    - Use cnr_number (not internal id) to refer to specific cases.
    - Use toLower() + CONTAINS for string matching.
    """
    if not DEPS_OK:
        return json.dumps({"error": "Graph service unavailable"})
    if not _safe_cypher(cypher):
        logger.warning("Unsafe Cypher blocked: %s", cypher[:120])
        return json.dumps({"error": "Blocked: only read-only Cypher is permitted."})
    try:
        with _neo4j.session() as db:
            rows = db.run(cypher).data()
        if not rows:
            return json.dumps({"message": "No results found.", "rows": []})
        return json.dumps({"rows": rows, "count": len(rows)}, ensure_ascii=False, default=str)
    except Exception as e:
        logger.error("run_neo4j_query failed: %s", e)
        return json.dumps({"error": str(e)})

# ── Agent factory ─────────────────────────────────────────────────────────────

def _build_agent():
    """Build a LangGraph react agent with the two lean tools."""
    return create_react_agent(
        model=_agent_llm,
        tools=[clarify_query, semantic_search, run_neo4j_query],
        prompt=_SYSTEM_PROMPT,
    )


def _get_or_create_session(chat_id: str) -> dict:
    if chat_id not in _sessions:
        _sessions[chat_id] = {
            "id":         chat_id,
            "agent":      _build_agent() if DEPS_OK else None,
            "history":    [],   # list[BaseMessage], trimmed to MEMORY_WINDOW*2
            "created_at": datetime.utcnow().isoformat(),
        }
    return _sessions[chat_id]

# ── SSE helpers ───────────────────────────────────────────────────────────────

def _sse(mode: str, message: str) -> str:
    return f"data: {json.dumps({'mode': mode, 'message': message})}\n\n"

def _thinking(msg: str) -> str: return _sse("thinking", msg)
def _token(t: str)     -> str: return _sse("response", t)
def _error(msg: str)   -> str: return _sse("error", msg)

def _metadata_evt(cases: list[dict]) -> str:
    citations = [
        {"title": f"{c.get('case_number','?')} ({c.get('cnr_number', c.get('cnr', ''))})",
         "url":   f"/entity/case/{c.get('cnr_number', c.get('cnr', ''))}"}
        for c in cases if c.get('cnr_number') or c.get('cnr')
    ]
    sources = [
        {"case_id":   c.get("cnr_number", c.get("cnr", "")),
         "case_no":   c.get("case_number", ""),
         "case_type": c.get("case_type", ""),
         "court":     c.get("court", ""),
         "title":     f"{c.get('case_number','?')} ({c.get('cnr_number', c.get('cnr', ''))})"}
        for c in cases if c.get('cnr_number') or c.get('cnr')
    ]
    payload = {"job_id": str(uuid.uuid4()), "citations": citations, "sources": sources}
    return _sse("metadata", json.dumps(payload))

def _suggestions_evt(suggestions: list[str]) -> str:
    """Emit LLM-generated follow-up content directions."""
    return _sse("suggestions", json.dumps(suggestions))

def _strategies_evt(strategies: list[str]) -> str:
    """Emit LLM-generated search strategy alternatives."""
    return _sse("strategies", json.dumps(strategies))

_SUGGESTIONS_RE = re.compile(r"<suggestions>\s*([\s\S]*?)\s*</suggestions>", re.IGNORECASE)
_STRATEGIES_RE  = re.compile(r"<strategies>\s*([\s\S]*?)\s*</strategies>",  re.IGNORECASE)

def _extract_suggestions(answer: str) -> tuple[str, list[str]]:
    """Strip <suggestions> block. Returns (clean_answer, suggestions_list)."""
    m = _SUGGESTIONS_RE.search(answer)
    if not m:
        return answer.strip(), []
    items = [s.strip() for s in m.group(1).splitlines() if s.strip()]
    return _SUGGESTIONS_RE.sub("", answer).strip(), items

def _extract_strategies(answer: str) -> tuple[str, list[str]]:
    """Strip <strategies> block. Returns (clean_answer, strategies_list)."""
    m = _STRATEGIES_RE.search(answer)
    if not m:
        return answer.strip(), []
    items = [s.strip() for s in m.group(1).splitlines() if s.strip()]
    return _STRATEGIES_RE.sub("", answer).strip(), items

# ── Streaming pipeline ────────────────────────────────────────────────────────

def _stream_agent(chat_id: str, query: str) -> Generator[str, None, None]:
    """
    Run the LangGraph agent for one user turn and yield SSE events.
    The agent decides which tools to call and writes its own Cypher.
    """
    session = _get_or_create_session(chat_id)
    agent   = session.get("agent")

    if agent is None:
        yield _error("Search service is not available. Please check server configuration.")
        return

    yield _thinking("Let me look into that…")

    try:
        # Pass trimmed history + new user message
        history      = session["history"][-(MEMORY_WINDOW * 2):]
        messages_in  = history + [HumanMessage(content=query)]

        logger.info("--- New Agent Turn ---")
        logger.info(f"User Query: {query}")

        all_msgs = []
        # Stream updates to catch intermediate tool calls
        for event in agent.stream({"messages": messages_in}, stream_mode="updates"):
            for node_name, state_update in event.items():
                messages = state_update.get("messages", [])
                if not isinstance(messages, list):
                    messages = [messages]
                
                for m in messages:
                    all_msgs.append(m)
                    
                    # Intercept AI messages that contain tool calls to log and yield thinking states
                    if m.__class__.__name__ == "AIMessage":
                        if hasattr(m, "tool_calls") and m.tool_calls:
                            logger.info(f"LLM Decided to use tools: {m.tool_calls}")
                            for tc in m.tool_calls:
                                t_name = tc.get("name")
                                t_args = tc.get("args", {})
                                
                                if t_name == "semantic_search":
                                    logger.info(f"Executing RAG (semantic_search) with args: {t_args}")
                                    q = t_args.get("query", "cases")
                                    yield _thinking(f"Searching legal database for '{q}'...")
                                    
                                elif t_name == "run_neo4j_query":
                                    logger.info(f"Executing Graph query (run_neo4j_query) with cypher:\n{t_args.get('cypher', '')}")
                                    yield _thinking("Analyzing case connections and relationships...")
                                    
                                elif t_name == "clarify_query":
                                    logger.info(f"Agent asking for clarification: {t_args.get('question', '')}")
                        else:
                            # Log the raw text response from Nvidia API
                            logger.info(f"LLM Response (raw Nvidia output): {m.content[:500]}...")


        # Extract the final AI answer
        answer = ""
        for msg in reversed(all_msgs):
            if msg.__class__.__name__ == "AIMessage" and not (hasattr(msg, "tool_calls") and msg.tool_calls):
                answer = msg.content if isinstance(msg.content, str) else ""
                break

        # Parse out <suggestions> and <strategies> blocks before streaming
        clean_answer, suggestions = _extract_suggestions(answer)
        clean_answer, strategies  = _extract_strategies(clean_answer)

        # Persist plain human/ai turn (store clean answer without markup)
        session["history"].append(HumanMessage(content=query))
        session["history"].append(AIMessage(content=clean_answer))

        # Clarification path
        if clean_answer.startswith("__CLARIFY__:"):
            yield _token(clean_answer[len("__CLARIFY__:"):])
            return

        # Stream clean answer word-by-word
        words = clean_answer.split(" ")
        for i, word in enumerate(words):
            yield _token(word if i == 0 else " " + word)

        # Emit suggestions after the answer
        if suggestions:
            yield _suggestions_evt(suggestions)

        # Emit search strategies (only present on new search queries)
        if strategies:
            yield _strategies_evt(strategies)

        # Emit metadata: collect cases from run_neo4j_query ToolMessages
        try:
            meta_cases: list[dict] = []
            for msg in all_msgs:
                if msg.__class__.__name__ == "ToolMessage":
                    try:
                        data = json.loads(msg.content)
                        if isinstance(data, dict) and "rows" in data:
                            meta_cases.extend(data["rows"])
                    except (json.JSONDecodeError, TypeError):
                        pass
            if meta_cases:
                yield _metadata_evt(meta_cases)
        except Exception as meta_err:
            logger.warning("Metadata SSE failed: %s", meta_err)

    except Exception as e:
        logger.error("Agent error for chat %s: %s", chat_id, e)
        yield _error(f"Something went wrong: {e}")

# ── Request / Response schemas ────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    query: str   # optional first message

class ChatRequest(BaseModel):
    chat_id: str
    query:   str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/session")
def create_session(request: CreateSessionRequest):
    """Create a new search session. Returns a chat_id."""
    chat_id = str(uuid.uuid4())
    _get_or_create_session(chat_id)
    return {"chatId": chat_id}


@router.post("/chat")
def buddy_chat(request: ChatRequest):
    """Send a message to the search buddy. Returns a streaming SSE response."""
    chat_id = request.chat_id
    query   = request.query.strip()

    if not query:
        def _empty():
            yield _error("Please enter a query.")
            yield "data: [DONE]\n\n"
        return StreamingResponse(_empty(), media_type="text/event-stream")

    _get_or_create_session(chat_id)

    def generate():
        yield from _stream_agent(chat_id, query)
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive",
                 "X-Accel-Buffering": "no"},
    )


@router.post("/chat/stop")
def stop_streaming(request: dict):
    """No-op stop endpoint for frontend compatibility."""
    return {"message": "stopped"}


@router.get("/suggestions")
def get_suggestions(query: str = ""):
    """Stub suggestions endpoint for frontend compatibility."""
    return []
