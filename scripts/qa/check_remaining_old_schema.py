#!/usr/bin/env python3
"""
Check which node still has old schema properties
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

print("="*80)
print("CHECKING NODES WITH OLD SCHEMA PROPERTIES")
print("="*80)

with driver.session() as session:
    # Find nodes with old 'year' property
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.year IS NOT NULL
        RETURN m.media_id, m.title, m.year, m.release_year, m.type, m.media_type
    ''')

    print("\nNodes with 'year' property:")
    for record in result:
        print(f"  {record['m.title']} (media_id: {record['m.media_id']})")
        print(f"    year: {record['m.year']}, release_year: {record['m.release_year']}")
        print(f"    type: {record['m.type']}, media_type: {record['m.media_type']}")

    # Find nodes with old 'type' property
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.type IS NOT NULL
        RETURN m.media_id, m.title, m.year, m.release_year, m.type, m.media_type
    ''')

    print("\nNodes with 'type' property:")
    for record in result:
        print(f"  {record['m.title']} (media_id: {record['m.media_id']})")
        print(f"    year: {record['m.year']}, release_year: {record['m.release_year']}")
        print(f"    type: {record['m.type']}, media_type: {record['m.media_type']}")

print("\n" + "="*80)

driver.close()
