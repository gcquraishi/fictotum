"""
ChronosGraph Roman Pilot Ingestor

Populates Neo4j with data from:
- HBO Rome (TV Series)
- Assassin's Creed Origins (Video Game)
- The Republic of Rome (Board Game)

Implements Master Entity Resolution and Consensus Engine for conflict detection.
"""

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase
from schema import (
    HistoricalFigure, MediaWork, Portrayal,
    MediaType, Sentiment, SCHEMA_CONSTRAINTS
)


# =============================================================================
# PILOT DATA: Historical Figures (Master Entities)
# =============================================================================

HISTORICAL_FIGURES = [
    HistoricalFigure(
        canonical_id="julius_caesar",
        name="Julius Caesar",
        birth_year=-100,
        death_year=-44,
        title="Dictator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="pompey_magnus",
        name="Pompey the Great",
        birth_year=-106,
        death_year=-48,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="marcus_antonius",
        name="Mark Antony",
        birth_year=-83,
        death_year=-30,
        title="Roman General",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cleopatra_vii",
        name="Cleopatra VII",
        birth_year=-69,
        death_year=-30,
        title="Pharaoh of Egypt",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="octavian_augustus",
        name="Octavian (Augustus)",
        birth_year=-63,
        death_year=14,
        title="First Roman Emperor",
        era="Roman Republic/Empire"
    ),
    HistoricalFigure(
        canonical_id="marcus_brutus",
        name="Marcus Brutus",
        birth_year=-85,
        death_year=-42,
        title="Senator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cato_younger",
        name="Cato the Younger",
        birth_year=-95,
        death_year=-46,
        title="Senator of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="cicero",
        name="Marcus Tullius Cicero",
        birth_year=-106,
        death_year=-43,
        title="Consul and Orator",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="ptolemy_xiii",
        name="Ptolemy XIII",
        birth_year=-62,
        death_year=-47,
        title="Pharaoh of Egypt",
        era="Ptolemaic Egypt"
    ),
    HistoricalFigure(
        canonical_id="marcus_crassus",
        name="Marcus Licinius Crassus",
        birth_year=-115,
        death_year=-53,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="gaius_marius",
        name="Gaius Marius",
        birth_year=-157,
        death_year=-86,
        title="Consul of Rome",
        era="Roman Republic"
    ),
    HistoricalFigure(
        canonical_id="sulla",
        name="Lucius Cornelius Sulla",
        birth_year=-138,
        death_year=-78,
        title="Dictator of Rome",
        era="Roman Republic"
    ),
]


# =============================================================================
# PILOT DATA: Media Works
# =============================================================================

MEDIA_WORKS = [
    MediaWork(
        media_id="hbo_rome",
        title="Rome",
        media_type=MediaType.TV_SERIES,
        release_year=2005,
        creator="Bruno Heller"
    ),
    MediaWork(
        media_id="ac_origins",
        title="Assassin's Creed Origins",
        media_type=MediaType.GAME,
        release_year=2017,
        creator="Ubisoft Montreal"
    ),
    MediaWork(
        media_id="republic_of_rome",
        title="The Republic of Rome",
        media_type=MediaType.GAME,
        release_year=1990,
        creator="Richard Berg / Avalon Hill"
    ),
]


# =============================================================================
# PILOT DATA: Portrayals (Figure <-> Media connections with Sentiment)
# =============================================================================

PORTRAYALS = [
    # === HBO Rome Portrayals ===
    Portrayal(
        figure_id="julius_caesar",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Ambitious general and dictator, portrayed as brilliant but ruthless",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Caesar's rival, shown as proud traditionalist",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Loyal soldier turned leader, passionate and impulsive",
        is_protagonist=True,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cleopatra_vii",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Cunning queen using alliances for Egypt's survival",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="hbo_rome",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Cold, calculating heir who becomes ruthless ruler",
        is_protagonist=True,
        conflict_flag=True,
        conflict_notes="HBO portrays Octavian as coldly villainous; AC Origins shows him more heroically as Rome's savior"
    ),
    Portrayal(
        figure_id="marcus_brutus",
        media_id="hbo_rome",
        sentiment=Sentiment.COMPLEX,
        role_description="Conflicted idealist who betrays Caesar",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="hbo_rome",
        sentiment=Sentiment.HEROIC,
        role_description="Stubborn defender of the Republic",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="hbo_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Pragmatic orator navigating political chaos",
        is_protagonist=False,
        conflict_flag=False
    ),

    # === Assassin's Creed Origins Portrayals ===
    Portrayal(
        figure_id="julius_caesar",
        media_id="ac_origins",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Antagonist allied with the Order of the Ancients",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="AC Origins portrays Caesar as villainous Order ally; HBO Rome shows him as complex antihero"
    ),
    Portrayal(
        figure_id="cleopatra_vii",
        media_id="ac_origins",
        sentiment=Sentiment.COMPLEX,
        role_description="Initially ally, later revealed as Order collaborator",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="ptolemy_xiii",
        media_id="ac_origins",
        sentiment=Sentiment.VILLAINOUS,
        role_description="Puppet pharaoh controlled by the Order",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="ac_origins",
        sentiment=Sentiment.NEUTRAL,
        role_description="Appears briefly before assassination in Egypt",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="octavian_augustus",
        media_id="ac_origins",
        sentiment=Sentiment.HEROIC,
        role_description="Portrayed as legitimate heir bringing order to Rome",
        is_protagonist=False,
        conflict_flag=True,
        conflict_notes="AC Origins portrays Octavian heroically; HBO Rome shows him as cold and villainous"
    ),

    # === The Republic of Rome Board Game Portrayals ===
    Portrayal(
        figure_id="julius_caesar",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Powerful senator/general card with military bonuses",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="pompey_magnus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with strong military capability",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_crassus",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card known for wealth mechanics",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cicero",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with high oratory/influence",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="cato_younger",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card representing conservative faction",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="gaius_marius",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Early era senator with military reforms",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="sulla",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Senator card with dictator mechanics",
        is_protagonist=False,
        conflict_flag=False
    ),
    Portrayal(
        figure_id="marcus_antonius",
        media_id="republic_of_rome",
        sentiment=Sentiment.NEUTRAL,
        role_description="Late Republic era senator card",
        is_protagonist=False,
        conflict_flag=False
    ),
]


