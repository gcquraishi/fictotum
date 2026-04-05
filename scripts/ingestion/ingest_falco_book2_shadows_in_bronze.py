"""
Fictotum: Marcus Didius Falco Series - Shadows in Bronze (Book 2)

Comprehensive ingestion of character relationships from Lindsey Davis's
"Shadows in Bronze" (Book 2 of Marcus Didius Falco series).

Historical Context:
- Setting: Rome, Bay of Naples, Pompeii, Capreae (AD 71)
- Historical Period: Vespasian's reign (AD 69-79)
- Plot: Investigation of failed conspiracy against Vespasian

Strategy:
1. MERGE core recurring characters (avoid duplicates):
   - Marcus Didius Falco
   - Helena Justina
   - Lucius Petronius Longus
   - Decimus Camillus Verus
   - Vespasian

2. Create new HistoricalFigure nodes for Book 2-specific characters

3. Create MediaWork node for Shadows in Bronze

4. Map APPEARS_IN relationships from characters to book

5. Map INTERACTED_WITH relationships between characters
"""

import os
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import List, Dict
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
# MEDIA WORKS: Shadows in Bronze (Book 2)
# =============================================================================

MEDIA_WORKS = [
    MediaWork(
        media_id="shadows_in_bronze",
        wikidata_id="Q3858900",
        title="Shadows in Bronze",
        media_type=MediaType.BOOK,
        release_year=1990,
        creator="Lindsey Davis"
    ),
]


# =============================================================================
# NEW CHARACTERS FOR BOOK 2: Shadows in Bronze
# =============================================================================

