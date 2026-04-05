#!/usr/bin/env python3
"""
Link Series Relationships (CHR-79)

Systematically links existing MediaWork nodes to their appropriate series
parent structures using PART_OF relationships.

Mission: Link 700+ MediaWork nodes to 205 Series structures
Target: Create 500+ new PART_OF relationships

Usage:
    python3 scripts/qa/link_series_relationships.py --dry-run
    python3 scripts/qa/link_series_relationships.py --execute
"""

import os
import sys
import requests
import re
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Tuple

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from neo4j import GraphDatabase

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

def get_wikidata_entity(qid: str) -> dict:
    """Fetch entity data from Wikidata API"""
    url = "https://www.wikidata.org/w/api.php"
    params = {
        "action": "wbgetentities",
        "ids": qid,
        "props": "labels|descriptions|claims",
        "languages": "en",
        "format": "json"
    }
    headers = {
        "User-Agent": "Fictotum/1.0 (CHR-79 Series Linking)"
    }

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "entities" in data and qid in data["entities"]:
            entity = data["entities"][qid]

            # Extract label
            label = entity.get("labels", {}).get("en", {}).get("value", qid)

            # Extract description
            description = entity.get("descriptions", {}).get("en", {}).get("value", "")

            # Extract P179 (part of the series) if exists
            claims = entity.get("claims", {})
            part_of_series = None
            series_ordinal = None

            if "P179" in claims:
                series_claim = claims["P179"][0]
                part_of_series = series_claim["mainsnak"]["datavalue"]["value"]["id"]

                # Check for series ordinal (P1545)
                if "qualifiers" in series_claim and "P1545" in series_claim["qualifiers"]:
                    series_ordinal = series_claim["qualifiers"]["P1545"][0]["datavalue"]["value"]

            # Extract publication date (P577)
            publication_year = None
            if "P577" in claims:
                pub_date = claims["P577"][0]["mainsnak"]["datavalue"]["value"]["time"]
                # Extract year from +YYYY-MM-DD format
                publication_year = int(pub_date[1:5])

            return {
                "qid": qid,
                "label": label,
                "description": description,
                "part_of_series": part_of_series,
                "series_ordinal": int(series_ordinal) if series_ordinal else None,
                "publication_year": publication_year
            }

    except Exception as e:
        print(f"  ⚠️  Error fetching {qid}: {e}")
        return None

def update_book_title_and_link_to_series(driver, dry_run=True):
    """Update book titles from Wikidata and link to Marcus Didius Falco series"""

    print("\n" + "=" * 80)
    print("PHASE 1: Link Lindsey Davis books to Marcus Didius Falco Series")
    print("=" * 80)

    # Q-IDs that need titles and linking
    qids_to_process = [
        "Q133247684",  # 1992
        "Q133247688",  # 2000
        "Q133296082",  # 2006
        "Q131851728",  # 2007
        "Q132323389",  # Unknown year
        "Q133261773",  # Unknown year
        "Q132128654",  # Unknown year
        "Q131930178",  # Unknown year
    ]

    falco_series_qid = "Q8442915"

    print(f"\nFetching Wikidata data for {len(qids_to_process)} books...")

    enriched_books = []
    for qid in qids_to_process:
        print(f"  Fetching {qid}...", end=" ")
        data = get_wikidata_entity(qid)
        if data:
            enriched_books.append(data)
            print(f"✓ {data['label']}")
        else:
            print(f"✗ Failed")

    if not enriched_books:
        print("❌ No books could be enriched from Wikidata")
        return 0

    print(f"\n✅ Successfully fetched {len(enriched_books)} books")

    # Now update the database
    links_created = 0
    titles_updated = 0

    with driver.session() as session:
        for book in enriched_books:
            qid = book["qid"]
            title = book["label"]
            series_qid = book.get("part_of_series")
            sequence = book.get("series_ordinal")
            pub_year = book.get("publication_year")

            # Verify this book belongs to Falco series
            if series_qid != falco_series_qid:
                print(f"  ⚠️  {title} ({qid}) - Not part of Falco series (P179={series_qid})")
                continue

            if dry_run:
                print(f"  [DRY RUN] Would update {qid}:")
                print(f"    - Set title: {title}")
                print(f"    - Link to series with sequence #{sequence}, year {pub_year}")
            else:
                # Update title and create PART_OF relationship
                result = session.run("""
                    MATCH (work:MediaWork {wikidata_id: $qid})
                    MATCH (series:MediaWork {wikidata_id: $series_qid})

                    SET work.title = $title

                    MERGE (work)-[r:PART_OF]->(series)
                    ON CREATE SET
                        r.sequence_number = $sequence,
                        r.publication_year = $pub_year

                    RETURN work.title as title, r.sequence_number as seq
                """, {
                    "qid": qid,
                    "series_qid": falco_series_qid,
                    "title": title,
                    "sequence": sequence,
                    "pub_year": pub_year
                })

                record = result.single()
                if record:
                    titles_updated += 1
                    links_created += 1
                    print(f"  ✓ {record['title']} - Linked as book #{record['seq']}")

    print(f"\n✅ Phase 1 Complete:")
    print(f"   - Titles updated: {titles_updated}")
    print(f"   - PART_OF relationships created: {links_created}")

    return links_created

