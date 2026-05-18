"""
semantic_search.py
SSE-based semantic search endpoint for the LegalAI frontend.

Implements:
  POST /semantic-search       → create a new chat session
  POST /semantic-search/chat  → SSE streaming answer
  GET  /semantic-search/chat/history         → list all chats
  GET  /semantic-search/chat/{id}/history    → messages for a chat
  DELETE /semantic-search/chat/{id}          → delete a chat
  GET  /semantic-search/suggestions          → search suggestions
"""
import json
import time
import uuid
import logging
from datetime import datetime
from typing import Optional

import numpy as np
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

# ── Config (same NVIDIA credentials as the Extraction service) ──────────
import os
from dotenv import load_dotenv
load_dotenv()

NVIDIA_API_KEY   = os.getenv('NVIDIA_API_KEY', '')
EMBEDDING_MODEL  = 'nvidia/llama-3.2-nemoretriever-300m-embed-v1'
LLM_MODEL        = 'meta/llama-3.1-8b-instruct'
EMBED_URL        = 'https://integrate.api.nvidia.com/v1/embeddings'
LLM_URL          = 'https://integrate.api.nvidia.com/v1/chat/completions'
NVIDIA_HEADERS   = {
    'Authorization': f'Bearer {NVIDIA_API_KEY}',
    'Accept'       : 'application/json',
    'Content-Type' : 'application/json',
}

# ── In-memory chat storage ──────────────────────────────────────────────
chat_sessions: dict = {}


# ── Models ──────────────────────────────────────────────────────────────

class CreateSearchRequest(BaseModel):
    query: str
    filters: Optional[dict] = None
    limit: Optional[int] = 10
    offset: Optional[int] = 0

class ChatMessageRequest(BaseModel):
    chat_id: str
    query: str


# ── Embedding helper ────────────────────────────────────────────────────

def embed_query(text: str) -> list[float]:
    """Embed a single query string using the NVIDIA API."""
    payload = {
        'model': EMBEDDING_MODEL,
        'input': [text],
        'input_type': 'query',
        'encoding_format': 'float',
        'truncate': 'END',
    }
    resp = requests.post(EMBED_URL, headers=NVIDIA_HEADERS, json=payload)
    resp.raise_for_status()
    return resp.json()['data'][0]['embedding']


# ── Vector search helpers ───────────────────────────────────────────────

def search_case_vectors(db, query_vec: list[float], top_k: int = 5) -> list[dict]:
    """Search the case-level vector index."""
    query = """
    CALL db.index.vector.queryNodes('case_search_vector', $topK, $queryVec)
    YIELD node AS c, score
    RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number,
           c.search_summary AS summary, c.status AS status, score
    ORDER BY score DESC
    """
    results = db.run(query, topK=top_k, queryVec=query_vec).data()
    return results


def search_chunk_vectors(db, query_vec: list[float], top_k: int = 10) -> list[dict]:
    """Search the chunk-level vector index."""
    query = """
    CALL db.index.vector.queryNodes('chunk_vector', $topK, $queryVec)
    YIELD node AS ch, score
    MATCH (c:Case)-[:HAS_CHUNK]->(ch)
    RETURN c.id AS case_id, c.cnr_number AS cnr, c.case_number AS case_number,
           c.search_summary AS summary, ch.text AS chunk_text,
           ch.chunk_index AS chunk_index, score
    ORDER BY score DESC
    """
    results = db.run(query, topK=top_k, queryVec=query_vec).data()
    return results


def get_case_metadata(db, case_id: str) -> dict:
    """Get court and judge info for a case."""
    query = """
    MATCH (c:Case {id: $cid})
    OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
    OPTIONAL MATCH (j)-[:JUDGE_IN]-(c)
    RETURN c.case_number AS case_number, c.cnr_number AS cnr,
           c.case_type AS case_type, c.status AS status,
           court.name AS court_name, j.name AS judge_name
    LIMIT 1
    """
    result = db.run(query, cid=case_id).single()
    if result:
        return dict(result)
    return {}


# ── Hybrid retrieval ────────────────────────────────────────────────────

