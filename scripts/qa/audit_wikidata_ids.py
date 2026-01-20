#!/usr/bin/env python3
"""
Audit Wikidata Q-IDs for MediaWork nodes

Checks all MediaWork nodes with wikidata_id properties and validates that:
1. The Q-ID is valid in Wikidata
2. The title in our DB matches the Wikidata label (fuzzy match)
3. Reports any mismatches for manual review
"""

import os
import sys
import time
import difflib
import requests
from dotenv import load_dotenv
from neo4j import GraphDatabase
from typing import Dict, List, Tuple

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI')
username = os.getenv('NEO4J_USERNAME')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

def fetch_wikidata_label(qid: str) -> str | None:
    """Fetch English label for a Wikidata Q-ID"""
    try:
        # Use the Wikidata API with proper headers
        url = f'https://www.wikidata.org/w/api.php'
        params = {
            'action': 'wbgetentities',
            'ids': qid,
            'props': 'labels',
            'languages': 'en',
            'format': 'json'
        }
        headers = {
            'User-Agent': 'ChronosGraph/1.0 (https://github.com/gcquraishi/chronosgraph; Data Quality Audit)'
        }

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()

        if 'entities' not in data or qid not in data['entities']:
            return None

        entity = data['entities'][qid]

        # Check if entity was found (not missing)
        if 'missing' in entity:
            return None

        # Try English label
        if 'labels' in entity and 'en' in entity['labels']:
            return entity['labels']['en']['value']

        return None

    except Exception as e:
        print(f"    Error fetching {qid}: {e}", file=sys.stderr)
        return None

def calculate_similarity(str1: str, str2: str) -> float:
    """Calculate similarity ratio between two strings (0-1)"""
    return difflib.SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

def audit_media_works():
    """Audit all MediaWork nodes with wikidata_ids"""

    print("="*80)
    print("WIKIDATA Q-ID AUDIT FOR MEDIAWORK NODES")
    print("="*80)
    print()

    with driver.session() as session:
        # Fetch all MediaWork nodes with wikidata_id
        result = session.run('''
            MATCH (m:MediaWork)
            WHERE m.wikidata_id IS NOT NULL
            RETURN m.media_id as media_id,
                   m.title as title,
                   m.wikidata_id as wikidata_id,
                   m.media_type as media_type,
                   m.release_year as release_year
            ORDER BY m.title
        ''')

        records = list(result)
        total = len(records)

        print(f"Found {total} MediaWork nodes with wikidata_id property\n")

        if total == 0:
            print("No works to audit.")
            return

        # Track results
        valid_count = 0
        suspicious_count = 0
        error_count = 0
        suspicious_works: List[Tuple[str, str, str, str, float]] = []

        for i, record in enumerate(records, 1):
            media_id = record['media_id']
            db_title = record['title']
            qid = record['wikidata_id']
            media_type = record['media_type']
            year = record['release_year']

            print(f"[{i}/{total}] Checking {db_title} ({qid})...", end=' ')

            # Fetch Wikidata label
            wikidata_label = fetch_wikidata_label(qid)

            if wikidata_label is None:
                print(f"❌ ERROR: Q-ID not found in Wikidata")
                error_count += 1
                suspicious_works.append((media_id, db_title, qid, "Q-ID not found", 0.0))
            else:
                similarity = calculate_similarity(db_title, wikidata_label)

                if similarity >= 0.8:  # 80% similarity threshold
                    print(f"✅ OK (similarity: {similarity:.2%})")
                    valid_count += 1
                else:
                    print(f"⚠️  SUSPICIOUS (similarity: {similarity:.2%})")
                    print(f"    DB Title:       '{db_title}'")
                    print(f"    Wikidata Label: '{wikidata_label}'")
                    suspicious_count += 1
                    suspicious_works.append((media_id, db_title, qid, wikidata_label, similarity))

            # Rate limiting - be nice to Wikidata servers
            if i < total:
                time.sleep(0.5)

        print()
        print("="*80)
        print("AUDIT SUMMARY")
        print("="*80)
        print(f"Total works audited:  {total}")
        print(f"✅ Valid:             {valid_count} ({valid_count/total*100:.1f}%)")
        print(f"⚠️  Suspicious:        {suspicious_count} ({suspicious_count/total*100:.1f}%)")
        print(f"❌ Errors:            {error_count} ({error_count/total*100:.1f}%)")
        print()

        if suspicious_works:
            print("="*80)
            print("SUSPICIOUS WORKS REQUIRING REVIEW")
            print("="*80)
            print()

            for media_id, db_title, qid, wikidata_label, similarity in suspicious_works:
                print(f"Media ID: {media_id}")
                print(f"  DB Title:       '{db_title}'")
                print(f"  Wikidata Q-ID:  {qid}")
                print(f"  Wikidata Label: '{wikidata_label}'")
                if similarity > 0:
                    print(f"  Similarity:     {similarity:.2%}")
                print(f"  Fix: Update wikidata_id or title for {media_id}")
                print()

if __name__ == '__main__':
    try:
        audit_media_works()
    except KeyboardInterrupt:
        print("\n\nAudit interrupted by user")
    finally:
        driver.close()
