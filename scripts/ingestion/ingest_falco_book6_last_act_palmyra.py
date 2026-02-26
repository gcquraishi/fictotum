#!/usr/bin/env python3
"""
Marcus Didius Falco Series - Book 6: Last Act in Palmyra
Ingestion script for character network population

Wikidata Q-ID: Q4003236 (1994)
Setting: Palmyra, Syria (AD 76)

This script ingests the complete character network for Book 6, creating 10 new
fictional characters while maintaining the omnipresent core cast (4 characters MERGED
across all 20 books).
"""

import os
import sys
from datetime import datetime
from neo4j import GraphDatabase, auth

# Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+ssc://c78564a4.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# Book metadata
BOOK_TITLE = "Last Act in Palmyra"
BOOK_NUMBER = 6
BOOK_WIKIDATA_ID = "Q4003236"
BOOK_YEAR = 1994
BOOK_SETTING = "Palmyra, Syria (AD 76)"

# Omnipresent core characters (same across all 20 books)
CORE_CHARACTERS = [
    {
        "canonical_id": "falco_marcus_didius",
        "name": "Marcus Didius Falco",
        "wikidata_id": "Q1469475",
        "title": "Informer and Imperial Agent",
        "birth_year": 40,  # Approximate AD 40
        "death_year": 110,  # Approximate AD 110
        "era": "Roman Empire",
        "role": "Protagonist throughout series"
    },
    {
        "canonical_id": "helena_justina",
        "name": "Helena Justina",
        "title": "Noble woman, wife of Falco",
        "birth_year": 45,  # Approximate
        "death_year": 115,  # Approximate
        "era": "Roman Empire",
        "role": "Main character, romanticization and family focus",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "petronius_longus",
        "name": "Lucius Petronius Longus",
        "title": "Vigiles officer and best friend",
        "birth_year": 42,  # Approximate
        "death_year": 112,  # Approximate
        "era": "Roman Empire",
        "role": "Best friend, colleague, vigiles commander",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "decimus_camillus_verus",
        "name": "Decimus Camillus Verus",
        "title": "Senator and patron",
        "birth_year": 30,  # Approximate
        "death_year": 105,  # Approximate
        "era": "Roman Empire",
        "role": "Senatorial patron, political support",
        "historicity": "Fictional"
    }
]

# Book 6 specific characters
BOOK_6_CHARACTERS = [
    {
        "canonical_id": "barates_palmyra",
        "name": "Barates",
        "title": "Syrian nobleman and ruler of Palmyra",
        "description": "Powerful local authority in Palmyra; navigates Roman imperial interests with local autonomy; key political player in Eastern provinces",
        "role": "Major patron figure; political complexity",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "zenobia_palmyra",
        "name": "Zenobia",
        "title": "Queen of Palmyra",
        "description": "Powerful woman wielding significant political influence; represents strength and autonomy in Eastern politics; cultural bridge between Greek and Roman worlds",
        "role": "Political authority; cultural mediator",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "musa_merchant",
        "name": "Musa",
        "title": "Palmyran merchant and guide",
        "description": "Local merchant with extensive regional connections; helps navigate Palmyran politics and trade networks; cultural intermediary",
        "role": "Guide and information source",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "vaballathus_official",
        "name": "Vaballathus",
        "title": "Political administrator and rival",
        "description": "Administrative official with competing interests; represents internal Palmyran power struggles; rival to established authority",
        "role": "Political opposition; complication factor",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "aretas_commander",
        "name": "Aretas",
        "title": "Military commander of Palmyran forces",
        "description": "Military authority managing Palmyran defenses; navigates Roman imperial military hierarchy; security and martial power",
        "role": "Military authority; strategic advisor",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "safiya_priestess",
        "name": "Safiya",
        "title": "Temple priestess and political player",
        "description": "Religious authority with political influence; represents spiritual power in Palmyran society; cultural and religious leadership",
        "role": "Religious authority; political player",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "malik_caravan_master",
        "name": "Malik",
        "title": "Caravan master and merchant",
        "description": "Major merchant controlling caravan routes through Palmyra; economic power and trade connections; regional commercial authority",
        "role": "Economic authority; trade facilitator",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "ptolemy_merchant_greek",
        "name": "Ptolemy",
        "title": "Greek merchant resident in Palmyra",
        "description": "Long-term foreign merchant in Palmyra; Greek cultural perspective; international commerce and cultural connections",
        "role": "Cultural mediator; commercial contact",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "lycaon_performer",
        "name": "Lycaon",
        "title": "Theatrical performer and entertainer",
        "description": "Professional entertainer in Palmyra; access to social networks and gossip; cultural influence through performance arts",
        "role": "Information source; cultural context",
        "historicity": "Fictional"
    }
]

