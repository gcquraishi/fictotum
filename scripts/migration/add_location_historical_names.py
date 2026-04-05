#!/usr/bin/env python3
"""
Migration Script: Add Historical Names to Location Nodes

Adds support for historical place names (e.g., Constantinople vs Istanbul)
by adding modern_name and time_period properties to Location nodes.

Schema Changes:
- Add Location.modern_name: STRING (for grouping historical variants)
- Add Location.time_period: STRING (format: "330-1453 CE")
- Create example historical locations: Constantinople, Byzantium

Usage:
    python3 add_location_historical_names.py [--dry-run] [--rollback]

Options:
    --dry-run    Show what would be changed without committing
    --rollback   Revert the migration (remove added properties)
"""

import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

# Example historical locations to create
HISTORICAL_LOCATIONS = [
    {
        'location_id': 'location-constantinople',
        'name': 'Constantinople',
        'wikidata_id': 'Q16869',
        'location_type': 'city',
        'modern_name': 'Istanbul',
        'time_period': '330-1453 CE',
        'coordinates': {'latitude': 41.0082, 'longitude': 28.9784},
        'description': 'Capital of the Byzantine Empire (330-1453 CE), later renamed Istanbul'
    },
    {
        'location_id': 'location-byzantium',
        'name': 'Byzantium',
        'wikidata_id': 'Q17151',
        'location_type': 'city',
        'modern_name': 'Istanbul',
        'time_period': '667 BCE-330 CE',
        'coordinates': {'latitude': 41.0082, 'longitude': 28.9784},
        'description': 'Ancient Greek city, predecessor to Constantinople'
    },
    {
        'location_id': 'location-istanbul',
        'name': 'Istanbul',
        'wikidata_id': 'Q406',
        'location_type': 'city',
        'modern_name': 'Istanbul',
        'time_period': '1453 CE-present',
        'coordinates': {'latitude': 41.0082, 'longitude': 28.9784},
        'description': 'Modern name for the city formerly known as Constantinople and Byzantium'
    }
]


def analyze_location_schema(driver):
    """
    Analyze current Location node schema before migration.

    Returns:
        Dictionary with schema statistics
    """
    with driver.session() as session:
        # Count total Location nodes
        result = session.run("""
            MATCH (l:Location)
            RETURN count(l) as total
        """)
        total = result.single()['total']

        # Count locations with modern_name already set
        result = session.run("""
            MATCH (l:Location)
            WHERE l.modern_name IS NOT NULL
            RETURN count(l) as has_modern_name
        """)
        has_modern_name = result.single()['has_modern_name']

        # Count locations with time_period already set
        result = session.run("""
            MATCH (l:Location)
            WHERE l.time_period IS NOT NULL
            RETURN count(l) as has_time_period
        """)
        has_time_period = result.single()['has_time_period']

        # Check if example locations already exist
        result = session.run("""
            MATCH (l:Location)
            WHERE l.wikidata_id IN ['Q16869', 'Q17151', 'Q406']
            RETURN collect(l.name) as existing_examples
        """)
        existing_examples = result.single()['existing_examples']

        return {
            'total': total,
            'has_modern_name': has_modern_name,
            'has_time_period': has_time_period,
            'existing_examples': existing_examples,
            'needs_migration': total > 0
        }


def apply_migration(driver, dry_run=False):
    """
    Apply the migration: Add modern_name and time_period properties.

    Args:
        driver: Neo4j driver instance
        dry_run: If True, show what would be changed without committing

    Returns:
        Dictionary with migration results
    """
    with driver.session() as session:
        if dry_run:
            print("\n🔍 DRY RUN MODE - No changes will be made\n")
        else:
            print("\n🚀 Starting migration...\n")

        # Step 1: Create example historical locations
        created_count = 0
        updated_count = 0

        for loc in HISTORICAL_LOCATIONS:
            if dry_run:
                # Check if location exists
                result = session.run("""
                    MATCH (l:Location {wikidata_id: $wikidata_id})
                    RETURN l.name as name
                """, wikidata_id=loc['wikidata_id'])
                existing = result.single()

                if existing:
                    print(f"  Would update: {loc['name']} (already exists)")
                else:
                    print(f"  Would create: {loc['name']} ({loc['time_period']})")
            else:
                # Use MERGE to create or update location
                result = session.run("""
                    MERGE (l:Location {wikidata_id: $wikidata_id})
                    ON CREATE SET
                        l.location_id = $location_id,
                        l.name = $name,
                        l.location_type = $location_type,
                        l.modern_name = $modern_name,
                        l.time_period = $time_period,
                        l.coordinates = $coordinates,
                        l.description = $description
                    ON MATCH SET
                        l.modern_name = $modern_name,
                        l.time_period = $time_period
                    RETURN l.name as name,
                           CASE WHEN l.location_id = $location_id THEN 'created' ELSE 'updated' END as action
                """, **loc)

                record = result.single()
                if record['action'] == 'created':
                    created_count += 1
                    print(f"  ✅ Created: {record['name']}")
                else:
                    updated_count += 1
                    print(f"  ✅ Updated: {record['name']}")

        if not dry_run:
            print(f"\nCompleted: {created_count} locations created, {updated_count} updated")

        # Step 2: Verify schema changes
        if not dry_run:
            result = session.run("""
                MATCH (l:Location)
                WHERE l.modern_name IS NOT NULL
                RETURN count(l) as with_modern_name
            """)
            with_modern_name = result.single()['with_modern_name']

            result = session.run("""
                MATCH (l:Location)
                WHERE l.time_period IS NOT NULL
                RETURN count(l) as with_time_period
            """)
            with_time_period = result.single()['with_time_period']

            print(f"\nValidation:")
            print(f"  • Locations with modern_name: {with_modern_name}")
            print(f"  • Locations with time_period: {with_time_period}")

        return {
            'success': True,
            'created': created_count if not dry_run else 0,
            'updated': updated_count if not dry_run else 0
        }


