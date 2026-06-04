import logging
from neo4j import GraphDatabase

from shared.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD, NEO4J_DATABASE

# Setup neo4j logging (from Extraction)
logging.getLogger('neo4j').setLevel(logging.WARNING)
logging.getLogger('neo4j.notifications').setLevel(logging.ERROR)

# Unified driver instance
driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD),
    notifications_min_severity='WARNING',
    notifications_disabled_categories=['PERFORMANCE', 'UNRECOGNIZED'],
)

# Alias for compatibility with Extraction scripts
neo4j_driver = driver

# --- Extraction Pipeline Helpers ---
def get_driver():
    """Return the shared Neo4j driver instance (used by Extraction)."""
    return driver

def close_driver():
    """Cleanly close the driver on shutdown."""
    driver.close()


# --- Backend (FastAPI) Helpers ---
def get_db():
    """Yield a Neo4j session (used by FastAPI Depends)."""
    session = driver.session(database=NEO4J_DATABASE)
    try:
        yield session
    finally:
        session.close()

def close_db():
    """Alias for close_driver for backend compatibility."""
    driver.close()
