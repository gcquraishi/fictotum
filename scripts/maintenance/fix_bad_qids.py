#!/usr/bin/env python3
"""
Fix Bad Wikidata Q-IDs in Database

Identifies MediaWork nodes with incorrect or missing Q-IDs and attempts
to automatically correct them by searching Wikidata.

Usage:
    python3 scripts/maintenance/fix_bad_qids.py [--dry-run] [--limit N]

Options:
    --dry-run    Show what would be fixed without making changes
    --limit N    Only process first N suspicious works
"""

import os
import sys
import argparse
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Add lib directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lib'))
from wikidata_search import search_wikidata_for_work, validate_qid

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI')
username = os.getenv('NEO4J_USERNAME')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))


def find_suspicious_works(session, limit=None):
    """Find works with suspicious or missing Q-IDs"""

    query = """
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NULL
           OR m.wikidata_id STARTS WITH 'PROV:'
           OR m.wikidata_id = ''
        RETURN m.media_id as media_id,
               m.title as title,
               m.wikidata_id as wikidata_id,
               m.creator as creator,
               m.release_year as release_year,
               m.media_type as media_type
        ORDER BY m.title
    """

    if limit:
        query += f" LIMIT {limit}"

    result = session.run(query)
    return list(result)


def validate_existing_qids(session, limit=None):
    """Validate existing Q-IDs against Wikidata"""

    query = """
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NOT NULL
          AND NOT m.wikidata_id STARTS WITH 'PROV:'
          AND m.wikidata_id <> ''
        RETURN m.media_id as media_id,
               m.title as title,
               m.wikidata_id as wikidata_id,
               m.creator as creator,
               m.release_year as release_year,
               m.media_type as media_type
        ORDER BY m.title
    """

    if limit:
        query += f" LIMIT {limit}"

    result = session.run(query)
    records = list(result)

    suspicious = []

    print(f"\nValidating {len(records)} existing Q-IDs...")

    for i, record in enumerate(records, 1):
        media_id = record['media_id']
        title = record['title']
        qid = record['wikidata_id']

        if i % 10 == 0:
            print(f"  Progress: {i}/{len(records)}")

        validation = validate_qid(qid, title)

        if not validation['valid']:
            suspicious.append(record)
            print(f"  ⚠️  {title}: {validation.get('error', 'Invalid')}")
        elif validation['similarity'] < 0.8:
            suspicious.append(record)
            print(f"  ⚠️  {title}: Low similarity ({validation['similarity']:.0%}) - Wikidata says '{validation['wikidata_label']}'")

    return suspicious


def fix_work(session, work, dry_run=False):
    """Attempt to find and update correct Q-ID for a work"""

    media_id = work['media_id']
    title = work['title']
    old_qid = work['wikidata_id']
    creator = work['creator']
    year = work['release_year']
    media_type = work['media_type']

    # Convert Neo4j Integer to Python int
    if year and hasattr(year, 'toNumber'):
        year = year.toNumber()

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Fixing: {title}")
    print(f"  Media ID: {media_id}")
    print(f"  Old Q-ID: {old_qid or 'None'}")
    print(f"  Creator: {creator or 'Unknown'}")
    print(f"  Year: {year or 'Unknown'}")

    # Search Wikidata
    try:
        result = search_wikidata_for_work(
            title=title,
            creator=creator,
            year=year,
            media_type=media_type
        )

        if result is None:
            print(f"  ❌ No good match found in Wikidata")
            return False

        new_qid = result['qid']
        confidence = result['confidence']
        similarity = result['similarity']

        print(f"  ✅ Found match: {result['title']}")
        print(f"     Q-ID: {new_qid}")
        print(f"     Confidence: {confidence}")
        print(f"     Similarity: {similarity:.0%}")

        if not dry_run:
            # Update database
            update_query = """
                MATCH (m:MediaWork {media_id: $media_id})
                SET m.wikidata_id = $new_qid,
                    m.wikidata_label = $wikidata_label,
                    m.wikidata_updated_at = timestamp()
                RETURN m.media_id
            """

            session.run(update_query, {
                'media_id': media_id,
                'new_qid': new_qid,
                'wikidata_label': result['title']
            })

            print(f"  ✅ Updated database: {old_qid or 'None'} → {new_qid}")
        else:
            print(f"  [Would update: {old_qid or 'None'} → {new_qid}]")

        return True

    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Fix bad Wikidata Q-IDs in database')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--limit', type=int, help='Only process first N works')
    parser.add_argument('--validate-existing', action='store_true', help='Validate existing Q-IDs instead of just missing ones')

    args = parser.parse_args()

    print("="*80)
    print("WIKIDATA Q-ID FIX SCRIPT")
    print("="*80)

    if args.dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made\n")

    try:
        with driver.session() as session:
            if args.validate_existing:
                # Validate existing Q-IDs
                suspicious_works = validate_existing_qids(session, args.limit)
                print(f"\nFound {len(suspicious_works)} works with suspicious Q-IDs")
            else:
                # Find works with missing/provisional Q-IDs
                suspicious_works = find_suspicious_works(session, args.limit)
                print(f"\nFound {len(suspicious_works)} works with missing/provisional Q-IDs")

            if not suspicious_works:
                print("\n✅ No suspicious works found!")
                return

            # Attempt to fix each one
            fixed_count = 0
            failed_count = 0

            for work in suspicious_works:
                success = fix_work(session, work, dry_run=args.dry_run)
                if success:
                    fixed_count += 1
                else:
                    failed_count += 1

            print("\n" + "="*80)
            print("SUMMARY")
            print("="*80)
            print(f"Total suspicious works: {len(suspicious_works)}")
            print(f"{'Would fix' if args.dry_run else 'Fixed'}: {fixed_count}")
            print(f"Failed to find match: {failed_count}")

            if args.dry_run:
                print("\n💡 Run without --dry-run to apply changes")

    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.close()


if __name__ == '__main__':
    main()
