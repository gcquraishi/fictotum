#!/usr/bin/env python3
"""
Fictotum Character Connection Prioritization Analysis
Purpose: Identify and rank MediaWorks for character relationship expansion
Database: Neo4j Aura (instance c78564a4)
Author: Claude Code (Sonnet 4.5)
Date: 2026-01-18

SCHEMA NOTES:
- HistoricalFigure nodes connect to MediaWork via :APPEARS_IN relationships
- Character connections = :INTERACTED_WITH relationships between HistoricalFigures
- Goal: Find MediaWorks with multiple figures that should have INTERACTED_WITH links
"""

from neo4j import GraphDatabase
import os
from collections import defaultdict
import json

# Neo4j connection
uri = "neo4j+ssc://c78564a4.databases.neo4j.io"
username = "neo4j"
password = os.environ.get("NEO4J_PASSWORD", "ybSiNRTV9UxUb6PQuANZEeqECn2vz3ozXYiNzkdcMBk")

driver = GraphDatabase.driver(uri, auth=(username, password))

def run_query(query, parameters=None):
    """Execute a Cypher query and return results as list of dicts"""
    with driver.session() as session:
        result = session.run(query, parameters or {})
        return [record.data() for record in result]

def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)

def analyze_existing_character_interactions():
    """Find MediaWorks that have INTERACTED_WITH relationships between their figures"""
    print_section("ANALYSIS 1: MediaWorks with Existing Character Interactions")

    query = """
    MATCH (mw:MediaWork)<-[:APPEARS_IN]-(hf1:HistoricalFigure)
    MATCH (mw)<-[:APPEARS_IN]-(hf2:HistoricalFigure)
    WHERE hf1.canonical_id < hf2.canonical_id
    WITH mw, hf1, hf2
    OPTIONAL MATCH (hf1)-[int:INTERACTED_WITH]-(hf2)
    WITH mw, count(DISTINCT CASE WHEN int IS NOT NULL THEN hf1.canonical_id + '_' + hf2.canonical_id END) as interaction_count,
         count(DISTINCT hf1) + count(DISTINCT hf2) as total_figures
    WHERE interaction_count > 0
    RETURN mw.title as title,
           mw.wikidata_id as qid,
           mw.release_year as year,
           mw.media_type as type,
           total_figures,
           interaction_count
    ORDER BY interaction_count DESC
    LIMIT 30
    """

    results = run_query(query)
    print(f"\nFound {len(results)} MediaWorks with existing character interactions:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['title']} ({r['year']}) - Q{r['qid']}")
        print(f"   Type: {r['type']} | Figures: {r['total_figures']} | Interactions: {r['interaction_count']}")

    return results

def analyze_works_with_multiple_figures_no_interactions():
    """Find MediaWorks with multiple figures but NO character interaction relationships"""
    print_section("ANALYSIS 2: Works with Multiple Figures, No Interactions (HIGH PRIORITY)")

    query = """
    MATCH (mw:MediaWork)<-[:APPEARS_IN]-(hf:HistoricalFigure)
    WITH mw, collect(DISTINCT hf) as figures
    WHERE size(figures) >= 3
    UNWIND figures as f1
    UNWIND figures as f2
    WHERE f1.canonical_id < f2.canonical_id
    OPTIONAL MATCH (f1)-[int:INTERACTED_WITH]-(f2)
    WITH mw, figures, count(DISTINCT CASE WHEN int IS NOT NULL THEN f1.canonical_id + '_' + f2.canonical_id END) as interaction_count
    WHERE interaction_count = 0
    RETURN mw.title as title,
           mw.wikidata_id as qid,
           mw.release_year as year,
           mw.media_type as type,
           size(figures) as figure_count,
           [f IN figures[0..8] | f.name] as sample_figures
    ORDER BY figure_count DESC
    LIMIT 30
    """

    results = run_query(query)
    print(f"\nFound {len(results)} works with multiple figures but NO interactions:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['title']} ({r['year']}) - Q{r['qid']}")
        print(f"   Type: {r['type']} | Figures: {r['figure_count']}")
        if r['sample_figures']:
            print(f"   Figures: {', '.join(r['sample_figures'][:6])}")
            if len(r['sample_figures']) > 6:
                print(f"            ... and {len(r['sample_figures']) - 6} more")

    return results

