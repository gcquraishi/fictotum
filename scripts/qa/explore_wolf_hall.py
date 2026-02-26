#!/usr/bin/env python3
"""
Explore Wolf Hall related data in the database
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
print("WOLF HALL DATA EXPLORATION")
print("="*80)

with driver.session() as session:
    # Search for all Wolf Hall mentions
    print("\n1. SEARCHING FOR 'WOLF HALL' IN ALL MEDIAWORKS:")
    print("-" * 80)
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE toLower(m.title) CONTAINS 'wolf hall'
        RETURN m.title as title,
               m.wikidata_id as wikidata_id,
               m.year as year,
               m.release_year as release_year,
               m.type as type,
               m.media_type as media_type,
               m.author as author,
               m.creator as creator,
               elementId(m) as element_id
        ORDER BY coalesce(m.release_year, m.year)
    ''')

    works = list(result)
    print(f"  Found {len(works)} MediaWork(s) containing 'Wolf Hall':")
    for w in works:
        print(f"\n  Title: {w['title']}")
        print(f"  Wikidata ID: {w['wikidata_id']}")
        print(f"  Type: {w['type'] or w['media_type']}")
        print(f"  Year: {w['year'] or w['release_year']}")
        print(f"  Author/Creator: {w['author'] or w['creator']}")

    # Search for Mantel's other books
    print("\n\n2. SEARCHING FOR HILARY MANTEL MEDIAWORKS:")
    print("-" * 80)
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.author CONTAINS 'Mantel' OR m.creator CONTAINS 'Mantel'
        RETURN m.title as title,
               m.wikidata_id as wikidata_id,
               m.year as year,
               m.release_year as release_year,
               m.type as type,
               m.media_type as media_type
        ORDER BY coalesce(m.release_year, m.year)
    ''')

    mantel_works = list(result)
    print(f"  Found {len(mantel_works)} Mantel work(s):")
    for w in mantel_works:
        print(f"  • {w['title']} ({w['year'] or w['release_year']})")

    # Search for Thomas Cromwell
    print("\n\n3. SEARCHING FOR THOMAS CROMWELL:")
    print("-" * 80)
    result = session.run('''
        MATCH (h:HistoricalFigure)
        WHERE toLower(h.name) CONTAINS 'cromwell'
        RETURN h.name as name,
               h.canonical_id as canonical_id,
               h.birth_year as birth,
               h.death_year as death,
               h.description as description
        ORDER BY h.name
    ''')

    cromwells = list(result)
    print(f"  Found {len(cromwells)} Cromwell figure(s):")
    for c in cromwells:
        print(f"\n  Name: {c['name']}")
        print(f"  Canonical ID: {c['canonical_id']}")
        print(f"  Years: {c['birth']}-{c['death']}")
        print(f"  Description: {c['description']}")

        # Check portrayals
        portrayal_result = session.run('''
            MATCH (h:HistoricalFigure {canonical_id: $cid})-[r:PORTRAYED_IN]->(m:MediaWork)
            RETURN m.title as title, m.year as year, m.type as type
            ORDER BY m.year
        ''', cid=c['canonical_id'])

        portrayals = list(portrayal_result)
        if portrayals:
            print(f"  Portrayed in {len(portrayals)} work(s):")
            for p in portrayals:
                print(f"    • {p['title']} ({p['year']}) - {p['type']}")
        else:
            print(f"  No portrayals found in database")

    # Search for Henry VIII
    print("\n\n4. SEARCHING FOR HENRY VIII:")
    print("-" * 80)
    result = session.run('''
        MATCH (h:HistoricalFigure)
        WHERE toLower(h.name) CONTAINS 'henry' AND toLower(h.name) CONTAINS 'viii'
        RETURN h.name as name,
               h.canonical_id as canonical_id,
               h.birth_year as birth,
               h.death_year as death
        ORDER BY h.name
    ''')

    henrys = list(result)
    print(f"  Found {len(henrys)} Henry VIII figure(s):")
    for henry in henrys:
        print(f"\n  Name: {henry['name']}")
        print(f"  Canonical ID: {henry['canonical_id']}")

        # Check portrayals
        portrayal_result = session.run('''
            MATCH (h:HistoricalFigure {canonical_id: $cid})-[r:PORTRAYED_IN]->(m:MediaWork)
            RETURN m.title as title, m.year as year, m.type as type
            ORDER BY m.year
        ''', cid=henry['canonical_id'])

        portrayals = list(portrayal_result)
        if portrayals:
            print(f"  Portrayed in {len(portrayals)} work(s):")
            for p in portrayals[:10]:  # First 10
                print(f"    • {p['title']} ({p['year']}) - {p['type']}")
            if len(portrayals) > 10:
                print(f"    ... and {len(portrayals) - 10} more")
        else:
            print(f"  No portrayals found in database")

    # Check total database stats
    print("\n\n5. DATABASE STATISTICS:")
    print("-" * 80)

    result = session.run('MATCH (m:MediaWork) RETURN count(m) as count')
    total_mediaworks = result.single()['count']

    result = session.run('MATCH (h:HistoricalFigure) RETURN count(h) as count')
    total_figures = result.single()['count']

    result = session.run('MATCH ()-[r:PORTRAYED_IN]->() RETURN count(r) as count')
    total_portrayals = result.single()['count']

    print(f"  Total MediaWorks: {total_mediaworks}")
    print(f"  Total HistoricalFigures: {total_figures}")
    print(f"  Total PORTRAYED_IN relationships: {total_portrayals}")

print("\n" + "="*80)
print("EXPLORATION COMPLETE")
print("="*80)

driver.close()
