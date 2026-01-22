#!/usr/bin/env python3
"""
Query Neo4j to find Henry VIII node for CHR-6 landing page implementation.

This script searches for Henry VIII in the ChronosGraph database and retrieves:
- canonical_id for use in landing page
- Node properties (name, historicity_status, era)
- Number of media connections (APPEARS_IN relationships)
- Sample media works to verify rich exploration potential

Author: Claude Code (Sonnet 4.5)
Date: 2026-01-21
Task: CHR-6 Task 1.1
"""

import os
import sys
from neo4j import GraphDatabase

# Neo4j connection details from environment
NEO4J_URI = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

if not NEO4J_PASSWORD:
    print("ERROR: NEO4J_PASSWORD environment variable not set")
    print("Please set it in .env or export it before running this script")
    sys.exit(1)

def find_henry_viii():
    """Search for Henry VIII node in Neo4j database."""
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        with driver.session() as session:
            # Search for Henry VIII (various spellings)
            query = """
            MATCH (f:HistoricalFigure)
            WHERE toLower(f.name) CONTAINS 'henry viii'
               OR toLower(f.name) CONTAINS 'henry 8'
               OR f.canonical_id CONTAINS 'henry-viii'
            RETURN f.canonical_id AS canonical_id,
                   f.name AS name,
                   f.historicity_status AS historicity_status,
                   f.era AS era,
                   f.birth_year AS birth_year,
                   f.death_year AS death_year
            LIMIT 5
            """

            result = session.run(query)
            records = list(result)

            if not records:
                print("❌ No Henry VIII node found in database")
                print("\nAlternative starting figures to consider:")
                print("  - Julius Caesar (julius-caesar)")
                print("  - Cleopatra (cleopatra)")
                print("  - Napoleon Bonaparte (napoleon-bonaparte)")
                print("  - Elizabeth I (elizabeth-i)")
                return None

            print(f"✅ Found {len(records)} Henry VIII candidate(s):\n")

            for i, record in enumerate(records, 1):
                canonical_id = record['canonical_id']
                name = record['name']
                historicity = record['historicity_status']
                era = record['era']
                birth_year = record['birth_year']
                death_year = record['death_year']

                print(f"{i}. {name}")
                print(f"   canonical_id: {canonical_id}")
                print(f"   Historicity: {historicity}")
                print(f"   Era: {era}")
                print(f"   Years: {birth_year}-{death_year}")

                # Count media connections
                media_query = """
                MATCH (f:HistoricalFigure {canonical_id: $canonical_id})-[r:APPEARS_IN]->(m:MediaWork)
                RETURN count(m) AS media_count,
                       collect(m.title)[0..5] AS sample_titles
                """
                media_result = session.run(media_query, canonical_id=canonical_id)
                media_record = media_result.single()

                if media_record:
                    media_count = media_record['media_count']
                    sample_titles = media_record['sample_titles']

                    print(f"   Media portrayals: {media_count}")
                    if sample_titles:
                        print(f"   Sample works: {', '.join(sample_titles[:3])}")

                # Count figure connections
                figure_query = """
                MATCH (f:HistoricalFigure {canonical_id: $canonical_id})-[r:INTERACTED_WITH]-(h:HistoricalFigure)
                RETURN count(h) AS figure_count
                """
                figure_result = session.run(figure_query, canonical_id=canonical_id)
                figure_record = figure_result.single()

                if figure_record:
                    figure_count = figure_record['figure_count']
                    print(f"   Connected figures: {figure_count}")

                print()

            # Return the first (most likely) match
            best_match = records[0]
            print(f"✅ RECOMMENDED for landing page: {best_match['canonical_id']}")
            return best_match['canonical_id']

    except Exception as e:
        print(f"❌ Error querying database: {e}")
        return None

    finally:
        driver.close()

if __name__ == "__main__":
    print("=" * 60)
    print("CHR-6: Finding Henry VIII Node for Landing Page")
    print("=" * 60)
    print()

    canonical_id = find_henry_viii()

    if canonical_id:
        print("\n" + "=" * 60)
        print(f"✅ SUCCESS: Use '{canonical_id}' in landing page implementation")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ FAILED: No suitable Henry VIII node found")
        print("Next step: Create node OR choose alternative figure")
        print("=" * 60)
        sys.exit(1)
