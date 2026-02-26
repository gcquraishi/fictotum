#!/usr/bin/env python3
"""
Migration script to:
1. Add media_id to all MediaWork nodes that don't have one
2. Standardize schema: year -> release_year, type -> media_type
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
print("MIGRATION: ADD MISSING MEDIA_IDs AND STANDARDIZE SCHEMA")
print("="*80)

with driver.session() as session:
    # Step 1: Find the highest existing media_id number
    print("\nStep 1: Finding highest existing media_id number...")
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.media_id IS NOT NULL AND m.media_id STARTS WITH 'MW_'
        RETURN max(toInteger(substring(m.media_id, 3))) as max_id
    ''')
    record = result.single()
    max_id = record['max_id'] or 0
    next_id = max_id + 1
    print(f"  Highest existing ID: MW_{max_id}")
    print(f"  Next available ID: MW_{next_id}")

    # Step 2: Count nodes that need migration
    print("\nStep 2: Counting nodes that need migration...")
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.media_id IS NULL
        RETURN count(m) as count
    ''')
    record = result.single()
    nodes_to_migrate = record['count']
    print(f"  Nodes without media_id: {nodes_to_migrate}")

    # Step 3: Add media_id to nodes without one
    if nodes_to_migrate > 0:
        print(f"\nStep 3: Adding media_id to {nodes_to_migrate} nodes...")
        result = session.run('''
            MATCH (m:MediaWork)
            WHERE m.media_id IS NULL
            WITH m
            ORDER BY m.wikidata_id
            WITH collect(m) as nodes
            UNWIND range(0, size(nodes)-1) as idx
            WITH nodes[idx] as node, idx
            SET node.media_id = 'MW_' + toString($start_id + idx)
            RETURN count(node) as updated
        ''', start_id=next_id)
        record = result.single()
        print(f"  ✓ Added media_id to {record['updated']} nodes")
    else:
        print("\nStep 3: All nodes already have media_id ✓")

    # Step 4: Standardize schema (year -> release_year, type -> media_type)
    print("\nStep 4: Standardizing schema properties...")

    # Convert year -> release_year
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.year IS NOT NULL AND m.release_year IS NULL
        SET m.release_year = m.year
        REMOVE m.year
        RETURN count(m) as updated
    ''')
    record = result.single()
    print(f"  ✓ Converted 'year' to 'release_year' for {record['updated']} nodes")

    # Convert type -> media_type
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.type IS NOT NULL AND m.media_type IS NULL
        SET m.media_type = m.type
        REMOVE m.type
        RETURN count(m) as updated
    ''')
    record = result.single()
    print(f"  ✓ Converted 'type' to 'media_type' for {record['updated']} nodes")

    # Step 5: Verify migration
    print("\nStep 5: Verifying migration...")
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
        print("\n  ✓✓✓ Migration completed successfully!")
    else:
        print("\n  ⚠ Migration incomplete - some nodes still need updating")

print("\n" + "="*80)

driver.close()
