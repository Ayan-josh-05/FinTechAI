"""
Extraction/database/calculate_metrics.py
Utility to calculate data extraction density (%) per case.
Formula: (Total non-null fields in Graph) / (Total possible fields in Pydantic models) * 100
"""
import logging
from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from models.entities import (
    Case, User, Organization, Court, Act, Asset, CaseHearing, Document
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger('metrics')

# Mapping Neo4j labels to Pydantic models (from entities.py)
MODEL_MAP = {
    'Case': Case,
    'Person': User,  # Maps to User/Lawyer/Judge (User has 18, so we use max)
    'Organization': Organization,
    'Court': Court,
    'Act': Act,
    'Asset': Asset,
    'Hearing': CaseHearing,
    'Document': Document,
}

# Pre-calculate counts dynamically
MODEL_FIELD_COUNTS = {k: len(v.model_fields) for k, v in MODEL_MAP.items()}

SYSTEM_FIELDS = {'id', 'created_at', 'updated_at', 'name_norm', 'search_vector', 'is_judge'}

def calculate_case_density():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    query = """
    MATCH (c:Case)
    OPTIONAL MATCH (c)-[r]-(n)
    WITH c, collect(DISTINCT n) + [c] AS nodes
    UNWIND nodes AS node
    WITH c, node, labels(node)[0] AS label, keys(node) AS props
    RETURN 
        c.cnr_number AS cnr,
        label,
        size([p IN props WHERE NOT p IN $sys_fields]) AS actual_fields
    """
    
    try:
        with driver.session() as session:
            results = session.run(query, sys_fields=list(SYSTEM_FIELDS))
            
            # Aggregate by CNR
            case_metrics = {}
            for record in results:
                cnr = record['cnr'] or "UNKNOWN_CNR"
                label = record['label']
                actual = record['actual_fields']
                
                if cnr not in case_metrics:
                    case_metrics[cnr] = {'total_actual': 0, 'total_possible': 0}
                
                # Check for label in our model counts
                possible = MODEL_FIELD_COUNTS.get(label, 0)
                if possible > 0:
                    case_metrics[cnr]['total_actual'] += actual
                    case_metrics[cnr]['total_possible'] += possible

            print("-" * 80)
            print(f"{'CNR Number':<25} | {'Fields':<10} | {'Possible':<10} | {'Density %'}")
            print("-" * 80)
            
            for cnr, data in case_metrics.items():
                actual = data['total_actual']
                possible = data['total_possible']
                percentage = (actual / possible * 100) if possible > 0 else 0
                print(f"{str(cnr):<25} | {actual:<10} | {possible:<10} | {percentage:>8.2f}%")
            print("-" * 80)
                
    except Exception as e:
        logger.error(f"Metrics calculation failed: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    calculate_case_density()
