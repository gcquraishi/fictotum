#!/usr/bin/env python3
"""
Identify Book/Media Series with Character Coverage Gaps
Finds series where characters appear in some works but not all works in the series
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase
from collections import defaultdict

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
username = os.getenv('NEO4J_USERNAME', 'neo4j')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

print("="*80)
print("IDENTIFYING SERIES WITH CHARACTER COVERAGE GAPS")
print("="*80)

with driver.session() as session:
    # Find all series (groups of MediaWorks with similar titles or creators)
    print("\n1. IDENTIFYING POTENTIAL SERIES BY TITLE PATTERNS:")
    print("-" * 80)

    # Get all books with at least one character portrayal
    books_with_characters = session.run('''
        MATCH (m:MediaWork)<-[:PORTRAYED_IN]-(h:HistoricalFigure)
        WHERE m.type = 'Book' OR m.media_type = 'Book'
        WITH m, count(DISTINCT h) as character_count
        WHERE character_count > 0
        RETURN m.wikidata_id as wikidata_id,
               m.title as title,
               m.year as year,
               m.creator as creator,
               character_count
        ORDER BY m.creator, m.year
    ''')

    books = list(books_with_characters)
    print(f"\n  Found {len(books)} books with character portrayals:")

    # Group by creator to find potential series
    creator_groups = defaultdict(list)
    for book in books:
        creator = book['creator'] or 'Unknown'
        creator_groups[creator].append(book)

    print(f"\n  Grouped into {len(creator_groups)} creator groups:\n")

    potential_series = []
    for creator, creator_books in creator_groups.items():
        if len(creator_books) > 1:
            print(f"  {creator}: {len(creator_books)} books")
            for book in creator_books[:5]:  # Show first 5
                print(f"    • {book['title']} ({book['year']}) - {book['character_count']} characters")
            if len(creator_books) > 5:
                print(f"    ... and {len(creator_books) - 5} more")
            print()

            # Mark as potential series if same creator has multiple books
            potential_series.append({
                'creator': creator,
                'books': creator_books
            })

    # Analyze character overlap in potential series
    print("\n2. ANALYZING CHARACTER OVERLAP IN SERIES:")
    print("-" * 80)

    for series in potential_series:
        if len(series['books']) < 2:
            continue

        creator = series['creator']
        book_ids = [b['wikidata_id'] for b in series['books']]

        # Get all characters appearing in any book by this creator
        character_coverage = session.run('''
            UNWIND $book_ids as book_id
            MATCH (m:MediaWork {wikidata_id: book_id})<-[:PORTRAYED_IN]-(h:HistoricalFigure)
            RETURN h.canonical_id as canonical_id,
                   h.name as name,
                   collect(DISTINCT m.title) as appears_in_titles,
                   count(DISTINCT m) as book_count
            ORDER BY book_count DESC, h.name
        ''', book_ids=book_ids)

        characters = list(character_coverage)

        # Find characters that appear in some but not all books
        total_books = len(series['books'])
        partial_characters = [c for c in characters if c['book_count'] < total_books and c['book_count'] > 0]

        if partial_characters:
            print(f"\n  {creator} series ({total_books} books):")
            print(f"    Found {len(partial_characters)} characters with partial coverage:")

            for char in partial_characters[:10]:  # Show top 10
                missing_count = total_books - char['book_count']
                print(f"      • {char['name']} appears in {char['book_count']}/{total_books} books")
                print(f"        Present in: {', '.join(char['appears_in_titles'][:3])}")
                if len(char['appears_in_titles']) > 3:
                    print(f"        ... and {len(char['appears_in_titles']) - 3} more")

    # Find related MediaWorks using PART_OF relationships
    print("\n\n3. CHECKING PART_OF RELATIONSHIPS FOR SERIES:")
    print("-" * 80)

    series_with_part_of = session.run('''
        MATCH (m1:MediaWork)-[r:PART_OF]->(m2:MediaWork)
        RETURN m1.title as part_title,
               m1.wikidata_id as part_id,
               m2.title as series_title,
               m2.wikidata_id as series_id,
               r.sequence_number as sequence
        ORDER BY m2.title, r.sequence_number
    ''')

    part_of_rels = list(series_with_part_of)
    if part_of_rels:
        print(f"  Found {len(part_of_rels)} PART_OF relationships")
        for rel in part_of_rels[:20]:
            print(f"    {rel['part_title']} → {rel['series_title']} (seq: {rel['sequence']})")
    else:
        print("  No PART_OF relationships found in database")

    # Look for MediaWorks with numbered titles (e.g., "Book 1", "Book 2")
    print("\n\n4. IDENTIFYING NUMBERED SERIES:")
    print("-" * 80)

    # Common patterns: "Book 1", "Vol. 1", "Part 1", etc.
    numbered_series = session.run('''
        MATCH (m:MediaWork)
        WHERE m.title =~ '.*[Bb]ook [0-9]+.*'
           OR m.title =~ '.*[Vv]ol\\.? [0-9]+.*'
           OR m.title =~ '.*[Pp]art [0-9]+.*'
           OR m.title =~ '.*#[0-9]+.*'
        RETURN m.title as title,
               m.wikidata_id as wikidata_id,
               m.type as type,
               m.year as year
        ORDER BY m.title
        LIMIT 50
    ''')

    numbered = list(numbered_series)
    if numbered:
        print(f"  Found {len(numbered)} MediaWorks with numbered titles:")
        for work in numbered[:20]:
            print(f"    • {work['title']} ({work['year']}) - {work['type']}")
    else:
        print("  No numbered series found")

    # Summary statistics
    print("\n\n5. SUMMARY STATISTICS:")
    print("-" * 80)

    # Total portrayals
    total_portrayals = session.run('''
        MATCH ()-[r:PORTRAYED_IN]->()
        RETURN count(r) as count
    ''').single()['count']

    # MediaWorks with portrayals
    works_with_portrayals = session.run('''
        MATCH (m:MediaWork)<-[:PORTRAYED_IN]-()
        RETURN count(DISTINCT m) as count
    ''').single()['count']

    # MediaWorks without portrayals
    works_without_portrayals = session.run('''
        MATCH (m:MediaWork)
        WHERE NOT (m)<-[:PORTRAYED_IN]-()
        RETURN count(m) as count
    ''').single()['count']

    print(f"  Total PORTRAYED_IN relationships: {total_portrayals}")
    print(f"  MediaWorks with portrayals: {works_with_portrayals}")
    print(f"  MediaWorks without portrayals: {works_without_portrayals}")
    print(f"  Potential series identified: {len(potential_series)}")

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)

driver.close()
