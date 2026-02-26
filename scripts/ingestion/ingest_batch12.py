"""
Fictotum: Ingestion Engine for Batch 12 (Archaic Greece)
"""
import os
import json
import sys
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Add parent directory to path for schema import
sys.path.insert(0, str(Path(__file__).parent.parent))
from schema import SCHEMA_CONSTRAINTS

class Batch12Ingestor:
    def __init__(self, uri, user, pwd):
        # ssc ensures that the driver trusts the server's certificate
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.report = {"nodes_created": 0, "rels_created": 0, "errors": []}

    def close(self):
        self.driver.close()

    def setup_schema(self):
        with self.driver.session() as session:
            for statement in SCHEMA_CONSTRAINTS.strip().split(';'):
                if statement.strip():
                    session.run(statement)
        print("✅ Schema constraints verified.")

    def ingest_data(self, data):
        """Ingests all components from the batch file."""
        self._ingest_nodes(data.get('media_works', []), 'MediaWork', 'media_id')
        self._ingest_nodes(data.get('historical_figures', []), 'HistoricalFigure', 'canonical_id')
        self._ingest_nodes(data.get('fictional_characters', []), 'FictionalCharacter', 'char_id')
        self._ingest_interactions(data.get('interactions', []))

    def _ingest_nodes(self, nodes, label, id_property):
        """Generic function to merge nodes based on a label and ID property."""
        if not nodes:
            return

        # For MediaWork, the canonical ID for merging should be wikidata_id
        merge_key = 'wikidata_id' if label == 'MediaWork' else id_property

        query = f"""
        UNWIND $nodes AS node_data
        MERGE (n:{label} {{{merge_key}: node_data.{merge_key}}})
        SET n += node_data
        """
        with self.driver.session() as session:
            result = session.run(query, nodes=nodes)
            summary = result.consume()
            count = summary.counters.nodes_created
            self.report["nodes_created"] += count
            print(f"  - Merged {len(nodes)} {label} nodes (created {count} new).")

    def _ingest_interactions(self, interactions):
        """Ingests the custom relationships from the 'interactions' block."""
        if not interactions:
            return

        rels_created = 0
        with self.driver.session() as session:
            for interaction in interactions:
                # Relationship types cannot be parameterized directly in Cypher.
                # We must build the query string, ensuring the type is sanitized.
                rel_type = interaction.get("relationship_type", "RELATED_TO").upper()
                # Basic sanitization
                if not rel_type.isalnum() and '_' not in rel_type:
                    error_msg = f"Invalid relationship type: {rel_type}"
                    print(f"❌ {error_msg}")
                    self.report["errors"].append(error_msg)
                    continue

                query = f"""
                MATCH (subj)
                WHERE (subj:HistoricalFigure AND subj.canonical_id = $subject_id)
                   OR (subj:FictionalCharacter AND subj.char_id = $subject_id)
                MATCH (obj)
                WHERE (obj:HistoricalFigure AND obj.canonical_id = $object_id)
                   OR (obj:FictionalCharacter AND obj.char_id = $object_id)
                MERGE (subj)-[r:`{rel_type}`]->(obj)
                SET r += $props
                """
                
                props_to_set = {
                    "sentiment": interaction.get("sentiment"),
                    "notes": interaction.get("notes"),
                    "source_batch_id": 12  # Add batch ID for provenance
                }
                # Remove None values
                props_to_set = {k: v for k, v in props_to_set.items() if v is not None}

                try:
                    result = session.run(query, 
                                     subject_id=interaction["subject_id"],
                                     object_id=interaction["object_id"],
                                     props=props_to_set)
                    summary = result.consume()
                    rels_created += summary.counters.relationships_created
                except Exception as e:
                    error_msg = f"Failed to create interaction {interaction}: {e}"
                    print(f"❌ {error_msg}")
                    self.report["errors"].append(error_msg)
        
        self.report["rels_created"] += rels_created
        print(f"  - Merged {len(interactions)} interaction relationships (created {rels_created} new).")


def main():
    load_dotenv()
    
    json_path = "data/batch_12_archaic_greece.json"

    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: The file '{json_path}' was not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in '{json_path}': {e}")
        sys.exit(1)

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not all([uri, user, pwd]):
        print("❌ Error: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD environment variables must be set.")
        sys.exit(1)

    ingestor = Batch12Ingestor(uri, user, pwd)
    try:
        print(f"--- Fictotum Batch 12 Ingestion: {datetime.now()} ---")
        ingestor.setup_schema()
        ingestor.ingest_data(data)
        print("\n--- Ingestion Report ---")
        print(f"  New Nodes Created: {ingestor.report['nodes_created']}")
        print(f"  New Relationships Created: {ingestor.report['rels_created']}")
        if ingestor.report['errors']:
            print(f"  Errors ({len(ingestor.report['errors'])}):")
            for err in ingestor.report['errors']:
                print(f"    - {err}")
        print("--- Ingestion Complete ---")
    finally:
        ingestor.close()

if __name__ == "__main__":
    main()
