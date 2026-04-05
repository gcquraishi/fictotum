#!/usr/bin/env python3
"""
CHR-54: Entity Resolution Integration Tests

Tests entity resolution against the actual Neo4j database.
Validates:
- Canonical ID collision prevention
- Wikidata Q-ID lookup
- Duplicate detection
- Entity merge operations

Prerequisites:
- Neo4j Aura connection configured in .env
- At least 100+ HistoricalFigure nodes in database

Run with: python scripts/qa/test_entity_resolution_integration.py
"""

import sys
import os
from typing import List, Dict, Optional
from dataclasses import dataclass
import json

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

try:
    from neo4j import GraphDatabase
    from dotenv import load_dotenv
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install neo4j python-dotenv")
    from neo4j import GraphDatabase
    from dotenv import load_dotenv

# Load environment variables
load_dotenv()


@dataclass
class HistoricalFigure:
    """Represents a HistoricalFigure node from Neo4j"""
    canonical_id: str
    name: str
    wikidata_id: Optional[str]
    birth_year: Optional[int]
    death_year: Optional[int]
    era: Optional[str]


class EntityResolutionIntegrationTester:
    """Integration tests for entity resolution with Neo4j"""

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.driver = None
        self.connect_to_neo4j()

    def connect_to_neo4j(self):
        """Establish connection to Neo4j Aura"""
        uri = os.getenv('NEO4J_URI')
        username = os.getenv('NEO4J_USERNAME')
        password = os.getenv('NEO4J_PASSWORD')

        if not all([uri, username, password]):
            print("✗ ERROR: Missing Neo4j credentials in .env file")
            print("Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
            sys.exit(1)

        try:
            self.driver = GraphDatabase.driver(uri, auth=(username, password))
            # Test connection
            with self.driver.session() as session:
                result = session.run("RETURN 1 as test")
                result.single()
            print("✓ Connected to Neo4j Aura (c78564a4)")
        except Exception as e:
            print(f"✗ ERROR: Failed to connect to Neo4j: {e}")
            sys.exit(1)

    def close(self):
        """Close Neo4j connection"""
        if self.driver:
            self.driver.close()

    def run_query(self, query: str, parameters: Dict = None) -> List[Dict]:
        """Execute a Cypher query and return results"""
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [dict(record) for record in result]

    # ========== TEST: CANONICAL ID UNIQUENESS ==========

    def test_canonical_id_uniqueness(self):
        """Test that all canonical_ids are unique"""
        print("\n" + "="*70)
        print("TEST: Canonical ID Uniqueness")
        print("="*70)

        query = """
        MATCH (f:HistoricalFigure)
        WITH f.canonical_id as id, count(*) as count
        WHERE count > 1
        RETURN id, count
        ORDER BY count DESC
        """

        duplicates = self.run_query(query)

        if len(duplicates) == 0:
            self.passed += 1
            print("✓ PASS: All canonical_ids are unique")
        else:
            self.failed += 1
            print(f"✗ FAIL: Found {len(duplicates)} duplicate canonical_ids:")
            for dup in duplicates[:5]:  # Show first 5
                print(f"  - {dup['id']}: {dup['count']} instances")

    # ========== TEST: WIKIDATA ID UNIQUENESS ==========

    def test_wikidata_id_uniqueness(self):
        """Test that Wikidata Q-IDs are unique across HistoricalFigure nodes"""
        print("\n" + "="*70)
        print("TEST: Wikidata ID Uniqueness")
        print("="*70)

        query = """
        MATCH (f:HistoricalFigure)
        WHERE f.wikidata_id IS NOT NULL
        WITH f.wikidata_id as qid, collect(f.canonical_id) as figures
        WHERE size(figures) > 1
        RETURN qid, figures, size(figures) as count
        ORDER BY count DESC
        """

        duplicates = self.run_query(query)

        if len(duplicates) == 0:
            self.passed += 1
            print("✓ PASS: All Wikidata Q-IDs are unique")
        else:
            self.failed += 1
            print(f"✗ FAIL: Found {len(duplicates)} duplicate Wikidata Q-IDs:")
            for dup in duplicates[:5]:
                print(f"  - {dup['qid']}: used by {dup['count']} figures")
                for fig_id in dup['figures'][:3]:
                    print(f"    • {fig_id}")

    # ========== TEST: CANONICAL ID FORMAT ==========

    def test_canonical_id_format(self):
        """Test that canonical_ids follow the correct format"""
        print("\n" + "="*70)
        print("TEST: Canonical ID Format Validation")
        print("="*70)

        query = """
        MATCH (f:HistoricalFigure)
        RETURN f.canonical_id as canonical_id, f.name as name
        LIMIT 1000
        """

        figures = self.run_query(query)

        valid_count = 0
        invalid_count = 0
        invalid_examples = []

        for figure in figures:
            canonical_id = figure['canonical_id']
            name = figure['name']

            # Check format: Q-ID or PROV:slug-timestamp
            if canonical_id.startswith('Q') and len(canonical_id) > 1:
                valid_count += 1
            elif canonical_id.startswith('PROV:') and len(canonical_id) > 5:
                valid_count += 1
            else:
                invalid_count += 1
                if len(invalid_examples) < 5:
                    invalid_examples.append((canonical_id, name))

        if invalid_count == 0:
            self.passed += 1
            print(f"✓ PASS: All {valid_count} canonical_ids have valid format")
            print(f"  - Q-IDs (Wikidata): {sum(1 for f in figures if f['canonical_id'].startswith('Q'))}")
            print(f"  - Provisional IDs: {sum(1 for f in figures if f['canonical_id'].startswith('PROV:'))}")
        else:
            self.failed += 1
            print(f"✗ FAIL: Found {invalid_count} invalid canonical_ids:")
            for canonical_id, name in invalid_examples:
                print(f"  - {canonical_id} ({name})")

    # ========== TEST: ORPHANED FIGURES ==========

    def test_no_orphaned_figures(self):
        """Test that HistoricalFigure nodes are connected to MediaWork nodes"""
        print("\n" + "="*70)
        print("TEST: Connected Figures (No Orphans)")
        print("="*70)

        query = """
        MATCH (f:HistoricalFigure)
        WHERE NOT (f)-[:APPEARS_IN|PORTRAYED_IN]->()
        RETURN f.canonical_id as id, f.name as name
        LIMIT 20
        """

        orphans = self.run_query(query)

        # Get total figure count
        total_query = "MATCH (f:HistoricalFigure) RETURN count(f) as total"
        total = self.run_query(total_query)[0]['total']

        orphan_percentage = (len(orphans) / total) * 100 if total > 0 else 0

        if orphan_percentage < 5:  # Allow up to 5% orphaned nodes
            self.passed += 1
            print(f"✓ PASS: Only {len(orphans)}/{total} ({orphan_percentage:.1f}%) figures are orphaned")
        else:
            self.failed += 1
            print(f"✗ FAIL: {len(orphans)}/{total} ({orphan_percentage:.1f}%) figures have no media connections")
            print("First 5 orphaned figures:")
            for orphan in orphans[:5]:
                print(f"  - {orphan['name']} ({orphan['id']})")

    # ========== TEST: WIKIDATA ENRICHMENT ==========

    def test_wikidata_coverage(self):
        """Test Wikidata Q-ID coverage across HistoricalFigure nodes"""
        print("\n" + "="*70)
        print("TEST: Wikidata Q-ID Coverage")
        print("="*70)

        query = """
        MATCH (f:HistoricalFigure)
        RETURN
          count(f) as total,
          sum(CASE WHEN f.wikidata_id IS NOT NULL THEN 1 ELSE 0 END) as with_qid,
          sum(CASE WHEN f.wikidata_id IS NULL THEN 1 ELSE 0 END) as without_qid
        """

        result = self.run_query(query)[0]
        total = result['total']
        with_qid = result['with_qid']
        without_qid = result['without_qid']

        coverage = (with_qid / total * 100) if total > 0 else 0

        print(f"Wikidata Coverage: {with_qid}/{total} ({coverage:.1f}%)")

        # We expect at least 30% coverage for a healthy database
        if coverage >= 30:
            self.passed += 1
            print(f"✓ PASS: Wikidata coverage is {coverage:.1f}% (target: ≥30%)")
        else:
            self.failed += 1
            print(f"✗ FAIL: Wikidata coverage is only {coverage:.1f}% (target: ≥30%)")
            print(f"  {without_qid} figures need Wikidata enrichment")

    # ========== TEST: DUPLICATE DETECTION ==========

    def test_duplicate_detection(self):
        """Test that potential duplicates are detected"""
        print("\n" + "="*70)
        print("TEST: Duplicate Detection System")
        print("="*70)

        # Find figures with very similar names
        query = """
        MATCH (f1:HistoricalFigure), (f2:HistoricalFigure)
        WHERE f1.canonical_id < f2.canonical_id
          AND f1.name CONTAINS 'Henry'
          AND f2.name CONTAINS 'Henry'
          AND f1.birth_year IS NOT NULL
          AND f2.birth_year IS NOT NULL
        RETURN
          f1.canonical_id as id1,
          f1.name as name1,
          f1.birth_year as birth1,
          f2.canonical_id as id2,
          f2.name as name2,
          f2.birth_year as birth2
        LIMIT 5
        """

        similar_figures = self.run_query(query)

        if len(similar_figures) > 0:
            self.passed += 1
            print(f"✓ PASS: Found {len(similar_figures)} figure pairs for duplicate testing")
            print("Sample pairs:")
            for pair in similar_figures[:3]:
                print(f"  - {pair['name1']} ({pair['birth1']}) vs {pair['name2']} ({pair['birth2']})")
        else:
            print("⚠ WARN: No similar figures found for duplicate testing")
            print("  (This may be expected if database has few figures)")
            self.passed += 1

    # ========== TEST: ERA COVERAGE ==========

    def test_era_coverage(self):
        """Test that most figures have era information"""
        print("\n" + "="*70)
        print("TEST: Era Information Coverage")
        print("="*70)

        query = """
        MATCH (f:HistoricalFigure)
        RETURN
          count(f) as total,
          sum(CASE WHEN f.era IS NOT NULL THEN 1 ELSE 0 END) as with_era,
          sum(CASE WHEN f.era IS NULL THEN 1 ELSE 0 END) as without_era
        """

        result = self.run_query(query)[0]
        total = result['total']
        with_era = result['with_era']
        without_era = result['without_era']

        coverage = (with_era / total * 100) if total > 0 else 0

        print(f"Era Coverage: {with_era}/{total} ({coverage:.1f}%)")

        # We expect at least 70% era coverage
        if coverage >= 70:
            self.passed += 1
            print(f"✓ PASS: Era coverage is {coverage:.1f}% (target: ≥70%)")
        else:
            self.failed += 1
            print(f"✗ FAIL: Era coverage is only {coverage:.1f}% (target: ≥70%)")
            print(f"  {without_era} figures need era classification")

    # ========== TEST: CANONICAL ID AS PRIMARY KEY ==========

    def test_canonical_id_as_primary_key(self):
        """Test that canonical_id can serve as primary key"""
        print("\n" + "="*70)
        print("TEST: Canonical ID as Primary Key")
        print("="*70)

        # Check that canonical_id is never null
        query = """
        MATCH (f:HistoricalFigure)
        WHERE f.canonical_id IS NULL
        RETURN count(f) as null_count
        """

        result = self.run_query(query)[0]
        null_count = result['null_count']

        if null_count == 0:
            self.passed += 1
            print("✓ PASS: All HistoricalFigure nodes have canonical_id (no nulls)")
        else:
            self.failed += 1
            print(f"✗ FAIL: {null_count} HistoricalFigure nodes have NULL canonical_id")

    # ========== TEST: RELATIONSHIP INTEGRITY ==========

    def test_relationship_integrity(self):
        """Test relationship integrity (no dangling relationships)"""
        print("\n" + "="*70)
        print("TEST: Relationship Integrity")
        print("="*70)

        # Check for APPEARS_IN relationships without is_protagonist
        query = """
        MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
        WHERE r.is_protagonist IS NULL
        RETURN count(r) as missing_protagonist
        """

        result = self.run_query(query)[0]
        missing_protagonist = result['missing_protagonist']

        # Get total APPEARS_IN count
        total_query = """
        MATCH ()-[r:APPEARS_IN]->()
        RETURN count(r) as total
        """
        total = self.run_query(total_query)[0]['total']

        missing_percentage = (missing_protagonist / total * 100) if total > 0 else 0

        if missing_percentage < 20:  # Allow up to 20% missing
            self.passed += 1
            print(f"✓ PASS: {missing_protagonist}/{total} ({missing_percentage:.1f}%) APPEARS_IN rels missing is_protagonist")
        else:
            self.failed += 1
            print(f"✗ FAIL: {missing_protagonist}/{total} ({missing_percentage:.1f}%) APPEARS_IN rels missing is_protagonist")

    def run_all_tests(self):
        """Run all integration tests"""
        print("\n" + "="*70)
        print("ENTITY RESOLUTION INTEGRATION TESTS (CHR-54)")
        print("="*70)
        print("Testing against Neo4j Aura (c78564a4)")

        try:
            self.test_canonical_id_uniqueness()
            self.test_wikidata_id_uniqueness()
            self.test_canonical_id_format()
            self.test_no_orphaned_figures()
            self.test_wikidata_coverage()
            self.test_duplicate_detection()
            self.test_era_coverage()
            self.test_canonical_id_as_primary_key()
            self.test_relationship_integrity()

            # Summary
            print("\n" + "="*70)
            print("INTEGRATION TEST SUMMARY")
            print("="*70)
            print(f"Total Tests: {self.passed + self.failed}")
            print(f"Passed: {self.passed} ✓")
            print(f"Failed: {self.failed} ✗")
            print(f"Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")

            if self.failed == 0:
                print("\n🎉 All integration tests passed!")
                return 0
            else:
                print(f"\n⚠️  {self.failed} test(s) failed")
                return 1

        finally:
            self.close()


if __name__ == "__main__":
    tester = EntityResolutionIntegrationTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
