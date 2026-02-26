#!/usr/bin/env python3
"""Verify Falco series Books 2-5 ingestion."""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment
load_dotenv()

neo4j_uri = os.getenv("NEO4J_URI")
neo4j_user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
neo4j_password = os.getenv("NEO4J_PASSWORD")

if not all([neo4j_uri, neo4j_user, neo4j_password]):
    print("ERROR: Missing Neo4j credentials")
    sys.exit(1)

if neo4j_uri.startswith("neo4j+s://"):
    neo4j_uri = neo4j_uri.replace("neo4j+s://", "neo4j+ssc://")

driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

try:
    with driver.session() as session:
        print("="*80)
        print("FALCO SERIES VERIFICATION: Books 1-5")
        print("="*80)

        # Count total characters in Falco series
        result = session.run("""
            MATCH (f:HistoricalFigure)-[:APPEARS_IN]->(m:MediaWork)
            WHERE m.wikidata_id IN ['Q1212490', 'Q3858900', 'Q3824690', 'Q3824696', 'Q3824702']
            RETURN COUNT(DISTINCT f) as total_figures,
                   COUNT(DISTINCT m) as total_books,
                   COUNT(*) as total_portrayals
        """)

        for record in result:
            print(f"\nCharacter Coverage (Books 1-5):")
            print(f"  Total Unique Characters: {record['total_figures']}")
            print(f"  Total Books: {record['total_books']}")
            print(f"  Total APPEARS_IN relationships: {record['total_portrayals']}")

        # Count interactions
        result = session.run("""
            MATCH (f1:HistoricalFigure)-[r:INTERACTED_WITH]-(f2:HistoricalFigure)
            WHERE f1.canonical_id IN ['marcus_didius_falco', 'helena_justina',
                                       'lucius_petronius_longus', 'decimus_camillus_verus',
                                       'barnabas', 'atius_pertinax', 'larius',
                                       'petronius_wife', 'petronius_daughters',
                                       'hortensius_novus', 'severina_zotica',
                                       'sabina_pollia', 'hortensia_atilia', 'hyacinthus',
                                       'anacrites', 'falco_mother', 'camillus_justinus',
                                       'veleda', 'xanthus', 'helveticus', 'missing_legate',
                                       'germanic_centurion', 'geminus', 'festus',
                                       'falco_sisters', 'maia', 'military_syndicate_members',
                                       'murdered_centurion']
            RETURN COUNT(r) as total_interactions
        """)

        for record in result:
            print(f"\nInteraction Coverage (Falco series only):")
            print(f"  Total INTERACTED_WITH relationships: {record['total_interactions']}")

        # Books breakdown
        books = [
            ("The Silver Pigs", "Q1212490"),
            ("Shadows in Bronze", "Q3858900"),
            ("Venus in Copper", "Q3824690"),
            ("The Iron Hand of Mars", "Q3824696"),
            ("Poseidon's Gold", "Q3824702"),
        ]

        print(f"\nBooks 1-5 Character Breakdown:")
        for book_name, q_id in books:
            result = session.run("""
                MATCH (f:HistoricalFigure)-[:APPEARS_IN]->(m:MediaWork {wikidata_id: $q_id})
                RETURN COUNT(DISTINCT f) as figures,
                       COUNT(*) as portrayals
            """, q_id=q_id)

            for record in result:
                print(f"  {book_name}: {record['figures']} figures, {record['portrayals']} portrayals")

        # Core recurring characters
        result = session.run("""
            MATCH (f:HistoricalFigure)-[:APPEARS_IN]->(m:MediaWork)
            WHERE m.wikidata_id IN ['Q1212490', 'Q3858900', 'Q3824690', 'Q3824696', 'Q3824702']
            WITH f, COUNT(DISTINCT m) as appearances
            WHERE appearances >= 4
            RETURN f.name as character, appearances as book_appearances
            ORDER BY appearances DESC, f.name
        """)

        print(f"\nCore Recurring Characters (4+ books):")
        for record in result:
            print(f"  {record['character']}: {record['book_appearances']} books")

        print("\n" + "="*80)
        print("✓ VERIFICATION COMPLETE")
        print("="*80 + "\n")

finally:
    driver.close()
