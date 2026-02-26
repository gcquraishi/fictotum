#!/usr/bin/env python3
"""
Debug script to check all properties of The Mirror & the Light
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
print("DEBUGGING THE MIRROR & THE LIGHT")
print("="*80)

with driver.session() as session:
    # Search by title
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE toLower(m.title) CONTAINS 'mirror'
        RETURN m
        LIMIT 5
    ''')

    for record in result:
        node = record['m']
        print(f"\nNode properties:")
        for key, value in node.items():
            print(f"  {key}: {value}")
        print(f"\nNode labels: {node.labels}")

print("\n" + "="*80)

driver.close()