def analyze_series_potential():
    """Find MediaWorks that might be part of series (same creator, similar titles)"""
    print_section("ANALYSIS 3: Potential Series/Franchise Works")

    query = """
    MATCH (mw:MediaWork)<-[:APPEARS_IN]-(hf:HistoricalFigure)
    WITH mw, count(DISTINCT hf) as fig_count
    WHERE fig_count >= 2
    MATCH (mw2:MediaWork)<-[:APPEARS_IN]-(hf2:HistoricalFigure)
    WHERE mw.media_id <> mw2.media_id
      AND mw.creator IS NOT NULL
      AND mw.creator = mw2.creator
      AND mw.media_type = mw2.media_type
    WITH mw, fig_count, count(DISTINCT mw2) as related_works
    WHERE related_works > 0
    RETURN mw.title as title,
           mw.wikidata_id as qid,
           mw.release_year as year,
           mw.creator as creator,
           mw.media_type as type,
           fig_count,
           related_works
    ORDER BY related_works DESC, fig_count DESC
    LIMIT 25
    """

    results = run_query(query)
    print(f"\nFound {len(results)} works that might be part of series:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['title']} ({r['year']}) - Q{r['qid']}")
        print(f"   Creator: {r['creator']} | Type: {r['type']}")
        print(f"   Figures: {r['fig_count']} | Related works by same creator: {r['related_works']}")

    return results

def analyze_high_figure_count_works():
    """Find works with many historical figures (likely need character interactions)"""
    print_section("ANALYSIS 4: Works with High Figure Counts (Character Network Potential)")

    query = """
    MATCH (mw:MediaWork)<-[:APPEARS_IN]-(hf:HistoricalFigure)
    WITH mw, collect(DISTINCT hf) as figures
    WHERE size(figures) >= 5
    UNWIND figures as f1
    UNWIND figures as f2
    WHERE f1.canonical_id < f2.canonical_id
    OPTIONAL MATCH (f1)-[int:INTERACTED_WITH]-(f2)
    WITH mw, figures,
         count(DISTINCT CASE WHEN int IS NOT NULL THEN f1.canonical_id + '_' + f2.canonical_id END) as interaction_count,
         size(figures) * (size(figures) - 1) / 2 as potential_interactions
    RETURN mw.title as title,
           mw.wikidata_id as qid,
           mw.release_year as year,
           mw.media_type as type,
           size(figures) as figure_count,
           interaction_count,
           potential_interactions,
           round(100.0 * interaction_count / potential_interactions, 1) as coverage_pct,
           [f IN figures[0..10] | f.name] as sample_figures
    ORDER BY potential_interactions DESC, coverage_pct ASC
    LIMIT 25
    """

    results = run_query(query)
    print(f"\nFound {len(results)} works with 5+ figures:\n")
    for i, r in enumerate(results, 1):
        print(f"{i}. {r['title']} ({r['year']}) - Q{r['qid']}")
        print(f"   Type: {r['type']} | Figures: {r['figure_count']}")
        print(f"   Interactions: {r['interaction_count']}/{r['potential_interactions']} ({r['coverage_pct']}% coverage)")
        if r['sample_figures']:
            print(f"   Sample: {', '.join(r['sample_figures'][:5])}...")

    return results

def analyze_historical_periods():
    """Find MediaWorks grouped by historical era"""
    print_section("ANALYSIS 5: Works Grouped by Historical Era")

    query = """
    MATCH (mw:MediaWork)<-[:APPEARS_IN]-(hf:HistoricalFigure)
    WHERE hf.era IS NOT NULL
    WITH mw, collect(DISTINCT hf.era) as eras, count(DISTINCT hf) as fig_count
    WHERE fig_count >= 3
    UNWIND eras as era
    WITH era, collect(DISTINCT {title: mw.title, qid: mw.wikidata_id, year: mw.release_year, figs: fig_count}) as works
    RETURN era,
           size(works) as work_count,
           works[0..10] as sample_works
    ORDER BY work_count DESC
    LIMIT 15
    """

    results = run_query(query)
    print(f"\nFound {len(results)} historical eras with multiple works:\n")
    for i, r in enumerate(results, 1):
        print(f"\n{i}. Era: {r['era']} ({r['work_count']} works)")
        for w in r['sample_works'][:5]:
            print(f"   - {w['title']} ({w['year']}) - Q{w['qid']} - {w['figs']} figures")
        if r['work_count'] > 5:
            print(f"   ... and {r['work_count'] - 5} more works")

    return results

