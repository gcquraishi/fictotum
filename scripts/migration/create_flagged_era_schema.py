#!/usr/bin/env python3
"""
Migration Script: Create FlaggedEra Schema

Creates the FlaggedEra node type and constraint for admin review queue
of era tag conflicts detected during ingestion.

Schema Changes:
- Create FlaggedEra node type
- Properties:
  - flag_id: STRING (UUID, unique identifier)
  - work_id: STRING (media_id of the MediaWork)
  - suggested_tags: [STRING] (AI-suggested era tags from Wikidata/inference)
  - user_selected_tags: [STRING] (tags selected by user during ingestion)
  - override_type: STRING (type of conflict detected)
  - confidence_delta: FLOAT (difference in confidence scores)
  - status: STRING ("pending_review" | "ai_accepted" | "user_accepted" | "custom_resolution")
  - flagged_at: DATETIME (when flag was created)
  - resolved_by: STRING (admin/agent who resolved)
  - resolved_at: DATETIME (when resolution occurred)
- Create uniqueness constraint on flag_id
- Override types: "removed_high_confidence" | "added_anachronistic" | "added_custom"

Usage:
    python3 create_flagged_era_schema.py [--dry-run] [--rollback]

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
    Check if FlaggedEra schema already exists.

    Returns:
        Dictionary with schema status
    """
    with driver.session() as session:
        # Check for constraint
        result = session.run("""
            SHOW CONSTRAINTS
            YIELD name, labelsOrTypes, properties
            WHERE 'FlaggedEra' IN labelsOrTypes
              AND 'flag_id' IN properties
            RETURN count(*) as constraint_exists
        """)
        constraint_exists = result.single()['constraint_exists'] > 0

        # Check for existing FlaggedEra nodes
        result = session.run("""
            MATCH (fe:FlaggedEra)
            RETURN count(fe) as node_count,
                   count(CASE WHEN fe.status = 'pending_review' THEN 1 END) as pending,
                   count(CASE WHEN fe.status = 'ai_accepted' THEN 1 END) as ai_accepted,
                   count(CASE WHEN fe.status = 'user_accepted' THEN 1 END) as user_accepted,
                   count(CASE WHEN fe.status = 'custom_resolution' THEN 1 END) as custom
        """)
        node_stats = result.single()

        # Check override type distribution
        result = session.run("""
            MATCH (fe:FlaggedEra)
            WHERE fe.override_type IS NOT NULL
            RETURN fe.override_type as type, count(*) as count
            ORDER BY count DESC
        """)
        override_distribution = {record['type']: record['count']
                                for record in result}

        return {
            'constraint_exists': constraint_exists,
            'total_nodes': node_stats['node_count'],
            'pending': node_stats['pending'],
            'ai_accepted': node_stats['ai_accepted'],
            'user_accepted': node_stats['user_accepted'],
            'custom': node_stats['custom'],
            'override_distribution': override_distribution,
            'already_migrated': constraint_exists and node_stats['node_count'] >= 0
        }


