#!/usr/bin/env python3
"""
Add Missing Wolf Hall Trilogy Characters and Relationships
Creates HistoricalFigure nodes and PORTRAYED_IN relationships for the trilogy
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
username = os.getenv('NEO4J_USERNAME', 'neo4j')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

# Historical figures to add (if missing) with their appearances
# Format: {figure_data, [book_wikidata_ids]}
characters_and_appearances = [
    {
        'figure': {
            'wikidata_qid': 'Q44329',
            'name': 'Thomas Cromwell',
            'canonical_id': 'Q44329',
            'birth_year': 1485,
            'death_year': 1540,
            'title': 'Chief Minister to Henry VIII',
            'description': 'English lawyer and statesman who served as chief minister to King Henry VIII'
        },
        'appears_in': ['Q202517', 'Q3644822', 'Q7751674']  # All three books
    },
    {
        'figure': {
            'wikidata_qid': 'Q38370',
            'name': 'Henry VIII',
            'canonical_id': 'Q38370',
            'birth_year': 1491,
            'death_year': 1547,
            'title': 'King of England',
            'description': 'King of England from 1509 to 1547, famous for his six marriages'
        },
        'appears_in': ['Q202517', 'Q3644822', 'Q7751674']  # All three books
    },
    {
        'figure': {
            'wikidata_qid': 'Q80823',
            'name': 'Anne Boleyn',
            'canonical_id': 'Q80823',
            'birth_year': 1501,
            'death_year': 1536,
            'title': 'Queen of England',
            'description': 'Second wife of King Henry VIII, mother of Elizabeth I, executed for treason'
        },
        'appears_in': ['Q202517', 'Q3644822']  # First two books (executed in 1536)
    },
    {
        'figure': {
            'wikidata_qid': 'Q182637',
            'name': 'Jane Seymour',
            'canonical_id': 'Q182637',
            'birth_year': 1508,
            'death_year': 1537,
            'title': 'Queen of England',
            'description': 'Third wife of King Henry VIII, mother of Edward VI'
        },
        'appears_in': ['Q3644822', 'Q7751674']  # Last two books (married 1536, died 1537)
    },
    {
        'figure': {
            'wikidata_qid': 'Q42544',
            'name': 'Thomas More',
            'canonical_id': 'Q42544',
            'birth_year': 1478,
            'death_year': 1535,
            'title': 'Lord High Chancellor of England',
            'description': 'English lawyer, philosopher, and statesman, author of Utopia, executed for refusing to accept Henry VIII as head of the Church'
        },
        'appears_in': ['Q202517']  # First book (executed 1535)
    },
    {
        'figure': {
            'wikidata_qid': 'Q182605',
            'name': 'Catherine of Aragon',
            'canonical_id': 'Q182605',
            'birth_year': 1485,
            'death_year': 1536,
            'title': 'Queen of England',
            'description': 'First wife of King Henry VIII, mother of Mary I'
        },
        'appears_in': ['Q202517']  # First book (divorced 1533, died 1536)
    },
    {
        'figure': {
            'wikidata_qid': 'Q335265',
            'name': 'Thomas Howard, 3rd Duke of Norfolk',
            'canonical_id': 'Q335265',
            'birth_year': 1473,
            'death_year': 1554,
            'title': 'Duke of Norfolk',
            'description': 'Prominent Tudor nobleman and uncle to Anne Boleyn and Catherine Howard'
        },
        'appears_in': ['Q202517', 'Q3644822', 'Q7751674']  # All three books
    },
    {
        'figure': {
            'wikidata_qid': 'Q981649',
            'name': 'Stephen Gardiner',
            'canonical_id': 'Q981649',
            'birth_year': 1497,
            'death_year': 1555,
            'title': 'Bishop of Winchester',
            'description': 'English Catholic bishop and politician, opponent of Thomas Cromwell'
        },
        'appears_in': ['Q202517', 'Q3644822', 'Q7751674']  # All three books
    },
]

print("="*80)
print("ADDING WOLF HALL TRILOGY CHARACTERS AND RELATIONSHIPS")
print("="*80)

with driver.session() as session:
    # Step 1: Create or update HistoricalFigure nodes
    print("\n1. CREATING/UPDATING HISTORICAL FIGURES:")
    print("-" * 80)

    for entry in characters_and_appearances:
        fig = entry['figure']
        print(f"\nProcessing: {fig['name']} ({fig['wikidata_qid']})")

        # Check if figure exists with this canonical_id
        check_result = session.run('''
            MATCH (h:HistoricalFigure)
            WHERE h.canonical_id = $canonical_id
            RETURN h.name as name, h.canonical_id as canonical_id
        ''', canonical_id=fig['canonical_id'])

        existing = check_result.single()

        if existing:
            print(f"  ✓ Already exists: {existing['name']} ({existing['canonical_id']})")
        else:
            # Check if exists by name (legacy entry)
            legacy_check = session.run('''
                MATCH (h:HistoricalFigure)
                WHERE toLower(h.name) = toLower($name)
                RETURN h.name as name, h.canonical_id as old_canonical_id
            ''', name=fig['name'])

            legacy = legacy_check.single()

            if legacy:
                # Update legacy entry with new canonical_id
                update_result = session.run('''
                    MATCH (h:HistoricalFigure)
                    WHERE toLower(h.name) = toLower($name)
                    SET h.canonical_id = $canonical_id,
                        h.birth_year = CASE WHEN h.birth_year IS NULL THEN $birth_year ELSE h.birth_year END,
                        h.death_year = CASE WHEN h.death_year IS NULL THEN $death_year ELSE h.death_year END,
                        h.title = CASE WHEN h.title IS NULL THEN $title ELSE h.title END,
                        h.description = CASE WHEN h.description IS NULL THEN $description ELSE h.description END
                    RETURN h.name as name, h.canonical_id as canonical_id
                ''',
                    name=fig['name'],
                    canonical_id=fig['canonical_id'],
                    birth_year=fig['birth_year'],
                    death_year=fig['death_year'],
                    title=fig.get('title'),
                    description=fig.get('description')
                )
                result = update_result.single()
                print(f"  ✓ Updated legacy entry from {legacy['old_canonical_id']} to {result['canonical_id']}")
            else:
                # Create new figure
                create_result = session.run('''
                    CREATE (h:HistoricalFigure {
                        canonical_id: $canonical_id,
                        name: $name,
                        birth_year: $birth_year,
                        death_year: $death_year,
                        title: $title,
                        description: $description
                    })
                    RETURN h.name as name, h.canonical_id as canonical_id
                ''',
                    canonical_id=fig['canonical_id'],
                    name=fig['name'],
                    birth_year=fig['birth_year'],
                    death_year=fig['death_year'],
                    title=fig.get('title'),
                    description=fig.get('description')
                )
                result = create_result.single()
                print(f"  ✓ Created new figure: {result['name']} ({result['canonical_id']})")

    # Step 2: Create PORTRAYED_IN relationships
    print("\n\n2. CREATING PORTRAYED_IN RELATIONSHIPS:")
    print("-" * 80)

    total_relationships = 0
    for entry in characters_and_appearances:
        fig = entry['figure']
        books = entry['appears_in']

        print(f"\n{fig['name']} appears in {len(books)} book(s):")

        for book_qid in books:
            # Check if relationship already exists
            check_rel = session.run('''
                MATCH (h:HistoricalFigure {canonical_id: $canonical_id})-[r:PORTRAYED_IN]->(m:MediaWork {wikidata_id: $book_qid})
                RETURN r
            ''', canonical_id=fig['canonical_id'], book_qid=book_qid)

            if check_rel.single():
                # Get book title for display
                book_title_result = session.run('''
                    MATCH (m:MediaWork {wikidata_id: $book_qid})
                    RETURN m.title as title
                ''', book_qid=book_qid)
                book_title = book_title_result.single()['title']
                print(f"  ✓ Already connected to: {book_title}")
            else:
                # Create relationship
                create_rel = session.run('''
                    MATCH (h:HistoricalFigure {canonical_id: $canonical_id})
                    MATCH (m:MediaWork {wikidata_id: $book_qid})
                    CREATE (h)-[r:PORTRAYED_IN]->(m)
                    RETURN m.title as book_title
                ''', canonical_id=fig['canonical_id'], book_qid=book_qid)

                result = create_rel.single()
                if result:
                    print(f"  ✓ Created connection to: {result['book_title']}")
                    total_relationships += 1
                else:
                    print(f"  ✗ Failed to create connection to: {book_qid}")

    print(f"\n  Total new relationships created: {total_relationships}")

    # Step 3: Verification
    print("\n\n3. VERIFICATION:")
    print("-" * 80)

    # Count relationships per book
    for book_qid in ['Q202517', 'Q3644822', 'Q7751674']:
        count_result = session.run('''
            MATCH (m:MediaWork {wikidata_id: $book_qid})<-[:PORTRAYED_IN]-(h:HistoricalFigure)
            RETURN m.title as title, count(h) as character_count
        ''', book_qid=book_qid)

        record = count_result.single()
        if record:
            print(f"  {record['title']}: {record['character_count']} characters")

    # Show sample of relationships
    print("\n  Sample relationships:")
    sample_result = session.run('''
        MATCH (h:HistoricalFigure)-[:PORTRAYED_IN]->(m:MediaWork)
        WHERE m.wikidata_id IN ['Q202517', 'Q3644822', 'Q7751674']
        RETURN h.name as character, m.title as book
        ORDER BY m.year, h.name
        LIMIT 10
    ''')

    for record in sample_result:
        print(f"    • {record['character']} → {record['book']}")

print("\n" + "="*80)
print("INGESTION COMPLETE")
print("="*80)

driver.close()
