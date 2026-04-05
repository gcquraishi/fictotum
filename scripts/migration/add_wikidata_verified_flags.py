#!/usr/bin/env python3
"""
Migration Script: Add Wikidata Verification Flags

Adds data quality flags to HistoricalFigure and MediaWork nodes to track
whether entities have been verified against Wikidata and their data sources.

Schema Changes:
- HistoricalFigure: Add wikidata_verified: BOOLEAN, data_source: STRING
- MediaWork: Add wikidata_verified: BOOLEAN, data_source: STRING,
              setting_year: INT, setting_year_end: INT

Migration Strategy:
1. Set wikidata_verified: true where wikidata_id exists
2. Set data_source based on wikidata_id presence:
   - "wikidata" if wikidata_id exists
   - "user_input" if no wikidata_id
3. Initialize setting_year fields to null (to be populated later)

Usage:
    python3 add_wikidata_verified_flags.py [--dry-run] [--rollback]

Options:
    --dry-run    Show what would be changed without committing
    --rollback   Revert migration (remove added properties)
"""

import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')


def analyze_verification_status(driver):
    """
    Analyze current verification flag status before migration.

    Returns:
        Dictionary with analysis statistics
    """
    with driver.session() as session:
        # Analyze HistoricalFigure nodes
        result = session.run("""
            MATCH (f:HistoricalFigure)
            RETURN
                count(f) as total_figures,
                count(CASE WHEN f.wikidata_id IS NOT NULL THEN 1 END) as with_wikidata_id,
                count(CASE WHEN f.wikidata_verified IS NOT NULL THEN 1 END) as already_has_flag,
                count(CASE WHEN f.data_source IS NOT NULL THEN 1 END) as already_has_source
        """)
        figure_stats = result.single()

        # Analyze MediaWork nodes
        result = session.run("""
            MATCH (m:MediaWork)
            RETURN
                count(m) as total_media,
                count(CASE WHEN m.wikidata_id IS NOT NULL THEN 1 END) as with_wikidata_id,
                count(CASE WHEN m.wikidata_verified IS NOT NULL THEN 1 END) as already_has_flag,
                count(CASE WHEN m.data_source IS NOT NULL THEN 1 END) as already_has_source,
                count(CASE WHEN m.setting_year IS NOT NULL THEN 1 END) as has_setting_year
        """)
        media_stats = result.single()

        return {
            'figures': {
                'total': figure_stats['total_figures'],
                'with_wikidata_id': figure_stats['with_wikidata_id'],
                'already_has_flag': figure_stats['already_has_flag'],
                'already_has_source': figure_stats['already_has_source'],
                'needs_migration': figure_stats['total_figures'] - figure_stats['already_has_flag']
            },
            'media': {
                'total': media_stats['total_media'],
                'with_wikidata_id': media_stats['with_wikidata_id'],
                'already_has_flag': media_stats['already_has_flag'],
                'already_has_source': media_stats['already_has_source'],
                'has_setting_year': media_stats['has_setting_year'],
                'needs_migration': media_stats['total_media'] - media_stats['already_has_flag']
            }
        }


