#!/usr/bin/env python3
"""
Check which Wolf Hall historical figures exist in the database
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
username = os.getenv('NEO4J_USERNAME', 'neo4j')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

# Key historical figures from Wolf Hall trilogy with their Wikidata Q-IDs
key_figures = [
    {'name': 'Thomas Cromwell', 'wikidata_qid': 'Q44329', 'appears_in': 'All three books'},
    {'name': 'Henry VIII', 'wikidata_qid': 'Q38370', 'appears_in': 'All three books'},
    {'name': 'Anne Boleyn', 'wikidata_qid': 'Q80823', 'appears_in': 'Wolf Hall, Bring Up the Bodies'},
    {'name': 'Jane Seymour', 'wikidata_qid': 'Q182637', 'appears_in': 'Bring Up the Bodies, The Mirror & the Light'},
    {'name': 'Thomas More', 'wikidata_qid': 'Q42544', 'appears_in': 'Wolf Hall'},
    {'name': 'Catherine of Aragon', 'wikidata_qid': 'Q182605', 'appears_in': 'Wolf Hall'},
    {'name': 'Thomas Howard, Duke of Norfolk', 'wikidata_qid': 'Q335265', 'appears_in': 'All three books'},
    {'name': 'Stephen Gardiner', 'wikidata_qid': 'Q981649', 'appears_in': 'All three books'},
]

print("="*80)
print("CHECKING WOLF HALL TRILOGY CHARACTERS IN DATABASE")
print("="*80)

with driver.session() as session:
    print("\n1. CHECKING BY NAME:")
    print("-" * 80)

    for figure in key_figures:
        # Check by name
        name_result = session.run('''
            MATCH (h:HistoricalFigure)
            WHERE toLower(h.name) CONTAINS toLower($name)
            RETURN h.name as name,
                   h.canonical_id as canonical_id,
                   h.birth_year as birth,
                   h.death_year as death
            ORDER BY h.name
            LIMIT 5
        ''', name=figure['name'])

        records = list(name_result)
        print(f"\n{figure['name']} (Wikidata: {figure['wikidata_qid']})")
        print(f"  Appears in: {figure['appears_in']}")

        if records:
            print(f"  Found {len(records)} potential match(es):")
            for r in records:
                print(f"    • {r['name']} (canonical_id: {r['canonical_id']}) [{r['birth']}-{r['death']}]")
        else:
            print(f"  ✗ NOT FOUND in database")

    print("\n\n2. CHECKING BY CANONICAL_ID (Wikidata Q-IDs):")
    print("-" * 80)

    for figure in key_figures:
        # Check by canonical_id matching Wikidata Q-ID
        qid_result = session.run('''
            MATCH (h:HistoricalFigure)
            WHERE h.canonical_id = $qid
            RETURN h.name as name,
                   h.canonical_id as canonical_id
        ''', qid=figure['wikidata_qid'])

        record = qid_result.single()
        if record:
            print(f"  ✓ {figure['name']}: {record['canonical_id']}")
        else:
            print(f"  ✗ {figure['name']}: {figure['wikidata_qid']} not found as canonical_id")

    # Check what canonical_id format is being used
    print("\n\n3. SAMPLE OF EXISTING CANONICAL_IDs:")
    print("-" * 80)

    sample_result = session.run('''
        MATCH (h:HistoricalFigure)
        WHERE h.canonical_id IS NOT NULL
        RETURN h.name as name,
               h.canonical_id as canonical_id
        LIMIT 10
    ''')

    print("  Current canonical_id formats in database:")
    for r in sample_result:
        print(f"    {r['name']}: {r['canonical_id']}")

print("\n" + "="*80)
print("CHECK COMPLETE")
print("="*80)

driver.close()
