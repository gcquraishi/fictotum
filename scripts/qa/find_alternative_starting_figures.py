#!/usr/bin/env python3
"""
Find alternative well-connected historical figures for landing page.

Searches for figures with high media connectivity to ensure rich exploration.

Author: Claude Code (Sonnet 4.5)
Date: 2026-01-21
Task: CHR-6 Task 1.1 (backup option)
"""

import os
import sys
from neo4j import GraphDatabase

# Neo4j connection details
NEO4J_URI = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

if not NEO4J_PASSWORD:
    print("ERROR: NEO4J_PASSWORD environment variable not set")
    sys.exit(1)

def find_well_connected_figures():
    """Find historical figures with richest media connections."""
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        with driver.session() as session:
            # Find figures with most media connections
            query = """
            MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
            WITH f, count(m) AS media_count
            WHERE media_count >= 3
            RETURN f.canonical_id AS canonical_id,
                   f.name AS name,
                   f.era AS era,
                   media_count
            ORDER BY media_count DESC
            LIMIT 15
            """

            result = session.run(query)
            records = list(result)

            if not records:
                print("❌ No well-connected figures found")
                return None

            print(f"✅ Found {len(records)} well-connected figures:\n")
            print(f"{'Rank':<6}{'Name':<30}{'canonical_id':<35}{'Era':<25}{'Media'}")
            print("-" * 100)

            for i, record in enumerate(records, 1):
                canonical_id = record['canonical_id']
                name = record['name']
                era = record['era'] or 'Unknown'
                media_count = record['media_count']

                # Truncate long names/ids for display
                display_name = name[:28] + '..' if len(name) > 30 else name
                display_id = canonical_id[:33] + '..' if len(canonical_id) > 35 else canonical_id
                display_era = era[:23] + '..' if len(era) > 25 else era

                print(f"{i:<6}{display_name:<30}{display_id:<35}{display_era:<25}{media_count}")

            print()
            best = records[0]
            print(f"✅ RECOMMENDED: '{best['canonical_id']}' ({best['name']}) with {best['media_count']} media portrayals")
            return best['canonical_id']

    except Exception as e:
        print(f"❌ Error querying database: {e}")
        import traceback
        traceback.print_exc()
        return None

    finally:
        driver.close()

if __name__ == "__main__":
    print("=" * 100)
    print("Finding Well-Connected Historical Figures for Landing Page")
    print("=" * 100)
    print()

    canonical_id = find_well_connected_figures()

    if canonical_id:
        print("\n" + "=" * 100)
        print(f"✅ Use this figure for landing page: {canonical_id}")
        print("=" * 100)
        sys.exit(0)
    else:
        sys.exit(1)
