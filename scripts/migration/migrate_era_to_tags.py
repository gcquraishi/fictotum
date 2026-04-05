#!/usr/bin/env python3
"""
Migration Script: Era Property → Era Tag Relationships

Migrates MediaWork era from single property to [:TAGGED_WITH] relationship model
for supporting multiple era tags per work.

Schema Changes:
- Create [:TAGGED_WITH] relationships: MediaWork -[:TAGGED_WITH]-> Era
- Relationship properties: {confidence: FLOAT, source: STRING, added_by: STRING, added_at: DATETIME}
- Source values: "wikidata" | "ai_inferred" | "user_added"
- Preserve existing era property during dual-write period

Migration Strategy:
1. Find all MediaWork nodes with era property but no TAGGED_WITH relationships
2. Create Era nodes if they don't exist (based on era property value)
3. Create TAGGED_WITH relationships with appropriate metadata
4. Mark source as "ai_inferred" for existing data (legacy migration)

Usage:
    python3 migrate_era_to_tags.py [--dry-run] [--rollback]

Options:
    --dry-run    Show what would be migrated without making changes
    --rollback   Revert migration (delete TAGGED_WITH relationships)
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


def analyze_era_schema(driver):
    """
    Analyze current era schema before migration.

    Returns:
        Dictionary with migration statistics
    """
    with driver.session() as session:
        # Count MediaWork nodes with era property
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.era IS NOT NULL
            RETURN count(m) as has_era_property
        """)
        has_era_property = result.single()['has_era_property']

        # Count MediaWork nodes with TAGGED_WITH relationships
        result = session.run("""
            MATCH (m:MediaWork)-[r:TAGGED_WITH]->(:Era)
            RETURN count(DISTINCT m) as has_era_relationships
        """)
        has_era_relationships = result.single()['has_era_relationships']

        # Count MediaWork nodes needing migration
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.era IS NOT NULL
              AND NOT (m)-[:TAGGED_WITH]->(:Era)
            RETURN count(m) as needs_migration
        """)
        needs_migration = result.single()['needs_migration']

        # Get era value distribution
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.era IS NOT NULL
            RETURN m.era as era, count(*) as count
            ORDER BY count DESC
        """)
        era_distribution = {record['era']: record['count']
                           for record in result}

        # Count existing Era nodes
        result = session.run("""
            MATCH (e:Era)
            RETURN count(e) as total_era_nodes
        """)
        total_era_nodes = result.single()['total_era_nodes']

        return {
            'has_era_property': has_era_property,
            'has_era_relationships': has_era_relationships,
            'needs_migration': needs_migration,
            'era_distribution': era_distribution,
            'total_era_nodes': total_era_nodes
        }


def create_era_node_from_string(session, era_name, migration_agent="migration_script"):
    """
    Create an Era node from a string value (used during migration).
    This creates a basic Era node - admin should update with proper dates later.

    Args:
        session: Neo4j session
        era_name: Name of the era
        migration_agent: Who created this node

    Returns:
        era_id of created/existing Era node
    """
    # Generate era_id from name (lowercase, hyphenated)
    era_id = f"era-{era_name.lower().replace(' ', '-').replace('_', '-')}"

    # Check if Era node already exists
    result = session.run("""
        MATCH (e:Era {era_id: $era_id})
        RETURN e.era_id as era_id
    """, era_id=era_id)

    existing = result.single()

    if existing:
        return existing['era_id']

    # Create Era node with placeholder dates (to be updated by admin)
    # Using 0 as placeholder for start/end year (indicates needs manual update)
    session.run("""
        CREATE (e:Era {
            era_id: $era_id,
            name: $name,
            start_year: 0,
            end_year: 0,
            era_type: 'historical_period',
            description: 'Migrated from legacy era property - needs date verification'
        })
    """, era_id=era_id, name=era_name)

    return era_id


