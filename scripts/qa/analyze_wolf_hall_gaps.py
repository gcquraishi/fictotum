#!/usr/bin/env python3
"""
Analyze Wolf Hall Trilogy Character Gaps
Identifies historical figures appearing in one book but missing from sequential books
"""

import json
import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()
uri = os.getenv('NEO4J_URI', 'neo4j+ssc://c78564a4.databases.neo4j.io')
username = os.getenv('NEO4J_USERNAME', 'neo4j')
password = os.getenv('NEO4J_PASSWORD')

driver = GraphDatabase.driver(uri, auth=(username, password))

print("="*80)
print("WOLF HALL TRILOGY CHARACTER GAP ANALYSIS")
print("="*80)

with driver.session() as session:
    # Find all Wolf Hall related MediaWorks
    print("\n1. IDENTIFYING WOLF HALL TRILOGY MEDIAWORKS:")
    print("-" * 80)
    result = session.run('''
        MATCH (m:MediaWork)
        WHERE m.title CONTAINS 'Wolf Hall'
           OR m.title CONTAINS 'Bring Up the Bodies'
           OR m.title CONTAINS 'The Mirror & the Light'
        RETURN m.title as title,
               m.wikidata_id as wikidata_id,
               m.release_year as release_year,
               m.year as year,
               m.media_type as media_type,
               m.type as type,
               id(m) as node_id
        ORDER BY coalesce(m.release_year, m.year), m.title
    ''')

    mediaworks = []
    for record in result:
        work = {
            'title': record['title'],
            'wikidata_id': record['wikidata_id'],
            'year': record['release_year'] or record['year'],
            'type': record['media_type'] or record['type'],
            'node_id': record['node_id']
        }
        mediaworks.append(work)
        print(f"  • {work['title']}")
        print(f"    Wikidata ID: {work['wikidata_id']}")
        print(f"    Type: {work['type']}")
        print(f"    Year: {work['year']}")

    # For each MediaWork, get the portrayed characters
    print("\n2. CHARACTERS IN EACH WORK:")
    print("-" * 80)

    work_characters = {}
    for work in mediaworks:
        result = session.run('''
            MATCH (h:HistoricalFigure)-[r:PORTRAYED_IN]->(m:MediaWork)
            WHERE id(m) = $node_id
            RETURN h.name as name,
                   h.canonical_id as canonical_id,
                   r.actor as actor,
                   r.character_portrayed as character_portrayed
            ORDER BY h.name
        ''', node_id=work['node_id'])

        characters = []
        for record in result:
            characters.append({
                'name': record['name'],
                'canonical_id': record['canonical_id'],
                'actor': record['actor'],
                'character_portrayed': record['character_portrayed']
            })

        work_characters[work['title']] = characters
        print(f"\n  {work['title']} ({len(characters)} characters):")
        for char in characters[:15]:  # Show first 15
            print(f"    • {char['name']} (Q-ID: {char['canonical_id']})")
        if len(characters) > 15:
            print(f"    ... and {len(characters) - 15} more")

    # Identify gaps: characters in one work but not in others
    print("\n3. CHARACTER COVERAGE GAPS:")
    print("-" * 80)

    if len(mediaworks) >= 2:
        # Get unique characters across all works
        all_characters = {}
        for title, chars in work_characters.items():
            for char in chars:
                cid = char['canonical_id']
                if cid not in all_characters:
                    all_characters[cid] = {
                        'name': char['name'],
                        'canonical_id': cid,
                        'appears_in': []
                    }
                all_characters[cid]['appears_in'].append(title)

        # Find characters that appear in some but not all works
        gaps = []
        for cid, char_info in all_characters.items():
            if len(char_info['appears_in']) > 0 and len(char_info['appears_in']) < len(mediaworks):
                missing_in = [w['title'] for w in mediaworks if w['title'] not in char_info['appears_in']]
                gaps.append({
                    'name': char_info['name'],
                    'canonical_id': cid,
                    'appears_in': char_info['appears_in'],
                    'missing_from': missing_in
                })

        # Sort by number of appearances (descending) to prioritize major characters
        gaps.sort(key=lambda x: len(x['appears_in']), reverse=True)

        print(f"\n  Found {len(gaps)} characters with incomplete coverage:")
        print(f"  (Showing characters appearing in at least one work but missing from others)\n")

        for i, gap in enumerate(gaps[:30], 1):  # Show top 30
            print(f"  {i}. {gap['name']} (Q-ID: {gap['canonical_id']})")
            print(f"     Appears in: {', '.join(gap['appears_in'])}")
            print(f"     MISSING from: {', '.join(gap['missing_from'])}")
            print()

    # Group mediaworks by type to identify series patterns
    print("\n4. MEDIAWORK TYPE GROUPINGS:")
    print("-" * 80)

    type_groups = {}
    for work in mediaworks:
        work_type = work['type'] or 'unknown'
        if work_type not in type_groups:
            type_groups[work_type] = []
        type_groups[work_type].append(work['title'])

    for work_type, titles in type_groups.items():
        print(f"  {work_type.upper()}:")
        for title in titles:
            char_count = len(work_characters.get(title, []))
            print(f"    • {title} ({char_count} characters)")

    # Export gap data for further processing
    print("\n5. EXPORTING GAP DATA:")
    print("-" * 80)

    export_data = {
        'mediaworks': mediaworks,
        'character_coverage': [
            {
                'name': gap['name'],
                'canonical_id': gap['canonical_id'],
                'appears_in': gap['appears_in'],
                'missing_from': gap['missing_from']
            }
            for gap in gaps
        ]
    }

    output_path = '/Users/gcquraishi/Documents/big-heavy/fictotum/data/wolf_hall_gaps.json'
    with open(output_path, 'w') as f:
        json.dump(export_data, f, indent=2)

    print(f"  Exported gap analysis to: {output_path}")
    print(f"  Total gaps identified: {len(gaps)}")

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)

driver.close()
