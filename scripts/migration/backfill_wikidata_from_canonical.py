#!/usr/bin/env python3
"""
Backfill wikidata_id from canonical_id for HistoricalFigure nodes.

Some figures have Q-IDs in canonical_id but NULL wikidata_id. This means
they won't be found by `WHERE f.wikidata_id = $qid` dedup queries, and the
figure_wikidata_idx index won't cover them.

This migration is idempotent — safe to run multiple times.

Cypher executed:
  MATCH (f:HistoricalFigure)
  WHERE f.canonical_id STARTS WITH 'Q'
    AND f.wikidata_id IS NULL
  SET f.wikidata_id = f.canonical_id
  RETURN count(f) AS updated

First run (2026-03-22): 6 figures updated:
  - George Dyer (Q94525166)
  - Jack Brennan (Q6111391)
  - Jack Swigert (Q348358)
  - Michael Strobl (Q6834665)
  - Stephen Gardiner (Q981649)
  - Thomas Howard, 3rd Duke of Norfolk (Q335265)

Usage:
    python3 scripts/migration/backfill_wikidata_from_canonical.py [--dry-run]
"""

import os
import sys
import argparse
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

env_path = Path(__file__).parent.parent.parent / "web-app" / ".env.local"
load_dotenv(env_path)


def main():
    parser = argparse.ArgumentParser(
        description="Backfill wikidata_id from canonical_id for Q-prefixed figures"
    )
    parser.add_argument("--dry-run", action="store_true", help="Count only, don't write")
    args = parser.parse_args()

    uri = os.getenv("NEO4J_URI", "")
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD", "")

    driver = GraphDatabase.driver(uri, auth=(user, pwd))

    print("=" * 60)
    print("Backfill wikidata_id from canonical_id")
    print("=" * 60)

    with driver.session() as session:
        # Count first
        count = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE f.canonical_id STARTS WITH 'Q'
              AND f.wikidata_id IS NULL
            RETURN count(f) AS count
        """).single()["count"]

        print(f"Figures with Q-prefixed canonical_id but NULL wikidata_id: {count}")

        if count == 0:
            print("Nothing to backfill.")
            driver.close()
            return

        if args.dry_run:
            # Show which figures would be updated
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id STARTS WITH 'Q'
                  AND f.wikidata_id IS NULL
                RETURN f.canonical_id AS canonical_id, f.name AS name
                ORDER BY f.name
            """)
            for record in result:
                print(f"  Would backfill: {record['name']} ({record['canonical_id']})")
            print(f"\nDRY RUN — {count} figures would be updated. Run without --dry-run to execute.")
        else:
            updated = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id STARTS WITH 'Q'
                  AND f.wikidata_id IS NULL
                SET f.wikidata_id = f.canonical_id
                RETURN count(f) AS updated
            """).single()["updated"]
            print(f"Updated {updated} figures.")

    driver.close()
    print("=" * 60)


if __name__ == "__main__":
    main()
