import os
import logging
import pandas as pd
from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

# Configure logging
logging.basicConfig(level=logging.ERROR, format='%(asctime)s | %(levelname)s | %(message)s')
logger = logging.getLogger('export_excel')

OUTPUT_FILE = "neo4j_database_export.xlsx"

import datetime
import re
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill

# Regex to strip illegal characters that crash openpyxl (control characters)
ILLEGAL_CHARACTERS_RE = re.compile(r'[\000-\010]|[\013-\014]|[\016-\037]')

def dict_to_string(d):
    """Convert dict values, lists, etc. to basic types for Excel to prevent formatting errors."""
    for k, v in d.items():
        if isinstance(v, (list, tuple)):
            clean_str = ", ".join(map(str, v))
            d[k] = ILLEGAL_CHARACTERS_RE.sub("", clean_str)
        elif isinstance(v, dict):
            clean_str = str(v)
            d[k] = ILLEGAL_CHARACTERS_RE.sub("", clean_str)
        elif isinstance(v, datetime.datetime):
            if v.tzinfo is not None:
                d[k] = v.replace(tzinfo=None)
        elif type(v).__name__ in ['DateTime', 'Date', 'Time', 'Duration']:
            d[k] = str(v)
        elif isinstance(v, str):
            d[k] = ILLEGAL_CHARACTERS_RE.sub("", v)
    return d

def format_excel_sheets(writer):
    """Applies pretty formatting to all sheets in the Excel writer."""
    for sheet_name in writer.sheets:
        worksheet = writer.sheets[sheet_name]
        
        # 1. Format Headers (Row 1)
        for cell in worksheet[1]:
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="E0E0E0", end_color="E0E0E0", fill_type="solid")
            
        # 2. Format column widths and wrap text
        for col in worksheet.columns:
            max_length = 0
            column_letter = col[0].column_letter # e.g. 'A', 'B', 'C'
            
            for cell in col:
                val = str(cell.value) if cell.value is not None else ""
                lines = val.split('\n')
                longest_line = max([len(l) for l in lines]) if lines else 0
                if longest_line > max_length:
                    max_length = longest_line
                    
            adjusted_width = max_length + 2
            
            if adjusted_width > 60:
                adjusted_width = 60
                for cell in col[(1 if len(col) > 1 else 0):]: # Skip header for wrapping logic if we want, or do all
                    cell.alignment = Alignment(wrap_text=True, vertical='top')
            else:
                for cell in col[(1 if len(col) > 1 else 0):]:
                    cell.alignment = Alignment(vertical='top')
                    
            worksheet.column_dimensions[column_letter].width = adjusted_width

def export_all_to_excel():
    logger.info("Connecting to Neo4j database...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    try:
        with driver.session() as session:
            # 1. Get all node labels currently present in the DB
            labels_result = session.run("CALL db.labels()")
            labels = [row[0] for row in labels_result]
            
            dfs = {}
            
            # 2. Fetch data for each label
            for label in labels:
                logger.info(f"Fetching nodes for entity label: {label}")
                # We also pull id(n) to have a fallback unique identifier for nodes without CNR
                query = f"MATCH (n:`{label}`) RETURN id(n) AS neo4j_node_id, n"
                results = session.run(query)
                
                records = []
                for record in results:
                    node = record["n"]
                    node_dict = dict(node)
                    node_dict = dict_to_string(node_dict)
                    
                    # Store standard node properties and explicitly add inner properties
                    row_dict = {"neo4j_node_id": record["neo4j_node_id"]}
                    row_dict.update(node_dict)
                    records.append(row_dict)
                    
                if records:
                    dfs[label] = pd.DataFrame(records)
                    
            # 3. Fetch all Relationships
            logger.info("Fetching relationships...")
            rel_query = """
            MATCH (a)-[r]->(b)
            RETURN id(a) as source_node_id,
                   coalesce(a.cnr, a.id, a.name_norm, "") as source_identifier,
                   labels(a)[0] as source_label, 
                   type(r) as relationship_type, 
                   id(b) as target_node_id,
                   coalesce(b.cnr, b.id, b.name_norm, "") as target_identifier,
                   labels(b)[0] as target_label,
                   properties(r) as rel_props
            """
            rel_results = session.run(rel_query)
            rel_records = []
            for record in rel_results:
                rec_dict = dict(record)
                props = rec_dict.pop('rel_props', {})
                if props:
                    props = dict_to_string(props)
                    for pk, pv in props.items():
                        rec_dict[f"rel_{pk}"] = pv
                rel_records.append(rec_dict)
            if rel_records:
                dfs['Relationships'] = pd.DataFrame(rel_records)
                
    except Exception as e:
        logger.error(f"Error fetching from DB: {e}")
        return
    finally:
        driver.close()
        
    # 4. Save to Excel with merging logic
    if os.path.exists(OUTPUT_FILE):
        logger.info(f"Existing file {OUTPUT_FILE} found. Applying update-or-append logic...")
        try:
            existing_xls = pd.ExcelFile(OUTPUT_FILE)
            
            with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl', mode='w') as writer:
                for sheet_name, new_df in dfs.items():
                    if sheet_name in existing_xls.sheet_names:
                        # Load existing sheet
                        existing_df = pd.read_excel(existing_xls, sheet_name=sheet_name)
                        
                        # Decide on a merge key: 'cnr', then 'neo4j_node_id', or nothing
                        merge_keys = [k for k in ['cnr', 'neo4j_node_id'] if k in new_df.columns and k in existing_df.columns]
                        
                        if merge_keys:
                            key = merge_keys[0]  # Prioritize 'cnr', then fallback to node_id
                            logger.info(f"Merging data in sheet '{sheet_name}' on key '{key}'...")
                            
                            # Set index for updating
                            existing_df.set_index(key, inplace=True)
                            new_df.set_index(key, inplace=True)
                            
                            # update existing
                            existing_df.update(new_df)
                            
                            # identify explicitly new rows
                            new_rows = new_df[~new_df.index.isin(existing_df.index)]
                            
                            final_df = pd.concat([existing_df, new_rows]).reset_index()
                        else:
                            # If no common matching key is found, just overwrite
                            logger.info(f"No valid merge key for sheet '{sheet_name}', overwriting...")
                            final_df = new_df
                            
                        # Dump to excel
                        final_df.to_excel(writer, sheet_name=sheet_name, index=False)
                    else:
                        # New sheet in neo4j that wasn't in excel yet
                        logger.info(f"Adding entirely new sheet '{sheet_name}'...")
                        new_df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                # Copy over any sheets that were in Excel natively but weren't updated from DB
                for sheet_name in existing_xls.sheet_names:
                    if sheet_name not in dfs:
                        logger.info(f"Preserving un-updated sheet '{sheet_name}'...")
                        existing_df = pd.read_excel(existing_xls, sheet_name=sheet_name)
                        existing_df.to_excel(writer, sheet_name=sheet_name, index=False)
                        
                # Make it look not like noodles
                format_excel_sheets(writer)
                
        except Exception as e:
            logger.error(f"Error during excel manipulation: {e}")
    else:
        logger.info(f"Creating new file {OUTPUT_FILE}...")
        try:
            with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
                for sheet_name, df in dfs.items():
                    df.to_excel(writer, sheet_name=sheet_name, index=False)
                
                # Make it look not like noodles
                format_excel_sheets(writer)
        except Exception as e:
            logger.error(f"Error creating excel: {e}")
            
    logger.info("✅ Export and sync completed successfully!")

if __name__ == "__main__":
    export_all_to_excel()