def rollback_migration(driver):
    """
    Rollback the migration: Remove modern_name and time_period properties.

    Args:
        driver: Neo4j driver instance

    Returns:
        Dictionary with rollback results
    """
    with driver.session() as session:
        print("\n⏪ Rolling back migration...\n")

        # Step 1: Remove properties from all Location nodes
        result = session.run("""
            MATCH (l:Location)
            WHERE l.modern_name IS NOT NULL OR l.time_period IS NOT NULL
            REMOVE l.modern_name, l.time_period
            RETURN count(l) as updated
        """)
        updated_count = result.single()['updated']
        print(f"✅ Removed modern_name and time_period from {updated_count} locations")

        # Step 2: Optionally delete example locations (only if they have no relationships)
        result = session.run("""
            MATCH (l:Location)
            WHERE l.wikidata_id IN ['Q16869', 'Q17151', 'Q406']
              AND NOT (l)-[]-()
            DELETE l
            RETURN count(l) as deleted
        """)
        deleted_count = result.single()['deleted']

        if deleted_count > 0:
            print(f"✅ Deleted {deleted_count} example locations (no relationships)")
        else:
            print(f"ℹ️  Kept example locations (have relationships or don't exist)")

        # Step 3: Verify rollback
        result = session.run("""
            MATCH (l:Location)
            WHERE l.modern_name IS NOT NULL OR l.time_period IS NOT NULL
            RETURN count(l) as remaining
        """)
        remaining = result.single()['remaining']

        if remaining == 0:
            print("\n✅ Rollback complete - all properties removed")
        else:
            print(f"\n⚠️  Warning: {remaining} locations still have properties")

        return {
            'success': remaining == 0,
            'updated': updated_count,
            'deleted': deleted_count
        }


def main():
    """Main migration execution"""
    dry_run = '--dry-run' in sys.argv
    rollback = '--rollback' in sys.argv

    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Error: Missing Neo4j credentials in .env file")
        print("   Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    print("=" * 70)
    print("Location Historical Names Migration (CHR-16 Task 1.1)")
    print("=" * 70)

    try:
        # Connect to Neo4j
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )

        # Verify connection
        driver.verify_connectivity()
        print("✅ Connected to Neo4j")

        if rollback:
            # Execute rollback
            result = rollback_migration(driver)

            if result['success']:
                print("\n" + "=" * 70)
                print("✅ Rollback completed successfully!")
                print("=" * 70)
            else:
                print("\n" + "=" * 70)
                print("⚠️  Rollback completed with warnings")
                print("=" * 70)
        else:
            # Analyze current state
            print("\n📊 Analyzing current schema...\n")
            stats = analyze_location_schema(driver)

            print(f"Total Location nodes: {stats['total']}")
            print(f"  • With modern_name: {stats['has_modern_name']}")
            print(f"  • With time_period: {stats['has_time_period']}")

            if stats['existing_examples']:
                print(f"  • Existing examples: {', '.join(stats['existing_examples'])}")

            # Confirm migration
            if not dry_run and stats['needs_migration']:
                print("\n⚠️  About to add historical name properties to Location nodes")
                response = input("Continue? (yes/no): ")
                if response.lower() != 'yes':
                    print("Migration cancelled")
                    driver.close()
                    return

            # Execute migration
            result = apply_migration(driver, dry_run=dry_run)

            if result['success']:
                print("\n" + "=" * 70)
                print("✅ Migration completed successfully!")
                print("=" * 70)

        driver.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