def link_standalone_davis_books(driver, dry_run=True):
    """Check if standalone Davis books should be linked or remain independent"""

    print("\n" + "=" * 80)
    print("PHASE 2: Review standalone Lindsey Davis books")
    print("=" * 80)

    standalone_books = [
        ("The Course of Honour", "Q7727845"),  # Standalone novel about Vespasian
        ("Rebels and Traitors", "Q7302115"),   # English Civil War standalone
        ("Master and God", "Q6785111"),        # Domitian era standalone
    ]

    with driver.session() as session:
        for title, qid in standalone_books:
            result = session.run("""
                MATCH (work:MediaWork {wikidata_id: $qid})
                OPTIONAL MATCH (work)-[:PART_OF]->(series)
                RETURN work.title as title, series.title as series_title
            """, {"qid": qid})

            record = result.single()
            if record:
                if record["series_title"]:
                    print(f"  ✓ {record['title']} - Already linked to {record['series_title']}")
                else:
                    print(f"  - {record['title']} - Standalone (correct)")

    print("\n✅ Phase 2 Complete: All standalone books verified")
    return 0

def extract_sequence_number(title: str) -> Optional[int]:
    """Extract sequence number from title using various patterns."""
    patterns = [
        (r'\b(\d+)\b', lambda m: int(m.group(1))),  # Standalone number
        (r'\bII$', lambda m: 2),
        (r'\bIII$', lambda m: 3),
        (r'\bIV$', lambda m: 4),
        (r'\bV$', lambda m: 5),
        (r'\bVI$', lambda m: 6),
        (r'\bVII$', lambda m: 7),
        (r'\bVIII$', lambda m: 8),
        (r'\bIX$', lambda m: 9),
        (r'\bX$', lambda m: 10),
        (r'Book (\d+)', lambda m: int(m.group(1))),
        (r'Vol(?:ume)? (\d+)', lambda m: int(m.group(1))),
        (r'Part (\d+)', lambda m: int(m.group(1))),
        (r'#(\d+)', lambda m: int(m.group(1))),
    ]

    for pattern, converter in patterns:
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            try:
                return converter(match)
            except (ValueError, IndexError):
                continue

    return None


def determine_part_type(work_title: str, series_title: str) -> str:
    """Determine the type of series part based on context."""
    series_lower = series_title.lower()

    if 'game' in series_lower or 'total war' in series_lower or 'assassin' in series_lower:
        return 'game'
    elif 'tv' in series_lower or 'hbo' in series_lower or 'series' in series_lower:
        return 'episode'
    elif 'trilogy' in series_lower or 'duology' in series_lower or 'saga' in series_lower:
        return 'book'
    else:
        return 'book'