NEW_FIGURES = [
    # === Mysterious Antagonist ===
    HistoricalFigure(
        canonical_id="barnabas",
        name="Barnabas",
        birth_year=None,
        death_year=None,
        title="Mysterious Antagonist",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Deceased Conspirator ===
    HistoricalFigure(
        canonical_id="atius_pertinax",
        name="Atius Pertinax",
        birth_year=None,
        death_year=71,  # Assassinated in Book 2
        title="Former Conspirator Against Vespasian",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Falco's Nephew ===
    HistoricalFigure(
        canonical_id="larius",
        name="Larius",
        birth_year=57,  # ~14 years old in AD 71
        death_year=None,
        title="Young Artist, Falco's Nephew",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Petronius's Wife ===
    HistoricalFigure(
        canonical_id="petronius_wife",
        name="Petronius's Wife",
        birth_year=None,
        death_year=None,
        title="Wife of Lucius Petronius Longus",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Petronius's Daughters ===
    HistoricalFigure(
        canonical_id="petronius_daughters",
        name="Petronius's Daughters",
        birth_year=None,
        death_year=None,
        title="Daughters of Lucius Petronius Longus",
        era="Roman Empire (Flavian Dynasty)"
    ),
]


# =============================================================================
# CHARACTER PORTRAYALS: How Characters Appear in Shadows in Bronze
# =============================================================================

PORTRAYALS = [
    # === Core Recurring Characters ===
    Portrayal(
        figure_id="marcus_didius_falco",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist - Investigating failed conspiracy with Petronius; navigating danger from vengeful conspirator tracker",
        is_protagonist=True,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="helena_justina",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's romantic interest; reveals complex connection to conspiracy through her ex-husband Atius Pertinax",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="lucius_petronius_longus",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's best friend; accompanies him on investigation south to Naples with his family as cover",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="decimus_camillus_verus",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator and Helena's father; family tension over Helena's connections to conspiracy",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="vespasian",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.NEUTRAL,
        role_description="Roman Emperor ordering investigation of conspiracy; dealing with threats to imperial authority",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === New Characters for Book 2 ===
    Portrayal(
        figure_id="barnabas",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Mysterious 'green-cloaked man' with vendetta; antagonist creating danger during investigation",
        is_protagonist=False,
        conflict_flag=True
    ),

    Portrayal(
        figure_id="atius_pertinax",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.COMPLEX,
        role_description="Deceased conspirator; assassination in jail sets investigation in motion; Helena's ex-husband",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="larius",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's 14-year-old nephew; travels disguised as lead pipe salesman; aspiring painter",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="petronius_wife",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.NEUTRAL,
        role_description="Petronius's wife; accompanies him south with daughters to provide family cover for investigation",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="petronius_daughters",
        media_id="shadows_in_bronze",
        sentiment=Sentiment.NEUTRAL,
        role_description="Petronius's daughters; travel with parents as family cover for investigation in Naples region",
        is_protagonist=False,
        conflict_flag=False
    ),
]


# =============================================================================
# CHARACTER INTERACTION RELATIONSHIPS: Book 2 Specific
# =============================================================================

CHARACTER_INTERACTIONS = [
    # Format: (character_1_canonical_id, character_2_canonical_id, relationship_type, context)

    # === Main Plot Relationships ===
    ("marcus_didius_falco", "helena_justina", "ROMANTIC_INTEREST", "Falco torn between love and suspicion over Helena's connection to conspiracy"),
    ("marcus_didius_falco", "lucius_petronius_longus", "INVESTIGATION_PARTNER", "Petronius joins Falco investigating conspiracy in Naples region"),
    ("marcus_didius_falco", "vespasian", "IMPERIAL_AGENT", "Vespasian orders investigation of conspiracy"),
    ("marcus_didius_falco", "decimus_camillus_verus", "POLITICAL_INVESTIGATION", "Decimus's family affected by conspiracy"),

    # === Antagonist Relationships ===
    ("marcus_didius_falco", "barnabas", "OPPOSED_TO", "Barnabas creates danger for Falco's investigation"),
    ("barnabas", "atius_pertinax", "SEEKING_REVENGE_AGAINST", "Barnabas tracks down conspirators including Pertinax"),

    # === Family Relationships ===
    ("helena_justina", "decimus_camillus_verus", "FATHER_DAUGHTER", "Helena's family connections complicate investigation"),
    ("helena_justina", "atius_pertinax", "FORMER_SPOUSE", "Atius was Helena's ex-husband; his death disturbs investigation"),

    # === Traveling Companions ===
    ("marcus_didius_falco", "larius", "UNCLE_NEPHEW", "Larius travels with Falco disguised as lead pipe salesman"),
    ("lucius_petronius_longus", "petronius_wife", "HUSBAND_WIFE", "Family connection for investigation cover"),
    ("lucius_petronius_longus", "petronius_daughters", "FATHER_CHILDREN", "Family accompanies investigation"),
    ("marcus_didius_falco", "petronius_wife", "TRAVELING_COMPANION", "Part of investigation cover south"),
    ("marcus_didius_falco", "petronius_daughters", "TRAVELING_COMPANION", "Family cover for investigation"),

    # === Imperial Relationships ===
    ("vespasian", "decimus_camillus_verus", "EMPEROR_SENATOR", "Political relationship during conspiracy investigation"),
]


# =============================================================================
# INGESTION CLASS
# =============================================================================

class ShadowsInBronzeIngestor:
    """Handles ingestion of Shadows in Bronze character data into Neo4j."""

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
            ("vespasian", "Vespasian"),
        ]

        success_count = 0
        with self.driver.session() as session:
            for canonical_id, name in core_ids:
                try:
                    # MERGE ensures no duplicates; SET updates if exists
                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name
                    """, canonical_id=canonical_id, name=name)
                    success_count += 1
                except Exception as e:
                    log_error(f"MERGE core figure {name}", e)
        print(f"MERGED {success_count}/5 core recurring figures (no duplicates created).")
        return success_count

    def ingest_new_figures(self, figures: List[HistoricalFigure]) -> int:
        """Ingest new Book 2-specific characters."""
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
        print(f"Ingested {success_count}/{len(figures)} new figures for Book 2.")
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
                            r.media_work = "Shadows in Bronze"
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
    # Load environment variables
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
    neo4j_password = os.getenv("NEO4J_PASSWORD")

    if not all([neo4j_uri, neo4j_user, neo4j_password]):
        print("ERROR: Missing Neo4j credentials in environment variables")
        print("Required: NEO4J_URI, NEO4J_USERNAME (or NEO4J_USER), NEO4J_PASSWORD")
        return False

    # Initialize ingestor
    ingestor = ShadowsInBronzeIngestor(neo4j_uri, neo4j_user, neo4j_password)

    try:
        print("="*80)
        print("Fictotum: Shadows in Bronze (Book 2) Character Ingestion")
        print("="*80)

        # Setup schema
        print("\n[1/6] Setting up schema constraints...")
        ingestor.setup_schema()

        # MERGE core recurring characters
        print("\n[2/6] MERGING core recurring characters (no duplicates)...")
        core_count = ingestor.merge_core_figures()

        # Ingest new Book 2-specific figures
        print("\n[3/6] Ingesting new Book 2-specific figures...")
        new_fig_count = ingestor.ingest_new_figures(NEW_FIGURES)

        # Ingest media work
        print("\n[4/6] Ingesting media work (Shadows in Bronze)...")
        media_count = ingestor.ingest_media(MEDIA_WORKS)

        # Ingest portrayals
        print("\n[5/6] Ingesting character portrayals (APPEARS_IN relationships)...")
        portrayal_count = ingestor.ingest_portrayals(PORTRAYALS)

        # Ingest character interactions
        print("\n[6/6] Ingesting character interactions (INTERACTED_WITH relationships)...")
        interaction_count = ingestor.ingest_interactions(CHARACTER_INTERACTIONS)

        # Print summary
        print("\n" + "="*80)
        print("INGESTION SUMMARY: Shadows in Bronze (Book 2)")
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

        # Log errors if any
        if ERROR_LOG:
            print(f"\n{len(ERROR_LOG)} errors encountered during ingestion:")
            for error_entry in ERROR_LOG:
                print(f"  - {error_entry['context']}: {error_entry['error']}")


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
