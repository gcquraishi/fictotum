#!/usr/bin/env python3
"""
Check if Wolf Hall trilogy books exist in Neo4j database
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

# Wolf Hall trilogy Wikidata Q-IDs
trilogy_qids = {
    'Q202517': 'Wolf Hall',
    'Q3644822': 'Bring Up the Bodies',
    'Q7751674': 'The Mirror & the Light'
}

print("="*80)
print("CHECKING WOLF HALL TRILOGY IN DATABASE")
print("="*80)

with driver.session() as session:
    for qid, expected_title in trilogy_qids.items():
        print(f"\nSearching for {expected_title} (Wikidata: {qid}):")
        result = session.run('''
            MATCH (m:MediaWork {wikidata_id: $qid})
            RETURN m.title as title,
                   m.wikidata_id as wikidata_id,
                   m.year as year,
                   m.type as type,
                   elementId(m) as element_id
        ''', qid=qid)

        record = result.single()
        if record:
            print(f"  ✓ FOUND in database")
            print(f"    Title: {record['title']}")
            print(f"    Year: {record['year']}")
            print(f"    Type: {record['type']}")
        else:
            print(f"  ✗ NOT FOUND in database - needs to be added")

print("\n" + "="*80)

driver.close()
