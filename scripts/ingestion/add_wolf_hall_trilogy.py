#!/usr/bin/env python3
"""
Add Missing Wolf Hall Trilogy Books to Neo4j Database
Adds 'Bring Up the Bodies' and 'The Mirror & the Light' with proper Wikidata Q-IDs
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

# MediaWork data to add
mediaworks_to_add = [
    {
        'wikidata_id': 'Q3644822',
        'title': 'Bring Up the Bodies',
        'year': 2012,
        'type': 'Book',
        'creator': 'Hilary Mantel',
        'publisher': 'Fourth Estate',
        'isbn': '9780007485598',
        'description': 'Second novel in the Wolf Hall trilogy, chronicling Thomas Cromwell\'s role in Anne Boleyn\'s downfall'
    },
    {
        'wikidata_id': 'Q7751674',
        'title': 'The Mirror & the Light',
        'year': 2020,
        'type': 'Book',
        'creator': 'Hilary Mantel',
        'publisher': 'Fourth Estate',
        'isbn': '9780007480999',
        'description': 'Final novel in the Wolf Hall trilogy, depicting Thomas Cromwell\'s final years and execution'
    }
]

print("="*80)
print("ADDING MISSING WOLF HALL TRILOGY BOOKS")
print("="*80)

with driver.session() as session:
    for work in mediaworks_to_add:
        print(f"\nProcessing: {work['title']} ({work['wikidata_id']})")

        # First check if it already exists
        check_result = session.run('''
            MATCH (m:MediaWork {wikidata_id: $wikidata_id})
            RETURN m
        ''', wikidata_id=work['wikidata_id'])

        if check_result.single():
            print(f"  ✓ Already exists in database - skipping")
            continue

        # Create the MediaWork node
        create_result = session.run('''
            CREATE (m:MediaWork {
                wikidata_id: $wikidata_id,
                title: $title,
                year: $year,
                type: $type,
                creator: $creator,
                publisher: $publisher,
                isbn: $isbn,
                description: $description
            })
            RETURN m.title as title, m.wikidata_id as wikidata_id
        ''',
            wikidata_id=work['wikidata_id'],
            title=work['title'],
            year=work['year'],
            type=work['type'],
            creator=work['creator'],
            publisher=work['publisher'],
            isbn=work['isbn'],
            description=work['description']
        )

        result = create_result.single()
        if result:
            print(f"  ✓ Successfully created MediaWork node")
            print(f"    Title: {result['title']}")
            print(f"    Wikidata ID: {result['wikidata_id']}")
        else:
            print(f"  ✗ Failed to create node")

    # Update Wolf Hall with missing metadata
    print(f"\nUpdating existing Wolf Hall node with missing metadata:")
    update_result = session.run('''
        MATCH (m:MediaWork {wikidata_id: 'Q202517'})
        SET m.year = CASE WHEN m.year IS NULL THEN 2009 ELSE m.year END,
            m.type = CASE WHEN m.type IS NULL THEN 'Book' ELSE m.type END,
            m.creator = CASE WHEN m.creator IS NULL THEN 'Hilary Mantel' ELSE m.creator END,
            m.publisher = CASE WHEN m.publisher IS NULL THEN 'Fourth Estate' ELSE m.publisher END,
            m.description = CASE WHEN m.description IS NULL
                THEN 'First novel in the Wolf Hall trilogy, depicting Thomas Cromwell\\'s rise to power'
                ELSE m.description END
        RETURN m.title as title, m.year as year, m.type as type
    ''')

    wolf_hall_record = update_result.single()
    if wolf_hall_record:
        print(f"  ✓ Updated Wolf Hall")
        print(f"    Year: {wolf_hall_record['year']}")
        print(f"    Type: {wolf_hall_record['type']}")

    # Verify all three books now exist
    print(f"\n" + "-"*80)
    print("VERIFICATION: Checking all three trilogy books exist")
    print("-"*80)

    trilogy_qids = ['Q202517', 'Q3644822', 'Q7751674']
    for qid in trilogy_qids:
        verify_result = session.run('''
            MATCH (m:MediaWork {wikidata_id: $qid})
            RETURN m.title as title, m.year as year
        ''', qid=qid)

        record = verify_result.single()
        if record:
            print(f"  ✓ {record['title']} ({record['year']})")
        else:
            print(f"  ✗ Missing: {qid}")

print("\n" + "="*80)
print("INGESTION COMPLETE")
print("="*80)

driver.close()
