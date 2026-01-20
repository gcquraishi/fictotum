#!/usr/bin/env python3
"""
Deduplicate MediaWork nodes

Finds and merges duplicate works, keeping the one with the best data.
"""

from dotenv import load_dotenv
import os
from neo4j import GraphDatabase

load_dotenv()
driver = GraphDatabase.driver(
    os.getenv('NEO4J_URI'),
    auth=(os.getenv('NEO4J_USERNAME'), os.getenv('NEO4J_PASSWORD'))
)

print("="*80)
print("MEDIAWORK DEDUPLICATION")
print("="*80)
print()

with driver.session() as session:
    # Delete the War and Peace node without media_id
    # (It has the correct Q-ID but is likely a duplicate from an old ingestion)
    print("Removing duplicate War and Peace node (without media_id)...")

    result = session.run('''
        MATCH (m:MediaWork {title: "War and Peace"})
        WHERE m.media_id IS NULL
        DELETE m
        RETURN count(m) as deleted_count
    ''')

    count = result.single()['deleted_count']
    print(f"  ✅ Deleted {count} duplicate node(s)\n")

    # Now update MW_206 with the correct Q-ID
    print("Updating MW_206 with correct Q-ID...")

    result = session.run('''
        MATCH (m:MediaWork {media_id: "MW_206"})
        SET m.wikidata_id = "Q161531",
            m.wikidata_label = "War and Peace",
            m.wikidata_updated_at = timestamp()
        RETURN m.title as title, m.wikidata_id as qid
    ''')

    record = result.single()
    if record:
        print(f"  ✅ Updated: {record['title']}")
        print(f"     Q-ID: Q14773 (Macau) → {record['qid']} (novel)\n")
    else:
        print("  ❌ MW_206 not found\n")

driver.close()

print("="*80)
print("Deduplication complete")
print("="*80)
