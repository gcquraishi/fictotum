#!/usr/bin/env python3
"""
Check for schema inconsistencies in MediaWork nodes
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
print("CHECKING MEDIAWORK SCHEMA CONSISTENCY")
print("="*80)

with driver.session() as session:
    # Count nodes with old vs new schema
    result = session.run('''
        MATCH (m:MediaWork)
        RETURN
            count(CASE WHEN m.media_id IS NOT NULL THEN 1 END) as with_media_id,
            count(CASE WHEN m.media_id IS NULL THEN 1 END) as without_media_id,
            count(CASE WHEN m.release_year IS NOT NULL THEN 1 END) as with_release_year,
            count(CASE WHEN m.year IS NOT NULL THEN 1 END) as with_year,
            count(CASE WHEN m.media_type IS NOT NULL THEN 1 END) as with_media_type,
            count(CASE WHEN m.type IS NOT NULL THEN 1 END) as with_type,
            count(m) as total
    ''')

    record = result.single()
    print(f"\nTotal MediaWork nodes: {record['total']}")
    print(f"\nProperty distribution:")
    print(f"  with media_id: {record['with_media_id']}")
    print(f"  without media_id: {record['without_media_id']}")
    print(f"  with release_year: {record['with_release_year']}")
    print(f"  with year: {record['with_year']}")
    print(f"  with media_type: {record['with_media_type']}")
    print(f"  with type: {record['with_type']}")

    # Get sample nodes without media_id
    print(f"\n\nSample nodes WITHOUT media_id:")
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.media_id IS NULL
        RETURN m.title, m.wikidata_id, m.year, m.type, m.release_year, m.media_type
        LIMIT 5
    ''')

    for record in result:
        print(f"  - {record['m.title']} | wikidata: {record['m.wikidata_id']} | year: {record['m.year'] or record['m.release_year']} | type: {record['m.type'] or record['m.media_type']}")

    # Get sample nodes with media_id
    print(f"\n\nSample nodes WITH media_id:")
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.media_id IS NOT NULL
        RETURN m.title, m.media_id, m.wikidata_id, m.year, m.type, m.release_year, m.media_type
        LIMIT 5
    ''')

    for record in result:
        print(f"  - {record['m.title']} | media_id: {record['m.media_id']} | wikidata: {record['m.wikidata_id']} | year: {record['m.year'] or record['m.release_year']} | type: {record['m.type'] or record['m.media_type']}")

print("\n" + "="*80)

driver.close()
