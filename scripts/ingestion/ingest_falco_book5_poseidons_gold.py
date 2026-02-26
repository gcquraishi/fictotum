"""
Fictotum: Marcus Didius Falco Series - Poseidon's Gold (Book 5)

Comprehensive ingestion of character relationships from Lindsey Davis's
"Poseidon's Gold" (Book 5 of Marcus Didius Falco series).

Historical Context:
- Setting: Rome (primarily)
- Historical Period: AD 72 (Vespasian's reign, transition to Titus)
- Plot: Investigation of fraud scheme involving statue of Poseidon; clearing family name

Strategy:
1. MERGE core recurring characters
2. Create new HistoricalFigure nodes for Book 5-specific characters
3. Create MediaWork node for Poseidon's Gold
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
# MEDIA WORKS: Poseidon's Gold (Book 5)
# =============================================================================

MEDIA_WORKS = [
    MediaWork(
        media_id="poseidons_gold",
        wikidata_id="Q3824702",
        title="Poseidon's Gold",
        media_type=MediaType.BOOK,
        release_year=1993,
        creator="Lindsey Davis"
    ),
]


# =============================================================================
# NEW CHARACTERS FOR BOOK 5: Poseidon's Gold
# =============================================================================

NEW_FIGURES = [
    # === Deceased Brother ===
    HistoricalFigure(
        canonical_id="festus",
        name="Festus",
        birth_year=None,
        death_year=71,  # Died before Book 5 begins
        title="Falco's Deceased Older Brother, Soldier",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Father ===
    HistoricalFigure(
        canonical_id="geminus",
        name="Geminus",
        birth_year=None,
        death_year=None,
        title="Falco's Father, Wealthy Art Dealer and Merchant",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Falco's Sisters (Group) ===
    HistoricalFigure(
        canonical_id="falco_sisters",
        name="Falco's Sisters",
        birth_year=None,
        death_year=None,
        title="Extended Family, Varying Relationships",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Favorite Sister ===
    HistoricalFigure(
        canonical_id="maia",
        name="Maia",
        birth_year=None,
        death_year=None,
        title="Falco's Favorite Sister",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Military Syndicate Members ===
    HistoricalFigure(
        canonical_id="military_syndicate_members",
        name="Military Syndicate Members",
        birth_year=None,
        death_year=None,
        title="Fellow Soldiers, Fraud Co-conspirators",
        era="Roman Empire (Flavian Dynasty)"
    ),

    # === Murdered Centurion ===
    HistoricalFigure(
        canonical_id="murdered_centurion",
        name="Stabbed Centurion",
        birth_year=None,
        death_year=72,  # Murdered in Book 5
        title="Centurion, Debt Collector, Murder Victim",
        era="Roman Empire (Flavian Dynasty)"
    ),
]


# =============================================================================
# CHARACTER PORTRAYALS: How Characters Appear in Poseidon's Gold
# =============================================================================

PORTRAYALS = [
    # === Core Recurring Characters ===
    Portrayal(
        figure_id="marcus_didius_falco",
        media_id="poseidons_gold",
        sentiment=Sentiment.HEROIC,
        role_description="Protagonist - Investigates fraud scheme by deceased brother Festus; clears family name; prime murder suspect",
        is_protagonist=True,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="helena_justina",
        media_id="poseidons_gold",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's romantic interest; supports him through family crisis",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="lucius_petronius_longus",
        media_id="poseidons_gold",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's best friend; married to Falco's favorite sister Maia",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="decimus_camillus_verus",
        media_id="poseidons_gold",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator; provides political context for investigation",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="falco_mother",
        media_id="poseidons_gold",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's mother; commissions him to clear Festus's name; represents family obligation",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === New Characters for Book 5 ===
    Portrayal(
        figure_id="festus",
        media_id="poseidons_gold",
        sentiment=Sentiment.COMPLEX,
        role_description="Falco's deceased older brother; masterminded Poseidon statue fraud scheme; left debts affecting family",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="geminus",
        media_id="poseidons_gold",
        sentiment=Sentiment.COMPLEX,
        role_description="Falco's father; abandoned family when Falco was young; now wealthy art dealer; becomes unwilling partner with Falco",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="falco_sisters",
        media_id="poseidons_gold",
        sentiment=Sentiment.NEUTRAL,
        role_description="Extended family; various relationships to Falco, some estranged",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="maia",
        media_id="poseidons_gold",
        sentiment=Sentiment.HEROIC,
        role_description="Falco's favorite/youngest sister; maintains close relationship; married to Lucius Petronius Longus",
        is_protagonist=False,
        conflict_flag=False
    ),

    Portrayal(
        figure_id="military_syndicate_members",
        media_id="poseidons_gold",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Fellow soldiers partnered with Festus in Poseidon scheme; create complications as Falco resolves debts",
        is_protagonist=False,
        conflict_flag=True
    ),

    Portrayal(
        figure_id="murdered_centurion",
        media_id="poseidons_gold",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Centurion sent to collect on Poseidon scheme debts; fights publicly with Falco; later stabbed to death",
        is_protagonist=False,
        conflict_flag=True
    ),
]


# =============================================================================
# CHARACTER INTERACTION RELATIONSHIPS: Book 5 Specific
# =============================================================================

CHARACTER_INTERACTIONS = [
    # Format: (character_1, character_2, relationship_type, context)

    # === Family Crisis Core ===
    ("marcus_didius_falco", "festus", "BROTHER", "Festus's fraud scheme drives plot; Falco must clear family name"),
    ("marcus_didius_falco", "geminus", "FATHER_SON", "Father and son reconcile to resolve Festus's debts"),
    ("marcus_didius_falco", "falco_mother", "SON_MOTHER", "Mother commissions Falco to clear Festus's name"),

    # === Extended Family ===
    ("marcus_didius_falco", "falco_sisters", "SIBLINGS", "Extended family members with varying relationships"),
    ("marcus_didius_falco", "maia", "FAVORITE_SIBLING", "Maia is Falco's favorite/youngest sister"),
    ("maia", "lucius_petronius_longus", "HUSBAND_WIFE", "Maia married to Petronius"),

    # === Fraud Complications ===
    ("marcus_didius_falco", "murdered_centurion", "ANTAGONIST", "Centurion collector; Falco becomes murder suspect"),
    ("marcus_didius_falco", "military_syndicate_members", "FRAUD_INVESTIGATION", "Falco investigates syndicate partners"),
    ("geminus", "murdered_centurion", "DEBT_COLLECTION", "Centurion sent to collect from Geminus"),
    ("geminus", "military_syndicate_members", "BUSINESS_PARTNERS", "Geminus negotiates with fraud partners"),

    # === Family Relationships ===
    ("geminus", "falco_mother", "EX_SPOUSES", "Geminus and mother divorced/separated"),
    ("festus", "military_syndicate_members", "FRAUD_PARTNERS", "Deceased Festus was scheme mastermind"),
    ("falco_mother", "festus", "MOTHER_SON", "Mother affected by son Festus's crimes"),

    # === Supporting Relationships ===
    ("marcus_didius_falco", "helena_justina", "ROMANTIC_INTEREST", "Helena supports Falco through family crisis"),
    ("lucius_petronius_longus", "helena_justina", "ACQUAINTANCE", "Petronius knows Helena through Falco"),
    ("decimus_camillus_verus", "helena_justina", "FATHER_DAUGHTER", "Helena's father provides context"),
]


# =============================================================================
# INGESTION CLASS
# =============================================================================

class PoseidonsGoldIngestor:
    """Handles ingestion of Poseidon's Gold character data into Neo4j."""

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
            ("falco_mother", "Falco's Mother"),
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
        """Ingest new Book 5-specific characters."""
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
        print(f"Ingested {success_count}/{len(figures)} new figures for Book 5.")
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
                            r.media_work = "Poseidon's Gold"
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

    ingestor = PoseidonsGoldIngestor(neo4j_uri, neo4j_user, neo4j_password)

    try:
        print("="*80)
        print("Fictotum: Poseidon's Gold (Book 5) Character Ingestion")
        print("="*80)

        print("\n[1/6] Setting up schema constraints...")
        ingestor.setup_schema()

        print("\n[2/6] MERGING core recurring characters...")
        core_count = ingestor.merge_core_figures()

        print("\n[3/6] Ingesting new Book 5-specific figures...")
        new_fig_count = ingestor.ingest_new_figures(NEW_FIGURES)

        print("\n[4/6] Ingesting media work (Poseidon's Gold)...")
        media_count = ingestor.ingest_media(MEDIA_WORKS)

        print("\n[5/6] Ingesting character portrayals (APPEARS_IN relationships)...")
        portrayal_count = ingestor.ingest_portrayals(PORTRAYALS)

        print("\n[6/6] Ingesting character interactions (INTERACTED_WITH relationships)...")
        interaction_count = ingestor.ingest_interactions(CHARACTER_INTERACTIONS)

        print("\n" + "="*80)
        print("INGESTION SUMMARY: Poseidon's Gold (Book 5)")
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
