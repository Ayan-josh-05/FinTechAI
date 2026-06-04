"""
backend/routes/querySearch/feedback.py
----------------------------------------
Feedback routes (thumbs up / down) for the LegalAI Search Buddy.

In-memory stub — extend to persist to Neo4j or a database as needed.
All routes mounted under /search by router.py.
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ── In-memory feedback store ───────────────────────────────────────────────────
# job_id → list of feedback entries
_feedback: dict[str, list[dict]] = {}


class FeedbackRequest(BaseModel):
    reaction: str           # "like" | "dislike"
    feedback_text: str = ""


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/jobs/{job_id}/feedback")
def submit_feedback(job_id: str, request: FeedbackRequest):
    """Record a thumbs-up or thumbs-down for a search result."""
    feedback_id = str(uuid.uuid4())
    entry = {
        "id":            feedback_id,
        "job_id":        job_id,
        "reaction":      request.reaction,
        "feedback_text": request.feedback_text,
    }
    _feedback.setdefault(job_id, []).append(entry)
    return {"message": "Feedback recorded.", "id": feedback_id}


@router.delete("/jobs/{job_id}/feedback/{feedback_id}")
def delete_feedback(job_id: str, feedback_id: str):
    """Remove a specific feedback entry."""
    entries = _feedback.get(job_id, [])
    _feedback[job_id] = [e for e in entries if e["id"] != feedback_id]
    return {"message": "Feedback removed."}
