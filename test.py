import json
import logging
import os
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime

# Add Extraction to path for imports
sys.path.append(os.path.join(os.getcwd(), 'Extraction'))

from Extraction.main import process_case
from Extraction.database.db_connection import neo4j_driver

# Constants
MANIFEST_PATH = os.path.join(os.getcwd(), 'Extraction', 'manifest.csv')

def load_ground_truth(file_path):
    """Loads ground truth JSON for a case."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading ground truth: {e}")
        return None

def fetch_from_neo4j(cnr_number):
    """Fetches extracted data from Neo4j for a given CNR number."""
    query = """
    MATCH (c:Case {cnr_number: $cnr})
    OPTIONAL MATCH (c)-[:HEARD_IN]->(court:Court)
    OPTIONAL MATCH (p:Person)-[r:PETITIONER_IN|RESPONDENT_IN|PETITIONER|RESPONDENT]->(c)
    OPTIONAL MATCH (o:Organization)-[or:PETITIONER_IN|RESPONDENT_IN|PETITIONER|RESPONDENT]->(c)
    OPTIONAL MATCH (adv:Person)-[adv_r:ADVOCATE_FOR]->(c)
    OPTIONAL MATCH (j:Person)-[j_r:JUDGE_IN]->(c)
    OPTIONAL MATCH (c)-[:HAS_HEARING]->(h:Hearing)
    OPTIONAL MATCH (c)-[:INVOKES]->(a:Act)
    OPTIONAL MATCH (c)-[:HAS_DOCUMENT]->(d:Document)
    OPTIONAL MATCH (c)-[:HAS_ASSET]->(asset:Asset)
    
    RETURN 
        properties(c) as case_props,
        properties(court) as court_props,
        collect(distinct {name: p.name, role: type(r), props: properties(p)}) as person_parties,
        collect(distinct {name: o.name, role: type(or), props: properties(o)}) as org_parties,
        collect(distinct {name: adv.name, side: adv_r.side, props: properties(adv)}) as advocates,
        collect(distinct {name: j.name, designation: j_r.designation, props: properties(j)}) as judges,
        collect(distinct properties(h)) as hearings,
        collect(distinct properties(a)) as acts,
        collect(distinct properties(d)) as documents,
        collect(distinct properties(asset)) as assets
    """
    with neo4j_driver.session() as session:
        result = session.run(query, cnr=cnr_number)
        return result.single()

def map_neo4j_to_json(raw_data):
    """Maps raw Neo4j response to structured JSON matching user ground truth format."""
    case = (raw_data.get('case_props') or {}) if raw_data else {}
    court = (raw_data.get('court_props') or {}) if raw_data else {}
    
    # 1. Party Details
    petitioners = []
    respondents = []
    for p in (raw_data.get('person_parties') or []):
        if not p.get('name'): continue
        role = p.get('role') or ''
        if 'PETITIONER' in role: petitioners.append(p['name'])
        elif 'RESPONDENT' in role: respondents.append(p['name'])
    for o in (raw_data.get('org_parties') or []):
        if not o.get('name'): continue
        role = o.get('role') or ''
        if 'PETITIONER' in role: petitioners.append(o['name'])
        elif 'RESPONDENT' in role: respondents.append(o['name'])

    # 2. Advocate Details
    petitioner_advocates = []
    respondent_advocates = []
    for adv in (raw_data.get('advocates') or []):
        if not adv.get('name'): continue
        side = adv.get('side') or ''
        if side == 'petitioner': petitioner_advocates.append(adv['name'])
        elif side == 'respondent': respondent_advocates.append(adv['name'])

    # 3. Judge Details
    judges = [j.get('name') for j in (raw_data.get('judges') or []) if j.get('name')]
    primary_judge = judges[0] if judges else None

    # 4. Hearing Details
    hearings = (raw_data.get('hearings') or []) if raw_data else []
    sorted_hearings = sorted([h for h in hearings if h.get('date')], key=lambda x: x['date'])
    
    # 5. Order Details (from Documents)
    docs = (raw_data.get('documents') or []) if raw_data else []
    primary_doc = docs[0] if docs else {}

    # 6. Acts
    acts_list = []
    for a in (raw_data.get('acts') or []):
        if a:
            acts_list.append({
                'act_name': a.get('name'),
                'section': a.get('section')
            })

    # Mapping to target sections
    structured = {
        'case_details': {
            'case_number': case.get('case_number'),
            'cnr_number': case.get('cnr_number'),
            'case_type': case.get('case_type'),
            'case_status': case.get('status'),
            'filing_number': case.get('filing_number'),
            'filing_year': case.get('filing_year'),
            'filing_date': case.get('filing_date'),
            'registration_date': case.get('registration_date'),
            'decision_date': case.get('decision_date')
        },
        'court_details': {
            'court_name': court.get('name'),
            'district': court.get('district'),
            'state': court.get('state'),
            'court_number': court.get('court_code'),
            'bench': court.get('bench'),
            'bench_nature': court.get('bench_nature')
        },
        'party_details': {
            'petitioners': petitioners,
            'respondents': respondents
        },
        'advocate_details': {
            'petitioner_advocates': petitioner_advocates if petitioner_advocates else None,
            'respondent_advocates': respondent_advocates if respondent_advocates else None
        },
        'judge_details': {
            'judge_name': primary_judge
        },
        'hearing_details': {
            'first_hearing_date': case.get('first_hearing_date') or (sorted_hearings[0]['date'] if sorted_hearings else None),
            'last_hearing_date': case.get('last_hearing_date') or (sorted_hearings[-1]['date'] if sorted_hearings else None),
            'next_hearing_date': case.get('next_hearing_date'),
            'case_stage': case.get('stage')
        },
        'act_details': {
            'acts': acts_list
        },
        'order_details': {
            'order_date': primary_doc.get('order_date'),
            'order_type': primary_doc.get('order_type'),
            'order_number': primary_doc.get('order_number'),
            'order_summary': case.get('search_summary')
        },
        'additional_flags': {
            'delay_condoned': case.get('delay_condoned'),
            'application_type': case.get('application_type'),
            'mediation': case.get('mediation'),
            'settlement': case.get('settlement'),
            'involves_death': case.get('involves_death'),
            'vehicle_number': case.get('vehicle_number'),
            'fir_number': case.get('fir_number'),
            'police_station': case.get('police_station')
        }
    }
    return structured

def flatten_json(data, parent_key='', sep='.'):
    """Flattens nested JSON using dot notation. Handles lists and nulls correctly."""
    items = []
    if isinstance(data, dict):
        for k, v in data.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            items.extend(flatten_json(v, new_key, sep=sep).items())
    elif isinstance(data, list):
        if not data:
            return {parent_key: None}
        val_list = []
        for item in data:
            if isinstance(item, dict):
                name = item.get('act_name') or item.get('name')
                sec = item.get('section')
                val = f"{name} ({sec})" if sec else str(name)
                val_list.append(val)
            else:
                val_list.append(str(item))
        return {parent_key: ", ".join(val_list)}
    else:
        items.append((parent_key, data))
    return dict(items)

def generate_markdown(gt, llm):
    """Generates a Markdown section with side-by-side comparison using simplified field names."""
    if not gt: gt = {}
    if not llm: llm = {}
    
    gt_flat = flatten_json(gt)
    llm_flat = flatten_json(llm)
    
    all_keys = sorted(set(gt_flat.keys()) | set(llm_flat.keys()))
    sections = {}
    for key in all_keys:
        root = key.split('.')[0]
        if root not in sections:
            sections[root] = []
        sections[root].append(key)
        
    md = ""
    for section, keys in sections.items():
        md += f"## {section.replace('_', ' ').title()}\n\n"
        md += "| Field | Ground Truth | LLM Output |\n"
        md += "| :--- | :--- | :--- |\n"
        for key in keys:
            # Simplified field name (only show the last part of the dot notation)
            field_name = key.split('.')[-1]
            
            gt_val = gt_flat.get(key)
            llm_val = llm_flat.get(key)
            gt_str = str(gt_val) if gt_val is not None else "null"
            llm_str = str(llm_val) if llm_val is not None else "null"
            
            md += f"| {field_name} | {gt_str} | {llm_str} |\n"
        md += "\n---\n\n"
    return md

def main_pipeline_wrapper(file_path):
    """Identifies metadata and calls the core pipeline. Handles full manifest rows or single paths."""
    original_input = file_path
    # If the input is a comma-separated row from the manifest (User's new format)
    if ',' in file_path:
        parts = file_path.split(',')
        if len(parts) >= 3:
            # 3rd column (index 2) is pdf_paths
            # This handles cases like 194_2019 where there are multiple PDFs separated by |
            file_path = parts[2].split('|')[0].strip()
            print(f"Extracted PDF path from raw row: {file_path}")

    # 1. Look up PDF in manifest
    if not os.path.exists(MANIFEST_PATH):
        raise FileNotFoundError(f"Manifest not found at {MANIFEST_PATH}")
    
    df = pd.read_csv(MANIFEST_PATH)
    abs_file_path = os.path.abspath(file_path)
    
    match = None
    for idx, row in df.iterrows():
        pdf_val = row['pdf_paths']
        paths = str(pdf_val).split('|') if pd.notna(pdf_val) else []
        for p in paths:
            if os.path.abspath(p) == abs_file_path:
                match = row
                break
        if match is not None:
            break
            
    if match is None:
        raise ValueError(f"PDF path {file_path} not found in manifest or manifest mismatch.")
    
    print(f"Found manifest match: {match['json_path']}")
    
    # 2. Call process_case
    result = process_case(match['json_path'], [file_path])
    return result['cnr']

def run_test(file_paths, ground_truth_path, output_md="report.md"):
    """Full execution flow: Pipeline -> Neo4j -> Comparison -> Markdown."""
    overall_md = "# 📊 LegalAI Extraction Report\n\n"
    overall_md += f"*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n"
    
    gt_data_all = load_ground_truth(ground_truth_path)
    
    for fpath in file_paths:
        if not fpath.strip(): continue
        print(f"Processing: {fpath[:50]}...")
        try:
            # 1. Run pipeline
            cnr = main_pipeline_wrapper(fpath)
            
            # 2. Fetch from Neo4j
            raw_neo4j = fetch_from_neo4j(cnr)
            
            # 3. Map to JSON
            llm_json = map_neo4j_to_json(raw_neo4j)
            
            # 4. Get ground truth
            case_no = llm_json.get('case_details', {}).get('case_number')
            gt_case = None
            if isinstance(gt_data_all, dict):
                gt_case = gt_data_all.get(case_no) or gt_data_all.get(cnr)
            elif isinstance(gt_data_all, list):
                for item in gt_data_all:
                    if item.get('case_details', {}).get('case_number') == case_no or \
                       item.get('case_details', {}).get('cnr_number') == cnr:
                        gt_case = item
                        break
            
            # 5. Generate MD section
            overall_md += f"# Case: {case_no} (CNR: {cnr})\n\n"
            overall_md += generate_markdown(gt_case, llm_json)
            
        except Exception as e:
            print(f"Error processing case: {e}")
            overall_md += f"## Error processing case\n```\n{e}\n```\n\n"

    with open(output_md, 'w') as f:
        f.write(overall_md)
    print(f"Report saved to {output_md}")

if __name__ == "__main__":
    # The user updated test_file_paths to include full manifest rows.
    # We now handle this in main_pipeline_wrapper.
    test_file_paths = [
        "/home/ankita/Documents/CT-legal-Cases -  Testing cases data-20260322T072039Z-1-001/CT-legal-Cases -  Testing cases data/10_2020,/home/ankita/Documents/CT-legal-Cases -  Testing cases data-20260322T072039Z-1-001/CT-legal-Cases -  Testing cases data/10_2020/10_2020_case_data.json,/home/ankita/Documents/CT-legal-Cases -  Testing cases data-20260322T072039Z-1-001/CT-legal-Cases -  Testing cases data/10_2020/documents/order_judgement_2022-10-19.pdf,1,pending"
     ]
    gt_json = "ground_truth.json"
    run_test(test_file_paths, gt_json)
