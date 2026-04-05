#!/usr/bin/env python3
"""
QA Validation Script: Sentiment Tags Data Integrity

Validates that all :APPEARS_IN relationships have properly formatted sentiment_tags
and identifies data quality issues.

Usage:
    python3 validate_sentiment_tags.py [--fix]

Options:
    --fix    Automatically fix common issues (requires confirmation)
"""

import os
import sys
from neo4j import GraphDatabase
from dotenv import load_dotenv
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

SUGGESTED_TAGS = [
    'heroic', 'villainous', 'complex', 'neutral',
    'sympathetic', 'tragic', 'comedic', 'romantic',
    'antagonistic', 'ambiguous', 'satirical', 'nuanced'
]


def check_null_sentiment_tags(driver) -> int:
    """Check for relationships with null sentiment_tags."""
    with driver.session() as session:
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NULL
            RETURN count(r) as null_count
        """)
        return result.single()['null_count']


def check_empty_arrays(driver) -> int:
    """Check for relationships with empty sentiment_tags arrays."""
    with driver.session() as session:
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NOT NULL
              AND size(r.sentiment_tags) = 0
            RETURN count(r) as empty_count
        """)
        return result.single()['empty_count']


def check_tag_count_violations(driver) -> Dict[str, int]:
    """Check for relationships violating tag count constraints (1-5)."""
    with driver.session() as session:
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NOT NULL
              AND size(r.sentiment_tags) > 5
            RETURN count(r) as over_max
        """)
        over_max = result.single()['over_max']

        return {
            'over_max': over_max,
        }


def check_tag_length_violations(driver) -> List[Dict[str, Any]]:
    """Check for tags outside 2-30 character range."""
    with driver.session() as session:
        result = session.run("""
            MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
            WHERE r.sentiment_tags IS NOT NULL
            UNWIND r.sentiment_tags AS tag
            WITH f, m, r, tag
            WHERE size(tag) < 2 OR size(tag) > 30
            RETURN f.name as figure, m.title as media,
                   tag, size(tag) as length
            LIMIT 20
        """)

        violations = []
        for record in result:
            violations.append({
                'figure': record['figure'],
                'media': record['media'],
                'tag': record['tag'],
                'length': record['length']
            })

        return violations


def check_tag_case_inconsistency(driver) -> List[Dict[str, Any]]:
    """Check for tags that should be lowercase but aren't."""
    with driver.session() as session:
        result = session.run("""
            MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
            WHERE r.sentiment_tags IS NOT NULL
            UNWIND r.sentiment_tags AS tag
            WITH f, m, r, tag
            WHERE tag <> toLower(tag)
            RETURN DISTINCT f.name as figure, m.title as media,
                   tag, toLower(tag) as should_be
            LIMIT 20
        """)

        violations = []
        for record in result:
            violations.append({
                'figure': record['figure'],
                'media': record['media'],
                'tag': record['tag'],
                'should_be': record['should_be']
            })

        return violations


def generate_tag_frequency_report(driver) -> List[Dict[str, Any]]:
    """Generate tag frequency distribution."""
    with driver.session() as session:
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NOT NULL
            UNWIND r.sentiment_tags AS tag
            RETURN tag, count(*) as frequency
            ORDER BY frequency DESC
            LIMIT 30
        """)

        distribution = []
        for record in result:
            tag = record['tag']
            frequency = record['frequency']
            is_suggested = tag in SUGGESTED_TAGS

            distribution.append({
                'tag': tag,
                'frequency': frequency,
                'type': 'suggested' if is_suggested else 'custom'
            })

        return distribution


def check_metadata_accuracy(driver) -> int:
    """Check for tag_metadata that doesn't match actual tags."""
    with driver.session() as session:
        result = session.run("""
            MATCH ()-[r:APPEARS_IN]->()
            WHERE r.sentiment_tags IS NOT NULL
              AND r.tag_metadata IS NOT NULL
            WITH r,
                 size(r.tag_metadata.common) + size(r.tag_metadata.custom) as metadata_count,
                 size(r.sentiment_tags) as actual_count
            WHERE metadata_count <> actual_count
            RETURN count(r) as mismatched
        """)
        return result.single()['mismatched']