def apply_migration(driver, dry_run=False):
    """
    Apply the migration: Create FlaggedEra schema and constraint.

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
            print("  • Uniqueness constraint on FlaggedEra.flag_id")
            print("  • Index on FlaggedEra.status")
            print("  • Index on FlaggedEra.override_type")
            print("  • Example FlaggedEra node (test data)")
            return {'success': True}
        else:
            print("\n🚀 Starting migration...\n")

        # Step 1: Create uniqueness constraint on flag_id
        try:
            session.run("""
                CREATE CONSTRAINT flagged_era_unique IF NOT EXISTS
                FOR (fe:FlaggedEra) REQUIRE fe.flag_id IS UNIQUE
            """)
            print("✅ Created uniqueness constraint on FlaggedEra.flag_id")
        except Exception as e:
            print(f"⚠️  Constraint may already exist: {e}")

        # Step 2: Create index on status for efficient filtering
        try:
            session.run("""
                CREATE INDEX flagged_era_status_idx IF NOT EXISTS
                FOR (fe:FlaggedEra) ON (fe.status)
            """)
            print("✅ Created index on FlaggedEra.status")
        except Exception as e:
            print(f"⚠️  Index may already exist: {e}")

        # Step 3: Create index on override_type for analytics
        try:
            session.run("""
                CREATE INDEX flagged_era_override_type_idx IF NOT EXISTS
                FOR (fe:FlaggedEra) ON (fe.override_type)
            """)
            print("✅ Created index on FlaggedEra.override_type")
        except Exception as e:
            print(f"⚠️  Index may already exist: {e}")

        # Step 4: Create example FlaggedEra nodes (for testing/demo)
        # Only create if there are actual MediaWork nodes in the database
        result = session.run("""
            MATCH (m:MediaWork)
            RETURN count(m) as media_count
        """)
        media_count = result.single()['media_count']

        created_examples = 0

        if media_count >= 1:
            # Example 1: User removed high-confidence AI suggestion
            test_flag_id_1 = str(uuid.uuid4())
            test_timestamp = datetime.now()

            session.run("""
                MERGE (fe:FlaggedEra {flag_id: $flag_id})
                ON CREATE SET
                    fe.work_id = 'media-test-1',
                    fe.suggested_tags = ['Renaissance', 'Early Modern Period'],
                    fe.user_selected_tags = ['Renaissance'],
                    fe.override_type = 'removed_high_confidence',
                    fe.confidence_delta = 0.45,
                    fe.status = 'pending_review',
                    fe.flagged_at = datetime($timestamp),
                    fe.resolved_by = null,
                    fe.resolved_at = null
            """, flag_id=test_flag_id_1, timestamp=test_timestamp.isoformat())

            created_examples += 1

            # Example 2: User added anachronistic tag
            test_flag_id_2 = str(uuid.uuid4())

            session.run("""
                MERGE (fe:FlaggedEra {flag_id: $flag_id})
                ON CREATE SET
                    fe.work_id = 'media-test-2',
                    fe.suggested_tags = ['Ancient Rome'],
                    fe.user_selected_tags = ['Ancient Rome', 'Victorian Era'],
                    fe.override_type = 'added_anachronistic',
                    fe.confidence_delta = 0.95,
                    fe.status = 'pending_review',
                    fe.flagged_at = datetime($timestamp),
                    fe.resolved_by = null,
                    fe.resolved_at = null
            """, flag_id=test_flag_id_2, timestamp=test_timestamp.isoformat())

            created_examples += 1

            # Example 3: User added completely custom tag
            test_flag_id_3 = str(uuid.uuid4())

            session.run("""
                MERGE (fe:FlaggedEra {flag_id: $flag_id})
                ON CREATE SET
                    fe.work_id = 'media-test-3',
                    fe.suggested_tags = ['Medieval Period'],
                    fe.user_selected_tags = ['Medieval Period', 'Arthurian Legend'],
                    fe.override_type = 'added_custom',
                    fe.confidence_delta = 0.0,
                    fe.status = 'pending_review',
                    fe.flagged_at = datetime($timestamp),
                    fe.resolved_by = null,
                    fe.resolved_at = null
            """, flag_id=test_flag_id_3, timestamp=test_timestamp.isoformat())

            created_examples += 1

            print(f"✅ Created {created_examples} example FlaggedEra nodes")
        else:
            print("ℹ️  Skipped example node creation (insufficient MediaWork nodes)")

        # Step 5: Verify schema creation
        result = session.run("""
            MATCH (fe:FlaggedEra)
            RETURN count(fe) as total,
                   count(CASE WHEN fe.status = 'pending_review' THEN 1 END) as pending
        """)
        stats = result.single()

        print(f"\n📊 Validation:")
        print(f"  • Total FlaggedEra nodes: {stats['total']}")
        print(f"  • Pending review: {stats['pending']}")

        return {
            'success': True,
            'total_nodes': stats['total'],
            'created_examples': created_examples
        }


def rollback_migration(driver):
    """
    Rollback the migration: Remove FlaggedEra nodes and constraints.

    Args:
        driver: Neo4j driver instance

    Returns:
        Dictionary with rollback results
    """
    with driver.session() as session:
        print("\n⏪ Rolling back migration...\n")

        # Step 1: Delete all FlaggedEra nodes
        result = session.run("""
            MATCH (fe:FlaggedEra)
            DELETE fe
            RETURN count(fe) as deleted
        """)
        deleted_nodes = result.single()['deleted']
        print(f"✅ Deleted {deleted_nodes} FlaggedEra nodes")

        # Step 2: Drop indexes
        try:
            session.run("""
                DROP INDEX flagged_era_status_idx IF EXISTS
            """)
            print("✅ Dropped index on FlaggedEra.status")
        except Exception as e:
            print(f"⚠️  Could not drop status index: {e}")

        try:
            session.run("""
                DROP INDEX flagged_era_override_type_idx IF EXISTS
            """)
            print("✅ Dropped index on FlaggedEra.override_type")
        except Exception as e:
            print(f"⚠️  Could not drop override_type index: {e}")

        # Step 3: Drop constraint
        try:
            session.run("""
                DROP CONSTRAINT flagged_era_unique IF EXISTS
            """)
            print("✅ Dropped uniqueness constraint on FlaggedEra.flag_id")
        except Exception as e:
            print(f"⚠️  Could not drop constraint: {e}")

        # Step 4: Verify rollback
        result = session.run("""
            MATCH (fe:FlaggedEra)
            RETURN count(fe) as remaining
        """)
        remaining = result.single()['remaining']

        if remaining == 0:
            print("\n✅ Rollback complete - all FlaggedEra nodes removed")
        else:
            print(f"\n⚠️  Warning: {remaining} FlaggedEra nodes still exist")

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
    print("Create FlaggedEra Schema (CHR-16 Task 1.9)")
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

            print(f"FlaggedEra schema status:")
            print(f"  • Constraint exists: {stats['constraint_exists']}")
            print(f"  • Total nodes: {stats['total_nodes']}")
            if stats['total_nodes'] > 0:
                print(f"    - Pending review: {stats['pending']}")
                print(f"    - AI accepted: {stats['ai_accepted']}")
                print(f"    - User accepted: {stats['user_accepted']}")
                print(f"    - Custom resolution: {stats['custom']}")

            if stats['override_distribution']:
                print(f"\n  Override type distribution:")
                for override_type, count in stats['override_distribution'].items():
                    print(f"    • {override_type}: {count}")

            if stats['already_migrated']:
                print("\nℹ️  Schema appears to already exist")

            # Confirm migration
            if not dry_run:
                print("\n⚠️  About to create FlaggedEra schema")
                print("   This will add constraints, indexes, and example nodes")
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
                print("  • FlaggedEra schema is now ready for use")
                print("  • Ingestion pipeline can create flags when users override AI suggestions")
                print("  • Admin UI can query status='pending_review' for review queue")
                print("  • Override types help prioritize which conflicts need immediate attention")

        driver.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
