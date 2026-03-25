"""
Database/db_connection.py
Neo4j driver initialisation — import `neo4j_driver` anywhere in the project.
"""
import logging
from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

logging.getLogger('neo4j').setLevel(logging.WARNING)
logging.getLogger('neo4j.notifications').setLevel(logging.ERROR)

neo4j_driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD),
    notifications_min_severity='WARNING',
    notifications_disabled_categories=['PERFORMANCE', 'UNRECOGNIZED'],
)


def get_driver():
    """Return the shared Neo4j driver instance."""
    return neo4j_driver


def close_driver():
    """Cleanly close the driver on shutdown."""
    neo4j_driver.close()
