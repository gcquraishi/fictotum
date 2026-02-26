#!/usr/bin/env python3
"""
Clean up nodes that have both old and new schema properties
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
print("CLEANUP: REMOVE DUPLICATE SCHEMA PROPERTIES")
print("="*80)

with driver.session() as session:
    # Remove old 'year' property when release_year exists
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.year IS NOT NULL AND m.release_year IS NOT NULL
        REMOVE m.year
        RETURN count(m) as updated, collect(m.title)[0] as example_title
    ''')
    record = result.single()
    if record['updated'] > 0:
        print(f"\n✓ Removed duplicate 'year' property from {record['updated']} node(s)")
        print(f"  Example: {record['example_title']}")

    # Remove old 'type' property when media_type exists
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.type IS NOT NULL AND m.media_type IS NOT NULL
        REMOVE m.type
        RETURN count(m) as updated, collect(m.title)[0] as example_title
    ''')
    record = result.single()
    if record['updated'] > 0:
        print(f"\n✓ Removed duplicate 'type' property from {record['updated']} node(s)")
        print(f"  Example: {record['example_title']}")

    # Final verification
    print("\nFinal verification:")
    result = session.run('''
        MATCH (m:MediaWork)
        RETURN
            count(CASE WHEN m.media_id IS NULL THEN 1 END) as without_media_id,
            count(CASE WHEN m.year IS NOT NULL THEN 1 END) as with_old_year,
            count(CASE WHEN m.type IS NOT NULL THEN 1 END) as with_old_type,
            count(m) as total
    ''')
    record = result.single()
    print(f"  Total nodes: {record['total']}")
    print(f"  Nodes without media_id: {record['without_media_id']}")
    print(f"  Nodes with old 'year' property: {record['with_old_year']}")
    print(f"  Nodes with old 'type' property: {record['with_old_type']}")

    if record['without_media_id'] == 0 and record['with_old_year'] == 0 and record['with_old_type'] == 0:
        print("\n✓✓✓ All nodes are now using the standard schema!")

print("\n" + "="*80)

driver.close()
