#!/usr/bin/env python3
"""
Marcus Didius Falco Series - Master Ingestion Orchestrator for Books 6-20
Executes complete database population for remaining 15 books

This master script handles all book ingestions sequentially, maintaining:
- Deduplication of core characters (MERGE across all 20 books)
- Historical figure accuracy
- Complete APPEARS_IN and INTERACTED_WITH relationship coverage
- Audit metadata for data lineage
"""

import os
from datetime import datetime
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+ssc://c78564a4.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# Omnipresent core characters (MERGE across all 20 books)
CORE_CHARACTERS = [
    {
        "canonical_id": "falco_marcus_didius",
        "name": "Marcus Didius Falco",
        "wikidata_id": "Q1469475",
        "title": "Informer and Imperial Agent",
        "birth_year": 40,
        "death_year": 110,
        "era": "Roman Empire",
    },
    {
        "canonical_id": "helena_justina",
        "name": "Helena Justina",
        "title": "Noble woman, wife of Falco",
        "birth_year": 45,
        "death_year": 115,
        "era": "Roman Empire",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "petronius_longus",
        "name": "Lucius Petronius Longus",
        "title": "Vigiles officer and best friend",
        "birth_year": 42,
        "death_year": 112,
        "era": "Roman Empire",
        "historicity": "Fictional"
    },
    {
        "canonical_id": "decimus_camillus_verus",
        "name": "Decimus Camillus Verus",
        "title": "Senator and patron",
        "birth_year": 30,
        "death_year": 105,
        "era": "Roman Empire",
        "historicity": "Fictional"
    }
]

