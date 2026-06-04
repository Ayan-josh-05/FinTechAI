"""
backend/routes/querySearch/history.py
--------------------------------------
Session store and conversation history routes for the LegalAI Search Buddy.

All routes are mounted under /search by router.py.
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter

router = APIRouter()

# ── Shared session store ───────────────────────────────────────────────────────
# Single source of truth — imported by agent.py to share the same dict.
# chat_id → {
#   "id":         str,
#   "agent":      compiled langgraph agent | None,
#   "history":    list[BaseMessage],
#   "created_at": str (ISO),
# }

_sessions: dict[str, dict] = {}

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/chat/history")
def get_chat_history(page: int = 1, page_size: int = 20):
    """Return a paginated list of all sessions (sidebar history)."""
    sessions = sorted(
        _sessions.values(),
        key=lambda s: s.get("created_at", ""),
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
def get_session_messages(chat_id: str, page: int = 1, page_size: int = 50):
    """Return paginated conversation turns for a specific session."""
    session = _sessions.get(chat_id)
    if not session:
        return {"results": [], "page": page, "page_size": page_size, "total": 0}

    messages = session.get("history", [])
    turns, i = [], 0
    while i < len(messages):
        msg = messages[i]
        if msg.__class__.__name__ == "HumanMessage":
            ai_text = (
                messages[i + 1].content
                if i + 1 < len(messages) and messages[i + 1].__class__.__name__ == "AIMessage"
                else ""
            )
            turns.append({
                "id":     str(uuid.uuid4()),
                "role":   "user",
                "query":  msg.content,
                "output": ai_text,
            })
            i += 2
        else:
            i += 1

    start = (page - 1) * page_size
    return {
        "results":   turns[start: start + page_size],
        "page":      page,
        "page_size": page_size,
        "total":     len(turns),
    }


@router.get("/job/{job_id}")
def get_job(job_id: str):
    """Look up a session by job/chat ID. Returns session metadata."""
    session = _sessions.get(job_id)
    if not session:
        return {"id": job_id, "query": "", "output": "", "sources": []}
    messages = session.get("history", [])
    last_query  = next((m.content for m in reversed(messages) if m.__class__.__name__ == "HumanMessage"), "")
    last_answer = next((m.content for m in reversed(messages) if m.__class__.__name__ == "AIMessage"), "")
    return {
        "id":      job_id,
        "query":   last_query,
        "output":  last_answer,
        "sources": [],
    }


@router.delete("/session/{chat_id}")
def delete_session(chat_id: str):
    """Remove a session and free its memory."""
    _sessions.pop(chat_id, None)
    return {"deleted": chat_id}


@router.get("/user-queries")
def get_user_queries(query_type: str = "recent", page: int = 1, page_size: int = 5):
    """Stub endpoint for frontend compatibility — prevents 404 errors."""
    return {"results": [], "page": page, "page_size": page_size, "total": 0}