def generate_database_summary():
    """Generate overall database statistics"""
    print_section("DATABASE SUMMARY")

    summary_queries = {
        "basic_stats": """
        MATCH (mw:MediaWork)
        OPTIONAL MATCH (mw)<-[:APPEARS_IN]-(hf:HistoricalFigure)
        WITH count(DISTINCT mw) as total_media,
             count(DISTINCT hf) as total_figures,
             count(DISTINCT CASE WHEN hf IS NOT NULL THEN mw END) as media_with_figures
        MATCH (f1:HistoricalFigure)-[int:INTERACTED_WITH]-(f2:HistoricalFigure)
        RETURN total_media, total_figures, media_with_figures,
               count(DISTINCT int) as total_interactions
        """,
        "appears_in_count": """
        MATCH (:HistoricalFigure)-[r:APPEARS_IN]->(:MediaWork)
        RETURN count(r) as total_appears_in
        """
    }

    basic = run_query(summary_queries["basic_stats"])[0]
    appears = run_query(summary_queries["appears_in_count"])[0]

    print(f"\nTotal MediaWorks: {basic['total_media']}")
    print(f"Total HistoricalFigures: {basic['total_figures']}")
    print(f"MediaWorks with figures: {basic['media_with_figures']}")
    print(f"Total APPEARS_IN relationships: {appears['total_appears_in']}")
    print(f"Total INTERACTED_WITH relationships: {basic['total_interactions']}")

    coverage_pct = (basic['media_with_figures'] / basic['total_media'] * 100) if basic['total_media'] > 0 else 0
    print(f"\nFigure coverage: {coverage_pct:.1f}%")

    return basic

def generate_prioritization_report(no_interaction_works, high_figure_works):
    """Generate final prioritization ranking"""
    print_section("PRIORITIZATION REPORT: TOP 15 TARGETS FOR CHARACTER INTERACTIONS")

    # Combine and rank
    priorities = []

    # Add works with no interactions (highest priority)
    for w in no_interaction_works[:10]:
        priorities.append({
            'title': w['title'],
            'qid': w['qid'],
            'year': w['year'],
            'type': w['type'],
            'figure_count': w['figure_count'],
            'interaction_count': 0,
            'priority': 'CRITICAL' if w['figure_count'] >= 8 else 'HIGH',
            'reason': f"{w['figure_count']} figures, zero character interactions defined"
        })

    # Add high-figure works with partial coverage
    for w in high_figure_works:
        if w['coverage_pct'] < 50 and w['figure_count'] >= 6:
            priorities.append({
                'title': w['title'],
                'qid': w['qid'],
                'year': w['year'],
                'type': w['type'],
                'figure_count': w['figure_count'],
                'interaction_count': w['interaction_count'],
                'priority': 'MEDIUM',
                'reason': f"{w['figure_count']} figures, only {w['coverage_pct']}% interaction coverage"
            })

    # Remove duplicates and limit to top 15
    seen = set()
    unique_priorities = []
    for p in priorities:
        if p['qid'] not in seen:
            seen.add(p['qid'])
            unique_priorities.append(p)
            if len(unique_priorities) >= 15:
                break

    print("\n")
    print(f"{'Rank':<5} {'Title':<40} {'Year':<6} {'Figs':<5} {'Int':<4} {'Priority':<10}")
    print("-" * 110)

    for i, p in enumerate(unique_priorities, 1):
        title = p['title'][:38] + ".." if len(p['title']) > 40 else p['title']
        print(f"{i:<5} {title:<40} {p['year']:<6} {p['figure_count']:<5} {p['interaction_count']:<4} {p['priority']:<10}")
        print(f"      → {p['reason']}")

    return unique_priorities

def main():
    """Main analysis pipeline"""
    print("\n" + "=" * 80)
    print("Fictotum Character Connection Prioritization Analysis")
    print("=" * 80)

    try:
        # Run all analyses
        summary = generate_database_summary()
        existing_interactions = analyze_existing_character_interactions()
        no_interactions = analyze_works_with_multiple_figures_no_interactions()
        series_potential = analyze_series_potential()
        high_figure_works = analyze_high_figure_count_works()
        eras = analyze_historical_periods()
        prioritization = generate_prioritization_report(no_interactions, high_figure_works)

        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETE")
        print("=" * 80)
        print(f"\nTotal MediaWorks analyzed: {summary['total_media']}")
        print(f"Works with figures: {summary['media_with_figures']} ({summary['media_with_figures']/summary['total_media']*100:.1f}%)")
        print(f"Total INTERACTED_WITH relationships: {summary['total_interactions']}")
        print(f"\nTop targets identified: {len(prioritization)}")
        print(f"\nRECOMMENDATION:")
        print(f"  Focus on works with 5+ historical figures and zero character interactions.")
        print(f"  These represent the highest value targets for building character networks.")
        print(f"  Estimated effort: 2-5 interactions per work for {len(prioritization)} works = 30-75 relationships")

    except Exception as e:
        print(f"\nError during analysis: {e}")
        import traceback
        traceback.print_exc()
    finally:
        driver.close()

if __name__ == "__main__":
    main()