class ChronosGraphIngestor:
    """Handles ingestion of historical fiction data into Neo4j."""

    def __init__(self, uri: str, username: str, password: str):
        # Convert neo4j+s:// to neo4j+ssc:// to allow self-signed certs on macOS
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        self.driver.close()

    def setup_schema(self):
        """Apply schema constraints for Master Entity Resolution."""
        with self.driver.session() as session:
            for statement in SCHEMA_CONSTRAINTS.strip().split(';'):
                statement = statement.strip()
                if statement:
                    try:
                        session.run(statement)
                    except Exception as e:
                        # Constraints may already exist
                        print(f"Schema note: {e}")
        print("Schema constraints applied.")

    def ingest_figures(self, figures: list[HistoricalFigure]):
        """Ingest historical figures using MERGE for entity resolution."""
        with self.driver.session() as session:
            for figure in figures:
                session.run("""
                    MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                    SET f.name = $name,
                        f.birth_year = $birth_year,
                        f.death_year = $death_year,
                        f.title = $title,
                        f.era = $era
                """, **figure.model_dump())
        print(f"Ingested {len(figures)} historical figures.")

    def ingest_media(self, works: list[MediaWork]):
        """Ingest media works."""
        with self.driver.session() as session:
            for work in works:
                session.run("""
                    MERGE (m:MediaWork {media_id: $media_id})
                    SET m.title = $title,
                        m.media_type = $media_type,
                        m.release_year = $release_year,
                        m.creator = $creator
                """, media_type=work.media_type.value, **work.model_dump(exclude={'media_type'}))
        print(f"Ingested {len(works)} media works.")

    def ingest_portrayals(self, portrayals: list[Portrayal]):
        """Create APPEARS_IN relationships with sentiment and conflict data."""
        with self.driver.session() as session:
            for p in portrayals:
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
        print(f"Ingested {len(portrayals)} portrayals.")

    def find_collisions(self) -> dict:
        """
        Find historical figures that appear in multiple media works.
        These are 'collisions' - shared figures across different works.
        """
        with self.driver.session() as session:
            # Get figures appearing in multiple works
            result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
                WITH f, collect(DISTINCT m.title) AS media_titles, count(DISTINCT m) AS appearance_count
                WHERE appearance_count > 1
                RETURN f.name AS figure,
                       f.canonical_id AS id,
                       media_titles AS appears_in,
                       appearance_count AS collision_count
                ORDER BY collision_count DESC
            """)

            collisions = []
            for record in result:
                collisions.append({
                    "figure": record["figure"],
                    "id": record["id"],
                    "appears_in": record["appears_in"],
                    "collision_count": record["collision_count"]
                })

            # Get conflict portrayals
            conflict_result = session.run("""
                MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
                WHERE r.conflict_flag = true
                RETURN f.name AS figure,
                       m.title AS media,
                       r.sentiment AS sentiment,
                       r.conflict_notes AS notes
            """)

            conflicts = []
            for record in conflict_result:
                conflicts.append({
                    "figure": record["figure"],
                    "media": record["media"],
                    "sentiment": record["sentiment"],
                    "notes": record["notes"]
                })

            return {
                "collisions": collisions,
                "total_collision_figures": len(collisions),
                "conflicts": conflicts,
                "total_conflicts": len(conflicts)
            }


def main():
    """Run the Roman pilot ingestion."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        raise ValueError("NEO4J_PASSWORD not found in environment variables")

    print("=" * 60)
    print("ChronosGraph Roman Pilot Ingestor")
    print("=" * 60)
    print(f"Connecting to: {uri}")

    ingestor = ChronosGraphIngestor(uri, username, password)

    try:
        # Setup schema with constraints
        print("\n[1/4] Setting up schema...")
        ingestor.setup_schema()

        # Ingest master entities (historical figures)
        print("\n[2/4] Ingesting historical figures...")
        ingestor.ingest_figures(HISTORICAL_FIGURES)

        # Ingest media works
        print("\n[3/4] Ingesting media works...")
        ingestor.ingest_media(MEDIA_WORKS)

        # Ingest portrayals with sentiment data
        print("\n[4/4] Ingesting portrayals...")
        ingestor.ingest_portrayals(PORTRAYALS)

        # Run collision analysis
        print("\n" + "=" * 60)
        print("COLLISION ANALYSIS (Consensus Engine)")
        print("=" * 60)

        results = ingestor.find_collisions()

        print(f"\nTotal Collisions Found: {results['total_collision_figures']} figures")
        print("-" * 40)

        for collision in results["collisions"]:
            print(f"\n  {collision['figure']}")
            print(f"    Appears in {collision['collision_count']} works: {', '.join(collision['appears_in'])}")

        print(f"\n\nConflicting Portrayals: {results['total_conflicts']}")
        print("-" * 40)

        for conflict in results["conflicts"]:
            print(f"\n  {conflict['figure']} in '{conflict['media']}'")
            print(f"    Sentiment: {conflict['sentiment']}")
            print(f"    Conflict: {conflict['notes']}")

        print("\n" + "=" * 60)
        print("Ingestion complete!")
        print("=" * 60)

        return results

    finally:
        ingestor.close()


if __name__ == "__main__":
    main()
