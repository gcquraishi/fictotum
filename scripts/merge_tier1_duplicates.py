#!/usr/bin/env python3
"""
Tier 1 Duplicate Merges: PROV → Q-ID (High Confidence)
Executes merges directly via Neo4j Cypher queries
Date: 2026-02-02
"""

import os
import sys
from neo4j import GraphDatabase
from datetime import datetime

# Load credentials from environment
NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USERNAME = os.getenv('NEO4J_USERNAME')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
    print("Error: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set")
    sys.exit(1)

# Tier 1 merges: (name, source_id, target_id)
TIER1_MERGES = [
    ("Agrippina the Elder", "PROV:agrippina_elder", "Q229413"),
    ("Agrippina the Younger", "PROV:agrippina_younger", "Q154732"),
    ("Camille Desmoulins", "PROV:camille-desmoulins-1769140678336", "Q191590"),
    ("Gaius Cassius Longinus", "PROV:gaius_cassius", "Q207370"),
    ("Livia Drusilla", "PROV:livia_drusilla", "Q469701"),
    ("Lucilla", "PROV:lucilla_noble", "lucilla"),
    ("Tiberius", "PROV:tiberius", "Q1407"),
    ("Titus", "PROV:titus_caesar", "titus_emperor"),
    ("Zenobia", "PROV:zenobia_palmyra", "zenobia"),
    ("Lucius Cornelius Sulla", "PROV:sulla", "Q82954"),
    ("Herod the Great", "PROV:herod_great", "Q43915"),
]

def merge_figures(driver, name, source_id, target_id):
    """Merge two HistoricalFigure nodes"""

    merge_query = """
    MATCH (primary:HistoricalFigure {canonical_id: $target_id})
    MATCH (secondary:HistoricalFigure {canonical_id: $source_id})

    // Ensure Merge Agent exists
    MERGE (agent:Agent {agent_id: "merge-operation"})
    ON CREATE SET
      agent.name = "ChronosGraph Merge Operation",
      agent.type = "system",
      agent.created_at = datetime(),
      agent.metadata = '{"operation":"duplicate_merge","description":"Tier 1 cleanup"}'

    // Transfer APPEARS_IN relationships
    WITH primary, secondary, agent
    MATCH (secondary)-[r:APPEARS_IN]->(m:MediaWork)
    WHERE NOT EXISTS((primary)-[:APPEARS_IN]->(m))
    CREATE (primary)-[new_r:APPEARS_IN]->(m)
    SET new_r = properties(r)
    DELETE r

    // Transfer CREATED_BY relationships
    WITH primary, secondary, agent, count(*) as transferred
    OPTIONAL MATCH (secondary)-[cb:CREATED_BY]->(old_agent)

    // Merge properties (keep non-null, prefer primary)
    SET primary.wikidata_id = COALESCE(primary.wikidata_id, secondary.wikidata_id),
        primary.birth_year = COALESCE(primary.birth_year, secondary.birth_year),
        primary.death_year = COALESCE(primary.death_year, secondary.death_year),
        primary.description = COALESCE(primary.description, secondary.description),
        primary.era = COALESCE(primary.era, secondary.era),
        primary.last_merged_at = datetime($timestamp),
        primary.last_merged_from = $source_id

    // Create MERGED_FROM audit trail
    CREATE (primary)-[:MERGED_FROM {
      timestamp: datetime($timestamp),
      merged_id: $source_id,
      merged_name: secondary.name,
      batch_id: $batch_id,
      performed_by: "claude-sonnet-4.5"
    }]->(secondary)

    // Soft-delete secondary node
    SET secondary:Deleted,
        secondary.deleted_at = datetime($timestamp),
        secondary.deleted_reason = "Merged into " + $target_id,
        secondary.deleted_by = "claude-sonnet-4.5"

    RETURN transferred
    """

    timestamp = datetime.utcnow().isoformat()
    batch_id = f"tier1_cleanup_{int(datetime.utcnow().timestamp())}"

    with driver.session() as session:
        try:
            result = session.run(merge_query, {
                'source_id': source_id,
                'target_id': target_id,
                'timestamp': timestamp,
                'batch_id': batch_id
            })

            record = result.single()
            if record:
                transferred = record['transferred']
                print(f"✅ {name}: {source_id} → {target_id} ({transferred} relationships)")
                return True
            else:
                print(f"❌ {name}: Merge failed (no result)")
                return False

        except Exception as e:
            print(f"❌ {name}: Error - {str(e)}")
            return False

def main():
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
    )

    print("=== Tier 1 Duplicate Merge Execution ===\n")

    successful = 0
    failed = 0

    for name, source_id, target_id in TIER1_MERGES:
        if merge_figures(driver, name, source_id, target_id):
            successful += 1
        else:
            failed += 1

    driver.close()

    print(f"\n=== Summary ===")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print(f"Total: {successful + failed}")

if __name__ == '__main__':
    main()