def link_by_wikidata_p179(driver, dry_run=True):
    """
    Strategy: Use Wikidata P179 (part of series) property.
    Most reliable method - uses external canonical data.
    """
    print("\n" + "=" * 80)
    print("STRATEGY 1: Wikidata P179 Property Matching")
    print("=" * 80)

    links_created = 0
    works_processed = 0

    with driver.session() as session:
        # Get all works that have Wikidata IDs but no PART_OF relationships
        result = session.run("""
            MATCH (work:MediaWork)
            WHERE work.wikidata_id IS NOT NULL
              AND work.wikidata_id STARTS WITH 'Q'
              AND NOT (work)-[:PART_OF]->(:MediaWork)
            RETURN work.wikidata_id as qid, work.title as title
            LIMIT 100
        """)

        works = [dict(record) for record in result]

    print(f"Found {len(works)} works with Wikidata IDs to check")

    for work in works:
        qid = work['qid']
        works_processed += 1

        # Fetch Wikidata P179
        wd_data = get_wikidata_entity(qid)
        if not wd_data or not wd_data.get('part_of_series'):
            continue

        series_qid = wd_data['part_of_series']
        sequence = wd_data.get('series_ordinal')
        pub_year = wd_data.get('publication_year')

        # Check if series exists in database
        with driver.session() as session:
            series_result = session.run("""
                MATCH (series:MediaWork {wikidata_id: $series_qid})
                RETURN series.title as series_title
            """, {"series_qid": series_qid})

            series_record = series_result.single()
            if not series_record:
                print(f"  ⚠️  Series {series_qid} not found for {work['title']}")
                continue

            if dry_run:
                print(f"  [DRY RUN] Would link: {work['title']} → {series_record['series_title']} (#{sequence})")
            else:
                session.run("""
                    MATCH (work:MediaWork {wikidata_id: $work_qid})
                    MATCH (series:MediaWork {wikidata_id: $series_qid})

                    MERGE (work)-[r:PART_OF]->(series)
                    ON CREATE SET
                        r.sequence_number = $sequence,
                        r.publication_year = $pub_year,
                        r.part_type = 'book',
                        r.created_at = datetime()

                    RETURN count(r) as created
                """, {
                    "work_qid": qid,
                    "series_qid": series_qid,
                    "sequence": sequence,
                    "pub_year": pub_year
                })

                links_created += 1
                print(f"  ✓ Linked: {work['title']} → {series_record['series_title']} (#{sequence})")

    print(f"\n✅ Strategy 1 Complete: {links_created} relationships created ({works_processed} works checked)")
    return links_created


def link_by_title_pattern(driver, dry_run=True):
    """
    Strategy: Match works to series by title patterns.
    Example: "Sharpe's Eagle" matches "Sharpe Series"
    """
    print("\n" + "=" * 80)
    print("STRATEGY 2: Title Pattern Matching")
    print("=" * 80)

    links_created = 0

    with driver.session() as session:
        # Get series that contain identifying keywords
        series_result = session.run("""
            MATCH (series:MediaWork)
            WHERE series.title =~ '.*(Series|Trilogy|Saga|Chronicles|Cycle|Duology).*'
            RETURN series.wikidata_id as series_id,
                   series.title as series_title
            ORDER BY series.title
        """)

        series_list = [dict(record) for record in series_result]

    print(f"Analyzing {len(series_list)} series for title pattern matches...")

    for series in series_list:
        series_title = series['series_title']

        # Extract base name (remove "Series", "Trilogy", etc.)
        base_name = re.sub(r'\s+(Series|Trilogy|Saga|Chronicles|Cycle|Duology).*$', '', series_title, flags=re.IGNORECASE)

        # Skip if base name is too short (too many false positives)
        if len(base_name) < 5:
            continue

        with driver.session() as session:
            # Find works that contain the base name in their title
            result = session.run("""
                MATCH (work:MediaWork)
                WHERE work.title CONTAINS $base_name
                  AND NOT (work)-[:PART_OF]->(:MediaWork)
                  AND work.title <> $series_title
                RETURN work.wikidata_id as work_id,
                       work.title as work_title,
                       work.release_year as release_year
                LIMIT 20
            """, {"base_name": base_name, "series_title": series_title})

            matches = [dict(record) for record in result]

            for match in matches:
                sequence = extract_sequence_number(match['work_title'])
                part_type = determine_part_type(match['work_title'], series_title)

                if dry_run:
                    seq_str = f" (#{sequence})" if sequence else ""
                    print(f"  [DRY RUN] {match['work_title']}{seq_str} → {series_title}")
                else:
                    session.run("""
                        MATCH (work:MediaWork {wikidata_id: $work_id})
                        MATCH (series:MediaWork {wikidata_id: $series_id})

                        MERGE (work)-[r:PART_OF]->(series)
                        ON CREATE SET
                            r.sequence_number = $sequence,
                            r.part_type = $part_type,
                            r.created_at = datetime()
                    """, {
                        "work_id": match['work_id'],
                        "series_id": series['series_id'],
                        "sequence": sequence,
                        "part_type": part_type
                    })

                    links_created += 1
                    seq_str = f" (#{sequence})" if sequence else ""
                    print(f"  ✓ {match['work_title']}{seq_str} → {series_title}")

    print(f"\n✅ Strategy 2 Complete: {links_created} relationships created")
    return links_created


