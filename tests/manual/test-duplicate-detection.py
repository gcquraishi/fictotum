#!/usr/bin/env python3
"""
Test script for duplicate detection with Wikidata Q-IDs and canonical_ids
Tests the dual-key blocking logic from figures/create/route.ts
"""

import os
from neo4j import GraphDatabase

def get_neo4j_connection():
    """Establish connection to Neo4j Aura database"""
    uri = os.getenv('NEO4J_URI')
    username = os.getenv('NEO4J_USERNAME')
    password = os.getenv('NEO4J_PASSWORD')

    if not all([uri, username, password]):
        print("ERROR: Missing Neo4j credentials")
        return None

    driver = GraphDatabase.driver(uri, auth=(username, password))
    return driver

def test_duplicate_detection():
    """Test duplicate detection scenarios"""
    driver = get_neo4j_connection()
    if not driver:
        return

    print("=" * 80)
    print("Duplicate Detection Test")
    print("=" * 80)
    print()

    # Test Case 1: Check if existing figure with Q-ID can be found
    print("Test 1: Searching for existing figures with known Q-IDs")
    print("-" * 80)

    with driver.session() as session:
        # Find some existing figures with wikidata_id
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE f.wikidata_id IS NOT NULL
            RETURN f.canonical_id AS canonical_id,
                   f.name AS name,
                   f.wikidata_id AS wikidata_id
            LIMIT 3
        """)

        figures_with_qid = [record.data() for record in result]

        if figures_with_qid:
            print(f"Found {len(figures_with_qid)} figures with Wikidata Q-IDs:\n")
            for fig in figures_with_qid:
                print(f"  - {fig['name']}")
                print(f"    canonical_id: {fig['canonical_id']}")
                print(f"    wikidata_id: {fig['wikidata_id']}")
                print()
        else:
            print("  ⚠️  No figures with wikidata_id found in database")
            print("      (This is expected if migration hasn't been run yet)")
            print()

    # Test Case 2: Check figures without Q-IDs
    print("Test 2: Searching for existing figures without Q-IDs")
    print("-" * 80)

    with driver.session() as session:
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE f.wikidata_id IS NULL
            RETURN f.canonical_id AS canonical_id,
                   f.name AS name
            LIMIT 5
        """)

        figures_no_qid = [record.data() for record in result]

        if figures_no_qid:
            print(f"Found {len(figures_no_qid)} figures without Wikidata Q-IDs:\n")
            for fig in figures_no_qid:
                print(f"  - {fig['name']}")
                print(f"    canonical_id: {fig['canonical_id']}")
                has_prov = fig['canonical_id'].startswith('PROV:')
                print(f"    {'✅' if has_prov else '⚠️ '} {'Has PROV: prefix' if has_prov else 'Missing PROV: prefix (needs migration)'}")
                print()
        else:
            print("  ℹ️  All figures have wikidata_id (unusual but valid)")
            print()

    # Test Case 3: Simulate duplicate detection query
    print("Test 3: Simulating duplicate detection queries")
    print("-" * 80)

    with driver.session() as session:
        # Scenario A: Search by Q-ID (should match on wikidata_id)
        if figures_with_qid:
            test_figure = figures_with_qid[0]
            print(f"Scenario A: Searching for Q-ID '{test_figure['wikidata_id']}'")

            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.wikidata_id = $wikidataId OR f.canonical_id = $canonical_id
                RETURN f.canonical_id AS canonical_id,
                       f.name AS name,
                       f.wikidata_id AS wikidata_id
            """, {
                'wikidataId': test_figure['wikidata_id'],
                'canonical_id': 'dummy-canonical-id'  # Should NOT match
            })

            matches = [record.data() for record in result]
            if matches:
                print(f"  ✅ Found {len(matches)} match(es) by wikidata_id:")
                for match in matches:
                    print(f"     - {match['name']} (canonical_id: {match['canonical_id']})")
            else:
                print(f"  ❌ No matches found (unexpected!)")
            print()

        # Scenario B: Search by canonical_id (should match on canonical_id)
        if figures_no_qid:
            test_figure = figures_no_qid[0]
            print(f"Scenario B: Searching for canonical_id '{test_figure['canonical_id']}'")

            result = session.run("""
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id = $canonical_id
                RETURN f.canonical_id AS canonical_id,
                       f.name AS name,
                       f.wikidata_id AS wikidata_id
            """, {
                'canonical_id': test_figure['canonical_id']
            })

            matches = [record.data() for record in result]
            if matches:
                print(f"  ✅ Found {len(matches)} match(es) by canonical_id:")
                for match in matches:
                    print(f"     - {match['name']} (wikidata_id: {match['wikidata_id'] or 'None'})")
            else:
                print(f"  ❌ No matches found (unexpected!)")
            print()

    # Summary
    print("=" * 80)
    print("Summary")
    print("=" * 80)
    print()
    print("Dual-Key Duplicate Detection Logic:")
    print("  1. If Q-ID provided: Check both wikidata_id AND canonical_id")
    print("  2. If no Q-ID: Check only canonical_id")
    print()
    print("Expected Behavior:")
    print("  ✅ Figures with Q-IDs: canonical_id should equal Q-ID (e.g., 'Q517')")
    print("  ✅ Figures without Q-IDs: canonical_id should have PROV: prefix")
    print("  ✅ Duplicate prevention works via either wikidata_id or canonical_id match")
    print()

    driver.close()

if __name__ == '__main__':
    test_duplicate_detection()
