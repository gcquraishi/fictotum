#!/usr/bin/env python3
"""
Verify Bacon Connections in Neo4j Database
Shows the connection paths between Kevin Bacon, Francis Bacon (painter), and Francis Bacon (philosopher)
"""

import json
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
print("BACON CONNECTIONS VERIFICATION")
print("="*80)

with driver.session() as session:
    # Verify the three main figures exist
    print("\n1. MAIN FIGURES:")
    print("-" * 80)
    result = session.run('''
        MATCH (h:HistoricalFigure)
        WHERE h.canonical_id IN ['Q3454165', 'Q154340', 'Q37388']
        RETURN h.name as name, h.birth_year as birth, h.death_year as death, h.description as description
        ORDER BY h.birth_year
    ''')
    for record in result:
        death = record['death'] if record['death'] else 'present'
        print(f"  • {record['name']} ({record['birth']}-{death})")
        print(f"    {record['description']}")

    # Show all MediaWorks added
    print("\n2. MEDIAWORKS ADDED:")
    print("-" * 80)
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IN ['Q106428', 'Q935173', 'Q741823', 'Q2297818', 'Q691672']
        RETURN m.title as title, m.year as year, m.director as director, m.type as type
        ORDER BY m.year
    ''')
    for record in result:
        print(f"  • {record['title']} ({record['year']}) - Dir: {record['director']}")

    # Show connection path 1: Kevin Bacon -> Jack Swigert -> Apollo 13
    print("\n3. CONNECTION PATH 1: Kevin Bacon → Jack Swigert → Apollo 13")
    print("-" * 80)
    result = session.run('''
        MATCH path = (actor:HistoricalFigure {canonical_id: 'Q3454165'})-[:PORTRAYED_IN]->(movie:MediaWork {wikidata_id: 'Q106428'})<-[:PORTRAYED_IN]-(astronaut:HistoricalFigure {canonical_id: 'Q348358'})
        RETURN actor.name as actor_name, movie.title as movie_title, astronaut.name as astronaut_name
    ''')
    for record in result:
        print(f"  {record['actor_name']} portrayed {record['astronaut_name']} in {record['movie_title']}")

    # Show connection path 2: Kevin Bacon -> Michael Strobl -> Taking Chance
    print("\n4. CONNECTION PATH 2: Kevin Bacon → Michael Strobl → Taking Chance")
    print("-" * 80)
    result = session.run('''
        MATCH path = (actor:HistoricalFigure {canonical_id: 'Q3454165'})-[:PORTRAYED_IN]->(movie:MediaWork {wikidata_id: 'Q935173'})<-[:PORTRAYED_IN]-(marine:HistoricalFigure {canonical_id: 'Q6834665'})
        RETURN actor.name as actor_name, movie.title as movie_title, marine.name as marine_name
    ''')
    for record in result:
        print(f"  {record['actor_name']} portrayed {record['marine_name']} in {record['movie_title']}")

    # Show connection path 3: Derek Jacobi -> Francis Bacon (painter) -> Love Is the Devil
    print("\n5. CONNECTION PATH 3: Derek Jacobi → Francis Bacon (painter) → Love Is the Devil")
    print("-" * 80)
    result = session.run('''
        MATCH path = (actor:HistoricalFigure {canonical_id: 'Q256164'})-[:PORTRAYED_IN]->(movie:MediaWork {wikidata_id: 'Q2297818'})<-[:PORTRAYED_IN]-(painter:HistoricalFigure {canonical_id: 'Q154340'})
        RETURN actor.name as actor_name, movie.title as movie_title, painter.name as painter_name
    ''')
    for record in result:
        print(f"  {record['actor_name']} portrayed {record['painter_name']} in {record['movie_title']}")

    # Show connection path 4: Kevin Bacon -> Jack Brennan -> Frost/Nixon -> Richard Nixon
    print("\n6. CONNECTION PATH 4: Kevin Bacon → Jack Brennan → Frost/Nixon → Richard Nixon")
    print("-" * 80)
    result = session.run('''
        MATCH (actor:HistoricalFigure {canonical_id: 'Q3454165'})-[:PORTRAYED_IN]->(movie:MediaWork {wikidata_id: 'Q691672'})<-[:PORTRAYED_IN]-(aide:HistoricalFigure {canonical_id: 'Q6111391'})
        MATCH (movie)<-[:PORTRAYED_IN]-(president:HistoricalFigure {canonical_id: 'Q9588'})
        RETURN actor.name as actor_name, aide.name as aide_name, movie.title as movie_title, president.name as president_name
    ''')
    for record in result:
        print(f"  {record['actor_name']} portrayed {record['aide_name']} in {record['movie_title']}")
        print(f"  Film also depicts {record['president_name']}")

    # Show all portrayals by Kevin Bacon
    print("\n7. ALL PORTRAYALS BY KEVIN BACON:")
    print("-" * 80)
    result = session.run('''
        MATCH (kevin:HistoricalFigure {canonical_id: 'Q3454165'})-[r:PORTRAYED_IN]->(movie:MediaWork)
        RETURN movie.title as movie, movie.year as year, r.character_portrayed as character
        ORDER BY movie.year
    ''')
    for record in result:
        character = record['character'] if record['character'] else "fictional character"
        print(f"  • {record['movie']} ({record['year']}) - as {character}")

    # Count total degrees of separation paths
    print("\n8. NETWORK STATISTICS:")
    print("-" * 80)
    result = session.run('''
        MATCH (h:HistoricalFigure)
        RETURN count(h) as total_figures
    ''')
    total_figures = result.single()['total_figures']

    result = session.run('''
        MATCH (m:MediaWork)
        RETURN count(m) as total_mediaworks
    ''')
    total_mediaworks = result.single()['total_mediaworks']

    result = session.run('''
        MATCH ()-[r:PORTRAYED_IN]->()
        RETURN count(r) as total_portrayals
    ''')
    total_portrayals = result.single()['total_portrayals']

    print(f"  • Total Historical Figures: {total_figures}")
    print(f"  • Total MediaWorks: {total_mediaworks}")
    print(f"  • Total Portrayals: {total_portrayals}")

    # Show potential paths between the three Bacons
    print("\n9. POTENTIAL CONNECTION PATHS BETWEEN THE THREE BACON FIGURES:")
    print("-" * 80)
    result = session.run('''
        MATCH path = (kevin:HistoricalFigure {canonical_id: 'Q3454165'})-[:PORTRAYED_IN*..4]-(painter:HistoricalFigure {canonical_id: 'Q154340'})
        WHERE length(path) <= 4
        RETURN length(path) as degrees,
               [n in nodes(path) | CASE
                   WHEN 'HistoricalFigure' IN labels(n) THEN n.name
                   WHEN 'MediaWork' IN labels(n) THEN n.title
                   ELSE 'Unknown'
               END] as path_nodes
        LIMIT 5
    ''')

    paths_found = False
    for record in result:
        paths_found = True
        print(f"  Path ({record['degrees']} degrees): {' → '.join(record['path_nodes'])}")

    if not paths_found:
        print("  Note: Kevin Bacon (actor) and Francis Bacon (painter) are not directly connected")
        print("  through the current dataset, but both exist in the knowledge graph.")

print("\n" + "="*80)
print("VERIFICATION COMPLETE")
print("="*80)

driver.close()
