#!/usr/bin/env python3
"""
Batch Import Executor

Executes validated bulk imports with transaction support and provenance tracking.
Uses resolution decisions from duplicate checking to link or create entities.

Usage:
  python3 scripts/ingestion/import_batch.py data/examples/ancient-rome.json --dry-run
  python3 scripts/ingestion/import_batch.py data/examples/ancient-rome.json
  python3 scripts/ingestion/import_batch.py data/examples/ancient-rome.json --batch-id ancient-rome-2026-02-02
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
from neo4j import GraphDatabase
import time

# Load Neo4j credentials
NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
    print("Error: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set")
    sys.exit(1)

# Import resolution manager
sys.path.insert(0, str(Path(__file__).parent))
from resolve_entities import ResolutionManager

class BatchImporter:
    def __init__(self, dry_run: bool = False, batch_id: Optional[str] = None):
        self.dry_run = dry_run
        self.batch_id = batch_id or f"batch-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )
        self.resolution_manager = ResolutionManager()

        # Statistics
        self.stats = {
            'figures_created': 0,
            'figures_linked': 0,
            'figures_skipped': 0,
            'media_created': 0,
            'media_linked': 0,
            'relationships_created': 0,
            'errors': []
        }

        # History tracking
        self.history_dir = Path('data/.ingestion-history')
        self.history_file = self.history_dir / f"{self.batch_id}.json"

    def close(self):
        """Close database connection"""
        self.driver.close()

    def ensure_agent_exists(self, tx, agent_id: str = "batch-import-agent") -> str:
        """Ensure batch import agent exists in database"""
        query = """
        MERGE (agent:Agent {agent_id: $agent_id})
        ON CREATE SET
            agent.name = 'Batch Import Agent',
            agent.type = 'ai_agent',
            agent.version = '1.0.0',
            agent.created_at = datetime()
        RETURN agent.agent_id AS agent_id
        """

        result = tx.run(query, agent_id=agent_id)
        record = result.single()
        return record['agent_id']

    def find_existing_figure(self, tx, figure: Dict) -> Optional[str]:
        """Find existing figure by wikidata_id or canonical_id"""
        qid = figure.get('wikidata_id')
        cid = figure.get('canonical_id')

        if qid:
            query = """
            MATCH (f:HistoricalFigure {wikidata_id: $qid})
            WHERE NOT f:Deleted
            RETURN f.canonical_id AS canonical_id
            """
            result = tx.run(query, qid=qid)
            record = result.single()
            if record:
                return record['canonical_id']

        if cid:
            query = """
            MATCH (f:HistoricalFigure {canonical_id: $cid})
            WHERE NOT f:Deleted
            RETURN f.canonical_id AS canonical_id
            """
            result = tx.run(query, cid=cid)
            record = result.single()
            if record:
                return record['canonical_id']

        return None

    def create_figure(self, tx, figure: Dict, agent_id: str) -> str:
        """Create a new HistoricalFigure node"""
        # Generate canonical_id if not provided
        canonical_id = figure.get('canonical_id')
        if not canonical_id:
            if figure.get('wikidata_id'):
                canonical_id = figure['wikidata_id']
            else:
                # Generate PROV: ID
                name_slug = figure['name'].lower().replace(' ', '_')[:50]
                timestamp = int(time.time() * 1000)
                canonical_id = f"PROV:{name_slug}-{timestamp}"

        query = """
        CREATE (f:HistoricalFigure {
            canonical_id: $canonical_id,
            name: $name
        })
        SET f.wikidata_id = $wikidata_id,
            f.birth_year = $birth_year,
            f.death_year = $death_year,
            f.era = $era,
            f.title = $title,
            f.occupation = $occupation,
            f.description = $description,
            f.image_url = $image_url

        WITH f
        MATCH (agent:Agent {agent_id: $agent_id})
        CREATE (f)-[:CREATED_BY {
            timestamp: datetime(),
            context: 'bulk_ingestion',
            batch_id: $batch_id,
            method: 'wikidata_enriched'
        }]->(agent)

        RETURN f.canonical_id AS canonical_id
        """

        params = {
            'canonical_id': canonical_id,
            'name': figure['name'],
            'wikidata_id': figure.get('wikidata_id'),
            'birth_year': figure.get('birth_year'),
            'death_year': figure.get('death_year'),
            'era': figure.get('era'),
            'title': figure.get('title'),
            'occupation': figure.get('occupation'),
            'description': figure.get('description'),
            'image_url': figure.get('image_url'),
            'agent_id': agent_id,
            'batch_id': self.batch_id
        }

        result = tx.run(query, **params)
        record = result.single()
        return record['canonical_id']

    def import_figure(self, tx, figure: Dict, agent_id: str, index: int, total: int) -> Dict[str, Any]:
        """Import a single figure (create or link to existing)"""
        name = figure.get('name', '<unnamed>')

        # Check for existing figure
        existing_id = self.find_existing_figure(tx, figure)

        if existing_id:
            print(f"  [{index}/{total}] Linked to existing: {name} ({existing_id})")
            self.stats['figures_linked'] += 1
            return {'action': 'linked', 'canonical_id': existing_id, 'name': name}

        # Create new figure
        canonical_id = self.create_figure(tx, figure, agent_id)
        print(f"  [{index}/{total}] Created: {name} ({canonical_id})")
        self.stats['figures_created'] += 1
        return {'action': 'created', 'canonical_id': canonical_id, 'name': name}

    def find_existing_media(self, tx, media: Dict) -> Optional[str]:
        """Find existing media work by wikidata_id or media_id"""
        qid = media.get('wikidata_id')
        mid = media.get('media_id')

        if qid:
            query = """
            MATCH (m:MediaWork {wikidata_id: $qid})
            RETURN coalesce(m.media_id, m.wikidata_id) AS media_id
            """
            result = tx.run(query, qid=qid)
            record = result.single()
            if record:
                return record['media_id']

        if mid:
            query = """
            MATCH (m:MediaWork)
            WHERE coalesce(m.media_id, m.wikidata_id) = $mid
            RETURN coalesce(m.media_id, m.wikidata_id) AS media_id
            """
            result = tx.run(query, mid=mid)
            record = result.single()
            if record:
                return record['media_id']

        return None

    def create_media(self, tx, media: Dict, agent_id: str) -> str:
        """Create a new MediaWork node"""
        # Generate media_id if not provided
        media_id = media.get('media_id')
        if not media_id:
            if media.get('wikidata_id'):
                media_id = media['wikidata_id']
            else:
                # Generate ID from title
                title_slug = media['title'].lower().replace(' ', '_')[:50]
                timestamp = int(time.time() * 1000)
                media_id = f"MW_{title_slug}_{timestamp}"

        query = """
        CREATE (m:MediaWork {
            media_id: $media_id,
            title: $title,
            media_type: $media_type
        })
        SET m.wikidata_id = $wikidata_id,
            m.release_year = $release_year,
            m.creator = $creator,
            m.genre = $genre,
            m.runtime_minutes = $runtime_minutes,
            m.description = $description

        WITH m
        MATCH (agent:Agent {agent_id: $agent_id})
        CREATE (m)-[:CREATED_BY {
            timestamp: datetime(),
            context: 'bulk_ingestion',
            batch_id: $batch_id,
            method: 'wikidata_enriched'
        }]->(agent)

        RETURN m.media_id AS media_id
        """

        params = {
            'media_id': media_id,
            'title': media['title'],
            'media_type': media['media_type'],
            'wikidata_id': media.get('wikidata_id'),
            'release_year': media.get('release_year'),
            'creator': media.get('creator'),
            'genre': media.get('genre'),
            'runtime_minutes': media.get('runtime_minutes'),
            'description': media.get('description'),
            'agent_id': agent_id,
            'batch_id': self.batch_id
        }

        result = tx.run(query, **params)
        record = result.single()
        return record['media_id']

    def find_figure_by_identifier(self, tx, identifier: str) -> Optional[str]:
        """Find figure canonical_id by wikidata_id, canonical_id, or name"""
        # Try as Q-ID
        if identifier.startswith('Q'):
            query = """
            MATCH (f:HistoricalFigure {wikidata_id: $qid})
            WHERE NOT f:Deleted
            RETURN f.canonical_id AS canonical_id
            """
            result = tx.run(query, qid=identifier)
            record = result.single()
            if record:
                return record['canonical_id']

        # Try as canonical_id
        query = """
        MATCH (f:HistoricalFigure {canonical_id: $cid})
        WHERE NOT f:Deleted
        RETURN f.canonical_id AS canonical_id
        """
        result = tx.run(query, cid=identifier)
        record = result.single()
        if record:
            return record['canonical_id']

        # Try as exact name match
        query = """
        MATCH (f:HistoricalFigure {name: $name})
        WHERE NOT f:Deleted
        RETURN f.canonical_id AS canonical_id
        """
        result = tx.run(query, name=identifier)
        record = result.single()
        if record:
            return record['canonical_id']

        return None

    def create_portrayal(self, tx, media_id: str, portrayal: Dict, figure_map: Dict[str, str]) -> bool:
        """Create APPEARS_IN relationship for a portrayal"""
        identifier = portrayal.get('figure_identifier')

        # Look up figure canonical_id from import or database
        figure_canonical_id = None

        # Check if identifier is in the current import batch
        if identifier in figure_map:
            figure_canonical_id = figure_map[identifier]
        else:
            # Search database
            figure_canonical_id = self.find_figure_by_identifier(None, identifier)

        if not figure_canonical_id:
            print(f"    ⚠️  Could not find figure: {identifier}")
            return False

        query = """
        MATCH (f:HistoricalFigure {canonical_id: $figure_id})
        MATCH (m:MediaWork)
        WHERE coalesce(m.media_id, m.wikidata_id) = $media_id

        MERGE (f)-[r:APPEARS_IN]->(m)
        ON CREATE SET
            r.actor_name = $actor_name,
            r.character_name = $character_name,
            r.is_protagonist = $is_protagonist,
            r.sentiment = $sentiment,
            r.screen_time_minutes = $screen_time_minutes,
            r.notes = $notes

        RETURN r
        """

        with self.driver.session() as session:
            result = session.run(query,
                figure_id=figure_canonical_id,
                media_id=media_id,
                actor_name=portrayal.get('actor_name'),
                character_name=portrayal.get('character_name'),
                is_protagonist=portrayal.get('is_protagonist', False),
                sentiment=portrayal.get('sentiment', 'neutral'),
                screen_time_minutes=portrayal.get('screen_time_minutes'),
                notes=portrayal.get('notes')
            )

            if result.single():
                self.stats['relationships_created'] += 1
                return True

        return False

    def import_media(self, tx, media: Dict, agent_id: str, figure_map: Dict[str, str], index: int, total: int) -> Dict[str, Any]:
        """Import a single media work with portrayals"""
        title = media.get('title', '<untitled>')

        # Check for existing media
        existing_id = self.find_existing_media(tx, media)

        if existing_id:
            media_id = existing_id
            print(f"  [{index}/{total}] Linked to existing: {title} ({media_id})")
            self.stats['media_linked'] += 1
            action = 'linked'
        else:
            media_id = self.create_media(tx, media, agent_id)
            print(f"  [{index}/{total}] Created: {title} ({media_id})")
            self.stats['media_created'] += 1
            action = 'created'

        # Create portrayals
        portrayals = media.get('portrayals', [])
        if portrayals:
            for portrayal in portrayals:
                figure_id = portrayal.get('figure_identifier')
                actor = portrayal.get('actor_name', 'unknown')
                if self.create_portrayal(tx, media_id, portrayal, figure_map):
                    print(f"    ✓ Linked {figure_id} → {actor}")

        return {'action': action, 'media_id': media_id, 'title': title, 'portrayals': len(portrayals)}

    def execute_import(self, import_data: Dict):
        """Execute the full import in a transaction"""
        figures = import_data.get('figures', [])
        media_works = import_data.get('media_works', [])

        print(f"\n{'=' * 80}")
        print(f"STARTING IMPORT: {self.batch_id}")
        print(f"{'=' * 80}")
        print(f"Figures: {len(figures)}")
        print(f"Media Works: {len(media_works)}")
        print()

        if self.dry_run:
            print("[DRY RUN MODE - No database changes will be made]")
            print()
            return

        start_time = time.time()

        try:
            with self.driver.session() as session:
                with session.begin_transaction() as tx:
                    # Ensure batch import agent exists
                    agent_id = self.ensure_agent_exists(tx, "batch-import-agent")

                    # Import figures
                    figure_map = {}  # Map import identifiers to canonical_ids
                    if figures:
                        print(f"Importing figures...")
                        for i, figure in enumerate(figures, 1):
                            result = self.import_figure(tx, figure, agent_id, i, len(figures))

                            # Build map for portrayals
                            import_id = figure.get('wikidata_id') or figure.get('name')
                            figure_map[import_id] = result['canonical_id']
                        print()

                    # Import media works
                    if media_works:
                        print(f"Importing media works...")
                        for i, media in enumerate(media_works, 1):
                            self.import_media(tx, media, agent_id, figure_map, i, len(media_works))
                        print()

                    # Commit transaction
                    tx.commit()

            duration = time.time() - start_time

            print(f"{'=' * 80}")
            print(f"✅ IMPORT SUCCESSFUL!")
            print(f"{'=' * 80}")
            print(f"  Figures created: {self.stats['figures_created']}")
            print(f"  Figures linked: {self.stats['figures_linked']}")
            print(f"  Media created: {self.stats['media_created']}")
            print(f"  Media linked: {self.stats['media_linked']}")
            print(f"  Relationships created: {self.stats['relationships_created']}")
            print(f"  Duration: {duration:.2f}s")
            print()

            # Save history
            self.save_history(import_data, duration, success=True)

        except Exception as e:
            print(f"\n{'=' * 80}")
            print(f"❌ IMPORT FAILED!")
            print(f"{'=' * 80}")
            print(f"Error: {str(e)}")
            print()
            print("Transaction rolled back - no changes made to database")
            self.save_history(import_data, time.time() - start_time, success=False, error=str(e))
            raise

    def save_history(self, import_data: Dict, duration: float, success: bool, error: Optional[str] = None):
        """Save import history to file"""
        self.history_dir.mkdir(parents=True, exist_ok=True)

        history = {
            'batch_id': self.batch_id,
            'timestamp': datetime.now().isoformat(),
            'success': success,
            'duration_seconds': duration,
            'statistics': self.stats,
            'metadata': import_data.get('metadata', {}),
            'error': error
        }

        with open(self.history_file, 'w') as f:
            json.dump(history, f, indent=2)

        print(f"📝 Import history saved to: {self.history_file}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/ingestion/import_batch.py <file.json> [--dry-run] [--batch-id <id>]")
        sys.exit(1)

    input_path = sys.argv[1]
    dry_run = '--dry-run' in sys.argv

    batch_id = None
    if '--batch-id' in sys.argv:
        idx = sys.argv.index('--batch-id')
        if idx + 1 < len(sys.argv):
            batch_id = sys.argv[idx + 1]

    importer = BatchImporter(dry_run=dry_run, batch_id=batch_id)

    try:
        # Load import file
        with open(input_path, 'r') as f:
            import_data = json.load(f)

        # Execute import
        importer.execute_import(import_data)

    finally:
        importer.close()

if __name__ == '__main__':
    main()
