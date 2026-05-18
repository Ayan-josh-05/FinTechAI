"""
chunk_backfill.py
Standalone script to backfill Chunk nodes for all existing cases.

Reads each Case's search_summary, splits into sentences using spaCy,
batch-embeds via NVIDIA API, and stores as Chunk nodes linked to the Case.

Usage:
    cd /home/ue/LegalAI/Extraction
    python chunk_backfill.py           # process all cases
    python chunk_backfill.py --limit 5 # process first 5 cases only
    python chunk_backfill.py --force   # re-process even if chunks exist
"""
import argparse
import logging
import time
import sys

import numpy as np
import requests
import spacy
from tenacity import retry, wait_exponential, stop_after_attempt
from tqdm import tqdm

from config import (
    EMBED_URL, NVIDIA_HEADERS, EMBEDDING_MODEL,
)
from database.db_connection import neo4j_driver
from database.graph_inserts import insert_chunks, delete_case_chunks

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(message)s',
)
logger = logging.getLogger('chunk_backfill')


# ── Embedding ────────────────────────────────────────────────────────────

@retry(wait=wait_exponential(min=2, max=60), stop=stop_after_attempt(5))
def embed_texts(texts: list[str]) -> list[np.ndarray]:
    """Embed a batch of texts using the NVIDIA embedding API."""
    if not texts:
        return []
    payload = {
        'model': EMBEDDING_MODEL,
        'input': texts,
        'input_type': 'passage',
        'encoding_format': 'float',
        'truncate': 'END',
    }
    resp = requests.post(EMBED_URL, headers=NVIDIA_HEADERS, json=payload)
    if resp.status_code == 429:
        raise Exception('Rate limited')
    resp.raise_for_status()
    return [
        np.array(d['embedding'], dtype=np.float32)
        for d in sorted(resp.json()['data'], key=lambda x: x['index'])
    ]


# ── Sentence splitting ───────────────────────────────────────────────────

def split_into_sentences(text: str, nlp) -> list[str]:
    """
    Split text into sentences using spaCy.
    Filters out very short sentences (< 20 chars) that are usually noise.
    Groups very short sentences with the previous one for context.
    """
    doc = nlp(text)
    raw_sents = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    
    # Merge very short sentences with the previous one
    merged = []
    for sent in raw_sents:
        if len(sent) < 20 and merged:
            merged[-1] = merged[-1] + ' ' + sent
        elif len(sent) < 10:
            # Skip extremely short fragments
            continue
        else:
            merged.append(sent)
    
    return merged


# ── Main ─────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Backfill Chunk nodes for semantic search')
    parser.add_argument('--limit', type=int, default=0, help='Limit number of cases to process (0 = all)')
    parser.add_argument('--force', action='store_true', help='Re-process cases that already have chunks')
    parser.add_argument('--batch-size', type=int, default=20, help='Embedding batch size (max texts per API call)')
    args = parser.parse_args()

    logger.info('Loading spaCy model...')
    nlp = spacy.load('en_core_web_sm')

    # Fetch all cases with summaries
    logger.info('Fetching cases from Neo4j...')
    with neo4j_driver.session() as session:
        query = """
        MATCH (c:Case) 
        WHERE c.search_summary IS NOT NULL AND size(c.search_summary) > 50
        RETURN c.id AS case_id, c.cnr_number AS cnr, c.search_summary AS summary
        """
        if args.limit > 0:
            query += f" LIMIT {args.limit}"
        
        cases = session.run(query).data()

    logger.info(f'Found {len(cases)} cases with summaries')

    if not cases:
        logger.info('No cases to process. Exiting.')
        return

    total_chunks = 0
    skipped = 0
    errors = 0

    for case in tqdm(cases, desc='Processing cases'):
        case_id = case['case_id']
        cnr = case['cnr']
        summary = case['summary']

        try:
            # Check if chunks already exist
            if not args.force:
                with neo4j_driver.session() as session:
                    existing = session.run(
                        "MATCH (c:Case {id: $cid})-[:HAS_CHUNK]->(ch:Chunk) RETURN count(ch) as cnt",
                        cid=case_id
                    ).single()['cnt']
                    if existing > 0:
                        skipped += 1
                        continue

            # Split summary into sentences
            sentences = split_into_sentences(summary, nlp)
            if not sentences:
                logger.warning(f'No sentences extracted for {cnr}')
                continue

            # Batch embed
            vectors = []
            for i in range(0, len(sentences), args.batch_size):
                batch = sentences[i:i + args.batch_size]
                batch_vecs = embed_texts(batch)
                vectors.extend(batch_vecs)
                # Small delay between batches to avoid rate limits
                if i + args.batch_size < len(sentences):
                    time.sleep(0.5)

            # Build chunk dicts
            chunks = []
            for idx, (sent, vec) in enumerate(zip(sentences, vectors)):
                chunks.append({
                    'text': sent,
                    'chunk_index': idx,
                    'vector': vec.tolist(),
                })

            # Write to Neo4j
            with neo4j_driver.session() as session:
                def _write(tx):
                    if args.force:
                        delete_case_chunks(tx, case_id)
                    insert_chunks(tx, case_id, cnr, chunks)
                session.execute_write(_write)

            total_chunks += len(chunks)
            logger.debug(f'{cnr}: {len(chunks)} chunks created')

        except Exception as e:
            errors += 1
            logger.error(f'Error processing {cnr}: {e}')
            continue

    logger.info(f'Done! Created {total_chunks} chunks across {len(cases) - skipped - errors} cases')
    logger.info(f'Skipped: {skipped}, Errors: {errors}')


if __name__ == '__main__':
    main()
