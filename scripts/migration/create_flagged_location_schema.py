#!/usr/bin/env python3
"""
Migration Script: Create FlaggedLocation Schema

Creates the FlaggedLocation node type and constraint for admin review queue
of potential duplicate locations detected during ingestion.

Schema Changes:
- Create FlaggedLocation node type
- Properties:
  - flag_id: STRING (UUID, unique identifier)
  - candidate1_id: STRING (location_id of first candidate)
  - candidate2_id: STRING (location_id of second candidate)
  - similarity: FLOAT (0.0-1.0, similarity score)
  - q_id_match: BOOLEAN (whether wikidata_ids match)
  - coord_match: BOOLEAN (whether coordinates are similar)
  - status: STRING ("pending_review" | "merged" | "kept_separate")
  - flagged_at: DATETIME (when flag was created)
  - resolved_by: STRING (admin/agent who resolved)
  - resolved_at: DATETIME (when resolution occurred)
- Create uniqueness constraint on flag_id

Usage:
    python3 create_flagged_location_schema.py [--dry-run] [--rollback]

Options:
    --dry-run    Show what would be changed without committing
    --rollback   Revert migration (drop constraint, delete nodes)
"""

import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv
from datetime import datetime
import uuid

# Load environment variables from .env file
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')


def check_existing_schema(driver):
    """
    Check if FlaggedLocation schema already exists.

    Returns:
        Dictionary with schema status
    """
    with driver.session() as session:
        # Check for constraint
        result = session.run("""
            SHOW CONSTRAINTS
            YIELD name, labelsOrTypes, properties
            WHERE 'FlaggedLocation' IN labelsOrTypes
              AND 'flag_id' IN properties
            RETURN count(*) as constraint_exists
        """)
        constraint_exists = result.single()['constraint_exists'] > 0

        # Check for existing FlaggedLocation nodes
        result = session.run("""
            MATCH (fl:FlaggedLocation)
            RETURN count(fl) as node_count,
                   count(CASE WHEN fl.status = 'pending_review' THEN 1 END) as pending,
                   count(CASE WHEN fl.status = 'merged' THEN 1 END) as merged,
                   count(CASE WHEN fl.status = 'kept_separate' THEN 1 END) as kept_separate
        """)
        node_stats = result.single()

        return {
            'constraint_exists': constraint_exists,
            'total_nodes': node_stats['node_count'],
            'pending': node_stats['pending'],
            'merged': node_stats['merged'],
            'kept_separate': node_stats['kept_separate'],
            'already_migrated': constraint_exists and node_stats['node_count'] >= 0
        }


def apply_migration(driver, dry_run=False):
    """
    Apply the migration: Create FlaggedLocation schema and constraint.

    Args:
        driver: Neo4j driver instance
        dry_run: If True, show what would be changed without committing

    Returns:
        Dictionary with migration results
    """
    with driver.session() as session:
        if dry_run:
            print("\n🔍 DRY RUN MODE - No changes will be made\n")
            print("Would create:")
            print("  • Uniqueness constraint on FlaggedLocation.flag_id")
            print("  • Index on FlaggedLocation.status")
            print("  • Example FlaggedLocation node (test data)")
            return {'success': True}
        else:
            print("\n🚀 Starting migration...\n")

        # Step 1: Create uniqueness constraint on flag_id
        try:
            session.run("""
                CREATE CONSTRAINT flagged_location_unique IF NOT EXISTS
                FOR (fl:FlaggedLocation) REQUIRE fl.flag_id IS UNIQUE
            """)
            print("✅ Created uniqueness constraint on FlaggedLocation.flag_id")
        except Exception as e:
            print(f"⚠️  Constraint may already exist: {e}")

        # Step 2: Create index on status for efficient filtering
        try:
            session.run("""
                CREATE INDEX flagged_location_status_idx IF NOT EXISTS
                FOR (fl:FlaggedLocation) ON (fl.status)
            """)
            print("✅ Created index on FlaggedLocation.status")
        except Exception as e:
            print(f"⚠️  Index may already exist: {e}")

        # Step 3: Create example FlaggedLocation node (for testing/demo)
        # Only create if there are actual Location nodes in the database
        result = session.run("""
            MATCH (l:Location)
            RETURN count(l) as location_count
        """)
        location_count = result.single()['location_count']

        if location_count >= 2:
            # Create a test flagged location
            test_flag_id = str(uuid.uuid4())
            test_timestamp = datetime.now()

            session.run("""
                MERGE (fl:FlaggedLocation {flag_id: $flag_id})
                ON CREATE SET
                    fl.candidate1_id = 'location-test-1',
                    fl.candidate2_id = 'location-test-2',
                    fl.similarity = 0.85,
                    fl.q_id_match = false,
                    fl.coord_match = true,
                    fl.status = 'pending_review',
                    fl.flagged_at = datetime($timestamp),
                    fl.resolved_by = null,
                    fl.resolved_at = null
            """, flag_id=test_flag_id, timestamp=test_timestamp.isoformat())

            print(f"✅ Created example FlaggedLocation node (flag_id: {test_flag_id[:8]}...)")
        else:
            print("ℹ️  Skipped example node creation (insufficient Location nodes)")

        # Step 4: Verify schema creation
        result = session.run("""
            MATCH (fl:FlaggedLocation)
            RETURN count(fl) as total
        """)
        total_nodes = result.single()['total']

        print(f"\n📊 Validation:")
        print(f"  • Total FlaggedLocation nodes: {total_nodes}")

        return {
            'success': True,
            'total_nodes': total_nodes
        }


