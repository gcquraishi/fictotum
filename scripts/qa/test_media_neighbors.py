#!/usr/bin/env python3
"""
Test script to verify media node expansion
Queries high-connectivity media works in Neo4j to validate expansion logic
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

def test_high_connectivity_media():
    """Find media with highest connectivity for testing"""
    with driver.session() as session:
        # Find top 10 most connected media works
        result = session.run("""
            MATCH (m:MediaWork)
            WITH m, COUNT { (m)<-[:APPEARS_IN]-() } as figure_count
            WHERE figure_count > 0
            RETURN m.wikidata_id as qid, m.title as title,
                   m.release_year as year, figure_count
            ORDER BY figure_count DESC
            LIMIT 10
        """)

        print("\n=== TOP 10 MEDIA WORKS BY FIGURE COUNT ===")
        print(f"{'Q-ID':<15} {'Title':<50} {'Year':<10} {'Figures':<10}")
        print("-" * 95)

        top_media = []
        for record in result:
            top_media.append(record)
            year = record['year'] if record['year'] else 'N/A'
            print(f"{record['qid']:<15} {record['title'][:48]:<50} {str(year):<10} {record['figure_count']:<10}")

        return top_media


def test_media_expansion(wikidata_id, title):
    """Test the exact query used in getNodeNeighbors() for media nodes"""
    print(f"\n\n=== TESTING MEDIA EXPANSION: {title} (Q{wikidata_id}) ===")

    with driver.session() as session:
        # Test APPEARS_IN query (matches line 579-582)
        print("\n--- Query: APPEARS_IN relationships (Figures) ---")
        result = session.run("""
            MATCH (m:MediaWork {wikidata_id: $nodeId})<-[r:APPEARS_IN]-(f:HistoricalFigure)
            RETURN f, r
            LIMIT 50
        """, nodeId=wikidata_id)

        figures = list(result)
        print(f"Found {len(figures)} figures (LIMIT 50)")

        if figures:
            print("\nSample figures:")
            for i, record in enumerate(figures[:10]):
                figure = record['f']
                rel = record['r']
                print(f"  {i+1}. {figure['name']} ({figure['canonical_id']}) - Sentiment: {rel.get('sentiment', 'N/A')}")

        # Check if LIMIT is exceeded
        print("\n--- Checking if LIMIT 50 is sufficient ---")
        total_figures = session.run("""
            MATCH (m:MediaWork {wikidata_id: $nodeId})<-[:APPEARS_IN]-(f:HistoricalFigure)
            RETURN count(f) as total
        """, nodeId=wikidata_id).single()['total']

        print(f"Total APPEARS_IN: {total_figures} (returning {min(total_figures, 50)})")

        if total_figures > 50:
            print("⚠️  WARNING: LIMIT 50 is being exceeded! Some figures will be hidden.")
        else:
            print("✓ LIMIT 50 is sufficient for this media work")

        return len(figures)


def test_edge_cases():
    """Test edge cases for media expansion"""
    print("\n\n=== TESTING EDGE CASES ===")

    with driver.session() as session:
        # Find a media work with NO figures
        print("\n--- Case 1: Media with no figures ---")
        result = session.run("""
            MATCH (m:MediaWork)
            WHERE NOT (m)<-[:APPEARS_IN]-()
            RETURN m.wikidata_id as qid, m.title as title
            LIMIT 1
        """)

        no_figures = result.single()
        if no_figures:
            print(f"Testing: {no_figures['title']} (Q{no_figures['qid']})")
            test_media_expansion(no_figures['qid'], no_figures['title'])
        else:
            print("✓ All media works have at least one figure")


if __name__ == "__main__":
    print("=" * 95)
    print("MEDIA NODE EXPANSION TEST")
    print("=" * 95)

    # Step 1: Find high-connectivity media
    top_media = test_high_connectivity_media()

    # Step 2: Test expansion logic on top 3 media works
    print("\n" + "=" * 95)
    print("DETAILED EXPANSION TESTS (Top 3 Media Works)")
    print("=" * 95)

    for i, media in enumerate(top_media[:3]):
        test_media_expansion(media['qid'], media['title'])

    # Step 3: Test edge cases
    test_edge_cases()

    print("\n" + "=" * 95)
    print("MEDIA AUDIT COMPLETE")
    print("=" * 95)

    driver.close()