def apply_migration(driver, dry_run=False):
    """
    Apply the migration: Add wikidata_verified and data_source properties.

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

        # Step 1: Update HistoricalFigure nodes with wikidata_id
        if dry_run:
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.wikidata_id IS NOT NULL
                  AND f.wikidata_verified IS NULL
                RETURN count(f) as would_update
            """)
            would_update = result.single()['would_update']
            print(f"Would set wikidata_verified=true on {would_update} HistoricalFigure nodes")
        else:
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.wikidata_id IS NOT NULL
                  AND f.wikidata_verified IS NULL
                SET f.wikidata_verified = true,
                    f.data_source = 'wikidata'
                RETURN count(f) as updated
            """)
            updated = result.single()['updated']
            print(f"✅ Set wikidata_verified=true on {updated} HistoricalFigure nodes")

        # Step 2: Update HistoricalFigure nodes without wikidata_id
        if dry_run:
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.wikidata_id IS NULL
                  AND f.wikidata_verified IS NULL
                RETURN count(f) as would_update
            """)
            would_update = result.single()['would_update']
            print(f"Would set wikidata_verified=false on {would_update} HistoricalFigure nodes")
        else:
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.wikidata_id IS NULL
                  AND f.wikidata_verified IS NULL
                SET f.wikidata_verified = false,
                    f.data_source = 'user_input'
                RETURN count(f) as updated
            """)
            updated = result.single()['updated']
            print(f"✅ Set wikidata_verified=false on {updated} HistoricalFigure nodes")

        # Step 3: Update MediaWork nodes with wikidata_id
        if dry_run:
            result = session.run("""
                MATCH (m:MediaWork)
                WHERE m.wikidata_id IS NOT NULL
                  AND m.wikidata_verified IS NULL
                RETURN count(m) as would_update
            """)
            would_update = result.single()['would_update']
            print(f"Would set wikidata_verified=true on {would_update} MediaWork nodes")
        else:
            result = session.run("""
                MATCH (m:MediaWork)
                WHERE m.wikidata_id IS NOT NULL
                  AND m.wikidata_verified IS NULL
                SET m.wikidata_verified = true,
                    m.data_source = 'wikidata'
                RETURN count(m) as updated
            """)
            updated = result.single()['updated']
            print(f"✅ Set wikidata_verified=true on {updated} MediaWork nodes")

        # Step 4: Update MediaWork nodes without wikidata_id
        if dry_run:
            result = session.run("""
                MATCH (m:MediaWork)
                WHERE m.wikidata_id IS NULL
                  AND m.wikidata_verified IS NULL
                RETURN count(m) as would_update
            """)
            would_update = result.single()['would_update']
            print(f"Would set wikidata_verified=false on {would_update} MediaWork nodes")
        else:
            result = session.run("""
                MATCH (m:MediaWork)
                WHERE m.wikidata_id IS NULL
                  AND m.wikidata_verified IS NULL
                SET m.wikidata_verified = false,
                    m.data_source = 'user_input'
                RETURN count(m) as updated
            """)
            updated = result.single()['updated']
            print(f"✅ Set wikidata_verified=false on {updated} MediaWork nodes")

        # Step 5: Validation check
        if not dry_run:
            print("\n📊 Validation:")

            # Check HistoricalFigure
            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.wikidata_verified IS NULL
                RETURN count(f) as still_null
            """)
            still_null_figures = result.single()['still_null']

            if still_null_figures > 0:
                print(f"  ⚠️  Warning: {still_null_figures} HistoricalFigure nodes still have null wikidata_verified")
            else:
                print(f"  ✅ All HistoricalFigure nodes have wikidata_verified flag")

            # Check MediaWork
            result = session.run("""
                MATCH (m:MediaWork)
                WHERE m.wikidata_verified IS NULL
                RETURN count(m) as still_null
            """)
            still_null_media = result.single()['still_null']

            if still_null_media > 0:
                print(f"  ⚠️  Warning: {still_null_media} MediaWork nodes still have null wikidata_verified")
            else:
                print(f"  ✅ All MediaWork nodes have wikidata_verified flag")

            # Summary statistics
            result = session.run("""
                MATCH (f:HistoricalFigure)
                RETURN
                    count(CASE WHEN f.wikidata_verified = true THEN 1 END) as verified,
                    count(CASE WHEN f.wikidata_verified = false THEN 1 END) as unverified,
                    count(f) as total
            """)
            stats = result.single()
            print(f"\n  HistoricalFigure Summary:")
            print(f"    • Wikidata verified: {stats['verified']} ({100*stats['verified']//stats['total']}%)")
            print(f"    • User input: {stats['unverified']} ({100*stats['unverified']//stats['total']}%)")

            result = session.run("""
                MATCH (m:MediaWork)
                RETURN
                    count(CASE WHEN m.wikidata_verified = true THEN 1 END) as verified,
                    count(CASE WHEN m.wikidata_verified = false THEN 1 END) as unverified,
                    count(m) as total
            """)
            stats = result.single()
            print(f"\n  MediaWork Summary:")
            print(f"    • Wikidata verified: {stats['verified']} ({100*stats['verified']//stats['total']}%)")
            print(f"    • User input: {stats['unverified']} ({100*stats['unverified']//stats['total']}%)")

            return {
                'success': still_null_figures == 0 and still_null_media == 0,
                'still_null_figures': still_null_figures,
                'still_null_media': still_null_media
            }

        return {'success': True}


