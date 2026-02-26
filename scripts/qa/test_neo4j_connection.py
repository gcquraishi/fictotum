#!/usr/bin/env python3
"""
Quick test to check if Neo4j Aura database is accessible.
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

# Get credentials from .mcp.json (hardcoded for this test)
uri = "neo4j+s://c78564a4.databases.neo4j.io"
username = "neo4j"
password = "ybSiNRTV9UxUb6PQuANZEeqECn2vz3ozXYiNzkdcMBk"

print(f"Testing connection to: {uri}")
print(f"Username: {username}")

try:
    driver = GraphDatabase.driver(uri, auth=(username, password))

    with driver.session() as session:
        result = session.run("MATCH (f:HistoricalFigure) RETURN count(f) as total")
        record = result.single()
        total = record['total'] if record else 0

        print(f"✅ Connection successful!")
        print(f"Total HistoricalFigure nodes: {total}")

        # Test search
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE toLower(f.name) CONTAINS 'caesar'
            RETURN f.name as name
            LIMIT 5
        """)

        matches = list(result)
        print(f"\nSearch test for 'caesar': {len(matches)} matches")
        for record in matches:
            print(f"  - {record['name']}")

    driver.close()

except Exception as e:
    print(f"❌ Connection failed: {e}")
    import traceback
    traceback.print_exc()