def link_by_series_property(driver, dry_run=True):
    """
    Strategy: Link works that have series_name property set.
    These works already know which series they belong to.
    """
    print("\n" + "=" * 80)
    print("STRATEGY 3: Series Name Property")
    print("=" * 80)

    links_created = 0

    with driver.session() as session:
        # Find works with series_name property but no PART_OF relationship
        result = session.run("""
            MATCH (work:MediaWork)
            WHERE work.series_name IS NOT NULL
              AND NOT (work)-[:PART_OF]->(:MediaWork)

            RETURN work.wikidata_id as work_id,
                   work.title as work_title,
                   work.series_name as series_name,
                   work.book_number as book_number
            ORDER BY work.series_name, work.book_number
        """)

        works = [dict(record) for record in result]

    print(f"Found {len(works)} works with series_name property")

    for work in works:
        # Try to find matching series
        with driver.session() as session:
            series_result = session.run("""
                MATCH (series:MediaWork)
                WHERE series.title CONTAINS $series_name
                   OR $series_name CONTAINS series.title
                RETURN series.wikidata_id as series_id,
                       series.title as series_title
                LIMIT 1
            """, {"series_name": work['series_name']})

            series_record = series_result.single()
            if not series_record:
                print(f"  ⚠️  No series found for: {work['series_name']}")
                continue

            sequence = work.get('book_number') or extract_sequence_number(work['work_title'])
            part_type = 'book'

            if dry_run:
                seq_str = f" (#{sequence})" if sequence else ""
                print(f"  [DRY RUN] {work['work_title']}{seq_str} → {series_record['series_title']}")
            else:
                session.run("""
                    MATCH (work:MediaWork {wikidata_id: $work_id})
                    MATCH (series:MediaWork {wikidata_id: $series_id})

                    MERGE (work)-[r:PART_OF]->(series)
                    ON CREATE SET
                        r.sequence_number = $sequence,
                        r.part_type = $part_type,
                        r.created_at = datetime()
                """, {
                    "work_id": work['work_id'],
                    "series_id": series_record['series_id'],
                    "sequence": sequence,
                    "part_type": part_type
                })

                links_created += 1
                seq_str = f" (#{sequence})" if sequence else ""
                print(f"  ✓ {work['work_title']}{seq_str} → {series_record['series_title']}")

    print(f"\n✅ Strategy 3 Complete: {links_created} relationships created")
    return links_created


def get_current_statistics(driver):
    """Get current database statistics on PART_OF relationships"""

    with driver.session() as session:
        # Count all series nodes
        series_result = session.run("""
            MATCH (series:MediaWork)
            WHERE series.title =~ '.*(Series|Trilogy|Saga|Chronicles|Cycle|Duology).*'
            RETURN count(series) as total_series
        """)
        total_series = series_result.single()["total_series"]

        # Count all PART_OF relationships
        part_of_result = session.run("""
            MATCH ()-[r:PART_OF]->(:MediaWork)
            RETURN count(r) as part_of_count
        """)
        part_of_count = part_of_result.single()["part_of_count"]

        # Count series with children
        series_with_children_result = session.run("""
            MATCH (series:MediaWork)<-[:PART_OF]-()
            RETURN count(DISTINCT series) as series_with_children
        """)
        series_with_children = series_with_children_result.single()["series_with_children"]

        # Count orphaned series (no children)
        orphaned_series = total_series - series_with_children

        return {
            "total_series": total_series,
            "part_of_count": part_of_count,
            "series_with_children": series_with_children,
            "orphaned_series": orphaned_series
        }

