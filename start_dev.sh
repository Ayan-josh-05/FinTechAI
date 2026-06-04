#!/usr/bin/env bash
# start_dev.sh
# Starts the LegalAI backend (FastAPI) and frontend (Vite) in parallel.
# Ctrl+C kills both processes.
#
# Usage:
#   ./start_dev.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colour helpers ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Colour

echo -e "${GREEN}LegalAI Dev Server${NC}"
echo -e "  ${CYAN}Backend${NC}  → http://127.0.0.1:8000"
echo -e "  ${CYAN}Frontend${NC} → http://localhost:3000"
echo -e "${YELLOW}Press Ctrl+C to stop both.${NC}\n"

# ── Activate Python virtual environment ───────────────────────────────────────
if [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    source "$PROJECT_ROOT/.venv/bin/activate"
else
    echo "ERROR: .venv not found at $PROJECT_ROOT/.venv" >&2
    exit 1
fi

# ── Start backend ─────────────────────────────────────────────────────────────
echo "[backend] Starting uvicorn..."
cd "$PROJECT_ROOT"
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# ── Start frontend ────────────────────────────────────────────────────────────
echo "[frontend] Starting Vite dev server..."
cd "$PROJECT_ROOT/ui_service"
npm run dev &
FRONTEND_PID=$!

# ── Wait and handle Ctrl+C ────────────────────────────────────────────────────
trap "echo; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait $BACKEND_PID $FRONTEND_PID
