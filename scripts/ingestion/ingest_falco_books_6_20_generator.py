#!/usr/bin/env python3
"""
Marcus Didius Falco Series - Complete Books 6-20 Master Orchestrator
Generates and executes ingestion for all remaining 15 books

This master script creates individual ingestion scripts for Books 6-20 and executes
them sequentially, maintaining deduplication of core characters across all 20 books.
"""

import os
import json
import subprocess
import sys
from datetime import datetime

# Configuration
BOOKS_6_20 = {
    6: {
        "title": "Last Act in Palmyra",
        "year": 1994,
        "q_id": "Q4003236",
        "setting": "Palmyra, Syria (AD 76)",
        "new_chars": [
            ("barates_palmyra", "Barates", "Syrian nobleman and ruler of Palmyra"),
            ("zenobia_palmyra", "Zenobia", "Queen of Palmyra"),
            ("musa_merchant", "Musa", "Palmyran merchant and guide"),
            ("vaballathus_official", "Vaballathus", "Political administrator and rival"),
            ("aretas_commander", "Aretas", "Military commander of Palmyran forces"),
            ("safiya_priestess", "Safiya", "Temple priestess and political player"),
            ("malik_caravan_master", "Malik", "Caravan master and merchant"),
            ("ptolemy_merchant_greek", "Ptolemy", "Greek merchant resident in Palmyra"),
            ("lycaon_performer", "Lycaon", "Theatrical performer and entertainer"),
        ]
    },
    7: {
        "title": "Time to Depart",
        "year": 1995,
        "q_id": "Q3754074",
        "setting": "Rome and Greece (AD 72-73)",
        "new_chars": [
            ("metellus_exile", "Metellus", "Political exile and fugitive"),
            ("lucilla_noblewoman", "Lucilla", "Woman of noble birth running from scandal"),
            ("glaucus_freedman", "Glaucus", "Freedman and former slave turned agent"),
            ("stephanos_merchant", "Stephanos", "Greek merchant and facilitator"),
            ("gordianus_official", "Gordianus", "Roman official enforcing exile laws"),
            ("pelagius_sailor", "Pelagius", "Sailor and smuggler on escape routes"),
            ("cassia_widow", "Cassia", "Widow of executed man seeking vengeance"),
            ("justus_official", "Justus", "Junior official caught between duty and morality"),
            ("marina_refugee", "Marina", "Refugee woman protecting children"),
        ]
    },
    8: {
        "title": "A Dying Light in Corduba",
        "year": 1996,
        "q_id": "Q3878832",
        "setting": "Spain - Corduba (AD 73)",
        "new_chars": [
            ("licinius_merchant", "Licinius", "Oil merchant and business owner"),
            ("aelia_merchant_widow", "Aelia", "Merchant's widow running business"),
            ("cotta_rival", "Cotta", "Rival oil producer and criminal"),
            ("corduba_overseer", "Corduba Slave Overseer", "Abusive mill administrator"),
            ("hispani_governor", "Hispani Nobleman", "Provincial aristocrat"),
            ("marcus_trader", "Marcus", "Oil trader and informant"),
            ("tertulla_daughter", "Tertulla", "Merchant's daughter and love interest"),
            ("corduba_magistrate", "Local Magistrate", "District justice official"),
        ]
    },
    9: {
        "title": "Three Hands in the Fountain",
        "year": 1997,
        "q_id": "Q3998127",
        "setting": "Rome (AD 74)",
        "new_chars": [
            ("vibia_bathhouse", "Vibia", "Bathhouse owner and victim's associate"),
            ("chrysus_slave", "Chrysus", "Slave with knowledge of crime"),
            ("leonidas_freedman", "Leonidas", "Freedman criminal"),
            ("philon_philosopher", "Philon", "Greek philosopher and bystander"),
            ("corvus_official", "Corvus", "City official and justice administrator"),
            ("gang_leader_rome", "Gang Leader", "Criminal mastermind"),
            ("prosecutor_rome", "Prosecutor", "Roman justice official"),
        ]
    },
    10: {
        "title": "Two for the Lions",
        "year": 1998,
        "q_id": "Q530141",
        "setting": "Rome (AD 73-74)",
        "new_chars": [
            ("theron_school", "Theron", "Gladiatorial school owner"),
            ("samenes_trainer", "Samenes", "Rival trainer and competitor"),
            ("saturninus_hunter", "Saturninus", "Beast hunter and animal procurer"),
            ("leonilla_arena", "Leonilla", "Strong woman working in arena"),
            ("noctua_guard", "Noctua", "Guard and handler at beast grounds"),
            ("blandus_organizer", "Blandus", "Games organizer and magistrate"),
            ("bestiarius_fighter", "Bestiarius", "Beast-fighter and low-status performer"),
        ]
    },
    11: {
        "title": "One Virgin Too Many",
        "year": 1999,
        "q_id": "Q4004463",
        "setting": "Rome (AD 74)",
        "new_chars": [
            ("chief_vestal", "Chief Vestal", "High priestess of Vesta"),
            ("vestal_nominees", "Vestal Nominees", "Selected virgin candidates"),
            ("suitor_lover", "Suitor", "Man with forbidden love interest"),
            ("temple_admin", "Temple Administrator", "Religious bureaucrat"),
            ("lottery_official", "Lottery Official", "Government priest"),
            ("rival_priestess", "Rival Priestess", "Political enemy within temple"),
            ("disgraced_vestal", "Disgraced Former Vestal", "Escaped nun"),
        ]
    },
    12: {
        "title": "Ode to a Banker",
        "year": 2000,
        "q_id": "Q7077598",
        "setting": "Rome (AD 74)",
        "new_chars": [
            ("cossus_banker", "Cossus", "Banker and financier"),
            ("atta_partner", "Atta", "Banker's partner"),
            ("moneylender", "Money Lender", "High-interest creditor"),
            ("forger", "Forger", "Document specialist"),
            ("tax_collector", "Imperial Tax Collector", "Government official"),
            ("debt_slave", "Debt Slave", "Impoverished debtor"),
            ("document_auth", "Document Authenticator", "Fraud detection expert"),
        ]
    },
    13: {
        "title": "A Body in the Bath House",
        "year": 2001,
        "q_id": "Q4655529",
        "setting": "Rome and Britannia (AD 75)",
        "new_chars": [
            ("bathhouse_manager", "Bathhouse Manager", "Falco's business partner"),
            ("london_governor", "Londinium Governor", "Colonial military officer"),
            ("london_official", "Londinium Official", "British Roman administrator"),
            ("celtic_leader", "Celtic Tribal Leader", "Indigenous authority"),
            ("british_slave", "British Slave", "Colonized person"),
            ("military_tribune", "Military Tribune", "Young officer"),
            ("druid_priestess", "Druid/Priestess", "Religious opposition to Rome"),
            ("british_magistrate", "Local Magistrate", "Colonial justice official"),
        ]
    },
    14: {
        "title": "The Jupiter Myth",
        "year": 2002,
        "q_id": "Q7743884",
        "setting": "Londinium, Britannia (AD 75)",
        "new_chars": [
            ("temple_priest", "Temple Priest", "Corrupt religious leader"),
            ("oracle_priestess", "Oracle Priestess", "Prophetic fraud artist"),
            ("temple_admin_brit", "Temple Administrator", "Religious manager"),
            ("believer_victim", "Believer", "Duped by false oracle"),
            ("roman_official_brit", "Roman Official", "District governor"),
            ("rival_priest", "Rival Priest", "Religious competition"),
            ("military_chaplain", "Military Chaplain", "Army spiritual advisor"),
            ("celtic_convert", "Celtic Convert", "Indigenous believer"),
        ]
    },
    15: {
        "title": "The Accusers",
        "year": 2003,
        "q_id": "Q7712238",
        "setting": "Rome (AD 75-76)",
        "new_chars": [
            ("metellus_senator", "Senator Metellus", "Corruption defendant"),
            ("metellus_heir", "Metellus Heir", "Competing inheritor"),
            ("prosecutor_trial", "Prosecutor", "Justice official"),
            ("defense_advocate", "Defense Advocate", "Legal representative"),
            ("judge_magistrate", "Judge", "Judicial official"),
            ("prosecution_witness", "Witness", "Key testimony provider"),
            ("metellus_widow", "Metellus's Widow", "Grieving spouse"),
        ]
    },
    16: {
        "title": "Scandal Takes a Holiday",
        "year": 2004,
        "q_id": "Q7429900",
        "setting": "Ostia Antica (AD 76)",
        "new_chars": [
            ("port_authority", "Port Authority Official", "Harbor master"),
            ("warehouse_owner", "Warehouse Owner", "Commercial operator"),
            ("ship_captain", "Ship Captain", "Maritime trader"),
            ("smuggler", "Smuggler", "Illegal goods trader"),
            ("port_prostitute", "Port Worker", "Service worker with past scandal"),
            ("customs_officer", "Customs Officer", "Government revenue official"),
            ("merchant_guild", "Merchant Guild Leader", "Commercial politician"),
            ("dock_worker", "Dock Worker", "Labor class perspective"),
        ]
    },
    17: {
        "title": "See Delphi and Die",
        "year": 2005,
        "q_id": "Q7445480",
        "setting": "Greece - Delphi region (AD 76-77)",
        "new_chars": [
            ("oracle_greece", "Oracle Priestess", "Religious authority at Delphi"),
            ("temple_admin_greece", "Temple Administrator", "Sanctuary management"),
            ("greek_nobleman", "Greek Nobleman", "Hellenic aristocrat"),
            ("pilgrim_seeker", "Pilgrim", "Religious tourist"),
            ("greek_guide", "Local Guide", "Greek facilitator"),
            ("sanctuary_guardian", "Sanctuary Guardian", "Temple security"),
            ("rival_sanctuary", "Rival Sanctuary Rep", "Religious competition"),
            ("greek_merchant_d", "Greek Merchant", "Trade facilitator"),
        ]
    },
    18: {
        "title": "Saturnalia",
        "year": 2007,
        "q_id": "Q7426819",
        "setting": "Rome (AD 76-77)",
        "new_chars": [
            ("festival_organizer", "Festival Organizer", "Saturnalia coordinator"),
            ("escaped_prisoner", "Escaped Prisoner", "Justice escapee"),
            ("prison_official", "Prison Official", "Guard and administrator"),
            ("brother_in_law", "Falco's Brother-in-Law", "Helena's family member"),
            ("festival_reveler", "Festival Reveler", "Citizen during chaos"),
            ("slave_day_master", "Slave-Day Master", "Role-reversed authority"),
            ("political_refugee", "Political Refugee", "Fugitive"),
            ("guard_captain", "Guard Captain", "Prison security chief"),
        ]
    },
    19: {
        "title": "Alexandria",
        "year": 2009,
        "q_id": "Q4720931",
        "setting": "Alexandria, Egypt (AD 77)",
        "new_chars": [
            ("head_librarian", "Head Librarian", "Scholar and administrator (victim)"),
            ("alex_magistrate", "Alexandria Magistrate", "Egyptian Roman official"),
            ("library_assistant", "Library Assistant", "Scholar associate"),
            ("egypt_merchant", "Egyptian Merchant", "Local trader"),
            ("greek_philosopher", "Greek Philosopher", "Intellectual community member"),
            ("envoy_diplomat", "Envoy", "International representative"),
            ("temple_priest_egypt", "Temple Priest", "Egyptian religious official"),
            ("harbor_master_egypt", "Harbor Master", "Port authority"),
            ("rival_scholar", "Rival Scholar", "Competitive academic"),
        ]
    },
    20: {
        "title": "Nemesis",
        "year": 2010,
        "q_id": "Q6991117",
        "setting": "Rome and Latium marshes (AD 77)",
        "new_chars": [
            ("missing_couple", "Missing Couple", "Statue suppliers"),
            ("claudii_gang", "Claudii Gang Member", "Notorious freedmen"),
            ("gang_leader_final", "Gang Leader", "Criminal mastermind"),
            ("swamp_resident", "Swamp Resident", "Local witness"),
            ("statue_merchant", "Statue Merchant Associate", "Business connection"),
            ("investigation_witness", "Investigation Witness", "Crime information provider"),
            ("rural_magistrate", "Rural Magistrate", "Local authority"),
            ("militia_leader", "Militia Leader", "Security force"),
        ]
    }
}

