#!/usr/bin/env python3
"""Single public FastAPI entrypoint that fronts the three independent
document-processing services (OCR, translation, field-mapping).

Each backend module keeps running exactly as it already does today, in its
own process/venv, on its own internal port. This gateway does not import or
alter any of their code — it only reverse-proxies HTTP requests to them, so
from the outside (the frontend, Postman, curl) there is a single server to
talk to on one port.

Internal service locations are configurable via env vars so the startup
script can point this at wherever it launched each service.
"""

import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

OCR_BASE_URL = os.environ.get("OCR_BASE_URL", "http://127.0.0.1:8010")
TRANSLATION_BASE_URL = os.environ.get("TRANSLATION_BASE_URL", "http://127.0.0.1:8001")
FIELD_MAPPING_BASE_URL = os.environ.get("FIELD_MAPPING_BASE_URL", "http://127.0.0.1:8002")

# Headers that must not be forwarded as-is between hops (RFC 7230) plus a few
# that httpx/Starlette will recompute themselves and that would otherwise
# desync from the body we're actually sending/returning.
HOP_BY_HOP_HEADERS = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "host",
}
REQUEST_STRIP_HEADERS = HOP_BY_HOP_HEADERS
RESPONSE_STRIP_HEADERS = HOP_BY_HOP_HEADERS | {"content-length", "content-encoding"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.http = httpx.AsyncClient(timeout=120.0)
    yield
    await app.state.http.aclose()


app = FastAPI(title="Lending POC Gateway", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _proxy(request: Request, base_url: str, path: str) -> Response:
    client: httpx.AsyncClient = request.app.state.http
    headers = {k: v for k, v in request.headers.items() if k.lower() not in REQUEST_STRIP_HEADERS}
    body = await request.body()
    try:
        upstream = await client.request(
            request.method,
            f"{base_url}{path}",
            headers=headers,
            params=list(request.query_params.multi_items()),
            content=body,
        )
    except httpx.RequestError as exc:
        return JSONResponse(
            status_code=503,
            content={"detail": f"Upstream service unavailable ({base_url}{path}): {exc}"},
        )

    response_headers = {
        k: v for k, v in upstream.headers.items() if k.lower() not in RESPONSE_STRIP_HEADERS
    }
    return Response(content=upstream.content, status_code=upstream.status_code, headers=response_headers)


# --- Business endpoints (unprefixed — these paths don't collide across the
# three modules, so the frontend needs no path changes beyond one base URL) ---

@app.post("/extract")
async def extract(request: Request) -> Response:
    return await _proxy(request, OCR_BASE_URL, "/extract")


@app.post("/translate/text")
async def translate_text(request: Request) -> Response:
    return await _proxy(request, TRANSLATION_BASE_URL, "/translate/text")


@app.post("/translate/files")
async def translate_files(request: Request) -> Response:
    return await _proxy(request, TRANSLATION_BASE_URL, "/translate/files")


@app.post("/map")
async def map_fields(request: Request) -> Response:
    return await _proxy(request, FIELD_MAPPING_BASE_URL, "/map")


# --- Per-service health (namespaced since all three modules define /health) ---

@app.get("/ocr/health")
async def ocr_health(request: Request) -> Response:
    return await _proxy(request, OCR_BASE_URL, "/health")


@app.get("/translation/health")
async def translation_health(request: Request) -> Response:
    return await _proxy(request, TRANSLATION_BASE_URL, "/health")


@app.get("/field-mapping/health")
async def field_mapping_health(request: Request) -> Response:
    return await _proxy(request, FIELD_MAPPING_BASE_URL, "/health")


@app.get("/health")
async def health(request: Request) -> dict:
    client: httpx.AsyncClient = request.app.state.http
    statuses: dict[str, str] = {}
    for name, base in (
        ("ocr", OCR_BASE_URL),
        ("translation", TRANSLATION_BASE_URL),
        ("field_mapping", FIELD_MAPPING_BASE_URL),
    ):
        try:
            resp = await client.get(f"{base}/health", timeout=5.0)
            statuses[name] = "healthy" if resp.status_code == 200 else f"unhealthy ({resp.status_code})"
        except httpx.RequestError:
            statuses[name] = "unreachable"

    overall = "healthy" if all(v == "healthy" for v in statuses.values()) else "degraded"
    return {"status": overall, "services": statuses}


@app.get("/")
async def root() -> dict:
    return {
        "message": "Lending POC Gateway",
        "endpoints": {
            "POST /extract": "OCR text extraction (proxies document_processing/ocr)",
            "POST /translate/text": "Translate text (proxies document_processing/translation)",
            "POST /translate/files": "Translate files (proxies document_processing/translation)",
            "POST /map": "Field mapping (proxies field_mapping_poc)",
            "GET /health": "Aggregated health of all three backend services",
            "GET /ocr/health": "OCR service health",
            "GET /translation/health": "Translation service health",
            "GET /field-mapping/health": "Field mapping service health",
        },
    }