def rollback_migration(driver):
    """
    Rollback the migration: Remove FlaggedLocation nodes and constraints.

    Args:
        driver: Neo4j driver instance

    Returns:
        Dictionary with rollback results
    """
    with driver.session() as session:
        print("\n⏪ Rolling back migration...\n")

        # Step 1: Delete all FlaggedLocation nodes
        result = session.run("""
            MATCH (fl:FlaggedLocation)
            DELETE fl
            RETURN count(fl) as deleted
        """)
        deleted_nodes = result.single()['deleted']
        print(f"✅ Deleted {deleted_nodes} FlaggedLocation nodes")

        # Step 2: Drop index
        try:
            session.run("""
                DROP INDEX flagged_location_status_idx IF EXISTS
            """)
            print("✅ Dropped index on FlaggedLocation.status")
        except Exception as e:
            print(f"⚠️  Could not drop index: {e}")

        # Step 3: Drop constraint
        try:
            session.run("""
                DROP CONSTRAINT flagged_location_unique IF EXISTS
            """)
            print("✅ Dropped uniqueness constraint on FlaggedLocation.flag_id")
        except Exception as e:
            print(f"⚠️  Could not drop constraint: {e}")

        # Step 4: Verify rollback
        result = session.run("""
            MATCH (fl:FlaggedLocation)
            RETURN count(fl) as remaining
        """)
        remaining = result.single()['remaining']

        if remaining == 0:
            print("\n✅ Rollback complete - all FlaggedLocation nodes removed")
        else:
            print(f"\n⚠️  Warning: {remaining} FlaggedLocation nodes still exist")

        return {
            'success': remaining == 0,
            'deleted_nodes': deleted_nodes
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
    print("Create FlaggedLocation Schema (CHR-16 Task 1.8)")
    print("=" * 70)

    try:
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
            stats = check_existing_schema(driver)

            print(f"FlaggedLocation schema status:")
            print(f"  • Constraint exists: {stats['constraint_exists']}")
            print(f"  • Total nodes: {stats['total_nodes']}")
            if stats['total_nodes'] > 0:
                print(f"    - Pending review: {stats['pending']}")
                print(f"    - Merged: {stats['merged']}")
                print(f"    - Kept separate: {stats['kept_separate']}")

            if stats['already_migrated']:
                print("\nℹ️  Schema appears to already exist")

            # Confirm migration
            if not dry_run:
                print("\n⚠️  About to create FlaggedLocation schema")
                print("   This will add constraints and indexes")
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
                print("\nNext steps:")
                print("  • FlaggedLocation schema is now ready for use")
                print("  • Ingestion pipeline can create flags during location deduplication")
                print("  • Admin UI can query status='pending_review' for review queue")

        driver.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
