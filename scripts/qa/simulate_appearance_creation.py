#!/usr/bin/env python3
"""
Simulate the exact API workflow for creating an appearance
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
print("SIMULATING APPEARANCE CREATION")
print("="*80)

# Expected parameters from the user's attempt
figure_id = "Q38370"  # Henry VIII
media_id = "MW_1463"  # The Mirror & the Light (or Q7751674)
user_email = "george.quraishi@gmail.com"  # From the User table

with driver.session() as session:
    # Step 1: Try the exact query from the API
    print("\n1. Testing the EXACT query from the API...")
    print(f"   figure_id: {figure_id}")
    print(f"   media_id: {media_id}")
    print(f"   user_email: {user_email}")

    try:
        result = session.run('''
            MATCH (f:HistoricalFigure {canonical_id: $figureId})
            MATCH (m:MediaWork)
            WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
            MATCH (u:User {email: $userEmail})
            RETURN f.name as figure_name,
                   m.title as media_title,
                   u.email as user_email,
                   'SUCCESS' as status
        ''', figureId=figure_id, mediaId=media_id, userEmail=user_email)

        record = result.single()
        if record:
            print(f"\n   ✓ Query SUCCESS!")
            print(f"     Figure: {record['figure_name']}")
            print(f"     Media: {record['media_title']}")
            print(f"     User: {record['user_email']}")
            print(f"\n   The MERGE would work. Something else must be wrong.")
        else:
            print(f"\n   ✗ Query FAILED - No results returned")
            print(f"   One of the MATCH clauses is failing.")
    except Exception as e:
        print(f"\n   ✗ Query ERROR: {e}")

    # Step 2: Test each MATCH clause individually
    print("\n\n2. Testing each MATCH clause individually...")

    # Test Figure
    print(f"\n   a) Testing HistoricalFigure MATCH...")
    result = session.run('''
        MATCH (f:HistoricalFigure {canonical_id: $figureId})
        RETURN f.name, f.canonical_id
    ''', figureId=figure_id)
    record = result.single()
    if record:
        print(f"      ✓ Figure found: {record['f.name']} ({record['f.canonical_id']})")
    else:
        print(f"      ✗ Figure NOT found with canonical_id: {figure_id}")

    # Test Media with media_id
    print(f"\n   b) Testing MediaWork MATCH with media_id...")
    result = session.run('''
        MATCH (m:MediaWork {media_id: $mediaId})
        RETURN m.title, m.media_id
    ''', mediaId=media_id)
    record = result.single()
    if record:
        print(f"      ✓ Media found by media_id: {record['m.title']} ({record['m.media_id']})")
    else:
        print(f"      ✗ Media NOT found by media_id: {media_id}")

    # Test Media with wikidata_id
    print(f"\n   c) Testing MediaWork MATCH with wikidata_id...")
    result = session.run('''
        MATCH (m:MediaWork {wikidata_id: $wikidataId})
        RETURN m.title, m.wikidata_id
    ''', wikidataId="Q7751674")
    record = result.single()
    if record:
        print(f"      ✓ Media found by wikidata_id: {record['m.title']} ({record['m.wikidata_id']})")
    else:
        print(f"      ✗ Media NOT found by wikidata_id: Q7751674")

    # Test Media with WHERE clause
    print(f"\n   d) Testing MediaWork MATCH with WHERE clause...")
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
        RETURN m.title, m.media_id, m.wikidata_id
    ''', mediaId=media_id)
    record = result.single()
    if record:
        print(f"      ✓ Media found: {record['m.title']} (media_id: {record['m.media_id']}, wikidata: {record['m.wikidata_id']})")
    else:
        print(f"      ✗ Media NOT found with WHERE clause")

    # Test User
    print(f"\n   e) Testing User MATCH...")
    result = session.run('''
        MATCH (u:User {email: $userEmail})
        RETURN u.email, u.name
    ''', userEmail=user_email)
    record = result.single()
    if record:
        print(f"      ✓ User found: {record['u.name']} ({record['u.email']})")
    else:
        print(f"      ✗ User NOT found: {user_email}")
        print(f"\n      This is likely THE PROBLEM!")
        print(f"      Checking what Users exist...")
        result = session.run('MATCH (u:User) RETURN u.email, u.name LIMIT 5')
        users = list(result)
        if users:
            print(f"      Users in database:")
            for user_record in users:
                print(f"        - {user_record['u.name']} ({user_record['u.email']})")
        else:
            print(f"      No User nodes found!")

print("\n" + "="*80)

driver.close()
