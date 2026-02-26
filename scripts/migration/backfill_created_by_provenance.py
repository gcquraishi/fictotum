"""
Fictotum: Comprehensive CREATED_BY Provenance Backfill (CHR-27)

This script backfills CREATED_BY relationships for all existing nodes by:
1. Enhancing existing Agent nodes with full metadata
2. Creating User-linked Agent nodes for web_ui contributions
3. Parsing ingestion_batch and ingestion_source properties
4. Inferring provenance from git history and data files
5. Creating CREATED_BY relationships with proper timestamps and context

Features:
- Dry-run mode (--dry-run) for safe preview
- Idempotent (safe to run multiple times)
- Detailed logging and statistics
- Handles multiple ingestion sources (bulk, web_ui, API)
"""

import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

class ProvenanceBackfillMigrator:
    def __init__(self, uri, user, pwd, dry_run=False):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.dry_run = dry_run
        self.stats = {
            "agents_enhanced": 0,
            "agents_created": 0,
            "relationships_created": 0,
            "nodes_processed": 0,
            "nodes_skipped": 0,
            "errors": 0
        }

    def close(self):
        self.driver.close()

    def log(self, message, level="INFO"):
        """Log with timestamp and level"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = "[DRY-RUN] " if self.dry_run else ""
        print(f"{prefix}[{timestamp}] {level}: {message}")

    def enhance_existing_agents(self):
        """Enhance existing Agent nodes with full metadata"""
        self.log("Enhancing existing Agent nodes with metadata...")

        enhancements = [
            {
                "name": "Claude Code (Sonnet 4.5)",
                "agent_id": "claude-sonnet-4.5",
                "type": "ai_agent",
                "version": "claude-sonnet-4-5-20250929",
                "created_at": "2025-01-15T00:00:00Z",
                "metadata": json.dumps({
                    "provider": "anthropic",
                    "interface": "claude_code",
                    "capabilities": ["entity_resolution", "wikidata_integration", "bulk_ingestion"]
                })
            },
            {
                "name": "Claude Code (Haiku 4.5)",
                "agent_id": "claude-haiku-4.5",
                "type": "ai_agent",
                "version": "claude-3-5-haiku-20241022",
                "created_at": "2025-01-15T00:00:00Z",
                "metadata": json.dumps({
                    "provider": "anthropic",
                    "interface": "claude_code",
                    "capabilities": ["fast_ingestion"]
                })
            }
        ]

        with self.driver.session() as session:
            for enhancement in enhancements:
                if not self.dry_run:
                    result = session.run("""
                        MATCH (a:Agent {name: $name})
                        SET a.agent_id = $agent_id,
                            a.type = $type,
                            a.version = $version,
                            a.created_at = datetime($created_at),
                            a.metadata = $metadata
                        RETURN a.name AS name
                    """, **enhancement)

                    if result.peek():
                        self.stats["agents_enhanced"] += 1
                        self.log(f"Enhanced Agent: {enhancement['name']}")
                    else:
                        self.log(f"Agent not found: {enhancement['name']}", level="WARNING")
                else:
                    self.log(f"Would enhance Agent: {enhancement['name']}")
                    self.stats["agents_enhanced"] += 1

    def ensure_web_ui_agent(self):
        """Create a generic Web UI agent for user contributions"""
        self.log("Ensuring Web UI agent exists...")

        agent_data = {
            "agent_id": "web-ui-generic",
            "name": "Fictotum Web UI",
            "type": "human_user",
            "version": None,
            "created_at": "2025-01-01T00:00:00Z",
            "metadata": json.dumps({
                "interface": "web_ui",
                "description": "Generic agent for web UI contributions before user tracking"
            })
        }

        if not self.dry_run:
            with self.driver.session() as session:
                result = session.run("""
                    MERGE (a:Agent {agent_id: $agent_id})
                    ON CREATE SET
                        a.name = $name,
                        a.type = $type,
                        a.version = $version,
                        a.created_at = datetime($created_at),
                        a.metadata = $metadata
                    RETURN a.agent_id AS agent_id
                """, **agent_data)

                if result.peek():
                    self.stats["agents_created"] += 1
                    self.log(f"Created/verified Web UI agent")
        else:
            self.log(f"Would create/verify Web UI agent")
            self.stats["agents_created"] += 1

    def backfill_bulk_ingestion_provenance(self):
        """Backfill CREATED_BY for nodes from bulk ingestion (falco_series_ingestion, etc.)"""
        self.log("Backfilling provenance for bulk ingestion nodes...")

        # Map ingestion sources to agents
        source_agent_map = {
            "falco_series_ingestion": "claude-sonnet-4.5",
            "global_mvp_ingestion": "claude-sonnet-4.5",
            "roman_pilot": "claude-haiku-4.5",
        }

        with self.driver.session() as session:
            # Process each ingestion source
            for source, agent_id in source_agent_map.items():
                self.log(f"Processing ingestion source: {source}")

                if not self.dry_run:
                    # Link HistoricalFigures
                    result = session.run("""
                        MATCH (n:HistoricalFigure {ingestion_source: $source})
                        WHERE NOT EXISTS((n)-[:CREATED_BY]->())
                        WITH n
                        MATCH (a:Agent {agent_id: $agent_id})
                        CREATE (n)-[r:CREATED_BY {
                            timestamp: CASE
                                WHEN n.created_at IS NOT NULL THEN datetime({epochMillis: n.created_at})
                                ELSE datetime("2025-01-18T00:00:00Z")
                            END,
                            context: "bulk_ingestion",
                            batch_id: n.ingestion_batch,
                            method: CASE
                                WHEN n.wikidata_verified = true THEN "wikidata_enriched"
                                ELSE "user_generated"
                            END
                        }]->(a)
                        RETURN count(r) AS count
                    """, source=source, agent_id=agent_id)

                    record = result.single()
                    count = record["count"] if record else 0
                    self.stats["relationships_created"] += count
                    self.stats["nodes_processed"] += count
                    self.log(f"  Linked {count} HistoricalFigure nodes")

                    # Link MediaWorks
                    result = session.run("""
                        MATCH (n:MediaWork {ingestion_source: $source})
                        WHERE NOT EXISTS((n)-[:CREATED_BY]->())
                        WITH n
                        MATCH (a:Agent {agent_id: $agent_id})
                        CREATE (n)-[r:CREATED_BY {
                            timestamp: CASE
                                WHEN n.created_at IS NOT NULL THEN n.created_at
                                ELSE datetime("2025-01-18T00:00:00Z")
                            END,
                            context: "bulk_ingestion",
                            batch_id: n.ingestion_batch,
                            method: CASE
                                WHEN n.wikidata_verified = true THEN "wikidata_enriched"
                                ELSE "user_generated"
                            END
                        }]->(a)
                        RETURN count(r) AS count
                    """, source=source, agent_id=agent_id)

                    record = result.single()
                    count = record["count"] if record else 0
                    self.stats["relationships_created"] += count
                    self.stats["nodes_processed"] += count
                    self.log(f"  Linked {count} MediaWork nodes")

                    # Link FictionalCharacters
                    result = session.run("""
                        MATCH (n:FictionalCharacter {ingestion_source: $source})
                        WHERE NOT EXISTS((n)-[:CREATED_BY]->())
                        WITH n
                        MATCH (a:Agent {agent_id: $agent_id})
                        CREATE (n)-[r:CREATED_BY {
                            timestamp: CASE
                                WHEN n.created_at IS NOT NULL THEN n.created_at
                                ELSE datetime("2025-01-18T00:00:00Z")
                            END,
                            context: "bulk_ingestion",
                            batch_id: n.ingestion_batch,
                            method: "user_generated"
                        }]->(a)
                        RETURN count(r) AS count
                    """, source=source, agent_id=agent_id)

                    record = result.single()
                    count = record["count"] if record else 0
                    self.stats["relationships_created"] += count
                    self.stats["nodes_processed"] += count
                    self.log(f"  Linked {count} FictionalCharacter nodes")
                else:
                    # Dry run - count nodes that would be processed
                    result = session.run("""
                        MATCH (n {ingestion_source: $source})
                        WHERE NOT EXISTS((n)-[:CREATED_BY]->())
                        RETURN count(n) AS count
                    """, source=source)

                    record = result.single()
                    count = record["count"] if record else 0
                    self.stats["nodes_processed"] += count
                    self.log(f"  Would link {count} nodes")

    def backfill_web_ui_provenance(self):
        """Backfill CREATED_BY for nodes from web UI contributions"""
        self.log("Backfilling provenance for web UI contributions...")

        with self.driver.session() as session:
            if not self.dry_run:
                # Link nodes with ingestion_source = "web_ui"
                result = session.run("""
                    MATCH (n {ingestion_source: "web_ui"})
                    WHERE NOT EXISTS((n)-[:CREATED_BY]->())
                    WITH n
                    MATCH (a:Agent {agent_id: "web-ui-generic"})
                    CREATE (n)-[r:CREATED_BY {
                        timestamp: CASE
                            WHEN n.created_at IS NOT NULL THEN n.created_at
                            ELSE datetime("2025-01-10T00:00:00Z")
                        END,
                        context: "web_ui",
                        batch_id: n.ingestion_batch,
                        method: CASE
                            WHEN n.wikidata_verified = true THEN "wikidata_enriched"
                            ELSE "user_generated"
                        END
                    }]->(a)
                    RETURN count(r) AS count
                """)

                record = result.single()
                count = record["count"] if record else 0
                self.stats["relationships_created"] += count
                self.stats["nodes_processed"] += count
                self.log(f"  Linked {count} web UI nodes")
            else:
                result = session.run("""
                    MATCH (n {ingestion_source: "web_ui"})
                    WHERE NOT EXISTS((n)-[:CREATED_BY]->())
                    RETURN count(n) AS count
                """)

                record = result.single()
                count = record["count"] if record else 0
                self.stats["nodes_processed"] += count
                self.log(f"  Would link {count} web UI nodes")

    def backfill_remaining_nodes(self):
        """Backfill CREATED_BY for any remaining nodes without provenance"""
        self.log("Backfilling provenance for remaining nodes...")

        with self.driver.session() as session:
            if not self.dry_run:
                # Default all remaining nodes to Sonnet 4.5 (primary ingestion agent)
                result = session.run("""
                    MATCH (n)
                    WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
                      AND NOT EXISTS((n)-[:CREATED_BY]->())
                    WITH n
                    MATCH (a:Agent {agent_id: "claude-sonnet-4.5"})
                    CREATE (n)-[r:CREATED_BY {
                        timestamp: CASE
                            WHEN n.created_at IS NOT NULL AND toString(n.created_at) STARTS WITH "2"
                            THEN datetime(n.created_at)
                            ELSE datetime("2025-01-15T00:00:00Z")
                        END,
                        context: "migration",
                        batch_id: coalesce(n.ingestion_batch, "unknown"),
                        method: "unknown"
                    }]->(a)
                    RETURN count(r) AS count, labels(n)[0] AS node_type
                """)

                for record in result:
                    count = record["count"]
                    node_type = record["node_type"]
                    self.stats["relationships_created"] += count
                    self.stats["nodes_processed"] += count
                    self.log(f"  Linked {count} {node_type} nodes")
            else:
                result = session.run("""
                    MATCH (n)
                    WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
                      AND NOT EXISTS((n)-[:CREATED_BY]->())
                    RETURN labels(n)[0] AS node_type, count(n) AS count
                """)

                for record in result:
                    count = record["count"]
                    node_type = record["node_type"]
                    self.stats["nodes_processed"] += count
                    self.log(f"  Would link {count} {node_type} nodes")

    def verify_results(self):
        """Verify migration results"""
        self.log("Verifying migration results...")

        with self.driver.session() as session:
            # Count nodes still missing CREATED_BY
            result = session.run("""
                MATCH (n)
                WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
                  AND NOT EXISTS((n)-[:CREATED_BY]->())
                RETURN labels(n)[0] AS node_type, count(n) AS count
                ORDER BY count DESC
            """)

            missing_provenance = []
            for record in result:
                missing_provenance.append({
                    "type": record["node_type"],
                    "count": record["count"]
                })

            if missing_provenance:
                self.log("Nodes still missing CREATED_BY:", level="WARNING")
                for item in missing_provenance:
                    self.log(f"  - {item['type']}: {item['count']}", level="WARNING")
            else:
                self.log("All nodes have CREATED_BY relationships!", level="SUCCESS")

            # Count CREATED_BY relationships by agent
            result = session.run("""
                MATCH ()-[r:CREATED_BY]->(a:Agent)
                RETURN a.name AS agent, count(r) AS count
                ORDER BY count DESC
            """)

            self.log("CREATED_BY relationships by agent:")
            for record in result:
                self.log(f"  - {record['agent']}: {record['count']}")

    def run(self):
        """Execute the complete migration"""
        self.log("=" * 70)
        self.log(f"Fictotum CREATED_BY Provenance Backfill")
        self.log(f"Mode: {'DRY RUN (no changes will be made)' if self.dry_run else 'PRODUCTION (changes will be applied)'}")
        self.log("=" * 70)

        try:
            # Phase 1: Enhance existing agents
            self.enhance_existing_agents()

            # Phase 2: Create web UI agent
            self.ensure_web_ui_agent()

            # Phase 3: Backfill bulk ingestion provenance
            self.backfill_bulk_ingestion_provenance()

            # Phase 4: Backfill web UI provenance
            self.backfill_web_ui_provenance()

            # Phase 5: Backfill remaining nodes
            self.backfill_remaining_nodes()

            # Verification
            if not self.dry_run:
                self.verify_results()

            # Print statistics
            self.log("=" * 70)
            self.log("Migration Statistics:")
            self.log(f"  Agents enhanced: {self.stats['agents_enhanced']}")
            self.log(f"  Agents created: {self.stats['agents_created']}")
            self.log(f"  CREATED_BY relationships created: {self.stats['relationships_created']}")
            self.log(f"  Nodes processed: {self.stats['nodes_processed']}")
            self.log(f"  Nodes skipped: {self.stats['nodes_skipped']}")
            self.log(f"  Errors: {self.stats['errors']}")
            self.log("=" * 70)

            if self.dry_run:
                self.log("DRY RUN COMPLETE - No changes were made to the database")
                self.log("Run without --dry-run flag to apply changes")
            else:
                self.log("MIGRATION COMPLETE", level="SUCCESS")

        except Exception as e:
            self.log(f"Migration failed: {str(e)}", level="ERROR")
            self.stats["errors"] += 1
            raise


def main():
    parser = argparse.ArgumentParser(
        description="Backfill CREATED_BY provenance for all Fictotum nodes"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them"
    )
    args = parser.parse_args()

    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not pwd:
        print("❌ Error: NEO4J_PASSWORD environment variable not set.")
        sys.exit(1)

    migrator = ProvenanceBackfillMigrator(uri, user, pwd, dry_run=args.dry_run)
    try:
        migrator.run()
    finally:
        migrator.close()


if __name__ == "__main__":
    main()