def hybrid_search(db, query_text: str, top_k: int = 5) -> list[dict]:
    """
    Run vector search against both Case and Chunk indexes,
    merge and deduplicate results by case_id,
    and return enriched case objects.
    """
    query_vec = embed_query(query_text)

    # Search both tiers
    case_results = search_case_vectors(db, query_vec, top_k=top_k)
    chunk_results = search_chunk_vectors(db, query_vec, top_k=top_k * 2)

    # Merge by case_id, keeping best score
    seen = {}
    for r in case_results:
        cid = r['case_id']
        if cid not in seen or r['score'] > seen[cid]['score']:
            seen[cid] = {**r, 'matched_chunks': [], 'source': 'case_vector'}

    for r in chunk_results:
        cid = r['case_id']
        chunk_info = {
            'text': r.get('chunk_text', ''),
            'chunk_index': r.get('chunk_index', 0),
            'score': r['score'],
        }
        if cid in seen:
            seen[cid]['matched_chunks'].append(chunk_info)
            # Boost score if chunk also matches
            seen[cid]['score'] = max(seen[cid]['score'], r['score'] * 0.95)
        else:
            seen[cid] = {
                'case_id': cid,
                'cnr': r['cnr'],
                'case_number': r.get('case_number'),
                'summary': r.get('summary', ''),
                'score': r['score'],
                'matched_chunks': [chunk_info],
                'source': 'chunk_vector',
            }

    # Sort by score and take top_k
    results = sorted(seen.values(), key=lambda x: x['score'], reverse=True)[:top_k]

    # Enrich with metadata
    for r in results:
        meta = get_case_metadata(db, r['case_id'])
        r['court_name'] = meta.get('court_name', '')
        r['judge_name'] = meta.get('judge_name', '')
        r['case_type'] = meta.get('case_type', '')
        r['status'] = meta.get('status', r.get('status', ''))

    return results


# ── LLM answer generation (streaming) ──────────────────────────────────

def build_context(results: list[dict], query: str) -> str:
    """Build the context prompt for the LLM from search results."""
    context_parts = []
    for i, r in enumerate(results, 1):
        part = f"### Case {i}: {r.get('case_number', 'Unknown')} (CNR: {r.get('cnr', 'N/A')})\n"
        part += f"Court: {r.get('court_name', 'N/A')} | Judge: {r.get('judge_name', 'N/A')} | Status: {r.get('status', 'N/A')}\n"
        
        # Add matched chunks for granular context
        matched_chunks = r.get('matched_chunks', [])
        if matched_chunks:
            part += "\n**Relevant excerpts:**\n"
            for chunk in sorted(matched_chunks, key=lambda c: c['score'], reverse=True)[:3]:
                part += f"- {chunk['text']}\n"
        
        # Add summary (truncated if too long)
        summary = r.get('summary', '')
        if summary:
            if len(summary) > 800:
                summary = summary[:800] + '...'
            part += f"\n**Summary:** {summary}\n"
        
        context_parts.append(part)

    return "\n---\n".join(context_parts)


SYSTEM_PROMPT = """You are a legal research assistant for Indian law. You answer questions about legal cases based on the provided case data.

Instructions:
- Answer the user's question using ONLY the provided case context. Do not make up information.
- Structure your response with clear headers and bullet points where appropriate.
- Reference specific case numbers when citing information.
- If the context doesn't contain enough information to answer fully, say so.
- Be concise but thorough.
- Use markdown formatting for readability."""


def stream_llm_response(context: str, query: str):
    """
    Get a complete response from the NVIDIA LLM API and yield it 
    to the frontend using the expected mode/message format.
    """
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"## Case Context\n\n{context}\n\n## Question\n\n{query}"},
    ]

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "temperature": 0.3,
        "top_p": 0.9,
        "max_tokens": 2048,
        "stream": False,
    }

    try:
        resp = requests.post(LLM_URL, headers=NVIDIA_HEADERS, json=payload, timeout=60)
        resp.raise_for_status()

        data = resp.json()
        choices = data.get('choices', [])
        content = choices[0].get('message', {}).get('content', '') if choices else ''

        if content:
            yield f"data: {json.dumps({'mode': 'response', 'message': content})}\n\n"

    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        yield f"data: {json.dumps({'mode': 'error', 'message': f'Error generating response: {str(e)}'})}\n\n"


# ── Routes ──────────────────────────────────────────────────────────────

@router.post("")
def create_search(request: CreateSearchRequest, db=Depends(get_db)):
    """Create a new semantic search chat session."""
    chat_id = str(uuid.uuid4())
    chat_sessions[chat_id] = {
        'id': chat_id,
        'query': request.query,
        'messages': [],
        'created_at': datetime.utcnow().isoformat(),
    }
    return {"chatId": chat_id}


