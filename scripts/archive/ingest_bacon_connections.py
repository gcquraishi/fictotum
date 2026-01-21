"""
ChronosGraph: Ingestion Engine for Bacon Connections
Connects Kevin Bacon (actor), Francis Bacon (painter), and Francis Bacon (philosopher)
through multiple film and documentary pathways.
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

class BaconConnectionsIngestor:
    def __init__(self, uri, user, pwd):
        # ssc ensures that the driver trusts the server's certificate
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.report = {"nodes_created": 0, "rels_created": 0, "errors": []}
        # Timestamp auditing metadata
        self.batch_id = f"bacon_connections_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.source_name = "bacon_connections_v1"

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
        self._ingest_nodes(data.get('media_works', []), 'MediaWork', 'wikidata_id')
        self._ingest_nodes(data.get('historical_figures', []), 'HistoricalFigure', 'canonical_id')
        self._ingest_nodes(data.get('fictional_characters', []), 'FictionalCharacter', 'char_id')
        self._ingest_interactions(data.get('interactions', []))

    def _ingest_nodes(self, nodes, label, id_property):
        """Generic function to merge nodes based on a label and ID property."""
        if not nodes:
            return

        # Add timestamp auditing metadata to each node
        for node in nodes:
            if 'ingestion_batch' not in node:
                node['ingestion_batch'] = self.batch_id
            if 'ingestion_source' not in node:
                node['ingestion_source'] = self.source_name

        # For MediaWork, the canonical ID for merging should be wikidata_id
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
            self.report['nodes_created'] += created
            print(f"✅ {label}: {created} created, {len(nodes) - created} updated.")

    def _ingest_interactions(self, interactions):
        """Ingests interactions (relationships) between entities."""
        if not interactions:
            return

        for interaction in interactions:
            from_id = interaction['from_id']
            from_type = interaction['from_type']
            to_id = interaction['to_id']
            to_type = interaction['to_type']
            rel_type = interaction['rel_type']
            properties = interaction.get('properties', {})

            # Determine the ID property based on node type
            from_id_prop = self._get_id_property(from_type)
            to_id_prop = self._get_id_property(to_type)

            query = f"""
            MATCH (from:{from_type} {{{from_id_prop}: $from_id}})
            MATCH (to:{to_type} {{{to_id_prop}: $to_id}})
            MERGE (from)-[r:{rel_type}]->(to)
            ON CREATE SET r += $properties, r.created_at = datetime()
            ON MATCH SET r += $properties, r.updated_at = datetime()
            """

            with self.driver.session() as session:
                try:
                    result = session.run(query, from_id=from_id, to_id=to_id, properties=properties)
                    summary = result.consume()
                    created = summary.counters.relationships_created
                    self.report['rels_created'] += created
                except Exception as e:
                    error_msg = f"Error creating {rel_type} from {from_id} to {to_id}: {str(e)}"
                    self.report['errors'].append(error_msg)
                    print(f"❌ {error_msg}")

        print(f"✅ Interactions: {self.report['rels_created']} relationships created.")

    def _get_id_property(self, node_type):
        """Returns the ID property name for a given node type."""
        if node_type == 'MediaWork':
            return 'wikidata_id'
        elif node_type == 'HistoricalFigure':
            return 'canonical_id'
        elif node_type == 'FictionalCharacter':
            return 'char_id'
        else:
            raise ValueError(f"Unknown node type: {node_type}")

    def print_report(self):
        print("\n" + "="*50)
        print("INGESTION REPORT")
        print("="*50)
        print(f"Nodes Created: {self.report['nodes_created']}")
        print(f"Relationships Created: {self.report['rels_created']}")
        if self.report['errors']:
            print(f"\nErrors ({len(self.report['errors'])}):")
            for error in self.report['errors']:
                print(f"  - {error}")
        print("="*50)


def main():
    # Load environment variables
    load_dotenv()
    uri = os.getenv('NEO4J_URI')
    user = os.getenv('NEO4J_USERNAME')
    pwd = os.getenv('NEO4J_PASSWORD')

    if not all([uri, user, pwd]):
        print("❌ Missing Neo4j credentials in .env file")
        return

    # Load data file
    data_path = Path(__file__).parent.parent.parent / 'data' / 'bacon_connections.json'

    if not data_path.exists():
        print(f"❌ Data file not found: {data_path}")
        return

    with open(data_path, 'r') as f:
        data = json.load(f)

    # Initialize ingestor
    ingestor = BaconConnectionsIngestor(uri, user, pwd)

    try:
        print("🔧 Setting up schema constraints...")
        ingestor.setup_schema()

        print(f"\n📊 Ingesting data from {data_path.name}...")
        ingestor.ingest_data(data)

        ingestor.print_report()

    except Exception as e:
        print(f"❌ Ingestion failed: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        ingestor.close()
        print("\n✅ Connection closed.")


if __name__ == '__main__':
    main()
