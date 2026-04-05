#!/usr/bin/env python3
"""
Diagnostic script to debug search functionality.
Checks what properties actually exist on HistoricalFigure nodes.
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()

uri = os.getenv("NEO4J_URI")
user = os.getenv("NEO4J_USERNAME")
pwd = os.getenv("NEO4J_PASSWORD")

# SSL certificate handling for Neo4j Aura
if uri.startswith("neo4j+s://"):
    uri = uri.replace("neo4j+s://", "neo4j+ssc://")

driver = GraphDatabase.driver(uri, auth=(user, pwd))

def diagnose_search():
    """Run diagnostic queries to understand search issues."""
    with driver.session() as session:
        print("=" * 70)
        print("DIAGNOSTIC: Checking HistoricalFigure nodes")
        print("=" * 70)

        # 1. Count total figures
        result = session.run("MATCH (f:HistoricalFigure) RETURN count(f) as total")
        total = result.single()['total']
        print(f"\n1. Total HistoricalFigure nodes: {total}")

        # 2. Sample 10 nodes with all properties
        print("\n2. Sample of 10 HistoricalFigure nodes (with all properties):")
        result = session.run("""
            MATCH (f:HistoricalFigure)
            RETURN f
            LIMIT 10
        """)
        for i, record in enumerate(result, 1):
            node = record['f']
            print(f"\n   Node {i}:")
            print(f"   Properties: {dict(node)}")

        # 3. Check which properties exist
        print("\n3. Property coverage:")
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WITH count(f) as total,
                 count(f.canonical_id) as has_canonical_id,
                 count(f.name) as has_name,
                 count(f.wikidata_id) as has_wikidata_id
            RETURN total, has_canonical_id, has_name, has_wikidata_id
        """)
        record = result.single()
        print(f"   Total nodes: {record['total']}")
        print(f"   With canonical_id: {record['has_canonical_id']}")
        print(f"   With name: {record['has_name']}")
        print(f"   With wikidata_id: {record['has_wikidata_id']}")

        # 4. Test search query
        test_query = "caesar"
        print(f"\n4. Testing search for '{test_query}':")
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE toLower(f.name) CONTAINS toLower($query)
            RETURN f.canonical_id, f.name
            LIMIT 5
        """, query=test_query)

        matches = list(result)
        if matches:
            print(f"   Found {len(matches)} matches:")
            for record in matches:
                print(f"   - {record['f.name']} ({record['f.canonical_id']})")
        else:
            print(f"   No matches found!")

        # 5. Check indexes
        print("\n5. Checking indexes:")
        result = session.run("SHOW INDEXES")
        for record in result:
            index_name = record.get('name', 'N/A')
            labels = record.get('labelsOrTypes', [])
            properties = record.get('properties', [])
            state = record.get('state', 'N/A')
            if 'HistoricalFigure' in str(labels):
                print(f"   - {index_name}: {labels} ON {properties} (state: {state})")

    driver.close()
    print("\n" + "=" * 70)

if __name__ == "__main__":
    diagnose_search()