@router.post("/chat")
def chat(request: ChatMessageRequest, db=Depends(get_db)):
    """
    Handle a chat message with SSE streaming.
    This is the main semantic search endpoint.
    """
    chat_id = request.chat_id
    query = request.query

    # Create session if it doesn't exist
    if chat_id not in chat_sessions:
        chat_sessions[chat_id] = {
            'id': chat_id,
            'query': query,
            'messages': [],
            'created_at': datetime.utcnow().isoformat(),
        }

    # Store user message
    job_id = str(uuid.uuid4())
    user_msg = {
        'id': str(uuid.uuid4()),
        'role': 'user',
        'query': query,
        'timestamp': datetime.utcnow().isoformat(),
    }
    chat_sessions[chat_id]['messages'].append(user_msg)

    # 1. Search for relevant cases BEFORE the generator so we have an active db session
    try:
        results = hybrid_search(db, query, top_k=5)
    except Exception as e:
        logger.error(f"Search error: {e}")
        results = []

    def generate_sse():
        """Generator for SSE events."""
        try:
            if not results:
                yield f"data: {json.dumps({'mode': 'response', 'message': 'No relevant cases found for your query. Please try rephrasing or broadening your search.'})}\n\n"
            else:
                # 2. Build context and stream LLM response
                context = build_context(results, query)
                yield from stream_llm_response(context, query)

            # 3. Send source citations
            sources = []
            for r in results:
                sources.append({
                    'case_id': r.get('cnr', ''),
                    'case_no': r.get('case_number', ''),
                    'case_type': r.get('case_type', ''),
                    'court': r.get('court_name', ''),
                    'title': f"{r.get('case_number', 'Unknown')} ({r.get('cnr', '')})",
                })

            meta_event = {
                'job_id': job_id,
                'citations': [
                    {'title': s['title'], 'url': f"/entity/case/{s['case_id']}"}
                    for s in sources
                ],
                'sources': sources,
            }
            yield f"data: {json.dumps({'mode': 'metadata', 'message': json.dumps(meta_event)})}\n\n"

            # 4. Send done (frontend ignores [DONE] but it's a good marker)
            yield f"data: [DONE]\n\n"

            # 5. Store assistant message in session
            assistant_msg = {
                'id': job_id,
                'role': 'assistant',
                'query': query,
                'output': '[Synchronous response]',
                'sources': sources,
                'timestamp': datetime.utcnow().isoformat(),
            }
            chat_sessions[chat_id]['messages'].append(assistant_msg)

        except Exception as e:
            logger.error(f"SSE generation error: {e}")
            yield f"data: {json.dumps({'mode': 'error', 'message': f'An error occurred during search: {str(e)}'})}\n\n"
            yield f"data: [DONE]\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/chat/history")
def get_chat_history(page: int = 1, page_size: int = 20):
    """List all chat sessions."""
    sessions = sorted(
        chat_sessions.values(),
        key=lambda x: x.get('created_at', ''),
        reverse=True,
    )
    start = (page - 1) * page_size
    end = start + page_size
    results = [
        {'id': s['id'], 'title': s.get('query', 'Untitled')}
        for s in sessions[start:end]
    ]
    return {
        'results': results,
        'page': page,
        'page_size': page_size,
        'total': len(sessions),
    }


@router.get("/chat/{chat_id}/history")
def get_chat_messages(chat_id: str, page: int = 1, page_size: int = 50):
    """Get messages for a specific chat session."""
    session = chat_sessions.get(chat_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat not found")

    messages = session.get('messages', [])
    start = (page - 1) * page_size
    end = start + page_size

    return {
        'results': messages[start:end],
        'page': page,
        'page_size': page_size,
    }


@router.delete("/chat/{chat_id}")
def delete_chat(chat_id: str):
    """Delete a chat session."""
    if chat_id in chat_sessions:
        del chat_sessions[chat_id]
    return {"message": "Chat deleted"}


@router.post("/chat/stop-conversation")
def stop_conversation(body: dict):
    """Stop an ongoing conversation."""
    return {"message": "Conversation stopped"}


@router.get("/suggestions")
def get_suggestions(query: str = ""):
    """Return search suggestions."""
    suggestions = [
        "Cases involving loan default under SARFAESI Act",
        "Cases with property disputes in Mumbai",
        "Cases involving cheque bounce under Section 138 NI Act",
        "Cases where bank sought possession of secured assets",
        "Cases involving fraud and financial misrepresentation",
    ]
    if query:
        suggestions = [s for s in suggestions if query.lower() in s.lower()]
    return suggestions


@router.get("/job/{job_id}")
async def get_job_result(job_id: str):
    """
    Legacy endpoint for polling job results.
    The frontend may call this; we return a simple completed response.
    """
    return StreamingResponse(
        iter([
            f"data: {json.dumps({'type': 'block_start', 'blockId': 'cached', 'kind': 'paragraph'})}\n\n",
            f"data: {json.dumps({'type': 'token', 'blockId': 'cached', 'content': 'This result was previously generated. Please start a new search.'})}\n\n",
            f"data: {json.dumps({'type': 'block_end', 'blockId': 'cached'})}\n\n",
            f"data: {json.dumps({'type': 'done'})}\n\n",
        ]),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/jobs/{job_id}/feedback")
def submit_feedback(job_id: str, body: dict):
    """Accept feedback on a search result."""
    return {"message": "Feedback received", "feedbackId": str(uuid.uuid4())}


@router.delete("/jobs/{job_id}/feedback/{feedback_id}")
def delete_feedback(job_id: str, feedback_id: str):
    """Delete feedback."""
    return {"message": "Feedback deleted"}