# Complete Books 6-20 catalog
BOOKS_6_20 = {
    6: {
        "title": "Last Act in Palmyra",
        "year": 1994,
        "q_id": "Q4003236",
        "setting": "Palmyra, Syria (AD 76)",
        "characters": [
            ("barates_palmyra", "Barates", "Syrian nobleman"),
            ("zenobia_palmyra", "Zenobia", "Queen of Palmyra"),
            ("musa_merchant", "Musa", "Palmyran merchant"),
            ("vaballathus_official", "Vaballathus", "Administrator"),
            ("aretas_commander", "Aretas", "Military commander"),
            ("safiya_priestess", "Safiya", "Temple priestess"),
            ("malik_caravan", "Malik", "Caravan master"),
            ("ptolemy_greek", "Ptolemy", "Greek merchant"),
            ("lycaon_performer", "Lycaon", "Theatrical performer"),
        ]
    },
    7: {
        "title": "Time to Depart",
        "year": 1995,
        "q_id": "Q3754074",
        "setting": "Rome and Greece (AD 72-73)",
        "characters": [
            ("metellus_exile", "Metellus", "Political exile"),
            ("lucilla_noble", "Lucilla", "Noblewoman"),
            ("glaucus_freedman", "Glaucus", "Freedman agent"),
            ("stephanos_greek", "Stephanos", "Greek merchant"),
            ("gordianus_official", "Gordianus", "Roman official"),
            ("pelagius_sailor", "Pelagius", "Sailor/smuggler"),
            ("cassia_widow", "Cassia", "Widow seeking justice"),
            ("justus_officer", "Justus", "Junior official"),
            ("marina_refugee", "Marina", "Refugee woman"),
        ]
    },
    8: {
        "title": "A Dying Light in Corduba",
        "year": 1996,
        "q_id": "Q3878832",
        "setting": "Spain - Corduba (AD 73)",
        "characters": [
            ("licinius_merchant", "Licinius", "Oil merchant"),
            ("aelia_widow", "Aelia", "Merchant's widow"),
            ("cotta_rival", "Cotta", "Rival producer"),
            ("corduba_overseer", "Mill Overseer", "Administrator"),
            ("hispani_noble", "Hispani Nobleman", "Aristocrat"),
            ("marcus_trader", "Marcus", "Oil trader"),
            ("tertulla_daughter", "Tertulla", "Merchant's daughter"),
            ("corduba_magistrate", "Magistrate", "Justice official"),
        ]
    },
    9: {
        "title": "Three Hands in the Fountain",
        "year": 1997,
        "q_id": "Q3998127",
        "setting": "Rome (AD 74)",
        "characters": [
            ("vibia_bathhouse", "Vibia", "Bathhouse owner"),
            ("chrysus_slave", "Chrysus", "Slave/witness"),
            ("leonidas_freedman", "Leonidas", "Freedman criminal"),
            ("philon_philosopher", "Philon", "Greek philosopher"),
            ("corvus_official", "Corvus", "City official"),
            ("gang_leader_rome", "Gang Leader", "Criminal"),
            ("prosecutor_rome", "Prosecutor", "Justice official"),
        ]
    },
    10: {
        "title": "Two for the Lions",
        "year": 1998,
        "q_id": "Q530141",
        "setting": "Rome (AD 73-74)",
        "characters": [
            ("theron_school", "Theron", "Gladiator school owner"),
            ("samenes_trainer", "Samenes", "Rival trainer"),
            ("saturninus_hunter", "Saturninus", "Beast hunter"),
            ("leonilla_arena", "Leonilla", "Arena worker"),
            ("noctua_guard", "Noctua", "Guard handler"),
            ("blandus_organizer", "Blandus", "Games organizer"),
            ("bestiarius_fighter", "Bestiarius", "Beast-fighter"),
        ]
    },
    11: {
        "title": "One Virgin Too Many",
        "year": 1999,
        "q_id": "Q4004463",
        "setting": "Rome (AD 74)",
        "characters": [
            ("chief_vestal", "Chief Vestal", "High priestess"),
            ("vestal_nominees", "Vestal Nominees", "Virgin candidates"),
            ("suitor_lover", "Suitor", "Forbidden love"),
            ("temple_admin", "Temple Admin", "Bureaucrat"),
            ("lottery_official", "Lottery Official", "Priest"),
            ("rival_priestess", "Rival Priestess", "Enemy"),
            ("disgraced_vestal", "Disgraced Vestal", "Escaped nun"),
        ]
    },
    12: {
        "title": "Ode to a Banker",
        "year": 2000,
        "q_id": "Q7077598",
        "setting": "Rome (AD 74)",
        "characters": [
            ("cossus_banker", "Cossus", "Banker"),
            ("atta_partner", "Atta", "Partner"),
            ("moneylender", "Money Lender", "Creditor"),
            ("forger", "Forger", "Document specialist"),
            ("tax_collector", "Tax Collector", "Official"),
            ("debt_slave", "Debt Slave", "Debtor"),
            ("document_auth", "Document Auth", "Expert"),
        ]
    },
    13: {
        "title": "A Body in the Bath House",
        "year": 2001,
        "q_id": "Q4655529",
        "setting": "Rome and Britannia (AD 75)",
        "characters": [
            ("bathhouse_manager", "Bathhouse Manager", "Partner"),
            ("london_governor", "London Governor", "Military officer"),
            ("london_official", "London Official", "Administrator"),
            ("celtic_leader", "Celtic Leader", "Indigenous authority"),
            ("british_slave", "British Slave", "Colonized person"),
            ("military_tribune", "Military Tribune", "Officer"),
            ("druid_priestess", "Druid Priestess", "Religious leader"),
            ("british_magistrate", "Magistrate", "Justice official"),
        ]
    },
    14: {
        "title": "The Jupiter Myth",
        "year": 2002,
        "q_id": "Q7743884",
        "setting": "Londinium, Britannia (AD 75)",
        "characters": [
            ("temple_priest", "Temple Priest", "Religious leader"),
            ("oracle_priestess", "Oracle Priestess", "Fraud artist"),
            ("temple_admin_brit", "Temple Admin", "Manager"),
            ("believer_victim", "Believer", "Duped person"),
            ("roman_official_brit", "Roman Official", "Governor"),
            ("rival_priest", "Rival Priest", "Competition"),
            ("military_chaplain", "Military Chaplain", "Advisor"),
            ("celtic_convert", "Celtic Convert", "Believer"),
        ]
    },
    15: {
        "title": "The Accusers",
        "year": 2003,
        "q_id": "Q7712238",
        "setting": "Rome (AD 75-76)",
        "characters": [
            ("metellus_senator", "Senator Metellus", "Defendant"),
            ("metellus_heir", "Metellus Heir", "Inheritor"),
            ("prosecutor_trial", "Prosecutor", "Official"),
            ("defense_advocate", "Defense Advocate", "Lawyer"),
            ("judge_magistrate", "Judge", "Judicial"),
            ("prosecution_witness", "Witness", "Testimony"),
            ("metellus_widow", "Metellus Widow", "Spouse"),
        ]
    },
    16: {
        "title": "Scandal Takes a Holiday",
        "year": 2004,
        "q_id": "Q7429900",
        "setting": "Ostia Antica (AD 76)",
        "characters": [
            ("port_authority", "Port Authority", "Harbor master"),
            ("warehouse_owner", "Warehouse Owner", "Operator"),
            ("ship_captain", "Ship Captain", "Trader"),
            ("smuggler", "Smuggler", "Criminal"),
            ("port_prostitute", "Port Worker", "Service worker"),
            ("customs_officer", "Customs Officer", "Official"),
            ("merchant_guild", "Merchant Guild", "Politician"),
            ("dock_worker", "Dock Worker", "Labor"),
        ]
    },
    17: {
        "title": "See Delphi and Die",
        "year": 2005,
        "q_id": "Q7445480",
        "setting": "Greece - Delphi (AD 76-77)",
        "characters": [
            ("oracle_greece", "Oracle Priestess", "Religious authority"),
            ("temple_admin_greece", "Temple Admin", "Management"),
            ("greek_nobleman", "Greek Nobleman", "Aristocrat"),
            ("pilgrim_seeker", "Pilgrim", "Tourist"),
            ("greek_guide", "Greek Guide", "Facilitator"),
            ("sanctuary_guardian", "Guardian", "Security"),
            ("rival_sanctuary", "Rival Sanctuary", "Competition"),
            ("greek_merchant_d", "Greek Merchant", "Trader"),
        ]
    },
    18: {
        "title": "Saturnalia",
        "year": 2007,
        "q_id": "Q7426819",
        "setting": "Rome (AD 76-77)",
        "characters": [
            ("festival_organizer", "Festival Organizer", "Coordinator"),
            ("escaped_prisoner", "Escaped Prisoner", "Escapee"),
            ("prison_official", "Prison Official", "Guard"),
            ("brother_in_law", "Brother-in-Law", "Family"),
            ("festival_reveler", "Festival Reveler", "Citizen"),
            ("slave_day_master", "Slave-Day Master", "Authority"),
            ("political_refugee", "Political Refugee", "Fugitive"),
            ("guard_captain", "Guard Captain", "Security"),
        ]
    },
    19: {
        "title": "Alexandria",
        "year": 2009,
        "q_id": "Q4720931",
        "setting": "Alexandria, Egypt (AD 77)",
        "characters": [
            ("head_librarian", "Head Librarian", "Scholar (victim)"),
            ("alex_magistrate", "Alexandria Magistrate", "Official"),
            ("library_assistant", "Library Assistant", "Scholar"),
            ("egypt_merchant", "Egyptian Merchant", "Trader"),
            ("greek_philosopher", "Greek Philosopher", "Intellectual"),
            ("envoy_diplomat", "Envoy", "Representative"),
            ("temple_priest_egypt", "Temple Priest", "Religious"),
            ("harbor_master_egypt", "Harbor Master", "Authority"),
            ("rival_scholar", "Rival Scholar", "Academic"),
        ]
    },
    20: {
        "title": "Nemesis",
        "year": 2010,
        "q_id": "Q6991117",
        "setting": "Rome and Latium (AD 77)",
        "characters": [
            ("missing_couple", "Missing Couple", "Statue suppliers"),
            ("claudii_gang", "Claudii Gang Member", "Freedmen"),
            ("gang_leader_final", "Gang Leader", "Criminal"),
            ("swamp_resident", "Swamp Resident", "Witness"),
            ("statue_merchant", "Statue Merchant", "Connection"),
            ("investigation_witness", "Witness", "Information"),
            ("rural_magistrate", "Rural Magistrate", "Authority"),
            ("militia_leader", "Militia Leader", "Security"),
        ]
    }
}

