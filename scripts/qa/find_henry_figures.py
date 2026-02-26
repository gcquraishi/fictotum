#!/usr/bin/env python3
"""
Find Henry VIII or similar figures in the database
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
print("SEARCHING FOR HENRY VIII AND RELATED FIGURES")
print("="*80)

with driver.session() as session:
    # Search for Henry
    print(f"\nSearching for figures with 'Henry' in name...")
    result = session.run('''
        MATCH (f:HistoricalFigure)
        WHERE toLower(f.name) CONTAINS 'henry'
        RETURN f.canonical_id, f.name, f.era
        ORDER BY f.name
        LIMIT 10
    ''')

    records = list(result)
    if records:
        for record in records:
            print(f"  - {record['f.name']} ({record['f.canonical_id']}) - {record['f.era']}")
    else:
        print(f"  No figures with 'Henry' found")

    # Check total figure count
    print(f"\nTotal HistoricalFigure nodes in database:")
    result = session.run('MATCH (f:HistoricalFigure) RETURN count(f) as count')
    record = result.single()
    print(f"  {record['count']} figures")

    # Get some sample figures from Tudor era or 16th century
    print(f"\nSample figures from Tudor/Renaissance era:")
    result = session.run('''
        MATCH (f:HistoricalFigure)
        WHERE f.era CONTAINS 'Tudor' OR f.era CONTAINS '16th' OR f.era CONTAINS 'Renaissance'
        RETURN f.canonical_id, f.name, f.era
        LIMIT 10
    ''')

    records = list(result)
    if records:
        for record in records:
            print(f"  - {record['f.name']} ({record['f.canonical_id']}) - {record['f.era']}")
    else:
        print(f"  No Tudor/Renaissance figures found")

    # Get any sample figures
    print(f"\nSample of any figures in database:")
    result = session.run('''
        MATCH (f:HistoricalFigure)
        RETURN f.canonical_id, f.name, f.era
        LIMIT 10
    ''')

    for record in result:
        print(f"  - {record['f.name']} ({record['f.canonical_id']}) - {record['f.era']}")

print("\n" + "="*80)

driver.close()
