#!/usr/bin/env python3
"""
ChronosGraph: Apply Scalability Indexes
Executes index creation statements identified in SCALABILITY_AUDIT.md
Database: Neo4j Aura (instance c78564a4)
Date: 2026-01-18
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase


class IndexManager:
    def __init__(self, uri, username, password):
        """Initialize Neo4j driver with SSL fallback."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        self.indexes_created = []
        self.indexes_failed = []

    def close(self):
        """Close the database connection."""
        self.driver.close()

    def create_indexes(self):
        """Create all scalability indexes."""

        indexes = [
            # HistoricalFigure indexes
            {
                "name": "figure_wikidata_idx",
                "query": "CREATE INDEX figure_wikidata_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.wikidata_id)",
                "purpose": "Entity resolution and deduplication"
            },
            {
                "name": "figure_era_idx",
                "query": "CREATE INDEX figure_era_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.era)",
                "purpose": "Era-based filtering"
            },
            {
                "name": "figure_birth_year_idx",
                "query": "CREATE INDEX figure_birth_year_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.birth_year)",
                "purpose": "Temporal analysis"
            },
            {
                "name": "figure_death_year_idx",
                "query": "CREATE INDEX figure_death_year_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.death_year)",
                "purpose": "Lifespan calculations"
            },

            # MediaWork indexes
            {
                "name": "media_year_idx",
                "query": "CREATE INDEX media_year_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.release_year)",
                "purpose": "Chronological sorting"
            },
            {
                "name": "media_creator_idx",
                "query": "CREATE INDEX media_creator_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.creator)",
                "purpose": "Creator-based filtering"
            },

            # Composite indexes
            {
                "name": "media_type_year_idx",
                "query": "CREATE INDEX media_type_year_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.media_type, m.release_year)",
                "purpose": "Filtered timeline queries"
            },

            # Full-text search indexes
            {
                "name": "figure_fulltext",
                "query": "CREATE FULLTEXT INDEX figure_fulltext IF NOT EXISTS FOR (f:HistoricalFigure) ON EACH [f.name, f.title]",
                "purpose": "Fuzzy name search"
            },
            {
                "name": "media_fulltext",
                "query": "CREATE FULLTEXT INDEX media_fulltext IF NOT EXISTS FOR (m:MediaWork) ON EACH [m.title, m.creator]",
                "purpose": "Fuzzy media search"
            },
        ]

        print("=" * 70)
        print("ChronosGraph: Creating Scalability Indexes")
        print("=" * 70)
        print(f"Total indexes to create: {len(indexes)}\n")

        with self.driver.session() as session:
            for idx_config in indexes:
                try:
                    print(f"Creating: {idx_config['name']}")
                    print(f"  Purpose: {idx_config['purpose']}")

                    result = session.run(idx_config['query'])
                    result.consume()

                    self.indexes_created.append(idx_config['name'])
                    print(f"  ✅ Success\n")

                except Exception as e:
                    error_msg = str(e)
                    self.indexes_failed.append({
                        "name": idx_config['name'],
                        "error": error_msg
                    })
                    print(f"  ❌ Failed: {error_msg}\n")

    def verify_indexes(self):
        """Verify that indexes were created successfully."""
        print("\n" + "=" * 70)
        print("Verifying Index Creation")
        print("=" * 70)

        with self.driver.session() as session:
            result = session.run("SHOW INDEXES")
            all_indexes = list(result)

            print(f"\nTotal indexes in database: {len(all_indexes)}\n")

            # Check for our newly created indexes
            created_index_names = set(self.indexes_created)
            found_indexes = []

            for record in all_indexes:
                index_name = record.get("name", "")
                if index_name in created_index_names:
                    found_indexes.append({
                        "name": index_name,
                        "type": record.get("type", ""),
                        "labels": record.get("labelsOrTypes", []),
                        "properties": record.get("properties", [])
                    })

            if found_indexes:
                print("✅ Successfully Created Indexes:")
                for idx in found_indexes:
                    print(f"  - {idx['name']}: {idx['type']} on {idx['labels']} ({idx['properties']})")

            if self.indexes_failed:
                print(f"\n❌ Failed to Create ({len(self.indexes_failed)}):")
                for failed in self.indexes_failed:
                    print(f"  - {failed['name']}: {failed['error']}")

    def run_validation_queries(self):
        """Run sample queries to verify index usage."""
        print("\n" + "=" * 70)
        print("Running Validation Queries")
        print("=" * 70)

        validation_queries = [
            {
                "name": "Wikidata ID lookup",
                "query": "EXPLAIN MATCH (f:HistoricalFigure {wikidata_id: 'Q1048'}) RETURN f",
                "expected_index": "figure_wikidata_idx"
            },
            {
                "name": "Era filtering",
                "query": "EXPLAIN MATCH (f:HistoricalFigure) WHERE f.era = 'Roman Republic' RETURN f",
                "expected_index": "figure_era_idx"
            },
            {
                "name": "Release year filtering",
                "query": "EXPLAIN MATCH (m:MediaWork) WHERE m.release_year > 2000 RETURN m",
                "expected_index": "media_year_idx"
            },
            {
                "name": "Composite index usage",
                "query": "EXPLAIN MATCH (m:MediaWork) WHERE m.media_type = 'Film' AND m.release_year > 2000 RETURN m",
                "expected_index": "media_type_year_idx"
            }
        ]

        with self.driver.session() as session:
            for validation in validation_queries:
                try:
                    print(f"\n{validation['name']}:")
                    result = session.run(validation['query'])
                    plan = result.consume().plan

                    # Check if expected index is in the plan
                    plan_str = str(plan)
                    if validation['expected_index'] in plan_str:
                        print(f"  ✅ Using index: {validation['expected_index']}")
                    else:
                        print(f"  ⚠️  Index not used in plan (may not be needed for query)")

                except Exception as e:
                    print(f"  ❌ Validation query failed: {e}")

    def print_summary(self):
        """Print final summary report."""
        print("\n" + "=" * 70)
        print("INDEX CREATION SUMMARY")
        print("=" * 70)
        print(f"✅ Successfully created: {len(self.indexes_created)} indexes")
        if self.indexes_failed:
            print(f"❌ Failed: {len(self.indexes_failed)} indexes")
        print("\nNext Steps:")
        print("  1. Review SCALABILITY_AUDIT.md for query refactoring recommendations")
        print("  2. Update ingestion scripts to add timestamp metadata")
        print("  3. Standardize MediaWork ID strategy (use wikidata_id only)")
        print("  4. Monitor query performance using PROFILE queries")
        print("=" * 70)


def main():
    """Main execution function."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME", "neo4j")
    password = os.getenv("NEO4J_PASSWORD")

    if not all([uri, username, password]):
        print("❌ Error: Missing Neo4j credentials in .env file")
        print("Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    print(f"Connecting to: {uri}")
    print(f"Username: {username}\n")

    manager = IndexManager(uri, username, password)

    try:
        # Step 1: Create indexes
        manager.create_indexes()

        # Step 2: Verify creation
        manager.verify_indexes()

        # Step 3: Run validation queries
        manager.run_validation_queries()

        # Step 4: Print summary
        manager.print_summary()

    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        manager.close()
        print("\n✅ Connection closed.")


if __name__ == "__main__":
    main()
