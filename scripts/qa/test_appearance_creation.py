#!/usr/bin/env python3
"""
Test appearance creation with The Mirror & the Light
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
print("TEST: APPEARANCE CREATION QUERY")
print("="*80)

# Test parameters
media_id_to_test = "MW_1463"  # The Mirror & the Light
figure_id = "henry-viii"  # Henry VIII
user_email = "test@example.com"  # We'll need to check if a user exists

with driver.session() as session:
    # First, check if Henry VIII exists
    print(f"\n1. Checking if figure '{figure_id}' exists...")
    result = session.run('''
        MATCH (f:HistoricalFigure {canonical_id: $figureId})
        RETURN f.name, f.canonical_id
    ''', figureId=figure_id)
    record = result.single()
    if record:
        print(f"   ✓ Found: {record['f.name']} ({record['f.canonical_id']})")
    else:
        print(f"   ✗ Figure not found!")

    # Check if The Mirror & the Light exists
    print(f"\n2. Checking if media '{media_id_to_test}' exists...")
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
        RETURN m.title, m.media_id, m.wikidata_id
    ''', mediaId=media_id_to_test)
    record = result.single()
    if record:
        print(f"   ✓ Found: {record['m.title']} (media_id: {record['m.media_id']}, wikidata: {record['m.wikidata_id']})")
    else:
        print(f"   ✗ Media not found!")

    # Check if a User node exists
    print(f"\n3. Checking if any User nodes exist...")
    result = session.run('''
        MATCH (u:User)
        RETURN u.email, u.name
        LIMIT 5
    ''')
    users = list(result)
    if users:
        print(f"   ✓ Found {len(users)} user(s):")
        for record in users:
            print(f"      - {record['u.name']} ({record['u.email']})")
    else:
        print(f"   ✗ No User nodes found in database!")
        print(f"   This is the problem - the API requires a User node to exist")

    # Try the full query (without actually creating)
    print(f"\n4. Testing the full appearance creation query (dry run)...")
    try:
        result = session.run('''
            MATCH (f:HistoricalFigure {canonical_id: $figureId})
            MATCH (m:MediaWork)
            WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
            OPTIONAL MATCH (u:User {email: $userEmail})
            RETURN f.name as figure_name, m.title as media_title, u.email as user_email
        ''', figureId=figure_id, mediaId=media_id_to_test, userEmail=user_email)
        record = result.single()
        if record:
            print(f"   Figure: {record['figure_name']}")
            print(f"   Media: {record['media_title']}")
            print(f"   User: {record['user_email']}")
            if record['user_email'] is None:
                print(f"\n   ⚠ WARNING: User node does not exist!")
                print(f"   The MERGE will fail because it requires matching a User node first")
        else:
            print(f"   ✗ Query returned no results")
    except Exception as e:
        print(f"   ✗ Query failed: {e}")

print("\n" + "="*80)

driver.close()
