#!/usr/bin/env python3
"""
ChronosGraph: Ingestion Template
SCALABILITY-COMPLIANT TEMPLATE (2026-01-18)

This template follows all scalability best practices:
1. Uses wikidata_id as canonical ID for MediaWork nodes
2. Includes timestamp auditing (created_at, ingestion_batch, ingestion_source)
3. Uses bounded collections where applicable
4. Follows MediaWork Ingestion Protocol from CLAUDE.md

USE THIS TEMPLATE FOR ALL NEW INGESTION SCRIPTS
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


class ScalableIngestor:
    """
    Template ingestor class following ChronosGraph scalability guidelines.
    """

    def __init__(self, uri, user, pwd, batch_name="custom_batch"):
        """
        Initialize the ingestor with database connection and metadata tracking.

        Args:
            uri: Neo4j connection URI
            user: Neo4j username
            pwd: Neo4j password
            batch_name: Name identifier for this batch (used in tracking)
        """
        # SSL certificate handling for Neo4j Aura
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")

        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))

        # Timestamp auditing metadata (CRITICAL for scalability)
        self.batch_id = f"{batch_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.source_name = f"{batch_name}_v1"

        # Tracking report
        self.report = {
            "nodes_created": 0,
            "nodes_updated": 0,
            "rels_created": 0,
            "errors": []
        }

    def close(self):
        """Close database connection."""
        self.driver.close()

    def setup_schema(self):
        """Apply schema constraints from schema.py"""
        with self.driver.session() as session:
            for statement in SCHEMA_CONSTRAINTS.strip().split(';'):
                if statement.strip():
                    session.run(statement)
        print("✅ Schema constraints verified.")

    def _ingest_nodes(self, nodes, label, id_property):
        """
        Generic function to merge nodes with scalability best practices.

        IMPORTANT SCALABILITY FEATURES:
        1. Uses wikidata_id for MediaWork (not media_id)
        2. Adds ingestion_batch and ingestion_source for auditing
        3. Sets created_at on creation, updated_at on match

        Args:
            nodes: List of node dictionaries
            label: Neo4j node label (e.g., 'MediaWork', 'HistoricalFigure')
            id_property: Property name used for ID in the node data
        """
        if not nodes:
            return

        # Add timestamp auditing metadata to each node
        for node in nodes:
            if 'ingestion_batch' not in node:
                node['ingestion_batch'] = self.batch_id
            if 'ingestion_source' not in node:
                node['ingestion_source'] = self.source_name

        # CRITICAL: For MediaWork, always use wikidata_id as merge key
        # This follows the MediaWork Ingestion Protocol from CLAUDE.md
        merge_key = 'wikidata_id' if label == 'MediaWork' else id_property

        query = f"""
        UNWIND $nodes AS node_data
        MERGE (n:{label} {{{merge_key}: node_data.{id_property}}})
        ON CREATE SET n += node_data, n.created_at = datetime()
        ON MATCH SET n += node_data, n.updated_at = datetime()
        """

        with self.driver.session() as session:
            result = session.run(query, nodes=nodes)
            summary = result.consume()
            created = summary.counters.nodes_created
            updated = len(nodes) - created

            self.report['nodes_created'] += created
            self.report['nodes_updated'] += updated

            print(f"✅ {label}: {created} created, {updated} updated.")

    def _ingest_relationships(self, relationships):
        """
        Generic function to create relationships between entities.

        Each relationship dict should contain:
        - from_id: Source node identifier
        - from_type: Source node label
        - from_id_prop: Property name for source ID lookup
        - to_id: Target node identifier
        - to_type: Target node label
        - to_id_prop: Property name for target ID lookup
        - rel_type: Relationship type (e.g., 'APPEARS_IN', 'PART_OF')
        - properties: Dict of relationship properties (optional)
        """
        if not relationships:
            return

        for rel in relationships:
            from_id = rel['from_id']
            from_type = rel['from_type']
            from_id_prop = rel.get('from_id_prop', self._get_id_property(from_type))

            to_id = rel['to_id']
            to_type = rel['to_type']
            to_id_prop = rel.get('to_id_prop', self._get_id_property(to_type))

            rel_type = rel['rel_type']
            properties = rel.get('properties', {})

            # Add audit metadata to relationship
            properties['ingestion_batch'] = self.batch_id
            properties['ingestion_source'] = self.source_name

            query = f"""
            MATCH (from:{from_type} {{{from_id_prop}: $from_id}})
            MATCH (to:{to_type} {{{to_id_prop}: $to_id}})
            MERGE (from)-[r:{rel_type}]->(to)
            ON CREATE SET r += $properties, r.created_at = datetime()
            ON MATCH SET r += $properties, r.updated_at = datetime()
            """

            with self.driver.session() as session:
                try:
                    result = session.run(
                        query,
                        from_id=from_id,
                        to_id=to_id,
                        properties=properties
                    )
                    summary = result.consume()
                    created = summary.counters.relationships_created
                    self.report['rels_created'] += created

                except Exception as e:
                    error_msg = f"Error creating {rel_type} from {from_id} to {to_id}: {str(e)}"
                    self.report['errors'].append(error_msg)
                    print(f"❌ {error_msg}")

    def _get_id_property(self, node_type):
        """
        Returns the canonical ID property for a given node type.

        SCALABILITY NOTE: MediaWork uses wikidata_id, not media_id
        """
        id_map = {
            'MediaWork': 'wikidata_id',  # CRITICAL: Not media_id!
            'HistoricalFigure': 'canonical_id',
            'FictionalCharacter': 'char_id',
            'User': 'email'
        }
        return id_map.get(node_type, 'id')

    def print_report(self):
        """Print ingestion summary."""
        print("\n" + "=" * 70)
        print("INGESTION REPORT")
        print("=" * 70)
        print(f"Batch ID: {self.batch_id}")
        print(f"Source: {self.source_name}")
        print(f"Nodes created: {self.report['nodes_created']}")
        print(f"Nodes updated: {self.report['nodes_updated']}")
        print(f"Relationships created: {self.report['rels_created']}")

        if self.report['errors']:
            print(f"\n❌ Errors ({len(self.report['errors'])}):")
            for error in self.report['errors']:
                print(f"  - {error}")
        else:
            print("\n✅ No errors!")

        print("=" * 70)


def main():
    """
    Main execution function - customize this for your specific batch.
    """
    load_dotenv()

    # CUSTOMIZE: Path to your JSON data file
    json_path = "data/your_batch_file.json"

    # CUSTOMIZE: Batch name for tracking
    batch_name = "your_batch_name"

    # Load data
    try:
        with open(json_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{json_path}' not found.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in '{json_path}': {e}")
        sys.exit(1)

    # Get database credentials
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not all([uri, user, pwd]):
        print("❌ Error: Missing Neo4j credentials in .env")
        print("Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    # Initialize ingestor
    print(f"Connecting to: {uri}")
    ingestor = ScalableIngestor(uri, user, pwd, batch_name=batch_name)

    try:
        # Setup schema
        ingestor.setup_schema()

        # CUSTOMIZE: Ingest your data
        # Example:
        # ingestor._ingest_nodes(data.get('media_works', []), 'MediaWork', 'wikidata_id')
        # ingestor._ingest_nodes(data.get('historical_figures', []), 'HistoricalFigure', 'canonical_id')
        # ingestor._ingest_relationships(data.get('relationships', []))

        # Print results
        ingestor.print_report()

    finally:
        ingestor.close()
        print("\n✅ Connection closed.")


if __name__ == "__main__":
    main()
