"""
Fictotum: Marcus Didius Falco Series - Venus in Copper (Book 3)

Comprehensive ingestion of character relationships from Lindsey Davis's
"Venus in Copper" (Book 3 of Marcus Didius Falco series).

Historical Context:
- Setting: Rome (primarily Aventine district)
- Historical Period: AD 71 (Vespasian's reign)
- Plot: Investigation of wealthy freedman potentially marrying a "black widow"

Strategy:
1. MERGE core recurring characters
2. Create new HistoricalFigure nodes for Book 3-specific characters
3. Create MediaWork node for Venus in Copper
4. Map APPEARS_IN relationships
5. Map INTERACTED_WITH relationships
"""

import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import List
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
    })
    print(f"  [ERROR] {context}: {error}")


# =============================================================================
# MEDIA WORKS: Venus in Copper (Book 3)
# =============================================================================

MEDIA_WORKS = [
    MediaWork(
        media_id="venus_in_copper",
        wikidata_id="Q3824690",
        title="Venus in Copper",
        media_type=MediaType.BOOK,
        release_year=1991,
        creator="Lindsey Davis"
    ),
]


# =============================================================================
# NEW CHARACTERS FOR BOOK 3: Venus in Copper
# =============================================================================

NEW_FIGURES = [
    # === Primary Client ===
    HistoricalFigure(
        canonical_id="hortensius_novus",
        name="Hortensius Novus",
        birth_year=None,
        death_year=None,
        title="Wealthy Freedman",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Primary Suspect ===
    HistoricalFigure(
        canonical_id="severina_zotica",
        name="Severina Zotica",
        birth_year=None,
        death_year=None,
        title="Suspected Black Widow",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Female Investigator ===
    HistoricalFigure(
        canonical_id="sabina_pollia",
        name="Sabina Pollia",
        birth_year=None,
        death_year=None,
        title="Former Slave, Investigator",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Female Investigator ===
    HistoricalFigure(
        canonical_id="hortensia_atilia",
        name="Hortensia Atilia",
        birth_year=None,
        death_year=None,
        title="Former Slave, Investigator",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Initial Contact ===
    HistoricalFigure(
        canonical_id="hyacinthus",
        name="Hyacinthus",
        birth_year=None,
        death_year=None,
        title="Slave, Initial Contact",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Imperial Antagonist ===
    HistoricalFigure(
        canonical_id="anacrites",
        name="Anacrites",
        birth_year=None,
        death_year=None,
        title="Chief Spy to Emperor Vespasian",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Falco's Mother ===
    HistoricalFigure(
        canonical_id="falco_mother",
        name="Falco's Mother",
        birth_year=None,
        death_year=None,
        title="Family Matriarch",
        era="Roman Empire (Flavian Dynasty)"
    ),
]


# =============================================================================
# CHARACTER PORTRAYALS: How Characters Appear in Venus in Copper
# =============================================================================

PORTRAYALS = [
    # === Core Recurring Characters ===
    Portrayal(
        figure_id="marcus_didius_falco",
        media_id="venus_in_copper",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist - Bailed out of imperial prison; hired to investigate potential black widow scheme",
        is_protagonist=True,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="helena_justina",
        media_id="venus_in_copper",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's love interest; central to relationship exploration; recently miscarried from previous book's accident",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="lucius_petronius_longus",
        media_id="venus_in_copper",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's best friend; assists with investigation; captain of Aventine Watch",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="decimus_camillus_verus",
        media_id="venus_in_copper",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator; Helena's father; provides political context for investigation",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === New Characters for Book 3 ===
    Portrayal(
        figure_id="hortensius_novus",
        media_id="venus_in_copper",
        sentiment=Sentiment.NEUTRAL,
        role_description="Primary client; wealthy freedman engaged to potentially dangerous woman; fears black widow scheme",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="severina_zotica",
        media_id="venus_in_copper",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Primary suspect; beautiful woman wearing copper Venus ring; accused of murdering previous husbands",
        is_protagonist=False,
        conflict_flag=True
    ),

    Portrayal(
        figure_id="sabina_pollia",
        media_id="venus_in_copper",
        sentiment=Sentiment.HEROIC,
        role_description="Female investigator; former slave; hired to investigate Severina Zotica's past",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="hortensia_atilia",
        media_id="venus_in_copper",
        sentiment=Sentiment.HEROIC,
        role_description="Female investigator; former slave; partner with Sabina investigating background of Severina",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="hyacinthus",
        media_id="venus_in_copper",
        sentiment=Sentiment.NEUTRAL,
        role_description="Hortensius's slave; initial contact who brings case to Falco",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="anacrites",
        media_id="venus_in_copper",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Emperor's Chief Spy; antagonist who had Falco imprisoned; represents imperial danger",
        is_protagonist=False,
        conflict_flag=True
    ),

    Portrayal(
        figure_id="falco_mother",
        media_id="venus_in_copper",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's mother; bails him out of imperial prison; establishes family dynamics and obligations",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="titus_caesar",
        media_id="venus_in_copper",
        sentiment=Sentiment.COMPLEX,
        role_description="Emperor's son; briefly visits Rome; shows romantic interest in Helena Justina; political rival",
        is_protagonist=False,
        conflict_flag=False
    ),
]


# =============================================================================
# CHARACTER INTERACTION RELATIONSHIPS: Book 3 Specific
# =============================================================================

CHARACTER_INTERACTIONS = [
    # Format: (character_1, character_2, relationship_type, context)

    # === Investigation Core ===
    ("marcus_didius_falco", "hortensius_novus", "CLIENT_INVESTIGATOR", "Hortensius hires Falco to investigate Severina"),
    ("marcus_didius_falco", "anacrites", "ANTAGONIST", "Anacrites had Falco imprisoned; ongoing antagonism"),

    # === Female Investigators ===
    ("marcus_didius_falco", "sabina_pollia", "EMPLOYER", "Falco hires Sabina to investigate Severina's past"),
    ("marcus_didius_falco", "hortensia_atilia", "EMPLOYER", "Falco hires Hortensia to investigate Severina's past"),
    ("sabina_pollia", "hortensia_atilia", "COLLEAGUE", "Female investigators work together on case"),

    # === Romantic Relationships ===
    ("marcus_didius_falco", "helena_justina", "ROMANTIC_INTEREST", "Falco and Helena's relationship central to book"),
    ("titus_caesar", "helena_justina", "ATTRACTION", "Titus shows romantic interest in Helena; creates tension"),
    ("marcus_didius_falco", "titus_caesar", "ROMANTIC_RIVALRY", "Titus and Falco compete for Helena's attention"),

    # === Client and Suspect ===
    ("hortensius_novus", "severina_zotica", "FIANCÉ_SUSPECT", "Hortensius engaged to potentially dangerous Severina"),

    # === Family ===
    ("marcus_didius_falco", "falco_mother", "SON_MOTHER", "Mother bails Falco from prison; filial obligation"),
    ("helena_justina", "decimus_camillus_verus", "FATHER_DAUGHTER", "Helena's family relationship"),

    # === Political ===
    ("anacrites", "falco_mother", "ANTAGONIST_RELATION", "Anacrites imprisoned Falco; relationship through mother's action"),
]


# =============================================================================
# INGESTION CLASS
# =============================================================================

class VenusInCopperIngestor:
    """Handles ingestion of Venus in Copper character data into Neo4j."""

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

    def merge_core_figures(self) -> int:
        """MERGE core recurring characters to avoid duplicates."""
        core_ids = [
            ("marcus_didius_falco", "Marcus Didius Falco"),
            ("helena_justina", "Helena Justina"),
            ("lucius_petronius_longus", "Lucius Petronius Longus"),
            ("decimus_camillus_verus", "Decimus Camillus Verus"),
            ("titus_caesar", "Titus"),
        ]

        success_count = 0
        with self.driver.session() as session:
            for canonical_id, name in core_ids:
                try:
                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name
                    """, canonical_id=canonical_id, name=name)
                    success_count += 1
                except Exception as e:
                    log_error(f"MERGE core figure {name}", e)
        print(f"MERGED {success_count}/5 core figures (no duplicates created).")
        return success_count

    def ingest_new_figures(self, figures: List[HistoricalFigure]) -> int:
        """Ingest new Book 3-specific characters."""
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
                    log_error(f"Ingesting new figure {figure.name}", e)
        print(f"Ingested {success_count}/{len(figures)} new figures for Book 3.")
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
                            r.media_work = "Venus in Copper"
                    """, char1_id=char1_id, char2_id=char2_id, rel_type=rel_type, context=context)
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting interaction {char1_id} <-> {char2_id}", e)
        print(f"Ingested {success_count}/{len(interactions)} character interactions (INTERACTED_WITH).")
        return success_count


# =============================================================================
# MAIN EXECUTION
# =============================================================================

def main():
    """Main ingestion workflow."""
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
    neo4j_password = os.getenv("NEO4J_PASSWORD")

    if not all([neo4j_uri, neo4j_user, neo4j_password]):
        print("ERROR: Missing Neo4j credentials in environment variables")
        return False

    ingestor = VenusInCopperIngestor(neo4j_uri, neo4j_user, neo4j_password)

    try:
        print("="*80)
        print("Fictotum: Venus in Copper (Book 3) Character Ingestion")
        print("="*80)

        print("\n[1/6] Setting up schema constraints...")
        ingestor.setup_schema()

        print("\n[2/6] MERGING core recurring characters...")
        core_count = ingestor.merge_core_figures()

        print("\n[3/6] Ingesting new Book 3-specific figures...")
        new_fig_count = ingestor.ingest_new_figures(NEW_FIGURES)

        print("\n[4/6] Ingesting media work (Venus in Copper)...")
        media_count = ingestor.ingest_media(MEDIA_WORKS)

        print("\n[5/6] Ingesting character portrayals (APPEARS_IN relationships)...")
        portrayal_count = ingestor.ingest_portrayals(PORTRAYALS)

        print("\n[6/6] Ingesting character interactions (INTERACTED_WITH relationships)...")
        interaction_count = ingestor.ingest_interactions(CHARACTER_INTERACTIONS)

        print("\n" + "="*80)
        print("INGESTION SUMMARY: Venus in Copper (Book 3)")
        print("="*80)
        print(f"Core Figures (MERGED): {core_count}")
        print(f"New Figures: {new_fig_count}")
        print(f"Media Works: {media_count}")
        print(f"Character Portrayals (APPEARS_IN): {portrayal_count}")
        print(f"Character Interactions (INTERACTED_WITH): {interaction_count}")
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
        if ERROR_LOG:
            print(f"\n{len(ERROR_LOG)} errors encountered:")
            for error_entry in ERROR_LOG:
                print(f"  - {error_entry['context']}: {error_entry['error']}")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