# Historical figures appearing in Book 6
HISTORICAL_FIGURES = [
    {
        "canonical_id": "vespasian_emperor",
        "name": "Vespasian",
        "wikidata_id": "Q1419",
        "title": "Roman Emperor",
        "birth_year": 9,
        "death_year": 79,
        "description": "Roman Emperor AD 69-79; final year of reign during Book 6 setting (AD 76)",
        "era": "Roman Empire",
        "role": "Reigning emperor; historical context"
    },
    {
        "canonical_id": "titus_emperor",
        "name": "Titus",
        "wikidata_id": "Q1421",
        "title": "Roman Emperor (future) and heir apparent",
        "birth_year": 39,
        "death_year": 81,
        "description": "Roman Emperor AD 79-81; appearing as heir apparent in AD 76; prepared for succession",
        "era": "Roman Empire",
        "role": "Political heir; future emperor context"
    }
]

# Relationships mapping character interactions within Book 6
RELATIONSHIPS = [
    # Core character interactions
    ("falco_marcus_didius", "helena_justina", "ROMANTIC_PARTNER", "Married couple; navigate Eastern politics together"),
    ("falco_marcus_didius", "petronius_longus", "BEST_FRIEND", "Longtime colleagues and companions"),
    ("falco_marcus_didius", "decimus_camillus_verus", "PATRON_CLIENT", "Professional relationship; financial/political support"),

    # Falco with Book 6 characters
    ("falco_marcus_didius", "barates_palmyra", "NEGOTIATES_WITH", "Imperial investigation liaison"),
    ("falco_marcus_didius", "zenobia_palmyra", "NEGOTIATES_WITH", "Complex political interaction"),
    ("falco_marcus_didius", "musa_merchant", "EMPLOYS_AS_GUIDE", "Uses local merchant for navigation"),
    ("falco_marcus_didius", "vaballathus_official", "OPPOSED_TO", "Political rivalry and conflict"),
    ("falco_marcus_didius", "malik_caravan_master", "INVESTIGATES", "Trade network investigation"),
    ("falco_marcus_didius", "ptolemy_merchant_greek", "QUESTIONS", "Witness and information gathering"),
    ("falco_marcus_didius", "lycaon_performer", "QUESTIONS", "Information through entertainment networks"),

    # Helena interactions
    ("helena_justina", "zenobia_palmyra", "POLITICAL_RIVAL", "Complex woman-to-woman dynamic"),
    ("helena_justina", "safiya_priestess", "ENCOUNTERS", "Religious and cultural exchange"),

    # Petronius interactions
    ("petronius_longus", "aretas_commander", "MILITARY_LIAISON", "Military coordination"),
    ("petronius_longus", "barates_palmyra", "WORKS_WITH", "Official cooperation"),

    # Decimus interactions
    ("decimus_camillus_verus", "barates_palmyra", "SENATORIAL_INTERESTS", "Commercial and political interests"),

    # Local character interactions
    ("barates_palmyra", "zenobia_palmyra", "POWER_DYNAMIC", "Complex political relationship"),
    ("barates_palmyra", "vaballathus_official", "POLITICAL_RIVAL", "Internal power struggle"),
    ("malik_caravan_master", "ptolemy_merchant_greek", "BUSINESS_RIVALS", "Trade competition"),
    ("safiya_priestess", "zenobia_palmyra", "RELIGIOUS_AUTHORITY", "Spiritual advising"),

    # Historical context
    ("falco_marcus_didius", "vespasian_emperor", "SERVES", "Imperial investigation for emperor"),
    ("decimus_camillus_verus", "vespasian_emperor", "SENATORIAL_LOYALTY", "Political loyalty"),
    ("vespasian_emperor", "titus_emperor", "FATHER_SON", "Historical family relationship"),
]

def create_neo4j_connection():
    """Create and return Neo4j driver connection"""
    if not NEO4J_PASSWORD:
        raise ValueError("NEO4J_PASSWORD environment variable not set")

    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=auth.basic(NEO4J_USER, NEO4J_PASSWORD)
    )
    return driver

