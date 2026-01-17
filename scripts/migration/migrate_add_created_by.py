"""
ChronosGraph: Retroactive `CREATED_BY` Relationship Migration
"""
import os
import json
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# A mapping of AGENT names to the data files they created, based on CHRONOS_LOG.md
# We are only concerned with ingestion actions that created new nodes.
AGENT_TO_FILES_MAP = {
    "Claude Code (Sonnet 4.5)": [
        "data/global_mvp_batch11_deduplicated.json",
        "data/global_mvp_batch10_deduplicated.json",
        "data/global_mvp_batch9_deduplicated.json",
        "data/global_mvp_batch8_deduplicated.json",
        "data/global_mvp_batch7_deduplicated.json",
        "data/global_mvp_batch6_deduplicated.json",
        "data/global_mvp_batch5_deduplicated.json",
        "data/global_mvp_batch4_deduplicated.json",
        "data/global_mvp_batch3_deduplicated.json",
    ],
    "Claude Code (Haiku 4.5)": [
        "data/global_mvp_batch2_deduplicated.json",
        "data/global_mvp_seed.json",
    ]
}

class CreatedByMigration:
    def __init__(self, uri, user, pwd):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.agent_entity_map = {}

    def close(self):
        self.driver.close()

    def _get_entity_ids_from_file(self, file_path):
        """Reads a JSON data file and extracts all entity IDs."""
        figure_ids = set()
        media_ids = set()
        character_ids = set()

        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"⚠️  Warning: Could not process file {file_path}. Reason: {e}")
            return set(), set(), set()

        if isinstance(data, list): # Batch files are lists of entries
            for entry in data:
                if 'media_work' in entry and 'wikidata_id' in entry['media_work']:
                    media_ids.add(entry['media_work']['wikidata_id'])

                for fig in entry.get('historical_figures', []):
                    if 'canonical_id' in fig:
                        figure_ids.add(fig['canonical_id'])

                for char in entry.get('fictional_characters', []):
                    if 'char_id' in char:
                        character_ids.add(char['char_id'])

        # Handle dict structure (our actual batch files)
        elif isinstance(data, dict):
            # Extract media works by wikidata_id
            for media in data.get('media_works', []):
                if 'wikidata_id' in media:
                    media_ids.add(media['wikidata_id'])

            # Extract historical figures by canonical_id
            for fig in data.get('historical_figures', []):
                if 'canonical_id' in fig:
                    figure_ids.add(fig['canonical_id'])

            # Extract fictional characters by char_id
            for char in data.get('fictional_characters', []):
                if 'char_id' in char:
                    character_ids.add(char['char_id'])

        return figure_ids, media_ids, character_ids

    def build_agent_entity_map(self):
        """Builds the internal map of agents to all entities they created."""
        print("--- Building Agent-to-Entity Map ---")
        for agent, files in AGENT_TO_FILES_MAP.items():
            print(f"Processing agent: {agent}")
            total_figs = set()
            total_media = set()
            total_chars = set()
            for file_path in files:
                print(f"  - Reading file: {file_path}")
                figs, media, chars = self._get_entity_ids_from_file(file_path)
                total_figs.update(figs)
                total_media.update(media)
                total_chars.update(chars)
            
            self.agent_entity_map[agent] = {
                "figures": list(total_figs),
                "media": list(total_media),
                "characters": list(total_chars)
            }
            print(f"  - Found: {len(total_figs)} figures, {len(total_media)} media, {len(total_chars)} characters.")
        print("--- Map built successfully ---
")


    def run_migration(self):
        """Executes the migration to create Agent nodes and CREATED_BY relationships."""
        if not self.agent_entity_map:
            print("❌ Error: Agent-to-Entity map is empty. Run build_agent_entity_map() first.")
            return

        print("--- Starting Database Migration ---")
        with self.driver.session() as session:
            for agent, entities in self.agent_entity_map.items():
                print(f"Migrating entities for agent: {agent}")
                
                # 1. Create the Agent node
                session.run("MERGE (a:Agent {name: $name})", name=agent)
                print(f"  - Ensured Agent node exists for '{agent}'.")

                # 2. Link HistoricalFigures
                if entities["figures"]:
                    result = session.run("""
                        MATCH (f:HistoricalFigure)
                        WHERE f.canonical_id IN $ids
                        WITH f
                        MATCH (a:Agent {name: $agent_name})
                        MERGE (f)-[:CREATED_BY]->(a)
                    """, ids=entities["figures"], agent_name=agent)
                    print(f"  - Linked {len(entities['figures'])} HistoricalFigure nodes.")

                # 3. Link MediaWorks
                if entities["media"]:
                    result = session.run("""
                        MATCH (m:MediaWork)
                        WHERE m.wikidata_id IN $ids
                        WITH m
                        MATCH (a:Agent {name: $agent_name})
                        MERGE (m)-[:CREATED_BY]->(a)
                    """, ids=entities["media"], agent_name=agent)
                    print(f"  - Linked {len(entities['media'])} MediaWork nodes.")

                # 4. Link FictionalCharacters
                if entities["characters"]:
                    session.run("""
                        MATCH (c:FictionalCharacter)
                        WHERE c.char_id IN $ids
                        WITH c
                        MATCH (a:Agent {name: $agent_name})
                        MERGE (c)-[:CREATED_BY]->(a)
                    """, ids=entities["characters"], agent_name=agent)
                    print(f"  - Linked {len(entities['characters'])} FictionalCharacter nodes.")

        print("\n--- Migration Complete ---")


def main():
    load_dotenv()
    
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not pwd:
        print("❌ Error: NEO4J_PASSWORD environment variable not set.")
        sys.exit(1)

    migrator = CreatedByMigration(uri, user, pwd)
    try:
        print(f"--- ChronosGraph CREATED_BY Migration: {datetime.now()} ---")
        migrator.build_agent_entity_map()
        migrator.run_migration()
    finally:
        migrator.close()

if __name__ == "__main__":
    main()