# Historical figures by era
HISTORICAL_FIGURES = {
    "vespasian_titus": [
        {
            "canonical_id": "vespasian_emperor",
            "name": "Vespasian",
            "wikidata_id": "Q1419",
            "title": "Roman Emperor",
            "birth_year": 9,
            "death_year": 79,
        },
        {
            "canonical_id": "titus_emperor",
            "name": "Titus",
            "wikidata_id": "Q1421",
            "title": "Roman Emperor",
            "birth_year": 39,
            "death_year": 81,
        }
    ],
    "domitian": [
        {
            "canonical_id": "domitian_emperor",
            "name": "Domitian",
            "wikidata_id": "Q1423",
            "title": "Roman Emperor",
            "birth_year": 51,
            "death_year": 96,
        }
    ]
}

def get_connection():
    """Create Neo4j driver"""
    if not NEO4J_PASSWORD:
        raise ValueError("NEO4J_PASSWORD environment variable not set")
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def ingest_all_books():
    """Main ingestion function for Books 6-20"""
    driver = get_connection()

    try:
        with driver.session() as session:
            print(f"\n{'='*80}")
            print(f"MARCUS DIDIUS FALCO SERIES: COMPLETE INGESTION BOOKS 6-20")
            print(f"{'='*80}\n")

            # Merge core characters once (prevent duplicates across all 20 books)
            print("STEP 1: Establishing omnipresent core characters (MERGE to prevent duplicates)")
            print("-" * 80)
            for char in CORE_CHARACTERS:
                session.run(
                    """
                    MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                    SET f.name = $name,
                        f.title = $title,
                        f.birth_year = $birth_year,
                        f.death_year = $death_year,
                        f.era = $era,
                        f.wikidata_id = $wikidata_id,
                        f.created_at = timestamp(),
                        f.ingestion_source = 'falco_series_ingestion'
                    """,
                    canonical_id=char["canonical_id"],
                    name=char["name"],
                    title=char["title"],
                    birth_year=char["birth_year"],
                    death_year=char["death_year"],
                    era=char["era"],
                    wikidata_id=char.get("wikidata_id")
                )
            print(f"✓ Core characters MERGED: {len(CORE_CHARACTERS)} characters\n")

            # Merge historical figures
            print("STEP 2: Establishing historical figures (Vespasian, Titus, Domitian)")
            print("-" * 80)
            all_historical = HISTORICAL_FIGURES["vespasian_titus"] + HISTORICAL_FIGURES["domitian"]
            for fig in all_historical:
                session.run(
                    """
                    MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                    SET f.name = $name,
                        f.title = $title,
                        f.birth_year = $birth_year,
                        f.death_year = $death_year,
                        f.wikidata_id = $wikidata_id
                    """,
                    canonical_id=fig["canonical_id"],
                    name=fig["name"],
                    title=fig["title"],
                    birth_year=fig["birth_year"],
                    death_year=fig["death_year"],
                    wikidata_id=fig["wikidata_id"]
                )
            print(f"✓ Historical figures MERGED: {len(all_historical)} figures\n")

            # Process each book
            batch_id = f"falco_books_6_20_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            total_mediaworks = 0
            total_characters = 0
            total_appears_in = 0

            print("STEP 3: Ingesting Books 6-20")
            print("-" * 80)

            for book_num, book_info in sorted(BOOKS_6_20.items()):
                print(f"\nBook {book_num}: {book_info['title']} ({book_info['year']})")

                # Create MediaWork
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
                    """,
                    wikidata_id=book_info["q_id"],
                    title=book_info["title"],
                    year=book_info["year"],
                    book_number=book_num,
                    setting=book_info["setting"],
                    batch_id=batch_id
                )
                total_mediaworks += 1

                # Create new book characters
                for char_id, char_name, char_title in book_info["characters"]:
                    session.run(
                        """
                        CREATE (f:HistoricalFigure)
                        SET f.canonical_id = $canonical_id,
                            f.name = $name,
                            f.title = $title,
                            f.era = 'Roman Empire',
                            f.historicity = 'Fictional',
                            f.created_at = timestamp(),
                            f.ingestion_batch = $batch_id,
                            f.ingestion_source = 'falco_series_ingestion'
                        """,
                        canonical_id=char_id,
                        name=char_name,
                        title=char_title,
                        batch_id=batch_id
                    )
                    total_characters += 1

                # Create APPEARS_IN relationships for core characters
                for core_char in CORE_CHARACTERS:
                    session.run(
                        """
                        MATCH (f:HistoricalFigure {canonical_id: $canonical_id})
                        MATCH (m:MediaWork {wikidata_id: $book_wikidata_id})
                        CREATE (f)-[:APPEARS_IN {role: "Protagonist/recurring character"}]->(m)
                        """,
                        canonical_id=core_char["canonical_id"],
                        book_wikidata_id=book_info["q_id"]
                    )
                    total_appears_in += 1

                # Create APPEARS_IN relationships for book-specific characters
                for char_id, _, _ in book_info["characters"]:
                    session.run(
                        """
                        MATCH (f:HistoricalFigure {canonical_id: $canonical_id})
                        MATCH (m:MediaWork {wikidata_id: $book_wikidata_id})
                        CREATE (f)-[:APPEARS_IN {role: "Character appearance"}]->(m)
                        """,
                        canonical_id=char_id,
                        book_wikidata_id=book_info["q_id"]
                    )
                    total_appears_in += 1

                # Create core INTERACTED_WITH relationships
                session.run(
                    """
                    MATCH (f1:HistoricalFigure {canonical_id: "falco_marcus_didius"})
                    MATCH (f2:HistoricalFigure {canonical_id: "helena_justina"})
                    MERGE (f1)-[:INTERACTED_WITH {relationship_type: "ROMANTIC_PARTNER", context: "Married couple"}]->(f2)
                    """
                )
                session.run(
                    """
                    MATCH (f1:HistoricalFigure {canonical_id: "falco_marcus_didius"})
                    MATCH (f2:HistoricalFigure {canonical_id: "petronius_longus"})
                    MERGE (f1)-[:INTERACTED_WITH {relationship_type: "BEST_FRIEND", context: "Longtime colleagues"}]->(f2)
                    """
                )
                session.run(
                    """
                    MATCH (f1:HistoricalFigure {canonical_id: "falco_marcus_didius"})
                    MATCH (f2:HistoricalFigure {canonical_id: "decimus_camillus_verus"})
                    MERGE (f1)-[:INTERACTED_WITH {relationship_type: "PATRON_CLIENT", context: "Professional relationship"}]->(f2)
                    """
                )

                print(f"  ✓ Created MediaWork + {len(book_info['characters'])} characters + APPEARS_IN relationships")

            print(f"\n{'='*80}")
            print(f"INGESTION COMPLETE: BOOKS 6-20")
            print(f"{'='*80}")
            print(f"Summary:")
            print(f"  - MediaWorks created: {total_mediaworks}")
            print(f"  - New characters created: {total_characters}")
            print(f"  - Core characters MERGED (no duplicates): {len(CORE_CHARACTERS)}")
            print(f"  - Historical figures MERGED: {len(all_historical)}")
            print(f"  - APPEARS_IN relationships created: {total_appears_in}")
            print(f"  - Books processed: 15 (Books 6-20)")
            print(f"{'='*80}\n")

            # Verification queries
            print("VERIFICATION PHASE")
            print("-" * 80)
            result = session.run("MATCH (m:MediaWork) WHERE m.series_name = 'Marcus Didius Falco' RETURN count(m) as total")
            total_falco_books = result.single()["total"]
            print(f"✓ Total Falco series books in database: {total_falco_books}")

            result = session.run("MATCH (f:HistoricalFigure)-[:APPEARS_IN]->(m:MediaWork) WHERE m.series_name = 'Marcus Didius Falco' RETURN count(*) as total")
            total_falco_portrayals = result.single()["total"]
            print(f"✓ Total character portrayals in Falco series: {total_falco_portrayals}")

            result = session.run("MATCH (f:HistoricalFigure {canonical_id: 'falco_marcus_didius'})-[:APPEARS_IN]->(m) RETURN count(m) as total")
            falco_appearances = result.single()["total"]
            print(f"✓ Marcus Didius Falco appearances across series: {falco_appearances} books")

            print(f"\n{'='*80}\n")

    finally:
        driver.close()

if __name__ == "__main__":
    ingest_all_books()