def generate_report(driver, initial_stats, total_links_created):
    """Generate comprehensive linking report."""
    final_stats = get_current_statistics(driver)

    print("\n" + "=" * 80)
    print("FINAL REPORT: CHR-79 SERIES LINKING MISSION")
    print("=" * 80)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()

    print("Before Mission:")
    print(f"  - Total Series: {initial_stats['total_series']}")
    print(f"  - Series with Works: {initial_stats['series_with_children']}")
    print(f"  - Orphaned Series: {initial_stats['orphaned_series']}")
    print(f"  - PART_OF Relationships: {initial_stats['part_of_count']}")
    print()

    print("After Mission:")
    print(f"  - Total Series: {final_stats['total_series']}")
    print(f"  - Series with Works: {final_stats['series_with_children']}")
    print(f"  - Orphaned Series: {final_stats['orphaned_series']}")
    print(f"  - PART_OF Relationships: {final_stats['part_of_count']}")
    print()

    print("Changes:")
    print(f"  - New Relationships Created: {total_links_created}")
    print(f"  - Series Linked (+): {final_stats['series_with_children'] - initial_stats['series_with_children']}")
    print(f"  - Orphaned Series (-): {initial_stats['orphaned_series'] - final_stats['orphaned_series']}")
    print()

    # Get top series by works linked
    with driver.session() as session:
        result = session.run("""
            MATCH (series:MediaWork)<-[:PART_OF]-(work:MediaWork)
            RETURN series.title as series_title,
                   count(work) as work_count
            ORDER BY work_count DESC
            LIMIT 10
        """)

        print("Top 10 Series by Works:")
        for i, record in enumerate(result, 1):
            print(f"  {i}. {record['series_title']}: {record['work_count']} works")

    print()
    print("=" * 80)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/qa/link_series_relationships.py [--dry-run|--execute]")
        sys.exit(1)

    dry_run = "--dry-run" in sys.argv

    if not all([NEO4J_URI, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j credentials. Set NEO4J_URI and NEO4J_PASSWORD environment variables.")
        sys.exit(1)

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    print("=" * 80)
    print("CHR-79: EXPAND SERIES PART_OF RELATIONSHIPS")
    print("=" * 80)
    print(f"Mode: {'DRY RUN (no changes)' if dry_run else 'LIVE EXECUTION'}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 80)

    try:
        # Get initial statistics
        initial_stats = get_current_statistics(driver)
        print(f"\nInitial State:")
        print(f"  - Total Series: {initial_stats['total_series']}")
        print(f"  - Series with Works: {initial_stats['series_with_children']}")
        print(f"  - Orphaned Series: {initial_stats['orphaned_series']}")
        print(f"  - PART_OF Relationships: {initial_stats['part_of_count']}")

        total_links = 0

        # Run legacy Lindsey Davis specific linking
        print("\n" + "=" * 80)
        print("LEGACY: Lindsey Davis Falco Books")
        print("=" * 80)
        total_links += update_book_title_and_link_to_series(driver, dry_run)
        link_standalone_davis_books(driver, dry_run)

        # Run comprehensive matching strategies
        total_links += link_by_wikidata_p179(driver, dry_run)
        total_links += link_by_title_pattern(driver, dry_run)
        total_links += link_by_series_property(driver, dry_run)

        # Generate final report
        if not dry_run:
            generate_report(driver, initial_stats, total_links)
        else:
            print("\n" + "=" * 80)
            print("[DRY RUN COMPLETE - No changes made to database]")
            print(f"Would have created approximately {total_links} new PART_OF relationships")
            print("Run with --execute flag to apply changes")
            print("=" * 80)

    finally:
        driver.close()


if __name__ == "__main__":
    main()
