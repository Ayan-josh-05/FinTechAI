"""
One-time migration script: chunks all Document.full_text from Neo4j,
embeds with NVIDIA NemoRetriever, and upserts into Qdrant.

Run once (idempotent — skips already-indexed document chunks):
    python -m backend.scripts.build_qdrant_index

Re-run after new cases are added to keep the index fresh.
"""
import logging
import sys
import uuid
from shared.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, NVIDIA_API_KEY, EMBEDDING_MODEL
from pathlib import Path

# Make sure the project root is on the path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

EMBED_MODEL    = EMBEDDING_MODEL

CHUNK_SIZE    = 800    # chars per chunk
CHUNK_OVERLAP = 100    # overlap between consecutive chunks
BATCH_SIZE    = 64     # embed + upsert batch size

# ── Fetch documents from Neo4j ────────────────────────────────────────────────

_FETCH_QUERY = """\
MATCH (c:Case)-[:HAS_DOCUMENT]->(d:Document)
WHERE d.full_text IS NOT NULL AND d.full_text <> ''
RETURN
  c.id          AS case_id,
  c.cnr_number  AS cnr_number,
  c.case_number AS case_number,
  c.case_type   AS case_type,
  c.district    AS district,
  c.state       AS state,
  c.status      AS status,
  c.stage       AS stage,
  d.id          AS document_id,
  d.order_type  AS order_type,
  d.order_date  AS order_date,
  d.full_text   AS full_text
ORDER BY c.cnr_number, d.order_date
"""


def fetch_documents(driver):
    with driver.session() as session:
        return session.run(_FETCH_QUERY).data()


# ── Chunking ──────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into chunks using LangChain's RecursiveCharacterTextSplitter."""
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    return chunks if chunks else [text[:chunk_size]]


# ── Embedding ─────────────────────────────────────────────────────────────────

def get_embedder():
    from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
    return NVIDIAEmbeddings(
        model=EMBED_MODEL, api_key=NVIDIA_API_KEY, truncate="END"
    )


# ── Already-indexed tracking ──────────────────────────────────────────────────

def get_indexed_document_ids(qdrant_client) -> set[str]:
    """Return set of document_ids already in Qdrant (to support re-runs)."""
    from qdrant_client.http.models import ScrollRequest
    from backend.qdrant_store import COLLECTION

    indexed = set()
    offset = None
    while True:
        result, next_offset = qdrant_client.scroll(
            collection_name=COLLECTION,
            scroll_filter=None,
            limit=1000,
            offset=offset,
            with_payload=["document_id"],
        )
        for point in result:
            doc_id = (point.payload or {}).get("document_id")
            if doc_id:
                indexed.add(doc_id)
        if next_offset is None:
            break
        offset = next_offset
    return indexed


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    from neo4j import GraphDatabase
    from qdrant_client.http.models import PointStruct
    from backend.qdrant_store import get_qdrant, COLLECTION

    # Connect
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    qdrant = get_qdrant()
    embedder = get_embedder()

    logger.info("Fetching documents from Neo4j...")
    docs = fetch_documents(driver)
    logger.info("Found %d documents with full_text.", len(docs))

    # Skip already-indexed documents
    indexed_ids = get_indexed_document_ids(qdrant)
    logger.info("Already indexed: %d document IDs.", len(indexed_ids))

    new_docs = [d for d in docs if d["document_id"] not in indexed_ids]
    logger.info("Documents to index: %d", len(new_docs))

    if not new_docs:
        logger.info("Nothing to do — index is up to date.")
        driver.close()
        return

    # Build all chunks with metadata
    all_points: list[PointStruct] = []
    for doc in new_docs:
        chunks = chunk_text(doc["full_text"])
        for i, chunk in enumerate(chunks):
            all_points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=[],          # filled in batch below
                payload={
                    "case_id":      doc["case_id"]     or "",
                    "cnr_number":   doc["cnr_number"]  or "",
                    "case_number":  doc["case_number"] or "",
                    "case_type":    doc["case_type"]   or "",
                    "district":     doc["district"]    or "",
                    "state":        doc["state"]       or "",
                    "status":       doc["status"]      or "",
                    "stage":        doc["stage"]       or "",
                    "document_id":  doc["document_id"] or "",
                    "order_type":   doc["order_type"]  or "",
                    "order_date":   str(doc["order_date"] or ""),
                    "chunk_index":  i,
                    "chunk_text":   chunk,
                },
            ))

    logger.info("Total chunks to embed & upsert: %d", len(all_points))

    # Batch embed + upsert
    total_batches = (len(all_points) + BATCH_SIZE - 1) // BATCH_SIZE
    for batch_num in range(total_batches):
        start = batch_num * BATCH_SIZE
        end   = min(start + BATCH_SIZE, len(all_points))
        batch = all_points[start:end]

        texts = [p.payload["chunk_text"] for p in batch]
        try:
            vectors = embedder.embed_documents(texts)
        except Exception as e:
            logger.error("Embed failed at batch %d: %s — skipping", batch_num, e)
            continue

        for point, vec in zip(batch, vectors):
            point.vector = vec

        qdrant.upsert(collection_name=COLLECTION, points=batch)
        logger.info(
            "Batch %d/%d done — chunks %d-%d upserted.",
            batch_num + 1, total_batches, start, end - 1
        )

    count = qdrant.get_collection(COLLECTION).points_count
    logger.info("Done. Qdrant collection '%s' now has %d points.", COLLECTION, count)
    driver.close()


if __name__ == "__main__":
    main()
