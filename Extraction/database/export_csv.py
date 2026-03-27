"""
Extraction/database/export_csv.py
Utility to export all Case data from Neo4j into a single CSV file.
"""
import csv
import logging
from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger('export')

def export_neo4j_to_csv(output_path="legal_cases_export.csv"):
    query = """
    MATCH (c:Case)
    OPTIONAL MATCH (c)-[:HEARD_IN]->(ct:Court)
    OPTIONAL MATCH (c)<-[:JUDGE_IN]-(j:Person)
    OPTIONAL MATCH (c)<-[:PETITIONER_IN]-(p)
    OPTIONAL MATCH (c)<-[:RESPONDENT_IN]-(r)
    OPTIONAL MATCH (c)-[:INVOKES]->(a:Act)
    OPTIONAL MATCH (c)-[:HAS_ASSET]->(asset:Asset)
    
    RETURN 
        c.cnr_number AS cnr,
        c.case_number AS case_num,
        c.case_type AS type,
        c.status AS status,
        c.case_stage AS stage,
        c.filing_date AS filing_date,
        c.disposal_date AS disposal_date,
        c.search_summary AS summary,
        ct.name AS court,
        ct.district AS district,
        ct.state AS state,
        collect(DISTINCT j.name) AS judges,
        collect(DISTINCT p.name) AS petitioners,
        collect(DISTINCT r.name) AS respondents,
        collect(DISTINCT a.name) AS acts,
        collect(DISTINCT asset.asset_type + ": " + coalesce(asset.identifier, "")) AS assets
    """
    
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        with driver.session() as session:
            results = session.run(query)
            
            with open(output_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                # Header
                writer.writerow([
                    'CNR', 'Case Number', 'Type', 'Status', 'Stage', 
                    'Filing Date', 'Disposal Date', 'Summary', 
                    'Court', 'District', 'State', 
                    'Judges', 'Petitioners', 'Respondents', 
                    'Acts', 'Assets'
                ])
                
                count = 0
                for record in results:
                    writer.writerow([
                        record['cnr'],
                        record['case_num'],
                        record['type'],
                        record['status'],
                        record['stage'],
                        record['filing_date'],
                        record['disposal_date'],
                        record['summary'],
                        record['court'],
                        record['district'],
                        record['state'],
                        ", ".join(filter(None, record['judges'])),
                        ", ".join(filter(None, record['petitioners'])),
                        ", ".join(filter(None, record['respondents'])),
                        ", ".join(filter(None, record['acts'])),
                        "; ".join(filter(None, record['assets']))
                    ])
                    count += 1
                    
                logger.info(f"Successfully exported {count} cases to {output_path}")
                
    except Exception as e:
        logger.error(f"Export failed: {e}")
    finally:
        driver.close()

if __name__ == "__main__":
    export_neo4j_to_csv()