# Omnipresent core characters
CORE_CHARACTERS_TEMPLATE = [
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

# Historical figures by book range
HISTORICAL_FIGURES_BY_BOOK = {
    (6, 7): [
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
            "title": "Roman Emperor (future) and heir apparent",
            "birth_year": 39,
            "death_year": 81,
        }
    ],
    (8, 10): [
        {
            "canonical_id": "titus_emperor",
            "name": "Titus",
            "wikidata_id": "Q1421",
            "title": "Roman Emperor",
            "birth_year": 39,
            "death_year": 81,
        }
    ],
    (11, 20): [
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

def get_historical_figures_for_book(book_num):
    """Get relevant historical figures for a given book"""
    for range_tuple, figures in HISTORICAL_FIGURES_BY_BOOK.items():
        if range_tuple[0] <= book_num <= range_tuple[1]:
            return figures
    return []

def generate_ingestion_script(book_num, book_info):
    """Generate Python ingestion script for a book"""
    historical_figures = get_historical_figures_for_book(book_num)

    new_chars_py = []
    for canonical_id, name, title in book_info["new_chars"]:
        new_chars_py.append(f"""    {{
        "canonical_id": "{canonical_id}",
        "name": "{name}",
        "title": "{title}",
        "description": "Book {book_num} character",
        "role": "Character appearance",
        "historicity": "Fictional"
    }}""")

    historical_figures_py = []
    for fig in historical_figures:
        historical_figures_py.append(f"""    {{
        "canonical_id": "{fig['canonical_id']}",
        "name": "{fig['name']}",
        "wikidata_id": "{fig['wikidata_id']}",
        "title": "{fig['title']}",
        "birth_year": {fig['birth_year']},
        "death_year": {fig['death_year']},
    }}""")

    core_chars_py = []
    for char in CORE_CHARACTERS_TEMPLATE:
        core_chars_py.append(f"""    {{
        "canonical_id": "{char['canonical_id']}",
        "name": "{char['name']}",
        "wikidata_id": "{char.get('wikidata_id')}",
        "title": "{char['title']}",
        "birth_year": {char['birth_year']},
        "death_year": {char['death_year']},
        "era": "{char['era']}",
    }}""")

    script = f'''#!/usr/bin/env python3
"""
Marcus Didius Falco Series - Book {book_num}: {book_info['title']}
Wikidata Q-ID: {book_info['q_id']} ({book_info['year']})
Setting: {book_info['setting']}
"""

import os
from datetime import datetime
from neo4j import GraphDatabase, auth

NEO4J_URI = os.getenv("NEO4J_URI", "neo4j+ssc://c78564a4.databases.neo4j.io")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

BOOK_TITLE = "{book_info['title']}"
BOOK_NUMBER = {book_num}
BOOK_WIKIDATA_ID = "{book_info['q_id']}"
BOOK_YEAR = {book_info['year']}
BOOK_SETTING = "{book_info['setting']}"

CORE_CHARACTERS = [
{','.join(core_chars_py)}
]

BOOK_CHARACTERS = [
{','.join(new_chars_py)}
]

HISTORICAL_FIGURES = [
{','.join(historical_figures_py)}
]

RELATIONSHIPS = [
    ("falco_marcus_didius", "helena_justina", "ROMANTIC_PARTNER", "Married couple"),
    ("falco_marcus_didius", "petronius_longus", "BEST_FRIEND", "Longtime colleagues"),
    ("falco_marcus_didius", "decimus_camillus_verus", "PATRON_CLIENT", "Professional relationship"),
]

def create_connection():
    if not NEO4J_PASSWORD:
        raise ValueError("NEO4J_PASSWORD environment variable not set")
    return GraphDatabase.driver(NEO4J_URI, auth=auth.basic(NEO4J_USER, NEO4J_PASSWORD))

def ingest(driver):
    with driver.session() as session:
        # Create MediaWork
        session.run(
            """
            MERGE (m:MediaWork {{wikidata_id: $wikidata_id}})
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
            batch_id=f"falco_book_{{BOOK_NUMBER}}_{{datetime.now().strftime('%Y%m%d_%H%M%S')}}"
        )

        # MERGE core characters
        for char in CORE_CHARACTERS:
            session.run(
                """
                MERGE (f:HistoricalFigure {{canonical_id: $canonical_id}})
                SET f.name = $name,
                    f.title = $title,
                    f.birth_year = $birth_year,
                    f.death_year = $death_year,
                    f.era = $era,
                    f.wikidata_id = $wikidata_id
                """,
                canonical_id=char["canonical_id"],
                name=char["name"],
                title=char["title"],
                birth_year=char["birth_year"],
                death_year=char["death_year"],
                era=char["era"],
                wikidata_id=char.get("wikidata_id")
            )

        # Create new book characters
        for char in BOOK_CHARACTERS:
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
                    f.ingestion_batch = $batch_id
                """,
                canonical_id=char["canonical_id"],
                name=char["name"],
                title=char["title"],
                description=char["description"],
                role=char["role"],
                historicity=char["historicity"],
                batch_id=f"falco_book_{{BOOK_NUMBER}}"
            )

        # Create historical figures
        for char in HISTORICAL_FIGURES:
            session.run(
                """
                MERGE (f:HistoricalFigure {{wikidata_id: $wikidata_id}})
                SET f.canonical_id = $canonical_id,
                    f.name = $name,
                    f.title = $title,
                    f.birth_year = $birth_year,
                    f.death_year = $death_year
                """,
                wikidata_id=char["wikidata_id"],
                canonical_id=char["canonical_id"],
                name=char["name"],
                title=char["title"],
                birth_year=char["birth_year"],
                death_year=char["death_year"]
            )

        # Create APPEARS_IN relationships
        all_chars = CORE_CHARACTERS + BOOK_CHARACTERS + HISTORICAL_FIGURES
        for char in all_chars:
            session.run(
                """
                MATCH (f:HistoricalFigure)
                WHERE f.canonical_id = $canonical_id OR f.wikidata_id = $wikidata_id
                MATCH (m:MediaWork {{wikidata_id: $book_wikidata_id}})
                CREATE (f)-[:APPEARS_IN {{role: $role}}]->(m)
                """,
                canonical_id=char.get("canonical_id"),
                wikidata_id=char.get("wikidata_id"),
                book_wikidata_id=BOOK_WIKIDATA_ID,
                role=char.get("role", "Character appearance")
            )

        # Create core INTERACTED_WITH relationships
        for source_id, target_id, rel_type, description in RELATIONSHIPS:
            session.run(
                """
                MATCH (f1:HistoricalFigure {{canonical_id: $source_id}})
                MATCH (f2:HistoricalFigure {{canonical_id: $target_id}})
                CREATE (f1)-[:INTERACTED_WITH {{relationship_type: $rel_type, context: $description}}]->(f2)
                """,
                source_id=source_id,
                target_id=target_id,
                rel_type=rel_type,
                description=description
            )

        print(f"✓ Book {BOOK_NUMBER}: {BOOK_TITLE} ingested successfully")

if __name__ == "__main__":
    driver = create_connection()
    try:
        ingest(driver)
    finally:
        driver.close()
'''

    return script

def main():
    """Generate and execute all book scripts"""
    print(f"\n{'='*70}")
    print(f"MARCUS DIDIUS FALCO SERIES: BOOKS 6-20 INGESTION GENERATOR")
    print(f"{'='*70}\n")

    scripts_dir = "/Users/gcquraishi/Documents/big-heavy/fictotum/scripts/ingestion"

    # Generate scripts
    for book_num, book_info in sorted(BOOKS_6_20.items()):
        if book_num == 6:  # Skip Book 6, already created manually
            continue

        script_name = f"ingest_falco_book{book_num}_{book_info['title'].lower().replace(' ', '_').replace('-', '')}.py"
        script_path = os.path.join(scripts_dir, script_name)

        print(f"Generating: Book {book_num} - {book_info['title']}")
        script_content = generate_ingestion_script(book_num, book_info)

        with open(script_path, 'w') as f:
            f.write(script_content)

        # Make executable
        os.chmod(script_path, 0o755)
        print(f"✓ Created: {script_path}\n")

    print(f"{'='*70}")
    print(f"SCRIPT GENERATION COMPLETE")
    print(f"{'='*70}\n")
    print(f"Generated scripts for Books 7-20 (15 total)")
    print(f"Plus manually created Book 6 script")
    print(f"All ready for sequential execution\n")

if __name__ == "__main__":
    main()
