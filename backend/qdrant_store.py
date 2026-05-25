"""
Shared Qdrant client singleton for LegalAI.
Collection: legalai_doc_chunks
"""
import logging
import os
from functools import lru_cache

from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    PayloadSchemaType,
)

load_dotenv()
logger = logging.getLogger(__name__)

QDRANT_URL  = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION  = "legalai_doc_chunks"
VECTOR_DIM  = 1024  # nvidia/nv-embedqa-e5-v5 output dim


@lru_cache(maxsize=1)
def get_qdrant() -> QdrantClient:
    """Return the singleton Qdrant client (lazy-init, cached)."""
    client = QdrantClient(url=QDRANT_URL, timeout=10)
    _ensure_collection(client)
    return client


def _ensure_collection(client: QdrantClient) -> None:
    """Create collection + payload indexes if they don't exist."""
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION in existing:
        logger.info("Qdrant collection '%s' already exists.", COLLECTION)
        return

    logger.info("Creating Qdrant collection '%s' (dim=%d).", COLLECTION, VECTOR_DIM)
    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_DIM, distance=Distance.COSINE),
    )

    # Create payload indexes for fast metadata filtering
    for field, schema in [
        ("case_id",     PayloadSchemaType.KEYWORD),
        ("cnr_number",  PayloadSchemaType.KEYWORD),
        ("case_type",   PayloadSchemaType.KEYWORD),
        ("district",    PayloadSchemaType.KEYWORD),
        ("state",       PayloadSchemaType.KEYWORD),
        ("status",      PayloadSchemaType.KEYWORD),
    ]:
        client.create_payload_index(
            collection_name=COLLECTION,
            field_name=field,
            field_schema=schema,
        )
    logger.info("Payload indexes created.")
