#!/usr/bin/env python3
"""Check for existing MediaWork nodes in Neo4j database."""

import json
from neo4j import GraphDatabase

# Neo4j connection details
uri = 'neo4j+ssc://c78564a4.databases.neo4j.io'
username = 'neo4j'
password = 'ybSiNRTV9UxUb6PQuANZEeqECn2vz3ozXYiNzkdcMBk'

driver = GraphDatabase.driver(uri, auth=(username, password))

# Check for existing MediaWorks
with driver.session() as session:
    # Check for MediaWorks by wikidata_id
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IN ['Q106428', 'Q935173', 'Q741823', 'Q2297818', 'Q691672']
        RETURN m.title as title, m.wikidata_id as wikidata_id
    ''')
    existing_mediaworks = [dict(record) for record in result]
    print('Existing MediaWorks:')
    print(json.dumps(existing_mediaworks, indent=2))

    # Check for HistoricalFigure nodes
    result = session.run('''
        MATCH (h:HistoricalFigure)
        WHERE h.canonical_id IN ['Q3454165', 'Q154340', 'Q37388', 'Q348358', 'Q6834665',
                                  'Q94525166', 'Q4547', 'Q256164', 'Q9588']
        RETURN h.name as name, h.canonical_id as canonical_id
    ''')
    existing_figures = [dict(record) for record in result]
    print('\nExisting HistoricalFigure nodes:')
    print(json.dumps(existing_figures, indent=2))

driver.close()
