# LegalAI

An end-to-end system for extracting, storing, and querying Indian court case data using a Knowledge Graph (Neo4j) and Vector Search (Qdrant), surfaced via a FastAPI backend and a Vite/React frontend.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [What's Implemented](#whats-implemented)
- [Setup Instructions](#setup-instructions)
  - [1. Python Environment](#1-python-environment)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Docker Desktop](#3-docker-desktop)
  - [4. Neo4j (via Docker)](#4-neo4j-via-docker)
  - [5. Qdrant (via Docker)](#5-qdrant-via-docker)
  - [6. Import Neo4j Data Dump](#6-import-neo4j-data-dump)
  - [7. Build the Qdrant Vector Index](#7-build-the-qdrant-vector-index)
  - [8. Run the Backend](#8-run-the-backend)
  - [9. Run the Frontend](#9-run-the-frontend)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Data Sources                        │
│         JSON metadata + PDF court orders                │
└─────────────────────────┬───────────────────────────────┘
                          │
              ┌───────────▼───────────┐
              │  Extraction Pipeline  │  Extraction/main.py
              │  (6-stage, cached)    │
              └──┬──────┬──────┬─────┘
                 │      │      │
          ┌──────▼──┐ ┌─▼──┐ ┌▼──────────┐
          │  Neo4j  │ │PDF │ │  Qdrant   │
          │  Graph  │ │ /  │ │  Vector   │
          │   DB    │ │OCR │ │  Index    │
          └──────┬──┘ └────┘ └────┬──────┘
                 │                │
         ┌───────▼────────────────▼──────┐
         │         FastAPI Backend        │  backend/main.py
         │  /search  /entity  /auth       │
         └──────────────┬────────────────┘
                        │
              ┌─────────▼─────────┐
              │   Vite/React UI   │  ui_service/
              └───────────────────┘
```

---

## What's Implemented

### Extraction Pipeline (`Extraction/`)

A 6-stage, per-case processing pipeline with file-based intermediate caching (`.pipeline_cache/`), so individual stages can be re-run without repeating the whole pipeline.

| Stage | File | Output |
|-------|------|--------|
| 1 — JSON load | `text_extraction/json_loader.py` | `CaseModel` (Pydantic) |
| 2 — PDF extraction | `text_extraction/pdf_extractor.py` | `{storage_id: text}` dict (digital + OCR) |
| 3 — LLM extraction | `llm_extraction.py` | Structured JSON (judges, parties, acts, summary) |
| 4 — Graph inserts | `database/graph_inserts.py` | Neo4j nodes & relationships |
| 5 — Document backfill | *(part of stage 4)* | `Document.full_text` populated |
| 6 — Embeddings | `Extraction/main.py` | Case vector on Neo4j node |

**Cache layer** (`Extraction/cache/pipeline_cache.py`): Each stage writes `<stage>.json` + `<stage>.meta.json` per case. A stage is skipped if its input hash matches the cached value.

**CLI flags** on `Extraction/main.py`:

```bash
# Process all pending cases
python -m Extraction.main

# Process one case (uses caches)
python -m Extraction.main --cnr MHXX010012342024

# Force re-run from a specific stage
python -m Extraction.main --force-stage llm_output --cnr MHXX010012342024

# Force-rerun all stages (no cache)
python -m Extraction.main --force-stage all
```

**Case edit CLI** (`Extraction/tools/edit_case.py`): Safe, scoped tool to edit Case nodes in Neo4j without touching shared nodes (Person, Organization, Court, Act).

```bash
# Show a case
python -m Extraction.tools.edit_case --cnr MHXX... --show

# Edit a field
python -m Extraction.tools.edit_case --cnr MHXX... --field status --value "disposed"

# Invalidate cache from a stage onwards
python -m Extraction.tools.edit_case --cnr MHXX... --rerun-from llm_output
```

---

### Knowledge Graph — Neo4j

The graph schema includes:

| Node | Description |
|------|-------------|
| `Case` | Core node with metadata; linked to all entities |
| `Person` | Parties and lawyers (deduplicated across cases) |
| `Organization` | Organizational parties |
| `Judge` | With `JUDGE_IN` relationships to cases |
| `Court` | Shared across cases |
| `Act` | Legislation cited in cases |
| `Hearing` | Case timeline entries |
| `Document` | Court orders (with full extracted text) |
| `Asset` | Immovable properties mentioned |
| `ExtractionLog` | Missing-data audit trail |
| `Chunk` | Text chunks for embedding |

---

### Backend API (`backend/`)

FastAPI server exposing:

| Route | Description |
|-------|-------------|
| `GET /health` | Health check |
| `POST /auth/...` | Authentication |
| `GET /entity/case/...` | Case detail queries against Neo4j |
| `GET /entity/court/...` | Court detail queries against Neo4j |
| `POST /search/...` | Agentic semantic search (Qdrant + Neo4j) |

**Qdrant vector search** (`backend/qdrant_store.py`): Collection `legalai_doc_chunks` stores 1024-dim embeddings of court order text chunks, with payload indexes for `case_id`, `cnr_number`, `case_type`, `district`, `state`, and `status`.

---

### Frontend (`ui_service/`)

React + Vite + TypeScript UI with routes for search, case detail view, and court detail view. Communicates with the FastAPI backend at `http://127.0.0.1:8000`.

---

## Setup Instructions

### 1. Python Environment

> Requires **Python 3.14.6**

```bash
# Create virtual environment (use your Python 3.14.6 binary)
python3.14 -m venv .legalai

# Activate
source .legalai/bin/activate        # macOS / Linux
# .legalai\Scripts\activate         # Windows

# Install all dependencies
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

---

### 2. Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set the following:

```dotenv
# ── Database ─────────────────────────────────────────────────────
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# ── Qdrant ───────────────────────────────────────────────────────
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=legalai_doc_chunks

# ── NVIDIA API (required for LLM extraction + embeddings) ────────
NVIDIA_API_KEY=nvapi-your-key-here

# ── Extraction data root (absolute path to case JSON/PDF files) ──
DATASET_ROOT=/absolute/path/to/LegalAI/Extraction/data
```

---

### 3. Docker Desktop

Docker Desktop is required to run Neo4j and Qdrant locally.

**Install via Homebrew (macOS):**

```bash
brew install --cask docker
```

After installation, launch **Docker Desktop** from your Applications folder and wait until the whale icon in the menu bar is solid (engine running).

Verify:

```bash
docker info
```

---

### 4. Neo4j (via Docker)

Run **Neo4j 2026.05.0** with Bolt exposed on port **7687**:

```bash
docker run -d \
  --name neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_PLUGINS='["apoc"]' \
  -v neo4j_data:/data \
  neo4j:2026.05.0
```

- **Neo4j Browser:** http://localhost:7474
- **Bolt URI:** `neo4j://localhost:7687`

Check health:

```bash
docker logs neo4j --tail 30
```

---

### 5. Qdrant (via Docker)

Run **Qdrant 1.18.2** on port **6333**:

```bash
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v qdrant_storage:/qdrant/storage \
  qdrant/qdrant:v1.18.2
```

- **Qdrant Dashboard:** http://localhost:6333/dashboard

---

### 6. Import Neo4j Data Dump

> This step loads the pre-built case graph into Neo4j. **Neo4j must be stopped during import.**

```bash
# 1. Download the dump file
curl -L -o legalai.dump "<DUMP_DOWNLOAD_LINK>"

# 2. Stop the running container
docker stop neo4j

# 3. Import the dump
docker run --rm \
  -v neo4j_data:/data \
  -v "$(pwd)/legalai.dump":/dump/legalai.dump \
  neo4j:2026.05.0 \
  neo4j-admin database load \
    --from-path=/dump \
    neo4j \
    --overwrite-destination=true

# 4. Restart Neo4j
docker start neo4j
```

Wait ~30 seconds for Neo4j to finish starting, then verify at http://localhost:7474.

---

### 7. Build the Qdrant Vector Index

This one-time script reads `Document.full_text` from Neo4j, chunks the text, embeds it via NVIDIA NemoRetriever, and upserts into Qdrant. It is **idempotent** — re-running it skips already-indexed documents.

> Run this **after** the Neo4j dump is imported and Neo4j is running.

```bash
# With venv activated
python -m backend.scripts.build_qdrant_index
```

Re-run any time new cases are added to Neo4j.

---

### 8. Run the Backend

```bash
# Activate venv if not already
source .legalai/bin/activate

uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

- **API:** http://127.0.0.1:8000
- **Swagger UI:** http://127.0.0.1:8000/docs

---

### 9. Run the Frontend

> Requires **Node.js 20+**

```bash
cd ui_service

# Install dependencies (first time only)
npm install

# Start the dev server
npm run dev

# If using mise for Node version management:
mise exec -- npm run dev
```

- **Frontend:** http://localhost:3000

---

## Quick Reference

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | — |
| Backend API | http://127.0.0.1:8000 | — |
| API Docs (Swagger) | http://127.0.0.1:8000/docs | — |
| Neo4j Browser | http://localhost:7474 | neo4j / password |
| Qdrant Dashboard | http://localhost:6333/dashboard | — |

---

## Notes

- The **Qdrant vector index is not included in the Neo4j dump** — it must be built locally using `build_qdrant_index.py` after importing the dump.
- The extraction pipeline stores intermediate outputs in `DATASET_ROOT/.pipeline_cache/<cnr>/` as plain JSON files for developer inspection.
- To globally invalidate all pipeline caches (e.g. after a model change), bump `PIPELINE_VERSION` in `shared/config.py`.