def rollback_migration(driver):
    """
    Rollback the migration: Remove verification flags and data_source properties.

    Args:
        driver: Neo4j driver instance

    Returns:
        Dictionary with rollback results
    """
    with driver.session() as session:
        print("\n⏪ Rolling back migration...\n")

        # Step 1: Remove properties from HistoricalFigure nodes
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE f.wikidata_verified IS NOT NULL
               OR f.data_source IS NOT NULL
            REMOVE f.wikidata_verified, f.data_source
            RETURN count(f) as updated
        """)
        updated_figures = result.single()['updated']
        print(f"✅ Removed flags from {updated_figures} HistoricalFigure nodes")

        # Step 2: Remove properties from MediaWork nodes
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.wikidata_verified IS NOT NULL
               OR m.data_source IS NOT NULL
               OR m.setting_year IS NOT NULL
               OR m.setting_year_end IS NOT NULL
            REMOVE m.wikidata_verified, m.data_source, m.setting_year, m.setting_year_end
            RETURN count(m) as updated
        """)
        updated_media = result.single()['updated']
        print(f"✅ Removed flags from {updated_media} MediaWork nodes")

        # Step 3: Verify rollback
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE f.wikidata_verified IS NOT NULL
            RETURN count(f) as remaining
        """)
        remaining_figures = result.single()['remaining']

        result = session.run("""
            MATCH (m:MediaWork)
            WHERE m.wikidata_verified IS NOT NULL
            RETURN count(m) as remaining
        """)
        remaining_media = result.single()['remaining']

        if remaining_figures == 0 and remaining_media == 0:
            print("\n✅ Rollback complete - all properties removed")
        else:
            print(f"\n⚠️  Warning: {remaining_figures + remaining_media} nodes still have properties")

        return {
            'success': remaining_figures == 0 and remaining_media == 0,
            'updated_figures': updated_figures,
            'updated_media': updated_media
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
    print("Wikidata Verification Flags Migration (CHR-16 Task 1.3)")
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
            print("\n📊 Analyzing current database state...\n")
            stats = analyze_verification_status(driver)

            print("HistoricalFigure nodes:")
            print(f"  • Total: {stats['figures']['total']}")
            print(f"  • With wikidata_id: {stats['figures']['with_wikidata_id']}")
            print(f"  • Already have flag: {stats['figures']['already_has_flag']}")
            print(f"  • Need migration: {stats['figures']['needs_migration']}")

            print("\nMediaWork nodes:")
            print(f"  • Total: {stats['media']['total']}")
            print(f"  • With wikidata_id: {stats['media']['with_wikidata_id']}")
            print(f"  • Already have flag: {stats['media']['already_has_flag']}")
            print(f"  • Need migration: {stats['media']['needs_migration']}")

            if stats['figures']['needs_migration'] == 0 and stats['media']['needs_migration'] == 0:
                print("\n✅ No migration needed - all nodes already have verification flags")
                driver.close()
                return

            # Confirm migration
            if not dry_run:
                total_updates = stats['figures']['needs_migration'] + stats['media']['needs_migration']
                print(f"\n⚠️  About to update {total_updates} nodes with verification flags")
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
                print("⚠️  Migration completed with warnings")
                print("=" * 70)

        driver.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
