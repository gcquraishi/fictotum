"""
ChronosGraph: Marcus Didius Falco Series - The Silver Pigs (Book 1)

Comprehensive ingestion of character relationships from Lindsey Davis's 20-book
Marcus Didius Falco mystery series, starting with the anchor book "The Silver Pigs."

Historical Context:
- Setting: Rome and Britannia, AD 70
- Historical Period: Post-"Year of the Four Emperors" (AD 69)
- Under reign of Emperor Vespasian (Wikidata: Q1419)
- Series spans 20 books covering AD 70 onwards

Research Sources:
- Wikipedia: The Silver Pigs article
- Goodreads: Marcus Didius Falco series (20 books)
- SuperSummary: Character summaries
- Lindsey Davis official website
- LibraryThing: Character tracking across series
- Wikidata: Historical emperors and canonical IDs

Strategy:
1. Create HistoricalFigure nodes for:
   - Marcus Didius Falco (Q1469475 - fictional protagonist)
   - Helena Justina (fictional, appears throughout series)
   - Vespasian (Q1419 - historical emperor)
   - Titus (Q1421 - historical emperor)
   - Domitian (Q1423 - historical emperor)
   - Supporting fictional characters

2. Create MediaWork node for The Silver Pigs (Q1212490)

3. Map APPEARS_IN relationships from characters to book

4. Map INTERACTED_WITH relationships between characters

5. Document series progression (which characters appear in which books)
"""

import os
import sys
import json
import traceback
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

# Load environment variables
load_dotenv()

# Add parent directory to path for schema import
sys.path.insert(0, str(Path(__file__).parent.parent))
from schema import (
    HistoricalFigure, MediaWork, Portrayal,
    MediaType, Sentiment, SCHEMA_CONSTRAINTS
)

# Error logging
ERROR_LOG = []

def log_error(context: str, error: Exception):
    """Log errors for review."""
    ERROR_LOG.append({
        "timestamp": datetime.now().isoformat(),
        "context": context,
        "error": str(error),
        "traceback": traceback.format_exc()
    })
    print(f"  [ERROR] {context}: {error}")


# =============================================================================
# HISTORICAL & FICTIONAL FIGURES: Master Entities for The Silver Pigs
# =============================================================================

