#!/usr/bin/env python3
"""
Migration Script: Prefix Provisional Canonical IDs

Purpose:
  Prefix existing slug-only canonical_id values with 'PROV:' to clearly mark
  them as provisional identifiers that should be enriched with Wikidata Q-IDs.

Background:
  As part of Priority 1 (Entity Resolution Enhancement), Fictotum now uses
  Wikidata Q-IDs as canonical identifiers when available. Existing figures that
  were created before this change have slug-only canonical_ids (e.g., "napoleon-bonaparte").

  This migration prefixes these with "PROV:" (e.g., "PROV:napoleon-bonaparte")
  to signal they need enrichment and to align with the new ID generation pattern.

Safety:
  - Non-destructive: Original ID preserved as substring
  - Idempotent: Safe to run multiple times (skips already-prefixed IDs)
  - Dry-run mode: Preview changes before applying

Usage:
  python3 prefix_provisional_canonical_ids.py --dry-run  # Preview changes
  python3 prefix_provisional_canonical_ids.py            # Apply migration

Author: Claude (Fictotum Co-CEO)
Date: 2026-01-22
"""

import os
import sys
import argparse
from neo4j import GraphDatabase


def get_neo4j_connection():
    """
    Establish connection to Neo4j Aura database using environment variables
    """
    uri = os.getenv('NEO4J_URI')
    username = os.getenv('NEO4J_USERNAME')
    password = os.getenv('NEO4J_PASSWORD')

    if not all([uri, username, password]):
        print("ERROR: Missing Neo4j credentials. Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    driver = GraphDatabase.driver(uri, auth=(username, password))
    return driver


def find_provisional_candidates(session):
    """
    Find all HistoricalFigure nodes that need PROV: prefix

    Criteria:
    - canonical_id does NOT start with 'Q' (not a Wikidata Q-ID)
    - canonical_id does NOT start with 'PROV:' (not already migrated)
    - wikidata_id IS NULL (not linked to Wikidata)
    """
    query = """
    MATCH (f:HistoricalFigure)
    WHERE f.canonical_id IS NOT NULL
      AND NOT f.canonical_id STARTS WITH 'Q'
      AND NOT f.canonical_id STARTS WITH 'PROV:'
      AND f.wikidata_id IS NULL
    RETURN f.canonical_id AS canonical_id, f.name AS name
    ORDER BY f.canonical_id
    """

    result = session.run(query)
    candidates = [(record['canonical_id'], record['name']) for record in result]
    return candidates


def migrate_figure(session, old_canonical_id, dry_run=True):
    """
    Migrate a single figure by prefixing its canonical_id with 'PROV:'

    Args:
        session: Neo4j session
        old_canonical_id: Current canonical_id value
        dry_run: If True, don't actually update (just simulate)

    Returns:
        New canonical_id value
    """
    new_canonical_id = f"PROV:{old_canonical_id}"

    if not dry_run:
        query = """
        MATCH (f:HistoricalFigure {canonical_id: $old_id})
        SET f.canonical_id = $new_id
        RETURN f.canonical_id AS updated_id
        """

        result = session.run(query, old_id=old_canonical_id, new_id=new_canonical_id)
        record = result.single()

        if record:
            return record['updated_id']
        else:
            raise Exception(f"Failed to update figure with canonical_id: {old_canonical_id}")

    return new_canonical_id


def main():
    parser = argparse.ArgumentParser(
        description='Prefix provisional canonical IDs for HistoricalFigure nodes'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without applying them'
    )

    args = parser.parse_args()

    print("=" * 80)
    print("Fictotum Migration: Prefix Provisional Canonical IDs")
    print("=" * 80)
    print()

    if args.dry_run:
        print("🔍 DRY RUN MODE - No changes will be made")
        print()
    else:
        print("⚠️  LIVE MODE - Changes will be applied to the database")
        print()
        confirm = input("Are you sure you want to proceed? (yes/no): ")
        if confirm.lower() != 'yes':
            print("Migration cancelled.")
            sys.exit(0)
        print()

    # Connect to Neo4j
    driver = get_neo4j_connection()

    with driver.session() as session:
        # Find candidates
        print("Searching for figures with provisional IDs...")
        candidates = find_provisional_candidates(session)

        if not candidates:
            print("✅ No figures need migration. All canonical_ids are already Q-IDs or PROV: prefixed.")
            driver.close()
            return

        print(f"Found {len(candidates)} figure(s) to migrate:")
        print()

        # Display candidates
        print(f"{'Old canonical_id':<40} {'Name':<30} {'New canonical_id'}")
        print("-" * 110)

        for old_id, name in candidates:
            new_id = f"PROV:{old_id}"
            print(f"{old_id:<40} {name:<30} {new_id}")

        print()

        # Migrate
        if args.dry_run:
            print("🔍 DRY RUN: No changes applied. Run without --dry-run to migrate.")
        else:
            print("Applying migration...")
            updated_count = 0

            for old_id, name in candidates:
                try:
                    new_id = migrate_figure(session, old_id, dry_run=False)
                    print(f"✅ Migrated: {old_id} → {new_id}")
                    updated_count += 1
                except Exception as e:
                    print(f"❌ ERROR migrating {old_id}: {e}")

            print()
            print(f"Migration complete. Updated {updated_count}/{len(candidates)} figure(s).")

    driver.close()
    print()
    print("=" * 80)


if __name__ == '__main__':
    main()
