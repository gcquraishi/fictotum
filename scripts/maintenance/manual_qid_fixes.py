#!/usr/bin/env python3
"""Manual Q-ID fixes for critical works with verified Wikidata Q-IDs"""

from dotenv import load_dotenv
import os
from neo4j import GraphDatabase

load_dotenv()
uri = os.getenv('NEO4J_URI')
username = os.getenv('NEO4J_USERNAME')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

# Manually verified Q-IDs from Wikidata
# These are critical works with completely wrong Q-IDs that need immediate fixing
fixes = [
    # Already fixed:
    # - MW_301: A Tale of Two Cities (Q208931 → Q308918) ✅
    # - MW_206: War and Peace (Q14773 → Q161531) ✅

    {
        'media_id': 'MW_603',
        'title': 'Watchmen',
        'old_qid': 'Q128338',  # Trinity Blood (anime)
        'new_qid': 'Q128444',  # Correct: Alan Moore graphic novel
        'source': 'https://www.wikidata.org/wiki/Q128444'
    },
    {
        'media_id': 'MW_1006',
        'title': 'Vanity Fair',
        'old_qid': 'Q737821',  # Lego Racers 2 (video game)
        'new_qid': 'Q612836',  # Correct: Thackeray novel
        'source': 'https://www.wikidata.org/wiki/Q612836'
    },
]

print("="*80)
print("MANUAL Q-ID FIXES - VERIFIED FROM WIKIDATA")
print("="*80)
print()

with driver.session() as session:
    for fix in fixes:
        print(f"Fixing: {fix['title']}")
        print(f"  Media ID: {fix['media_id']}")
        print(f"  Old Q-ID: {fix['old_qid']}")
        print(f"  New Q-ID: {fix['new_qid']}")
        print(f"  Source: {fix['source']}")

        result = session.run('''
            MATCH (m:MediaWork {media_id: $media_id})
            SET m.wikidata_id = $new_qid,
                m.wikidata_label = $title,
                m.wikidata_updated_at = timestamp()
            RETURN m.title, m.wikidata_id
        ''', {
            'media_id': fix['media_id'],
            'new_qid': fix['new_qid'],
            'title': fix['title']
        })

        record = result.single()
        if record:
            print(f"  ✅ Updated successfully\n")
        else:
            print(f"  ❌ Media ID not found\n")

driver.close()

print("="*80)
print(f"Fixed {len(fixes)} critical Q-ID errors")
print("="*80)