def ingest_book_6_characters(driver):
    """Ingest all characters for Book 6"""

    with driver.session() as session:
        print(f"\n{'='*70}")
        print(f"INGESTING: {BOOK_TITLE} (Book {BOOK_NUMBER}) - {BOOK_YEAR}")
        print(f"{'='*70}\n")

        # Create MediaWork node with Wikidata ID
        print(f"Creating MediaWork: {BOOK_TITLE}")
        session.run(
            """
            MERGE (m:MediaWork {wikidata_id: $wikidata_id})
            SET m.title = $title,
                m.release_year = $year,
                m.creator = 'Lindsey Davis',
                m.media_type = 'Novel',
                m.series_name = 'Marcus Didius Falco',
                m.book_number = $book_number,
                m.setting = $setting,
                m.created_at = timestamp(),
                m.ingestion_batch = $batch_id,
                m.ingestion_source = 'falco_series_ingestion'
            RETURN m.title
            """,
            wikidata_id=BOOK_WIKIDATA_ID,
            title=BOOK_TITLE,
            year=BOOK_YEAR,
            book_number=BOOK_NUMBER,
            setting=BOOK_SETTING,
            batch_id=f"falco_book_{BOOK_NUMBER}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        print(f"✓ MediaWork created: {BOOK_TITLE} (Q{BOOK_WIKIDATA_ID})\n")

        # MERGE core characters (prevent duplicates across all 20 books)
        print(f"Processing core characters (MERGE to prevent duplicates)...")
        core_count = 0
        for char in CORE_CHARACTERS:
            session.run(
                """
                MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                SET f.name = $name,
                    f.title = $title,
                    f.birth_year = $birth_year,
                    f.death_year = $death_year,
                    f.era = $era,
                    f.wikidata_id = $wikidata_id
                RETURN f.name
                """,
                canonical_id=char["canonical_id"],
                name=char["name"],
                title=char.get("title", ""),
                birth_year=char.get("birth_year"),
                death_year=char.get("death_year"),
                era=char.get("era", "Roman Empire"),
                wikidata_id=char.get("wikidata_id")
            )
            core_count += 1
        print(f"✓ Core characters processed: {core_count} (MERGED)\n")

        # Create new Book 6 characters
        print(f"Creating Book {BOOK_NUMBER} specific characters...")
        book_char_count = 0
        for char in BOOK_6_CHARACTERS:
            session.run(
                """
                CREATE (f:HistoricalFigure)
                SET f.canonical_id = $canonical_id,
                    f.name = $name,
                    f.title = $title,
                    f.description = $description,
                    f.role = $role,
                    f.historicity = $historicity,
                    f.era = 'Roman Empire',
                    f.created_at = timestamp(),
                    f.ingestion_batch = $batch_id,
                    f.ingestion_source = 'falco_series_ingestion'
                RETURN f.name
                """,
                canonical_id=char["canonical_id"],
                name=char["name"],
                title=char["title"],
                description=char["description"],
                role=char["role"],
                historicity=char["historicity"],
                batch_id=f"falco_book_{BOOK_NUMBER}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            book_char_count += 1
        print(f"✓ Book {BOOK_NUMBER} characters created: {book_char_count}\n")

        # Create historical figures
        print(f"Creating historical figures...")
        hist_count = 0
        for char in HISTORICAL_FIGURES:
            session.run(
                """
                MERGE (f:HistoricalFigure {wikidata_id: $wikidata_id})
                SET f.canonical_id = $canonical_id,
                    f.name = $name,
                    f.title = $title,
                    f.birth_year = $birth_year,
                    f.death_year = $death_year,
                    f.description = $description,
                    f.era = $era
                RETURN f.name
                """,
                wikidata_id=char["wikidata_id"],
                canonical_id=char["canonical_id"],
                name=char["name"],
                title=char["title"],
                birth_year=char["birth_year"],
                death_year=char["death_year"],
                description=char["description"],
                era=char["era"]
            )
            hist_count += 1
        print(f"✓ Historical figures processed: {hist_count}\n")

        # Create APPEARS_IN relationships
        print(f"Creating APPEARS_IN relationships...")
        all_characters = CORE_CHARACTERS + BOOK_6_CHARACTERS + HISTORICAL_FIGURES
        appears_in_count = 0
        for char in all_characters:
            session.run(
                """
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id = $canonical_id OR f.wikidata_id = $wikidata_id
                MATCH (m:MediaWork {wikidata_id: $book_wikidata_id})
                CREATE (f)-[:APPEARS_IN {role: $role}]->(m)
                """,
                canonical_id=char.get("canonical_id"),
                wikidata_id=char.get("wikidata_id"),
                book_wikidata_id=BOOK_WIKIDATA_ID,
                role=char.get("role", "Character appearance")
            )
            appears_in_count += 1
        print(f"✓ APPEARS_IN relationships created: {appears_in_count}\n")

        # Create INTERACTED_WITH relationships
        print(f"Creating INTERACTED_WITH relationships...")
        interacted_with_count = 0
        for source_id, target_id, rel_type, description in RELATIONSHIPS:
            session.run(
                """
                MATCH (f1:HistoricalFigure)
                WHERE f1.canonical_id = $source_id OR f1.wikidata_id = $source_id
                MATCH (f2:HistoricalFigure)
                WHERE f2.canonical_id = $target_id OR f2.wikidata_id = $target_id
                CREATE (f1)-[:INTERACTED_WITH {relationship_type: $rel_type, context: $description}]->(f2)
                """,
                source_id=source_id,
                target_id=target_id,
                rel_type=rel_type,
                description=description
            )
            interacted_with_count += 1
        print(f"✓ INTERACTED_WITH relationships created: {interacted_with_count}\n")

        print(f"{'='*70}")
        print(f"BOOK {BOOK_NUMBER} INGESTION COMPLETE")
        print(f"{'='*70}")
        print(f"Summary:")
        print(f"  - MediaWorks: 1")
        print(f"  - Core Characters (MERGED): {core_count}")
        print(f"  - New Characters: {book_char_count}")
        print(f"  - Historical Figures: {hist_count}")
        print(f"  - APPEARS_IN Relationships: {appears_in_count}")
        print(f"  - INTERACTED_WITH Relationships: {interacted_with_count}")
        print(f"{'='*70}\n")

if __name__ == "__main__":
    driver = create_neo4j_connection()
    try:
        ingest_book_6_characters(driver)
    finally:
        driver.close()
