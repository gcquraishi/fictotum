#!/usr/bin/env python3
"""
Migration Script: Sentiment String → Sentiment Tags Array

Migrates existing APPEARS_IN relationships from single sentiment field
to sentiment_tags array format.

Migration Strategy:
1. Find all :APPEARS_IN relationships with sentiment field but no sentiment_tags
2. Convert sentiment string to lowercase array: ["complex"] → ["complex"]
3. Handle null sentiments (default to ["complex"])
4. Preserve original sentiment field (dual-write period)
5. Add tag_metadata categorization

Usage:
    python3 migrate_sentiment_to_tags.py [--dry-run]

Options:
    --dry-run    Show what would be migrated without making changes
"""

import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv
from typing import Dict, List

# Load environment variables from .env file
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

# Suggested tags for categorization
SUGGESTED_TAGS = [
    'heroic', 'villainous', 'complex', 'neutral',
    'sympathetic', 'tragic', 'comedic', 'romantic',
    'antagonistic', 'ambiguous', 'satirical', 'nuanced'
]

def categorize_tags(tags: List[str]) -> Dict[str, List[str]]:
    """
    Categorize tags into common (suggested) and custom.

    Args:
        tags: List of normalized tags

    Returns:
        Dictionary with 'common' and 'custom' tag lists
    """
    common = [tag for tag in tags if tag in SUGGESTED_TAGS]
    custom = [tag for tag in tags if tag not in SUGGESTED_TAGS]
    return {'common': common, 'custom': custom}


def analyze_existing_sentiments(driver):
    """
    Analyze current sentiment distribution before migration.

    Returns:
        Dictionary with migration statistics
    """
    with driver.session() as session:
        # Count relationships with old format only
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment IS NOT NULL
              AND r.sentiment_tags IS NULL
            RETURN count(r) as needs_migration
        """)
        needs_migration = result.single()['needs_migration']

        # Count relationships with null sentiment
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment IS NULL
              AND r.sentiment_tags IS NULL
            RETURN count(r) as null_sentiment
        """)
        null_sentiment = result.single()['null_sentiment']

        # Count already migrated
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NOT NULL
            RETURN count(r) as already_migrated
        """)
        already_migrated = result.single()['already_migrated']

        # Get sentiment value distribution
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment IS NOT NULL
            RETURN r.sentiment as sentiment, count(*) as count
            ORDER BY count DESC
        """)
        sentiment_distribution = {record['sentiment']: record['count']
                                  for record in result}

        return {
            'needs_migration': needs_migration,
            'null_sentiment': null_sentiment,
            'already_migrated': already_migrated,
            'sentiment_distribution': sentiment_distribution,
            'total': needs_migration + null_sentiment + already_migrated
        }


def migrate_sentiment_to_tags(driver, dry_run=False):
    """
    Execute migration from sentiment field to sentiment_tags array.

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

        # Step 1: Migrate existing sentiment values to arrays
        if dry_run:
            # In dry-run, just show what would be migrated
            result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
                WHERE r.sentiment IS NOT NULL
                  AND r.sentiment_tags IS NULL
                RETURN f.name as figure, m.title as media,
                       r.sentiment as old_sentiment
                LIMIT 10
            """)

            print("Sample relationships to migrate (showing first 10):")
            for record in result:
                print(f"  • {record['figure']} → {record['media']}: '{record['old_sentiment']}'")
        else:
            # Actual migration
            result = session.run("""
                MATCH ()-[r:APPEARS_IN]->()
                WHERE r.sentiment IS NOT NULL
                  AND r.sentiment_tags IS NULL
                WITH r, toLower(trim(r.sentiment)) as normalized_tag
                SET r.sentiment_tags = [normalized_tag]
                RETURN count(r) as migrated
            """)
            migrated_count = result.single()['migrated']
            print(f"✅ Migrated {migrated_count} relationships with existing sentiment")

        # Step 2: Set tag_metadata for migrated relationships
        if not dry_run:
            # We need to do this in Python since Cypher can't easily categorize
            result = session.run("""
                MATCH ()-[r:APPEARS_IN]->()
                WHERE r.sentiment_tags IS NOT NULL
                  AND r.tag_metadata IS NULL
                RETURN id(r) as rel_id, r.sentiment_tags as tags
            """)

            metadata_updates = 0
            for record in result:
                rel_id = record['rel_id']
                tags = record['tags']
                metadata = categorize_tags(tags)

                session.run("""
                    MATCH ()-[r:APPEARS_IN]->()
                    WHERE id(r) = $rel_id
                    SET r.tag_metadata = $metadata
                """, rel_id=rel_id, metadata=metadata)

                metadata_updates += 1

            print(f"✅ Added tag_metadata to {metadata_updates} relationships")

        # Step 3: Handle null sentiments (default to 'complex')
        if dry_run:
            result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
                WHERE r.sentiment IS NULL
                  AND r.sentiment_tags IS NULL
                RETURN count(*) as null_count
            """)
            null_count = result.single()['null_count']
            print(f"\n📊 Would default {null_count} null sentiments to ['complex']")
        else:
            result = session.run("""
                MATCH ()-[r:APPEARS_IN]->()
                WHERE r.sentiment IS NULL
                  AND r.sentiment_tags IS NULL
                SET r.sentiment_tags = ['complex'],
                    r.sentiment = 'complex',
                    r.tag_metadata = {common: ['complex'], custom: []}
                RETURN count(r) as defaulted
            """)
            defaulted_count = result.single()['defaulted']
            print(f"✅ Defaulted {defaulted_count} null sentiments to ['complex']")

        # Step 4: Validation check
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NULL
            RETURN count(r) as still_null
        """)
        still_null = result.single()['still_null']

        if still_null > 0:
            print(f"\n⚠️  Warning: {still_null} relationships still have null sentiment_tags")
        else:
            print(f"\n✅ All relationships have sentiment_tags")

        return {
            'success': still_null == 0,
            'still_null': still_null
        }


def main():
    """Main migration execution"""
    dry_run = '--dry-run' in sys.argv

    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Error: Missing Neo4j credentials in .env file")
        print("   Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    print("=" * 60)
    print("Sentiment → Sentiment Tags Migration (CHR-12)")
    print("=" * 60)

    try:
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )

        # Verify connection
        driver.verify_connectivity()
        print("✅ Connected to Neo4j")

        # Analyze current state
        print("\n📊 Analyzing current database state...\n")
        stats = analyze_existing_sentiments(driver)

        print(f"Total APPEARS_IN relationships: {stats['total']}")
        print(f"  • Already migrated: {stats['already_migrated']}")
        print(f"  • Need migration: {stats['needs_migration']}")
        print(f"  • Null sentiment: {stats['null_sentiment']}")

        if stats['sentiment_distribution']:
            print(f"\nCurrent sentiment distribution:")
            for sentiment, count in stats['sentiment_distribution'].items():
                print(f"  • {sentiment}: {count}")

        if stats['needs_migration'] == 0 and stats['null_sentiment'] == 0:
            print("\n✅ No migration needed - all relationships already have sentiment_tags")
            driver.close()
            return

        # Confirm migration
        if not dry_run:
            print(f"\n⚠️  About to migrate {stats['needs_migration'] + stats['null_sentiment']} relationships")
            response = input("Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("Migration cancelled")
                driver.close()
                return

        # Execute migration
        result = migrate_sentiment_to_tags(driver, dry_run=dry_run)

        if result['success']:
            print("\n" + "=" * 60)
            print("✅ Migration completed successfully!")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print(f"⚠️  Migration completed with {result['still_null']} warnings")
            print("=" * 60)

        driver.close()

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
