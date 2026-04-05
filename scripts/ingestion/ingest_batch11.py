"""
Fictotum: Batch 11 Ingestion
Ingests deduplicated batch 11 data into Neo4j.
Focus: Peninsular War, Hundred Days, Napoleonic Naval Supremacy, Magical Napoleonic Realism
"""
import os
import sys
import json
import traceback
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError

# Add parent directory to path for schema import
sys.path.insert(0, str(Path(__file__).parent.parent))
from schema import SCHEMA_CONSTRAINTS

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

def infer_media_type(title: str) -> str:
    """Infer media type from title."""
    title_lower = title.lower()

    # Film indicators
    if any(x in title_lower for x in ['napoleon (film)', 'duelists']):
        return 'Film'

    # Book is default (Hornblower, Jonathan Strange, Les Mis, Vanity Fair)
    return 'Book'

class Batch11Ingestor:
    """Handles ingestion of Batch 11 data into Neo4j."""

    def __init__(self, uri: str, username: str, password: str):
        """Initialize Neo4j driver with SSL fallback."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        """Close the database connection."""
        self.driver.close()

    def ingest_historical_figures(self, figures: list) -> int:
        """Ingest historical figures."""
        success_count = 0
        with self.driver.session() as session:
            for figure in figures:
                try:
                    session.run("""
                        MERGE (f:HistoricalFigure {canonical_id: $canonical_id})
                        SET f.name = $name,
                            f.wikidata_id = $wikidata_id,
                            f.birth_year = $birth_year,
                            f.death_year = $death_year,
                            f.title = $title,
                            f.era = $era
                    """, **figure)
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting figure {figure.get('name', 'UNKNOWN')}", e)
        print(f"Ingested {success_count}/{len(figures)} historical figures.")
        return success_count

    def ingest_media_works(self, works: list) -> int:
        """Ingest media works with Wikidata Q-ID validation."""
        success_count = 0
        with self.driver.session() as session:
            for work in works:
                try:
                    # Validate Wikidata Q-ID
                    if not work.get('wikidata_id'):
                        log_error(
                            f"Media work '{work.get('title', 'UNKNOWN')}'",
                            ValueError("Missing wikidata_id (CLAUDE.md requirement)")
                        )
                        continue

                    # Infer media_type
                    media_type = infer_media_type(work['title'])

                    session.run("""
                        MERGE (m:MediaWork {media_id: $media_id})
                        SET m.title = $title,
                            m.wikidata_id = $wikidata_id,
                            m.media_type = $media_type,
                            m.release_year = $release_year,
                            m.creator = $creator
                    """,
                        media_id=work['media_id'],
                        title=work['title'],
                        wikidata_id=work['wikidata_id'],
                        media_type=media_type,
                        release_year=work['release_year'],
                        creator=work['creator']
                    )
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting media {work.get('title', 'UNKNOWN')}", e)
        print(f"Ingested {success_count}/{len(works)} media works.")
        return success_count

    def ingest_fictional_characters(self, characters: list) -> int:
        """Ingest fictional characters."""
        success_count = 0
        with self.driver.session() as session:
            for char in characters:
                try:
                    session.run("""
                        MERGE (c:FictionalCharacter {char_id: $char_id})
                        SET c.name = $name,
                            c.media_id = $media_id,
                            c.creator = $creator,
                            c.role_type = $role_type,
                            c.notes = $notes
                    """, **char)
                    success_count += 1
                except Exception as e:
                    log_error(f"Ingesting character {char.get('name', 'UNKNOWN')}", e)
        print(f"Ingested {success_count}/{len(characters)} fictional characters.")
        return success_count

    def ingest_interactions(self, interactions: list) -> int:
        """
        Ingest relationships between entities.
        """
        success_count = 0
        with self.driver.session() as session:
            for interaction in interactions:
                try:
                    subject_id = interaction['subject_id']
                    object_id = interaction['object_id']
                    rel_type = interaction['relationship_type']
                    sentiment = interaction.get('sentiment', 'Complex')
                    notes = interaction.get('notes', '')

                    # Determine node types from ID prefixes
                    subject_type = self._get_node_type(subject_id)
                    object_type = self._get_node_type(object_id)

                    # Build dynamic query
                    query = f"""
                        MATCH (subject:{subject_type})
                        WHERE subject.{self._get_id_field(subject_type)} = $subject_id
                        MATCH (object:{object_type})
                        WHERE object.{self._get_id_field(object_type)} = $object_id
                        MERGE (subject)-[r:{rel_type}]->(object)
                        SET r.sentiment = $sentiment,
                            r.notes = $notes
                    """

                    session.run(query,
                        subject_id=subject_id,
                        object_id=object_id,
                        sentiment=sentiment,
                        notes=notes
                    )
                    success_count += 1

                except Exception as e:
                    log_error(
                        f"Creating relationship {subject_id} -> {object_id} ({rel_type})",
                        e
                    )
        print(f"Created {success_count}/{len(interactions)} relationships.")
        return success_count

    def _get_node_type(self, node_id: str) -> str:
        """Determine node type from ID prefix."""
        if node_id.startswith('HF_'):
            return 'HistoricalFigure'
        elif node_id.startswith('FC_'):
            return 'FictionalCharacter'
        elif node_id.startswith('MW_'):
            return 'MediaWork'
        else:
            return 'Unknown'

    def _get_id_field(self, node_type: str) -> str:
        """Get the ID field name for a node type."""
        if node_type == 'HistoricalFigure':
            return 'canonical_id'
        elif node_type == 'FictionalCharacter':
            return 'char_id'
        elif node_type == 'MediaWork':
            return 'media_id'
        else:
            return 'id'

    def get_stats(self) -> dict:
        """Get database statistics."""
        with self.driver.session() as session:
            figures = session.run("MATCH (f:HistoricalFigure) RETURN count(f) as count").single()["count"]
            media = session.run("MATCH (m:MediaWork) RETURN count(m) as count").single()["count"]
            characters = session.run("MATCH (c:FictionalCharacter) RETURN count(c) as count").single()["count"]
            relationships = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()["count"]

            return {
                "figures": figures,
                "media_works": media,
                "fictional_characters": characters,
                "total_relationships": relationships,
            }

def main():
    """Run the Batch 11 ingestion."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not password:
        raise ValueError("NEO4J_PASSWORD not found in environment variables")

    # Load deduplicated JSON data
    data_path = Path(__file__).parent.parent.parent / "data" / "global_mvp_batch11_deduplicated.json"
    with open(data_path, 'r') as f:
        data = json.load(f)

    print("=" * 70)
    print("Fictotum: Batch 11 Ingestion")
    print("=" * 70)
    print(f"Dataset: {data['metadata']['project']}")
    print(f"Description: {data['metadata']['description']}")
    print(f"Connecting to: {uri}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        ingestor = Batch11Ingestor(uri, username, password)
    except (ServiceUnavailable, AuthError) as e:
        log_error("Database connection", e)
        print("\n[FATAL] Could not connect to Neo4j. Check credentials and try again.")
        sys.exit(1)

    try:
        print("\n[1/4] Ingesting historical figures...")
        print(f"       Total figures: {len(data['historical_figures'])}")
        ingestor.ingest_historical_figures(data['historical_figures'])

        print("\n[2/4] Ingesting media works...")
        print(f"       Total works: {len(data['media_works'])}")
        ingestor.ingest_media_works(data['media_works'])

        print("\n[3/4] Ingesting fictional characters...")
        print(f"       Total characters: {len(data['fictional_characters'])}")
        ingestor.ingest_fictional_characters(data['fictional_characters'])

        print("\n[4/4] Creating relationships...")
        print(f"       Total interactions: {len(data['interactions'])}")
        ingestor.ingest_interactions(data['interactions'])

        print("\n" + "=" * 70)
        print("INGESTION COMPLETE")
        print("=" * 70)

        stats = ingestor.get_stats()
        print(f"\nDatabase Statistics:")
        print(f"  Historical Figures: {stats['figures']}")
        print(f"  Media Works (Wikidata-mapped): {stats['media_works']}")
        print(f"  Fictional Characters: {stats['fictional_characters']}")
        print(f"  Total Relationships: {stats['total_relationships']}")

        print(f"\nFinished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 70)

        if ERROR_LOG:
            print(f"\n[WARNING] {len(ERROR_LOG)} errors occurred:")
            for err in ERROR_LOG:
                print(f"  - {err['context']}: {err['error']}")

        return stats

    except Exception as e:
        log_error("Main execution", e)
        print(f"\n[ERROR] Unexpected error: {e}")
        raise
    finally:
        ingestor.close()

if __name__ == "__main__":
    main()
