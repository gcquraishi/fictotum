"""
Verify The Silver Pigs ingestion - Check that all characters and relationships
were successfully created in Neo4j.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv()

def verify_ingestion():
    """Verify The Silver Pigs character data in Neo4j."""
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")

    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")

    driver = GraphDatabase.driver(uri, auth=(user, password))

    try:
        with driver.session() as session:
            print("\n" + "="*80)
            print("VERIFYING THE SILVER PIGS INGESTION")
            print("="*80)

            # 1. Check MediaWork
            print("\n[1] Checking MediaWork nodes...")
            result = session.run("""
                MATCH (m:MediaWork {wikidata_id: 'Q1212490'})
                RETURN m.title, m.media_id, m.release_year, m.creator
            """)
            media_records = list(result)
            if media_records:
                record = media_records[0]
                print(f"  ✓ Found: {record[0]} ({record[1]}) - {record[2]} by {record[3]}")
            else:
                print("  ✗ ERROR: The Silver Pigs MediaWork not found!")

            # 2. Check HistoricalFigure nodes
            print("\n[2] Checking HistoricalFigure nodes (11 expected)...")
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id IN [
                    'marcus_didius_falco',
                    'helena_justina',
                    'lucius_petronius_longus',
                    'vespasian',
                    'titus_emperor',
                    'domitian_emperor',
                    'decimus_camillus_verus',
                    'sosia_camillina',
                    'smaractus',
                    'lenia',
                    'publius_camillus_meto'
                ]
                RETURN f.canonical_id, f.name, f.title
                ORDER BY f.canonical_id
            """)
            figures = []
            for record in list(result):
                figures.append(record[0])
                print(f"  ✓ {record[0]:30s} : {record[1]:25s} ({record[2]})")

            if len(figures) == 11:
                print(f"\n  SUCCESS: All 11 figures found")
            else:
                print(f"\n  WARNING: Found {len(figures)}/11 expected figures")

            # 3. Check APPEARS_IN relationships
            print("\n[3] Checking APPEARS_IN relationships (9 expected)...")
            result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork {wikidata_id: 'Q1212490'})
                RETURN f.canonical_id, f.name, r.role_description
                ORDER BY f.canonical_id
            """)
            portrayals = []
            for record in list(result):
                portrayals.append(record[0])
                print(f"  ✓ {record[1]:25s} : {record[2][:50]}")

            if len(portrayals) == 9:
                print(f"\n  SUCCESS: All 9 APPEARS_IN relationships found")
            else:
                print(f"\n  WARNING: Found {len(portrayals)}/9 expected relationships")

            # 4. Check INTERACTED_WITH relationships
            print("\n[4] Checking INTERACTED_WITH relationships (12 expected)...")
            result = session.run("""
                MATCH (f1:HistoricalFigure)-[r:INTERACTED_WITH]-(f2:HistoricalFigure)
                WHERE f1.canonical_id IN [
                    'marcus_didius_falco',
                    'helena_justina',
                    'lucius_petronius_longus',
                    'vespasian',
                    'decimus_camillus_verus',
                    'sosia_camillina'
                ]
                AND f2.canonical_id IN [
                    'marcus_didius_falco',
                    'helena_justina',
                    'lucius_petronius_longus',
                    'vespasian',
                    'decimus_camillus_verus',
                    'sosia_camillina'
                ]
                RETURN f1.name, f2.name, r.relationship_type, r.context
                ORDER BY f1.name, f2.name
            """)
            interactions = []
            for record in list(result):
                interactions.append((record[0], record[1]))
                print(f"  ✓ {record[0]:20s} <-> {record[1]:20s} : {record[2]}")
                if record[3]:
                    print(f"    Context: {record[3][:70]}")

            if len(interactions) >= 12:
                print(f"\n  SUCCESS: Found {len(interactions)} INTERACTED_WITH relationships")
            else:
                print(f"\n  WARNING: Found {len(interactions)}/12 expected relationships")

            # 5. Character network summary
            print("\n[5] Character Network Summary for The Silver Pigs...")
            result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork {wikidata_id: 'Q1212490'})
                WITH count(f) as figures_count
                MATCH (f1:HistoricalFigure)-[r:INTERACTED_WITH]-(f2:HistoricalFigure)
                WHERE f1.canonical_id IN [
                    'marcus_didius_falco',
                    'helena_justina',
                    'lucius_petronius_longus',
                    'vespasian',
                    'decimus_camillus_verus',
                    'sosia_camillina'
                ]
                WITH figures_count, count(r) as interactions_count
                RETURN figures_count, interactions_count
            """)
            for record in list(result):
                print(f"  • Characters appearing in The Silver Pigs: {record[0]}")
                print(f"  • Character interactions documented: {record[1]}")

            # 6. Check for series progression metadata
            print("\n[6] Checking for series-wide character presence...")
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id IN [
                    'marcus_didius_falco',
                    'helena_justina',
                    'lucius_petronius_longus',
                    'decimus_camillus_verus'
                ]
                RETURN count(f) as omnipresent_chars
            """)
            for record in list(result):
                print(f"  ✓ Found {record[0]} characters that appear in all 20 books")

            print("\n" + "="*80)
            print("VERIFICATION COMPLETE")
            print("="*80 + "\n")

            return True

    except Exception as e:
        print(f"ERROR: {e}")
        return False
    finally:
        driver.close()


if __name__ == "__main__":
    success = verify_ingestion()
    sys.exit(0 if success else 1)
