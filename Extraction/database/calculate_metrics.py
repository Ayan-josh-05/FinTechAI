"""
Extraction/database/calculate_metrics.py
Utility to calculate data extraction density (%) per case.
Formula: (Total non-null fields in Graph) / (Total possible fields in Pydantic models) * 100
"""
import logging
from pathlib import Path
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

# Pre-calculate allowed field sets dynamically
MODEL_FIELD_SETS = {k: set(v.model_fields.keys()) for k, v in MODEL_MAP.items()}

SYSTEM_FIELDS = {
    'id', 'created_at', 'updated_at', 'name_norm', 'search_vector', 
    'is_judge', 'name_source', 'is_org', 'cnr'
}

def calculate_case_density():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    query = """
    MATCH (c:Case)
    OPTIONAL MATCH (c)-[r]-(n)
    WITH c, collect(DISTINCT n) + [c] AS nodes
    UNWIND nodes AS node
    RETURN 
        c.cnr_number AS cnr,
        labels(node)[0] AS label,
        keys(node) AS props
    """
    
    try:
        with driver.session() as session:
            results = session.run(query)
            
            case_metrics = {}
            # Gap and Extra trackers
            case_gaps    = {} # {cnr: {label: [missing_fields]}}
            case_extra   = {} # {cnr: {label: [extra_fields]}}
            global_gaps  = {} # {label: {field: count}}
            
            for record in results:
                cnr   = record['cnr'] or "UNKNOWN_CNR"
                label = record['label']
                props = set(record['props'])
                
                if cnr not in case_metrics:
                    case_metrics[cnr] = {'core_found': 0, 'core_possible': 0, 'extra_found': 0}
                    case_gaps[cnr]    = {}
                    case_extra[cnr]   = {}
                
                model_set = MODEL_FIELD_SETS.get(label, set())
                if model_set:
                    # Core logic
                    core_found = props.intersection(model_set)
                    case_metrics[cnr]['core_found']    += len(core_found)
                    case_metrics[cnr]['core_possible'] += len(model_set)
                    
                    # Gap logic
                    missing = model_set - core_found
                    if missing:
                        if label not in case_gaps[cnr]: case_gaps[cnr][label] = []
                        case_gaps[cnr][label].extend(list(missing))
                        
                        # Global frequency
                        if label not in global_gaps: global_gaps[label] = {}
                        for f in missing:
                            global_gaps[label][f] = global_gaps[label].get(f, 0) + 1

                    # Extra logic
                    extra = props - model_set - SYSTEM_FIELDS
                    case_metrics[cnr]['extra_found'] += len(extra)
                    if extra:
                        if label not in case_extra[cnr]: case_extra[cnr][label] = []
                        case_extra[cnr][label].extend(list(extra))

            # --- Generate Gap Report ---
            report_path = Path(__file__).parent / "detailed_gap_analysis.md"
            with open(report_path, "w") as f:
                f.write("# Extraction Analysis Report\n\n")
                f.write("> [!NOTE]\n> This report identifies fields from Pydantic models (Gaps) and additional data found in Neo4j (Extra).\n\n")
                
                f.write("## 1. Global Field Fragility (Most Frequently Missing Core Fields)\n")
                for label, fields in global_gaps.items():
                    f.write(f"### {label}\n")
                    sorted_f = sorted(fields.items(), key=lambda x: x[1], reverse=True)
                    for field, count in sorted_f[:10]:
                        f.write(f"- **{field}**: Missing in {count} nodes\n")
                
                f.write("\n## 2. Per Case Gaps (Missing Core Fields)\n")
                for cnr, labels in case_gaps.items():
                    if not any(labels.values()): continue
                    f.write(f"### {cnr}\n")
                    for label, missing in labels.items():
                        if missing:
                            unique_missing = sorted(list(set(missing)))
                            f.write(f"- **{label}**: {', '.join(unique_missing)}\n")

                f.write("\n## 3. Extra Fields Found (Non-Model Content)\n")
                f.write("> [!TIP]\n> These fields were found in the PDF/JSON but are not defined in your `entities.py` models. Consider adding them if they are useful.\n\n")
                for cnr, labels in case_extra.items():
                    if not any(labels.values()): continue
                    f.write(f"### {cnr}\n")
                    for label, extras in labels.items():
                        if extras:
                            unique_extras = sorted(list(set(extras)))
                            f.write(f"- **{label}**: {', '.join(unique_extras)}\n")
            
            logger.info(f"Detailed gap report generated: {report_path}")

            # --- Print Table ---
            print("-" * 110)
            print(f"{'CNR Number':<20} | {'Density %':<10} | {'Core (Found/Possible)':<25} | {'Extra'}")
            print("-" * 110)
            
            # Sort by density
            sorted_cases = sorted(
                case_metrics.items(), 
                key=lambda x: (x[1]['core_found'] / x[1]['core_possible']) if x[1]['core_possible'] > 0 else 0
            )

            total_pct = 0
            total_extra = 0
            for cnr, data in sorted_cases:
                found    = data['core_found']
                possible = data['core_possible']
                extra    = data['extra_found']
                percentage = (found / possible * 100) if possible > 0 else 0
                
                total_pct   += percentage
                total_extra += extra
                
                core_str = f"{found}/{possible}"
                extra_str = f"+{extra} fields" if extra > 0 else "-"
                print(f"{str(cnr):<20} | {percentage:>8.2f}% | {core_str:<25} | {extra_str}")
            
            # Summary Row
            num_cases = len(case_metrics)
            if num_cases > 0:
                avg_pct = total_pct / num_cases
                avg_extra = total_extra / num_cases
                print("-" * 110)
                print(f"{'AVERAGE (N=' + str(num_cases) + ')':<20} | {avg_pct:>8.2f}% | {'-':<25} | +{avg_extra:.1f} avg fields")
            print("-" * 110)
                
    except Exception as e:
        logger.error(f"Metrics calculation failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
    finally:
        driver.close()

if __name__ == "__main__":
    calculate_case_density()