HISTORICAL_FIGURES = [
    # === Historical Emperors (Actual Roman Emperors) ===
    HistoricalFigure(
        canonical_id="vespasian",
        name="Vespasian",
        birth_year=9,  # AD 9
        death_year=79,  # AD 79
        title="Emperor of Rome",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="titus_emperor",
        name="Titus",
        birth_year=39,  # AD 39
        death_year=81,  # AD 81
        title="Emperor of Rome",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="domitian_emperor",
        name="Domitian",
        birth_year=51,  # AD 51
        death_year=96,  # AD 96
        title="Emperor of Rome",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Fictional Protagonist & Main Characters ===
    HistoricalFigure(
        canonical_id="marcus_didius_falco",
        name="Marcus Didius Falco",
        birth_year=-15,  # ~15 BC, making him ~30 in AD 70
        death_year=None,  # Alive at end of series
        title="Informer and Imperial Agent",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="helena_justina",
        name="Helena Justina",
        birth_year=47,  # ~47 AD, making her ~23 in AD 70
        death_year=None,  # Alive at end of series
        title="Noblewoman, Daughter of Senator",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Fictional Supporting Characters ===
    HistoricalFigure(
        canonical_id="lucius_petronius_longus",
        name="Lucius Petronius Longus",
        birth_year=None,
        death_year=None,
        title="Vigiles Captain, Watch Captain of Aventine",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="decimus_camillus_verus",
        name="Decimus Camillus Verus",
        birth_year=None,
        death_year=None,
        title="Senator of Rome",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="sosia_camillina",
        name="Sosia Camillina",
        birth_year=54,  # ~54 AD, making her ~16 in AD 70
        death_year=70,  # AD 70 (murdered in The Silver Pigs)
        title="Young Noblewoman",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="lenia",
        name="Lenia",
        birth_year=None,
        death_year=None,
        title="Laundry Owner",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="smaractus",
        name="Smaractus",
        birth_year=None,
        death_year=None,
        title="Retired Gladiator, Apartment Building Owner",
        era="Roman Empire (Flavian Dynasty)"
    ),
    HistoricalFigure(
        canonical_id="publius_camillus_meto",
        name="Publius Camillus Meto",
        birth_year=None,
        death_year=None,
        title="Roman Noblewoman, Father of Sosia",
        era="Roman Empire (Flavian Dynasty)"
    ),
]


# =============================================================================
# MEDIA WORKS: The Silver Pigs and Series Context
# =============================================================================

MEDIA_WORKS = [
    MediaWork(
        media_id="the_silver_pigs",
        wikidata_id="Q1212490",
        title="The Silver Pigs",
        media_type=MediaType.BOOK,
        release_year=1989,
        creator="Lindsey Davis"
    ),
]


# =============================================================================
# CHARACTER PORTRAYALS: How Characters Appear in The Silver Pigs
# =============================================================================

PORTRAYALS = [
    # === Main Protagonist ===
    Portrayal(
        figure_id="marcus_didius_falco",
        media_id="the_silver_pigs",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist - Informer and Imperial Agent investigating a silver smuggling conspiracy and murder",
        is_protagonist=True,
        conflict_flag=False
    ),

    # === Romantic Interest ===
    Portrayal(
        figure_id="helena_justina",
        media_id="the_silver_pigs",
        sentiment=Sentiment.HEROIC,
        role_description="Daughter of Senator Decimus Camillus Verus; romantic interest who develops complex relationship with Falco",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === Historical Emperors ===
    Portrayal(
        figure_id="vespasian",
        media_id="the_silver_pigs",
        sentiment=Sentiment.NEUTRAL,
        role_description="Roman Emperor who hires Falco to investigate the silver conspiracy",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === Supporting Fictional Characters ===
    Portrayal(
        figure_id="lucius_petronius_longus",
        media_id="the_silver_pigs",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's best friend from army days; Vigiles captain assisting in investigation",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="decimus_camillus_verus",
        media_id="the_silver_pigs",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator and Helena's father; hires Falco to investigate his niece's murder",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sosia_camillina",
        media_id="the_silver_pigs",
        sentiment=Sentiment.NEUTRAL,
        role_description="Murder victim; young noblewoman whose death drives the main plot",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="smaractus",
        media_id="the_silver_pigs",
        sentiment=Sentiment.COMPLEX,
        role_description="Retired gladiator who owns Falco's apartment building; uses violent collection methods",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="lenia",
        media_id="the_silver_pigs",
        sentiment=Sentiment.NEUTRAL,
        role_description="Laundry owner on ground floor of Falco's building; local community figure",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="publius_camillus_meto",
        media_id="the_silver_pigs",
        sentiment=Sentiment.NEUTRAL,
        role_description="Sosia's father; Roman nobleman involved in the conspiracy",
        is_protagonist=False,
        conflict_flag=False
    ),
]


# =============================================================================
# CHARACTER INTERACTION RELATIONSHIPS
# =============================================================================

CHARACTER_INTERACTIONS = [
    # Format: (character_1_canonical_id, character_2_canonical_id, relationship_type, context)

    # === Main Plot Relationships ===
    ("marcus_didius_falco", "helena_justina", "ROMANTIC_INTEREST", "Falco and Helena develop romantic feelings during investigation in Britain"),
    ("marcus_didius_falco", "lucius_petronius_longus", "CLOSE_FRIENDSHIP", "Former army colleagues and best friends; Petronius assists in investigation"),
    ("marcus_didius_falco", "vespasian", "PATRON_CLIENT", "Vespasian hires Falco as imperial agent to investigate conspiracy"),
    ("marcus_didius_falco", "decimus_camillus_verus", "CLIENT_CONTRACTOR", "Decimus hires Falco to investigate his niece's death"),

    # === Family Relationships ===
    ("helena_justina", "decimus_camillus_verus", "FATHER_DAUGHTER", "Helena is daughter of Senator Decimus Camillus Verus"),
    ("helena_justina", "sosia_camillina", "COUSIN_RELATIONSHIP", "Helena and Sosia are cousins"),
    ("sosia_camillina", "decimus_camillus_verus", "UNCLE_NIECE", "Sosia is niece of Senator Decimus"),
    ("sosia_camillina", "publius_camillus_meto", "FATHER_DAUGHTER", "Sosia is daughter of Publius Camillus Meto"),

    # === Imperial & Political Relationships ===
    ("vespasian", "decimus_camillus_verus", "EMPEROR_SENATOR", "Vespasian and Decimus are emperor and senator"),

    # === Local Community Relationships ===
    ("marcus_didius_falco", "smaractus", "LANDLORD_TENANT", "Smaractus owns building where Falco lives on Aventine"),
    ("marcus_didius_falco", "lenia", "NEIGHBOR", "Lenia runs laundry on ground floor of Falco's building"),
    ("smaractus", "lenia", "BUILDING_NEIGHBORS", "Both work in/own parts of same building complex"),
]


# =============================================================================
# CHARACTER SERIES PROGRESSION: Appearances Across 20 Books
# =============================================================================

CHARACTER_SERIES_PROGRESSION = {
    "marcus_didius_falco": {
        "description": "Protagonist in all 20 books",
        "appearances": list(range(1, 21)),  # Books 1-20
        "role": "PROTAGONIST"
    },
    "helena_justina": {
        "description": "Romantic interest and wife; becomes major character after Book 1",
        "appearances": list(range(1, 21)),  # Books 1-20
        "role": "MAIN_CHARACTER",
        "notes": "Marries Falco in later books; relationship arc spans series"
    },
    "lucius_petronius_longus": {
        "description": "Falco's best friend; appears in majority of books",
        "appearances": list(range(1, 21)),  # Books 1-20
        "role": "MAIN_SUPPORTING_CHARACTER",
        "notes": "Captain of Vigiles; family relationship with Falco's sister Maia"
    },
    "vespasian": {
        "description": "Emperor during early books",
        "appearances": [1, 2, 3, 4, 5, 6, 7],  # AD 70-79
        "role": "HISTORICAL_FIGURE",
        "notes": "Historical emperor; appears in books set during his reign (AD 69-79)"
    },
    "titus_emperor": {
        "description": "Emperor in middle-later books",
        "appearances": [8, 9, 10],  # AD 79-81
        "role": "HISTORICAL_FIGURE",
        "notes": "Historical emperor; reigns AD 79-81"
    },
    "domitian_emperor": {
        "description": "Emperor in later books",
        "appearances": [11, 12, 13, 14, 15, 16, 17, 18, 19, 20],  # AD 81+
        "role": "HISTORICAL_FIGURE",
        "notes": "Historical emperor; reigns AD 81-96"
    },
    "decimus_camillus_verus": {
        "description": "Helena's father; senator appearing throughout series",
        "appearances": list(range(1, 21)),  # Books 1-20
        "role": "MAIN_SUPPORTING_CHARACTER",
        "notes": "Father of Helena; connected to political intrigue throughout series"
    },
}


# =============================================================================
# INGESTION CLASS
# =============================================================================

class SilverPigsIngestor:
    """Handles ingestion of The Silver Pigs character data into Neo4j."""

    def __init__(self, uri: str, username: str, password: str):
        """Initialize Neo4j driver with SSL handling."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        """Close database connection."""
        self.driver.close()

    def setup_schema(self):
        """Apply schema constraints."""
        with self.driver.session() as session:
            for statement in SCHEMA_CONSTRAINTS.strip().split(';'):
                statement = statement.strip()
                if statement:
                    try:
                        session.run(statement)
                    except Exception as e:
                        log_error("Schema setup", e)
        print("Schema constraints applied.")

    def ingest_figures(self, figures: List[HistoricalFigure]) -> int:
        """Ingest historical and fictional figures using MERGE."""
        success_count = 0
        with self.driver.session() as session:
            for figure in figures:
                try:
                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name,
                            f.birth_year = $birth_year,
                            f.death_year = $death_year,
                            f.title = $title,
                            f.era = $era
                    """, **figure.model_dump())
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting figure {figure.name}", e)
        print(f"Ingested {success_count}/{len(figures)} historical figures.")
        return success_count

    def ingest_media(self, works: List[MediaWork]) -> int:
        """Ingest media works."""
        success_count = 0
        with self.driver.session() as session:
            for work in works:
                try:
                    session.run("""
                        MERGE (m:MediaWork {wikidata_id: $wikidata_id})
                        SET m.media_id = $media_id,
                            m.title = $title,
                            m.media_type = $media_type,
                            m.release_year = $release_year,
                            m.creator = $creator
                    """, media_type=work.media_type.value, **work.model_dump(exclude={'media_type'}))
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting media {work.title}", e)
        print(f"Ingested {success_count}/{len(works)} media works.")
        return success_count

    def ingest_portrayals(self, portrayals: List[Portrayal]) -> int:
        """Create APPEARS_IN relationships."""
        success_count = 0
        with self.driver.session() as session:
            for p in portrayals:
                try:
                    session.run("""
                        MATCH (f:HistoricalFigure {canonical_id: $figure_id})
                        MATCH (m:MediaWork {media_id: $media_id})
                        MERGE (f)-[r:APPEARS_IN]->(m)
                        SET r.sentiment = $sentiment,
                            r.role_description = $role_description,
                            r.is_protagonist = $is_protagonist,
                            r.conflict_flag = $conflict_flag,
                            r.conflict_notes = $conflict_notes
                    """, sentiment=p.sentiment.value, **p.model_dump(exclude={'sentiment'}))
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting portrayal {p.figure_id} in {p.media_id}", e)
        print(f"Ingested {success_count}/{len(portrayals)} portrayals (APPEARS_IN relationships).")
        return success_count

    def ingest_interactions(self, interactions: List[tuple]) -> int:
        """Create INTERACTED_WITH relationships between characters."""
        success_count = 0
        with self.driver.session() as session:
            for char1_id, char2_id, rel_type, context in interactions:
                try:
                    session.run("""
                        MATCH (f1:HistoricalFigure {canonical_id: $char1_id})
                        MATCH (f2:HistoricalFigure {canonical_id: $char2_id})
                        MERGE (f1)-[r:INTERACTED_WITH]-(f2)
                        SET r.relationship_type = $rel_type,
                            r.context = $context,
                            r.media_work = "The Silver Pigs"
                    """, char1_id=char1_id, char2_id=char2_id, rel_type=rel_type, context=context)
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting interaction {char1_id} <-> {char2_id}", e)
        print(f"Ingested {success_count}/{len(interactions)} character interactions (INTERACTED_WITH).")
        return success_count

    def document_series_progression(self) -> dict:
        """Document which characters appear in which books for series propagation."""
        print("\n" + "="*80)
        print("CHARACTER SERIES PROGRESSION: The Silver Pigs → 20-Book Series")
        print("="*80)

        summary = {
            "total_characters": len(CHARACTER_SERIES_PROGRESSION),
            "total_books": 20,
            "characters_in_all_books": [],
            "main_characters": [],
            "historical_figures": [],
            "book_appearances": {}
        }

        for char_id, prog_data in CHARACTER_SERIES_PROGRESSION.items():
            num_appearances = len(prog_data["appearances"])

            if num_appearances == 20:
                summary["characters_in_all_books"].append(char_id)

            if prog_data["role"] in ["PROTAGONIST", "MAIN_CHARACTER", "MAIN_SUPPORTING_CHARACTER"]:
                summary["main_characters"].append(char_id)

            if prog_data["role"] == "HISTORICAL_FIGURE":
                summary["historical_figures"].append(char_id)

            print(f"\n{char_id.upper()}")
            print(f"  Role: {prog_data['role']}")
            print(f"  Appearances: Books {prog_data['appearances'][0]}-{prog_data['appearances'][-1]} ({len(prog_data['appearances'])} books)")
            print(f"  Description: {prog_data['description']}")
            if "notes" in prog_data:
                print(f"  Notes: {prog_data['notes']}")

        print("\n" + "="*80)
        print(f"SUMMARY: {len(summary['characters_in_all_books'])} characters in all 20 books")
        print(f"         {len(summary['main_characters'])} main/supporting characters")
        print(f"         {len(summary['historical_figures'])} historical emperor figures")
        print("="*80 + "\n")

        return summary


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main ingestion workflow."""
    # Load environment variables
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
    neo4j_password = os.getenv("NEO4J_PASSWORD")

    if not all([neo4j_uri, neo4j_user, neo4j_password]):
        print("ERROR: Missing Neo4j credentials in environment variables")
        print("Required: NEO4J_URI, NEO4J_USERNAME (or NEO4J_USER), NEO4J_PASSWORD")
        return False

    # Initialize ingestor
    ingestor = SilverPigsIngestor(neo4j_uri, neo4j_user, neo4j_password)

    try:
        print("="*80)
        print("ChronosGraph: The Silver Pigs Character Ingestion")
        print("="*80)

        # Setup schema
        print("\n[1/5] Setting up schema constraints...")
        ingestor.setup_schema()

        # Ingest historical and fictional figures
        print("\n[2/5] Ingesting historical and fictional figures...")
        fig_count = ingestor.ingest_figures(HISTORICAL_FIGURES)

        # Ingest media work
        print("\n[3/5] Ingesting media work (The Silver Pigs)...")
        media_count = ingestor.ingest_media(MEDIA_WORKS)

        # Ingest portrayals
        print("\n[4/5] Ingesting character portrayals (APPEARS_IN relationships)...")
        portrayal_count = ingestor.ingest_portrayals(PORTRAYALS)

        # Ingest character interactions
        print("\n[5/5] Ingesting character interactions (INTERACTED_WITH relationships)...")
        interaction_count = ingestor.ingest_interactions(CHARACTER_INTERACTIONS)

        # Document series progression
        print("\n[6/5] Documenting series progression for 20-book cascade...")
        progression_summary = ingestor.document_series_progression()

        # Print summary
        print("\n" + "="*80)
        print("INGESTION SUMMARY")
        print("="*80)
        print(f"Historical Figures: {fig_count}")
        print(f"Media Works: {media_count}")
        print(f"Character Portrayals (APPEARS_IN): {portrayal_count}")
        print(f"Character Interactions (INTERACTED_WITH): {interaction_count}")
        print(f"\nCharacter series progression documented for {progression_summary['total_characters']} characters")
        print(f"Ready to propagate to remaining {progression_summary['total_books']-1} books in series")
        print("="*80 + "\n")

        return True

    except ServiceUnavailable:
        print("ERROR: Neo4j database is unavailable")
        return False
    except AuthError:
        print("ERROR: Neo4j authentication failed")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error during ingestion: {e}")
        traceback.print_exc()
        return False
    finally:
        ingestor.close()

        # Log errors if any
        if ERROR_LOG:
            print(f"\n{len(ERROR_LOG)} errors encountered during ingestion:")
            for error_entry in ERROR_LOG:
                print(f"  - {error_entry['context']}: {error_entry['error']}")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
