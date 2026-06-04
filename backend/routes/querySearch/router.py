"""
backend/routes/querySearch/router.py
--------------------------------------
Single entry point that combines all query-search sub-routers.

Mounted in backend/main.py at prefix /search.

Route layout under /search:
  POST   /session                         — agent.py  — create a new chat session
  POST   /chat                            — agent.py  — send message, stream SSE
  POST   /chat/stop                       — agent.py  — stop streaming (no-op)
  GET    /suggestions                     — agent.py  — search suggestions stub
  GET    /chat/history                    — history.py — all sessions sidebar list
  GET    /chat/{chat_id}/history          — history.py — messages for a session
  GET    /job/{job_id}                    — history.py — session metadata lookup
  DELETE /session/{chat_id}              — history.py — delete a session
  GET    /user-queries                    — history.py — frontend compatibility stub
  POST   /jobs/{job_id}/feedback         — feedback.py — submit thumbs up/down
  DELETE /jobs/{job_id}/feedback/{fid}   — feedback.py — remove a feedback entry
  POST   /legal-discovery                — search.py  — structured legal discovery
  GET    /legal-discovery/{query_id}     — search.py  — get discovery results
  GET    /options                        — search.py  — filter options
"""

from fastapi import APIRouter

from backend.routes.querySearch import agent, history, feedback, search

router = APIRouter()

router.include_router(agent.router)
router.include_router(history.router)
router.include_router(feedback.router)
router.include_router(search.router)