def main():
    """Main validation execution."""
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Error: Missing Neo4j credentials in .env file")
        sys.exit(1)

    print("=" * 60)
    print("Sentiment Tags Data Validation (CHR-12)")
    print("=" * 60)

    try:
        driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )

        driver.verify_connectivity()
        print("✅ Connected to Neo4j\n")

        # Run all validation checks
        issues_found = False

        # Check 1: Null sentiment_tags
        print("📋 Check 1: Null sentiment_tags...")
        null_count = check_null_sentiment_tags(driver)
        if null_count > 0:
            print(f"   ❌ FAIL: {null_count} relationships have null sentiment_tags")
            issues_found = True
        else:
            print("   ✅ PASS: No null sentiment_tags")

        # Check 2: Empty arrays
        print("\n📋 Check 2: Empty sentiment_tags arrays...")
        empty_count = check_empty_arrays(driver)
        if empty_count > 0:
            print(f"   ❌ FAIL: {empty_count} relationships have empty arrays")
            issues_found = True
        else:
            print("   ✅ PASS: No empty arrays")

        # Check 3: Tag count violations
        print("\n📋 Check 3: Tag count constraints (1-5 tags)...")
        count_violations = check_tag_count_violations(driver)
        if count_violations['over_max'] > 0:
            print(f"   ❌ FAIL: {count_violations['over_max']} relationships exceed 5 tags")
            issues_found = True
        else:
            print("   ✅ PASS: All relationships have 1-5 tags")

        # Check 4: Tag length violations
        print("\n📋 Check 4: Tag length constraints (2-30 chars)...")
        length_violations = check_tag_length_violations(driver)
        if length_violations:
            print(f"   ❌ FAIL: {len(length_violations)} tags violate length constraints")
            for v in length_violations[:5]:
                print(f"      • {v['figure']} → {v['media']}: '{v['tag']}' ({v['length']} chars)")
            if len(length_violations) > 5:
                print(f"      ... and {len(length_violations) - 5} more")
            issues_found = True
        else:
            print("   ✅ PASS: All tags within 2-30 character range")

        # Check 5: Case inconsistency
        print("\n📋 Check 5: Lowercase normalization...")
        case_violations = check_tag_case_inconsistency(driver)
        if case_violations:
            print(f"   ⚠️  WARNING: {len(case_violations)} tags not lowercase")
            for v in case_violations[:5]:
                print(f"      • {v['tag']} → should be '{v['should_be']}'")
            if len(case_violations) > 5:
                print(f"      ... and {len(case_violations) - 5} more")
            issues_found = True
        else:
            print("   ✅ PASS: All tags properly lowercase")

        # Check 6: Metadata accuracy
        print("\n📋 Check 6: Tag metadata accuracy...")
        metadata_mismatches = check_metadata_accuracy(driver)
        if metadata_mismatches > 0:
            print(f"   ⚠️  WARNING: {metadata_mismatches} relationships have mismatched metadata")
            issues_found = True
        else:
            print("   ✅ PASS: Tag metadata consistent with tags")

        # Generate tag frequency report
        print("\n" + "=" * 60)
        print("TAG FREQUENCY DISTRIBUTION")
        print("=" * 60)
        distribution = generate_tag_frequency_report(driver)

        print(f"\n{'Tag':<20} {'Frequency':<12} {'Type':<10}")
        print("-" * 42)
        for item in distribution:
            print(f"{item['tag']:<20} {item['frequency']:<12} {item['type']:<10}")

        # Summary
        print("\n" + "=" * 60)
        if issues_found:
            print("⚠️  VALIDATION FAILED - Issues detected")
            print("=" * 60)
            print("\nRecommended actions:")
            if null_count > 0 or empty_count > 0:
                print("  • Run migration script to populate missing tags")
            if case_violations:
                print("  • Re-run migration with normalization enabled")
            if metadata_mismatches > 0:
                print("  • Regenerate tag_metadata for affected relationships")
        else:
            print("✅ VALIDATION PASSED - All checks successful")
            print("=" * 60)

        driver.close()

    except Exception as e:
        print(f"\n❌ Validation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
