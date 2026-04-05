#!/usr/bin/env python3
"""Check for duplicate MediaWork entries"""

from dotenv import load_dotenv
import os
from neo4j import GraphDatabase

load_dotenv()
driver = GraphDatabase.driver(
    os.getenv('NEO4J_URI'),
    auth=(os.getenv('NEO4J_USERNAME'), os.getenv('NEO4J_PASSWORD'))
)

with driver.session() as session:
    # Find all War and Peace entries
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.title CONTAINS 'War and Peace'
        RETURN m
        ORDER BY m.title
    ''')

    print('War and Peace entries in database:\n')
    for record in result:
        node = record['m']
        print(f'{node.get("media_id", "NO_ID")}: {node.get("title", "NO_TITLE")}')
        print(f'  Q-ID: {node.get("wikidata_id", "NONE")}')
        print(f'  Year: {node.get("release_year", "NONE")}')
        print()

driver.close()
