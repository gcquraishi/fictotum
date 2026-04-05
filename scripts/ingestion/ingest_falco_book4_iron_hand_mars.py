"""
Fictotum: Marcus Didius Falco Series - The Iron Hand of Mars (Book 4)

Comprehensive ingestion of character relationships from Lindsey Davis's
"The Iron Hand of Mars" (Book 4 of Marcus Didius Falco series).

Historical Context:
- Setting: Rome and Germania (northern Germany frontier)
- Historical Period: AD 71-72 (Vespasian's reign)
- Plot: Falco sent to deliver imperial military standard to legions in Germania

Strategy:
1. MERGE core recurring characters
2. Create new HistoricalFigure nodes for Book 4-specific characters
3. Create MediaWork node for The Iron Hand of Mars
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
# MEDIA WORKS: The Iron Hand of Mars (Book 4)
# =============================================================================

MEDIA_WORKS = [
    MediaWork(
        media_id="the_iron_hand_of_mars",
        wikidata_id="Q3824696",
        title="The Iron Hand of Mars",
        media_type=MediaType.BOOK,
        release_year=1992,
        creator="Lindsey Davis"
    ),
]


# =============================================================================
# NEW CHARACTERS FOR BOOK 4: The Iron Hand of Mars
# =============================================================================

NEW_FIGURES = [
    # === Helena's Brother ===
    HistoricalFigure(
        canonical_id="camillus_justinus",
        name="Camillus Justinus",
        birth_year=None,
        death_year=None,
        title="Military Tribune, Helena's Brother",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Historical Celtic Priestess ===
    HistoricalFigure(
        canonical_id="veleda",
        name="Veleda",
        birth_year=None,
        death_year=None,
        wikidata_id="Q187290",  # Historical figure
        title="Celtic Druid Priestess, Batavi Leader",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Redundant Barber ===
    HistoricalFigure(
        canonical_id="xanthus",
        name="Xanthus",
        birth_year=None,
        death_year=None,
        title="Unemployed Barber, Traveling Companion",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Traveling Companion ===
    HistoricalFigure(
        canonical_id="helveticus",
        name="Helveticus",
        birth_year=None,
        death_year=None,
        title="Traveling Companion",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Missing Military Officer ===
    HistoricalFigure(
        canonical_id="missing_legate",
        name="Missing Roman Legate",
        birth_year=None,
        death_year=None,
        title="Missing Military Officer in Germania",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Military Antagonist ===
    HistoricalFigure(
        canonical_id="germanic_centurion",
        name="Roman Centurion",
        birth_year=None,
        death_year=None,
        title="Military Officer, Frontier Commander",
        era="Roman Empire (Flavian Dynasty)"
    ),
]


# =============================================================================
# CHARACTER PORTRAYALS: How Characters Appear in The Iron Hand of Mars
# =============================================================================

PORTRAYALS = [
    # === Core Recurring Characters ===
    Portrayal(
        figure_id="marcus_didius_falco",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist - Sent to deliver imperial military standard to legions in Germania; encounters military intrigue",
        is_protagonist=True,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="helena_justina",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's romantic interest; brother Justinus travels with Falco; romantic rival Titus present",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="lucius_petronius_longus",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's best friend; appears in military context",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="decimus_camillus_verus",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator; father of Justinus and Helena",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="titus_caesar",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.COMPLEX,
        role_description="Military commander in Germania; continues romantic interest in Helena; Falco's military superior",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === New Characters for Book 4 ===
    Portrayal(
        figure_id="camillus_justinus",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.HEROIC,
        role_description="Helena's brother; young military tribune; inexperienced but courageous; travels with Falco to Germania",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="veleda",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.COMPLEX,
        role_description="Powerful Celtic Druid priestess; Germanic resistance leader; Falco attempts negotiation for peace",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="xanthus",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.HEROIC,
        role_description="Out-of-work barber; traveling companion to Falco and Justinus; provides practical services and comic relief",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="helveticus",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.NEUTRAL,
        role_description="Traveling companion on Germanic mission; soldier or merchant background",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="missing_legate",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.NEUTRAL,
        role_description="Missing Roman military officer; disappearance drives plot; Falco must locate or determine fate",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="germanic_centurion",
        media_id="the_iron_hand_of_mars",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Roman centurion; military antagonist; causes conflict with Falco during mission",
        is_protagonist=False,
        conflict_flag=True
    ),
]


# =============================================================================
# CHARACTER INTERACTION RELATIONSHIPS: Book 4 Specific
# =============================================================================

CHARACTER_INTERACTIONS = [
    # Format: (character_1, character_2, relationship_type, context)

    # === Military Mission Core ===
    ("marcus_didius_falco", "camillus_justinus", "TRAVELING_COMPANIONS", "Justinus and Falco travel together to Germania"),
    ("marcus_didius_falco", "titus_caesar", "MILITARY_COMMAND", "Titus commands Falco's mission; Falco reports to him"),
    ("camillus_justinus", "titus_caesar", "MILITARY_SUPERIOR", "Justinus serves under Titus as military officer"),

    # === Germanic Mission ===
    ("marcus_didius_falco", "veleda", "NEGOTIATION_ATTEMPT", "Falco attempts to negotiate peace with Celtic priestess"),
    ("camillus_justinus", "veleda", "OPPOSING_FORCES", "Roman officer confronting Germanic resistance leader"),

    # === Supporting Companions ===
    ("marcus_didius_falco", "xanthus", "TRAVELING_COMPANION", "Xanthus travels with Falco to Germania"),
    ("marcus_didius_falco", "helveticus", "TRAVELING_COMPANION", "Helveticus travels with Falco to Germania"),
    ("xanthus", "helveticus", "TRAVELING_COMPANIONS", "Both accompany Falco on mission"),

    # === Investigation ===
    ("marcus_didius_falco", "missing_legate", "INVESTIGATION_TARGET", "Falco must locate missing officer or discover fate"),
    ("marcus_didius_falco", "germanic_centurion", "ANTAGONISM", "Centurion creates conflict during mission"),

    # === Family Connections ===
    ("camillus_justinus", "helena_justina", "SIBLING", "Justinus is Helena's brother"),
    ("camillus_justinus", "decimus_camillus_verus", "FATHER_SON", "Justinus is Decimus's son"),
    ("marcus_didius_falco", "helena_justina", "ROMANTIC_INTEREST", "Romantic relationship continues despite separation"),
    ("titus_caesar", "helena_justina", "ROMANTIC_INTEREST", "Titus continues romantic interest in Helena"),

    # === Imperial Relationships ===
    ("titus_caesar", "decimus_camillus_verus", "EMPEROR_SENATOR", "Political relationship"),
]


# =============================================================================
# INGESTION CLASS
# =============================================================================

class IronHandMarsIngestor:
    """Handles ingestion of The Iron Hand of Mars character data into Neo4j."""

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
        """Ingest new Book 4-specific characters."""
        success_count = 0
        with self.driver.session() as session:
            for figure in figures:
                try:
                    dump = figure.model_dump()
                    # Remove wikidata_id if None for Veleda insertion
                    if dump.get('wikidata_id') is None:
                        dump.pop('wikidata_id', None)

                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name,
                            f.birth_year = $birth_year,
                            f.death_year = $death_year,
                            f.title = $title,
                            f.era = $era
                    """, **dump)
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting new figure {figure.name}", e)
        print(f"Ingested {success_count}/{len(figures)} new figures for Book 4.")
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
                            r.media_work = "The Iron Hand of Mars"
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

    ingestor = IronHandMarsIngestor(neo4j_uri, neo4j_user, neo4j_password)

    try:
        print("="*80)
        print("Fictotum: The Iron Hand of Mars (Book 4) Character Ingestion")
        print("="*80)

        print("\n[1/6] Setting up schema constraints...")
        ingestor.setup_schema()

        print("\n[2/6] MERGING core recurring characters...")
        core_count = ingestor.merge_core_figures()

        print("\n[3/6] Ingesting new Book 4-specific figures...")
        new_fig_count = ingestor.ingest_new_figures(NEW_FIGURES)

        print("\n[4/6] Ingesting media work (The Iron Hand of Mars)...")
        media_count = ingestor.ingest_media(MEDIA_WORKS)

        print("\n[5/6] Ingesting character portrayals (APPEARS_IN relationships)...")
        portrayal_count = ingestor.ingest_portrayals(PORTRAYALS)

        print("\n[6/6] Ingesting character interactions (INTERACTED_WITH relationships)...")
        interaction_count = ingestor.ingest_interactions(CHARACTER_INTERACTIONS)

        print("\n" + "="*80)
        print("INGESTION SUMMARY: The Iron Hand of Mars (Book 4)")
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
