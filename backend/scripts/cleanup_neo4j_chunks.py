"""
One-time cleanup: removes all Chunk nodes and the chunk_vector index from Neo4j.
These are redundant after migration to Qdrant.

Run ONCE after build_qdrant_index.py has completed successfully:
    python -m backend.scripts.cleanup_neo4j_chunks
"""
import logging
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

NEO4J_URI      = os.getenv("NEO4J_URI",      "bolt://localhost:7687")
NEO4J_USER     = os.getenv("NEO4J_USER",     "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")


def main():
    from neo4j import GraphDatabase

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    with driver.session() as session:
        # Count before
        count = session.run("MATCH (ch:Chunk) RETURN count(ch) AS cnt").single()["cnt"]
        logger.info("Found %d Chunk nodes to delete.", count)

        if count == 0:
            logger.info("Nothing to delete.")
            driver.close()
            return

        # Confirm
        answer = input(f"Delete {count} Chunk nodes and the chunk_vector index? [yes/no]: ").strip().lower()
        if answer != "yes":
            logger.info("Aborted.")
            driver.close()
            return

        # Delete in batches of 1000 to avoid memory spike
        deleted = 0
        while True:
            result = session.run(
                "MATCH (ch:Chunk) WITH ch LIMIT 1000 DETACH DELETE ch RETURN count(*) AS n"
            ).single()
            n = result["n"]
            deleted += n
            logger.info("Deleted %d / %d Chunk nodes...", deleted, count)
            if n == 0:
                break

        # Drop vector index if it exists
        try:
            session.run("DROP INDEX chunk_vector IF EXISTS")
            logger.info("Dropped index: chunk_vector")
        except Exception as e:
            logger.warning("Could not drop index chunk_vector: %s", e)

        # Drop HAS_CHUNK relationships (they now point to nothing, but clean up)
        rel_count = session.run(
            "MATCH ()-[r:HAS_CHUNK]->() DELETE r RETURN count(r) AS n"
        ).single()["n"]
        logger.info("Deleted %d HAS_CHUNK relationships.", rel_count)

        logger.info("Cleanup complete. Chunk nodes deleted: %d", deleted)

    driver.close()


if __name__ == "__main__":
    main()