def apply_migration(driver, dry_run=False):
    """
    Execute migration from era property to TAGGED_WITH relationships.

    Args:
        driver: Neo4j driver instance
        dry_run: If True, show what would be changed without committing

    Returns:
        Dictionary with migration results
    """
    migration_agent = "Claude Code (Sonnet 4.5)"
    migration_timestamp = datetime.now()

    with driver.session() as session:
        if dry_run:
            print("\n🔍 DRY RUN MODE - No changes will be made\n")
        else:
            print("\n🚀 Starting migration...\n")

        # Step 1: Get all MediaWork nodes needing migration
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.era IS NOT NULL
              AND NOT (m)-[:TAGGED_WITH]->(:Era)
            RETURN m.media_id as media_id,
                   m.title as title,
                   m.era as era
            ORDER BY m.era
        """)

        works_to_migrate = list(result)

        if dry_run:
            print(f"Found {len(works_to_migrate)} MediaWork nodes to migrate:\n")
            # Group by era for dry-run display
            era_groups = {}
            for work in works_to_migrate:
                era = work['era']
                if era not in era_groups:
                    era_groups[era] = []
                era_groups[era].append(work['title'])

            for era, titles in era_groups.items():
                print(f"  Era: {era} ({len(titles)} works)")
                for title in titles[:3]:  # Show first 3 examples
                    print(f"    • {title}")
                if len(titles) > 3:
                    print(f"    ... and {len(titles) - 3} more")
                print()

            return {
                'success': True,
                'would_migrate': len(works_to_migrate)
            }

        # Step 2: Create Era nodes and TAGGED_WITH relationships
        created_eras = set()
        created_relationships = 0

        for work in works_to_migrate:
            era_name = work['era']
            media_id = work['media_id']

            # Create Era node if needed
            era_id = create_era_node_from_string(session, era_name, migration_agent)
            if era_id not in created_eras:
                print(f"  ✅ Created Era node: {era_name} ({era_id})")
                created_eras.add(era_id)

            # Create TAGGED_WITH relationship
            session.run("""
                MATCH (m:MediaWork {media_id: $media_id})
                MATCH (e:Era {era_id: $era_id})
                MERGE (m)-[r:TAGGED_WITH]->(e)
                ON CREATE SET
                    r.confidence = 0.7,
                    r.source = 'ai_inferred',
                    r.added_by = $added_by,
                    r.added_at = datetime($timestamp)
            """, media_id=media_id, era_id=era_id,
                 added_by=migration_agent, timestamp=migration_timestamp.isoformat())

            created_relationships += 1

        print(f"\n✅ Created {len(created_eras)} Era nodes")
        print(f"✅ Created {created_relationships} TAGGED_WITH relationships")

        # Step 3: Validation check
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.era IS NOT NULL
              AND NOT (m)-[:TAGGED_WITH]->(:Era)
            RETURN count(m) as still_needs_migration
        """)
        still_needs = result.single()['still_needs_migration']

        if still_needs > 0:
            print(f"\n⚠️  Warning: {still_needs} works still need migration")
        else:
            print(f"\n✅ All MediaWork nodes with era property now have TAGGED_WITH relationships")

        # Step 4: Show Era nodes needing manual date updates
        result = session.run("""
            MATCH (e:Era)
            WHERE e.start_year = 0 OR e.end_year = 0
            RETURN count(e) as needs_dates
        """)
        needs_dates = result.single()['needs_dates']

        if needs_dates > 0:
            print(f"\nℹ️  Note: {needs_dates} Era nodes have placeholder dates (0) and need manual updates")

        return {
            'success': still_needs == 0,
            'created_eras': len(created_eras),
            'created_relationships': created_relationships,
            'still_needs_migration': still_needs
        }


def rollback_migration(driver):
    """
    Rollback the migration: Delete TAGGED_WITH relationships created by migration.

    Args:
        driver: Neo4j driver instance

    Returns:
        Dictionary with rollback results
    """
    with driver.session() as session:
        print("\n⏪ Rolling back migration...\n")

        # Step 1: Delete TAGGED_WITH relationships created by migration
        # (those with source='ai_inferred' and added_by='migration_script' or Claude)
        result = session.run("""
            MATCH (m:MediaWork)-[r:TAGGED_WITH]->(e:Era)
            WHERE r.source = 'ai_inferred'
              AND (r.added_by CONTAINS 'migration' OR r.added_by CONTAINS 'Claude')
            DELETE r
            RETURN count(r) as deleted_relationships
        """)
        deleted_rels = result.single()['deleted_relationships']
        print(f"✅ Deleted {deleted_rels} TAGGED_WITH relationships")

        # Step 2: Delete Era nodes with no relationships
        # (only delete those created during migration with placeholder dates)
        result = session.run("""
            MATCH (e:Era)
            WHERE NOT (e)-[]-()
              AND (e.start_year = 0 OR e.end_year = 0)
              AND e.description CONTAINS 'Migrated from legacy'
            DELETE e
            RETURN count(e) as deleted_eras
        """)
        deleted_eras = result.single()['deleted_eras']
        print(f"✅ Deleted {deleted_eras} orphaned Era nodes")

        # Step 3: Verify rollback
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.era IS NOT NULL
              AND NOT (m)-[:TAGGED_WITH]->(:Era)
            RETURN count(m) as back_to_property_only
        """)
        back_to_property = result.single()['back_to_property_only']

        print(f"\n✅ Rollback complete")
        print(f"   {back_to_property} MediaWork nodes back to era property only")

        return {
            'success': True,
            'deleted_relationships': deleted_rels,
            'deleted_eras': deleted_eras
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
    print("Era Property → Era Tags Migration (CHR-16 Task 1.2)")
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
            # Analyze current state
            print("\n📊 Analyzing current database state...\n")
            stats = analyze_era_schema(driver)

            print(f"MediaWork nodes with era property: {stats['has_era_property']}")
            print(f"MediaWork nodes with TAGGED_WITH relationships: {stats['has_era_relationships']}")
            print(f"Need migration: {stats['needs_migration']}")
            print(f"Existing Era nodes: {stats['total_era_nodes']}")

            if stats['era_distribution']:
                print(f"\nCurrent era distribution:")
                for era, count in sorted(stats['era_distribution'].items(),
                                        key=lambda x: x[1], reverse=True)[:10]:
                    print(f"  • {era}: {count}")

            if stats['needs_migration'] == 0:
                print("\n✅ No migration needed - all works already have TAGGED_WITH relationships")
                driver.close()
                return

            # Confirm migration
            if not dry_run:
                print(f"\n⚠️  About to migrate {stats['needs_migration']} MediaWork nodes")
                print("   This will create Era nodes and TAGGED_WITH relationships")
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
            else:
                print("\n" + "=" * 70)
                print(f"⚠️  Migration completed with warnings")
                print(f"   {result.get('still_needs_migration', 0)} works still need migration")
                print("=" * 70)

        driver.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
