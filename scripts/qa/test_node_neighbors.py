#!/usr/bin/env python3
"""
Test script to verify getNodeNeighbors() backend readiness
Queries high-connectivity figures in Neo4j to validate expansion logic
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load from .env file
load_dotenv()
driver = GraphDatabase.driver(
    os.getenv('NEO4J_URI'),
    auth=(os.getenv('NEO4J_USERNAME'), os.getenv('NEO4J_PASSWORD'))
)

def test_high_connectivity_figures():
    """Find figures with highest connectivity for testing"""
    with driver.session() as session:
        # Find top 10 most connected figures
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WITH f,
                 COUNT { (f)-[:APPEARS_IN]->() } as media_count,
                 COUNT { (f)-[:INTERACTED_WITH]-() } as interaction_count
            WITH f, media_count, interaction_count, (media_count + interaction_count) as total
            WHERE total > 0
            RETURN f.canonical_id as id, f.name as name,
                   media_count, interaction_count, total
            ORDER BY total DESC
            LIMIT 10
        """)

        print("\n=== TOP 10 MOST CONNECTED FIGURES ===")
        print(f"{'Canonical ID':<30} {'Name':<30} {'Media':<10} {'Interact':<10} {'Total':<10}")
        print("-" * 100)

        top_figures = []
        for record in result:
            top_figures.append(record)
            print(f"{record['id']:<30} {record['name']:<30} {record['media_count']:<10} {record['interaction_count']:<10} {record['total']:<10}")

        return top_figures


def test_figure_expansion(canonical_id, name):
    """Test the exact queries used in getNodeNeighbors() for a specific figure"""
    print(f"\n\n=== TESTING FIGURE EXPANSION: {name} ({canonical_id}) ===")

    with driver.session() as session:
        # Test APPEARS_IN query (matches line 610-612)
        print("\n--- Query 1: APPEARS_IN relationships (Media Works) ---")
        media_result = session.run("""
            MATCH (f:HistoricalFigure {canonical_id: $nodeId})-[r:APPEARS_IN]->(m:MediaWork)
            RETURN m, r
            LIMIT 50
        """, nodeId=canonical_id)

        media_works = list(media_result)
        print(f"Found {len(media_works)} media works (LIMIT 50)")

        if media_works:
            print("\nSample media works:")
            for i, record in enumerate(media_works[:5]):
                media = record['m']
                rel = record['r']
                print(f"  {i+1}. {media['title']} (Q{media['wikidata_id']}) - Sentiment: {rel.get('sentiment', 'N/A')}")

        # Test INTERACTED_WITH query (matches line 641-644)
        print("\n--- Query 2: INTERACTED_WITH relationships (Other Figures) ---")
        social_result = session.run("""
            MATCH (f:HistoricalFigure {canonical_id: $nodeId})-[r:INTERACTED_WITH]-(h:HistoricalFigure)
            RETURN h, r
            LIMIT 50
        """, nodeId=canonical_id)

        interactions = list(social_result)
        print(f"Found {len(interactions)} interactions (LIMIT 50)")

        if interactions:
            print("\nSample interactions:")
            for i, record in enumerate(interactions[:5]):
                other = record['h']
                rel = record['r']
                print(f"  {i+1}. {other['name']} ({other['canonical_id']}) - Type: {rel.get('interaction_type', 'N/A')}")

        # Check for edge case: what if LIMIT is exceeded?
        print("\n--- Checking if LIMIT 50 is sufficient ---")
        total_media = session.run("""
            MATCH (f:HistoricalFigure {canonical_id: $nodeId})-[:APPEARS_IN]->(m:MediaWork)
            RETURN count(m) as total
        """, nodeId=canonical_id).single()['total']

        total_interactions = session.run("""
            MATCH (f:HistoricalFigure {canonical_id: $nodeId})-[:INTERACTED_WITH]-(h:HistoricalFigure)
            RETURN count(h) as total
        """, nodeId=canonical_id).single()['total']

        print(f"Total APPEARS_IN: {total_media} (returning {min(total_media, 50)})")
        print(f"Total INTERACTED_WITH: {total_interactions} (returning {min(total_interactions, 50)})")

        if total_media > 50 or total_interactions > 50:
            print("⚠️  WARNING: LIMIT 50 is being exceeded! Some connections will be hidden.")
        else:
            print("✓ LIMIT 50 is sufficient for this figure")

        return len(media_works), len(interactions)


