#!/usr/bin/env python3
"""Quick audit sample - check first 15 works"""
from dotenv import load_dotenv
import os
import requests
import difflib
from neo4j import GraphDatabase
import time

load_dotenv()
uri = os.getenv('NEO4J_URI')
username = os.getenv('NEO4J_USERNAME')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

def fetch_wikidata_label(qid):
    try:
        url = 'https://www.wikidata.org/w/api.php'
        params = {
            'action': 'wbgetentities',
            'ids': qid,
            'props': 'labels',
            'languages': 'en',
            'format': 'json'
        }
        headers = {'User-Agent': 'ChronosGraph/1.0'}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        data = response.json()

        if 'entities' in data and qid in data['entities']:
            entity = data['entities'][qid]
            if 'missing' in entity:
                return None
            if 'labels' in entity and 'en' in entity['labels']:
                return entity['labels']['en']['value']
        return None
    except Exception as e:
        return None

print('Auditing sample MediaWork nodes...\n')

with driver.session() as session:
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NOT NULL
        RETURN m.title as title, m.wikidata_id as wikidata_id
        LIMIT 20
    ''')

    records = list(result)
    suspicious = []

    for i, record in enumerate(records, 1):
        db_title = record['title']
        qid = record['wikidata_id']

        wikidata_label = fetch_wikidata_label(qid)

        if wikidata_label is None:
            print(f'{i}. ❌ {db_title} (Q-ID: {qid}): NOT FOUND')
            suspicious.append((db_title, qid, 'Not found'))
        else:
            similarity = difflib.SequenceMatcher(None, db_title.lower(), wikidata_label.lower()).ratio()
            if similarity >= 0.8:
                print(f'{i}. ✅ {db_title}')
            else:
                print(f'{i}. ⚠️  {db_title} -> {wikidata_label} ({similarity:.0%})')
                suspicious.append((db_title, qid, wikidata_label))

        if i < len(records):
            time.sleep(0.5)

driver.close()

if suspicious:
    print(f'\n\nFound {len(suspicious)} suspicious entries:')
    for db_title, qid, issue in suspicious:
        print(f'  - {db_title} ({qid}): {issue}')
else:
    print('\n\n✅ All sampled works validated successfully!')
