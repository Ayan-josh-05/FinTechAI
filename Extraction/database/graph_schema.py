"""
Labels/graph_schema.py
Neo4j node labels, constraints, and index definitions.
Run setup_schema() once before the first pipeline run.

Node labels  : Case, Court, Act, Person, Organization, Asset,
               Hearing, Document, ExtractionLog
Relationship types: PETITIONER_IN, RESPONDENT_IN, ADVOCATE_FOR,
                    JUDGE_IN, HEARD_IN, INVOKES, HAS_ASSET,
                    HAS_HEARING, HAS_DOCUMENT, HAS_LOG
"""
import logging
from database.db_connection import neo4j_driver

logger = logging.getLogger('pipeline')

# ── Constraints ────────────────────────────────────────────────────────────
CONSTRAINTS = [
    "CREATE CONSTRAINT case_cnr    IF NOT EXISTS FOR (n:Case)         REQUIRE n.cnr       IS UNIQUE",
    "CREATE CONSTRAINT court_name  IF NOT EXISTS FOR (n:Court)        REQUIRE n.name      IS UNIQUE",
    "CREATE CONSTRAINT act_norm    IF NOT EXISTS FOR (n:Act)          REQUIRE n.name_norm IS UNIQUE",
    "CREATE CONSTRAINT person_norm IF NOT EXISTS FOR (n:Person)       REQUIRE n.name_norm IS UNIQUE",
    "CREATE CONSTRAINT org_norm    IF NOT EXISTS FOR (n:Organization) REQUIRE n.name_norm IS UNIQUE",
    "CREATE CONSTRAINT chunk_id    IF NOT EXISTS FOR (n:Chunk)        REQUIRE n.id        IS UNIQUE",
]

# ── Standard indexes ───────────────────────────────────────────────────────
INDEXES = [
    "CREATE INDEX case_status    IF NOT EXISTS FOR (n:Case)         ON (n.status)",
    "CREATE INDEX case_district  IF NOT EXISTS FOR (n:Case)         ON (n.district)",
    "CREATE INDEX case_type_idx  IF NOT EXISTS FOR (n:Case)         ON (n.case_type)",
    "CREATE INDEX case_filing    IF NOT EXISTS FOR (n:Case)         ON (n.filing_date)",
    "CREATE INDEX judge_uid_idx  IF NOT EXISTS FOR (n:Person)       ON (n.uid_number)",
    "CREATE INDEX org_type_idx   IF NOT EXISTS FOR (n:Organization) ON (n.organization_type)",
    "CREATE INDEX chunk_cnr_idx  IF NOT EXISTS FOR (n:Chunk)        ON (n.cnr_number)",
]

# ── Vector indexes (Neo4j 5.11+) ───────────────────────────────────────────
VECTOR_INDEXES = [
    """\
CREATE VECTOR INDEX case_search_vector IF NOT EXISTS
FOR (c:Case) ON c.search_vector
OPTIONS {indexConfig: {`vector.dimensions`: 2048, `vector.similarity_function`: 'cosine'}}""",
    """\
CREATE VECTOR INDEX chunk_vector IF NOT EXISTS
FOR (c:Chunk) ON c.chunk_vector
OPTIONS {indexConfig: {`vector.dimensions`: 2048, `vector.similarity_function`: 'cosine'}}""",
]


def setup_schema() -> None:
    """
    Idempotently create all constraints and indexes.
    Safe to run multiple times — IF NOT EXISTS guards each statement.
    """
    logger.info('Setting up Neo4j schema...')
    with neo4j_driver.session() as session:
        for stmt in CONSTRAINTS:
            session.run(stmt)
            logger.info(f'  constraint: {stmt[18:65]}')
        for stmt in INDEXES:
            session.run(stmt)
            logger.info(f'  index     : {stmt[13:65]}')
        for stmt in VECTOR_INDEXES:
            try:
                session.run(stmt)
                logger.info('  vector index created')
            except Exception as e:
                logger.warning(f'  vector index skipped (Neo4j < 5.11): {e}')
    logger.info('Schema ready.')