def test_edge_cases():
    """Test edge cases for getNodeNeighbors()"""
    print("\n\n=== TESTING EDGE CASES ===")

    with driver.session() as session:
        # Find a figure with NO connections
        print("\n--- Case 1: Figure with no connections ---")
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE NOT (f)-[:APPEARS_IN]->() AND NOT (f)-[:INTERACTED_WITH]-()
            RETURN f.canonical_id as id, f.name as name
            LIMIT 1
        """)

        no_connection = result.single()
        if no_connection:
            print(f"Testing: {no_connection['name']} ({no_connection['id']})")
            test_figure_expansion(no_connection['id'], no_connection['name'])
        else:
            print("✓ All figures have at least one connection")

        # Find a figure with ONLY APPEARS_IN
        print("\n--- Case 2: Figure with ONLY APPEARS_IN (no interactions) ---")
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE (f)-[:APPEARS_IN]->() AND NOT (f)-[:INTERACTED_WITH]-()
            WITH f, COUNT { (f)-[:APPEARS_IN]->() } as media_count
            RETURN f.canonical_id as id, f.name as name, media_count
            ORDER BY media_count DESC
            LIMIT 1
        """)

        only_media = result.single()
        if only_media:
            print(f"Testing: {only_media['name']} ({only_media['id']}) - {only_media['media_count']} media works")
            test_figure_expansion(only_media['id'], only_media['name'])
        else:
            print("✓ No figures with ONLY APPEARS_IN found")

        # Find a figure with ONLY INTERACTED_WITH
        print("\n--- Case 3: Figure with ONLY INTERACTED_WITH (no media) ---")
        result = session.run("""
            MATCH (f:HistoricalFigure)
            WHERE NOT (f)-[:APPEARS_IN]->() AND (f)-[:INTERACTED_WITH]-()
            WITH f, COUNT { (f)-[:INTERACTED_WITH]-() } as interaction_count
            RETURN f.canonical_id as id, f.name as name, interaction_count
            ORDER BY interaction_count DESC
            LIMIT 1
        """)

        only_interactions = result.single()
        if only_interactions:
            print(f"Testing: {only_interactions['name']} ({only_interactions['id']}) - {only_interactions['interaction_count']} interactions")
            test_figure_expansion(only_interactions['id'], only_interactions['name'])
        else:
            print("✓ No figures with ONLY INTERACTED_WITH found")


def test_bidirectional_deduplication():
    """Test if bidirectional INTERACTED_WITH relationships create duplicates"""
    print("\n\n=== TESTING BIDIRECTIONAL RELATIONSHIP HANDLING ===")

    with driver.session() as session:
        # Check if relationships are bidirectional
        result = session.run("""
            MATCH (f1:HistoricalFigure)-[r:INTERACTED_WITH]-(f2:HistoricalFigure)
            RETURN f1.canonical_id as fig1, f2.canonical_id as fig2,
                   id(r) as rel_id
            LIMIT 10
        """)

        print("\nSample bidirectional relationships:")
        for record in result:
            print(f"  {record['fig1']} <-> {record['fig2']} (rel_id: {record['rel_id']})")

        # The query uses undirected pattern: -[r:INTERACTED_WITH]-
        # This will return the same relationship twice if queried from both sides
        print("\n⚠️  NOTE: The Cypher pattern `-[r:INTERACTED_WITH]-` is undirected.")
        print("This means it matches relationships in BOTH directions.")
        print("The current implementation (lines 641-644) should NOT create duplicates")
        print("because it only expands from ONE node at a time.")


if __name__ == "__main__":
    print("=" * 100)
    print("BACKEND VERIFICATION: getNodeNeighbors() Function Audit")
    print("=" * 100)

    # Step 1: Find high-connectivity figures
    top_figures = test_high_connectivity_figures()

    # Step 2: Test expansion logic on top 3 figures
    print("\n" + "=" * 100)
    print("DETAILED EXPANSION TESTS (Top 3 Figures)")
    print("=" * 100)

    for i, fig in enumerate(top_figures[:3]):
        test_figure_expansion(fig['id'], fig['name'])

    # Step 3: Test edge cases
    test_edge_cases()

    # Step 4: Test bidirectional handling
    test_bidirectional_deduplication()

    print("\n" + "=" * 100)
    print("AUDIT COMPLETE")
    print("=" * 100)

    driver.close()
