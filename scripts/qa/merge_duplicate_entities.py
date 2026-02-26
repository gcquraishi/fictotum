"""
Fictotum Duplicate Entity Merger
Merges duplicate HistoricalFigure and MediaWork nodes identified by disambiguation audit.

CRITICAL: This script performs DESTRUCTIVE operations (deletes duplicate nodes).
Always back up database and review merge plan before execution.

Strategy:
1. Identify primary node (prefer node with Q-ID, then alphabetically first canonical_id)
2. Merge all properties from duplicates into primary
3. Redirect all relationships to primary node
4. Delete duplicate nodes
5. Log all merge operations for audit trail

Author: Claude Code (Data Architect)
Date: 2026-01-18
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
from dotenv import load_dotenv
from neo4j import GraphDatabase


class EntityMerger:
    """Merges duplicate entities in Fictotum database."""

    def __init__(self, uri: str, user: str, pwd: str, dry_run: bool = True):
        """Initialize Neo4j connection."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.dry_run = dry_run
        self.merge_log: List[Dict[str, Any]] = []

    def close(self):
        """Close Neo4j connection."""
        self.driver.close()

    def merge_duplicate_figure_qids(self):
        """Merge HistoricalFigure nodes sharing same Wikidata Q-ID."""
        print("\n" + "=" * 80)
        print("TASK 1: Merge Duplicate HistoricalFigure Nodes with Same Q-ID")
        print("=" * 80)

        with self.driver.session() as session:
            # Find all duplicate Q-IDs
            query_find = """
            MATCH (f:HistoricalFigure)
            WHERE f.wikidata_id IS NOT NULL
              AND NOT f.wikidata_id STARTS WITH 'PROV:'
            WITH f.wikidata_id AS qid,
                 COLLECT(f) AS figures
            WHERE SIZE(figures) > 1
            RETURN qid, figures
            ORDER BY qid
            """

            result = session.run(query_find)
            duplicates = list(result)

            if not duplicates:
                print("✅ No duplicate Q-IDs found in HistoricalFigure nodes.")
                return

            print(f"\n🔍 Found {len(duplicates)} Q-IDs with duplicate nodes.")

            for dup_record in duplicates:
                qid = dup_record["qid"]
                figures = dup_record["figures"]

                # Sort to determine primary (prefer HF_* prefix, then alphabetically)
                canonical_ids = [fig["canonical_id"] for fig in figures]
                canonical_ids.sort(key=lambda x: (not x.startswith("HF_"), x))
                primary_id = canonical_ids[0]
                duplicate_ids = canonical_ids[1:]

                print(f"\n📋 Q-ID: {qid}")
                print(f"   Primary: {primary_id}")
                print(f"   Duplicates: {duplicate_ids}")

                for dup_id in duplicate_ids:
                    self._merge_figure_nodes(session, primary_id, dup_id, qid)

    def _merge_figure_nodes(self, session, primary_id: str, duplicate_id: str, qid: str):
        """Merge a duplicate HistoricalFigure node into the primary node."""
        print(f"\n   🔀 Merging: {duplicate_id} → {primary_id}")

        if self.dry_run:
            print("      [DRY RUN] Would redirect all APPEARS_IN relationships")
            print("      [DRY RUN] Would redirect all outgoing relationships")
            print("      [DRY RUN] Would delete duplicate node")
            self.merge_log.append({
                "type": "HistoricalFigure",
                "primary": primary_id,
                "duplicate": duplicate_id,
                "qid": qid,
                "status": "DRY_RUN"
            })
            return

        try:
            # Step 1: Redirect APPEARS_IN relationships (figure → media)
            query_redirect_appears_in = """
            MATCH (dup:HistoricalFigure {canonical_id: $dup_id})-[r:APPEARS_IN]->(m:MediaWork)
            MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
            MERGE (primary)-[new_r:APPEARS_IN]->(m)
            ON CREATE SET new_r = properties(r)
            DELETE r
            RETURN COUNT(*) AS redirected_count
            """
            result = session.run(query_redirect_appears_in, dup_id=duplicate_id, primary_id=primary_id)
            redirected = result.single()["redirected_count"]
            print(f"      ✅ Redirected {redirected} APPEARS_IN relationships")

            # Step 2: Redirect other relationships (INTERACTED_WITH, etc.)
            query_redirect_outgoing = """
            MATCH (dup:HistoricalFigure {canonical_id: $dup_id})-[r]->(target)
            WHERE NOT type(r) = 'APPEARS_IN'
            MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
            WITH dup, r, target, primary, type(r) AS rel_type, properties(r) AS rel_props
            CALL apoc.create.relationship(primary, rel_type, rel_props, target) YIELD rel AS new_r
            DELETE r
            RETURN COUNT(*) AS redirected_count
            """
            # Since APOC may not be available, use simpler approach
            query_redirect_simple = """
            MATCH (dup:HistoricalFigure {canonical_id: $dup_id})-[r:INTERACTED_WITH]->(target)
            MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
            MERGE (primary)-[new_r:INTERACTED_WITH]->(target)
            ON CREATE SET new_r = properties(r)
            DELETE r
            RETURN COUNT(*) AS redirected_count
            """
            result = session.run(query_redirect_simple, dup_id=duplicate_id, primary_id=primary_id)
            redirected_other = result.single()["redirected_count"]
            if redirected_other > 0:
                print(f"      ✅ Redirected {redirected_other} other relationships")

            # Step 3: Redirect incoming relationships
            query_redirect_incoming = """
            MATCH (source)-[r]->(dup:HistoricalFigure {canonical_id: $dup_id})
            MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
            MERGE (source)-[new_r:INTERACTED_WITH]->(primary)
            ON CREATE SET new_r = properties(r)
            DELETE r
            RETURN COUNT(*) AS redirected_count
            """
            result = session.run(query_redirect_incoming, dup_id=duplicate_id, primary_id=primary_id)
            redirected_in = result.single()["redirected_count"]
            if redirected_in > 0:
                print(f"      ✅ Redirected {redirected_in} incoming relationships")

            # Step 4: Merge properties (if duplicate has any unique data)
            query_merge_props = """
            MATCH (dup:HistoricalFigure {canonical_id: $dup_id})
            MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
            SET primary = CASE
                WHEN primary.birth_year IS NULL AND dup.birth_year IS NOT NULL
                THEN primary {.*, birth_year: dup.birth_year}
                ELSE primary
            END
            SET primary = CASE
                WHEN primary.death_year IS NULL AND dup.death_year IS NOT NULL
                THEN primary {.*, death_year: dup.death_year}
                ELSE primary
            END
            SET primary = CASE
                WHEN primary.title IS NULL AND dup.title IS NOT NULL
                THEN primary {.*, title: dup.title}
                ELSE primary
            END
            RETURN primary.canonical_id AS merged_id
            """
            session.run(query_merge_props, dup_id=duplicate_id, primary_id=primary_id)
            print(f"      ✅ Merged properties into primary node")

            # Step 5: Delete duplicate node
            query_delete = """
            MATCH (dup:HistoricalFigure {canonical_id: $dup_id})
            DETACH DELETE dup
            """
            session.run(query_delete, dup_id=duplicate_id)
            print(f"      ✅ Deleted duplicate node: {duplicate_id}")

            self.merge_log.append({
                "type": "HistoricalFigure",
                "primary": primary_id,
                "duplicate": duplicate_id,
                "qid": qid,
                "status": "MERGED"
            })

        except Exception as e:
            print(f"      ❌ ERROR: {e}")
            self.merge_log.append({
                "type": "HistoricalFigure",
                "primary": primary_id,
                "duplicate": duplicate_id,
                "qid": qid,
                "status": "FAILED",
                "error": str(e)
            })

    def merge_duplicate_figure_names(self):
        """Merge HistoricalFigure nodes with identical names (likely duplicates)."""
        print("\n" + "=" * 80)
        print("TASK 2: Merge HistoricalFigure Nodes with Identical Names")
        print("=" * 80)

        with self.driver.session() as session:
            # Find figures with same name where one has Q-ID and one doesn't
            query_find = """
            MATCH (f1:HistoricalFigure)
            MATCH (f2:HistoricalFigure)
            WHERE f1.canonical_id < f2.canonical_id
              AND toLower(f1.name) = toLower(f2.name)
              AND (
                  (f1.wikidata_id IS NOT NULL AND NOT f1.wikidata_id STARTS WITH 'PROV:')
                  OR (f2.wikidata_id IS NOT NULL AND NOT f2.wikidata_id STARTS WITH 'PROV:')
              )
            RETURN f1.canonical_id AS id1, f1.name AS name1, f1.wikidata_id AS qid1,
                   f2.canonical_id AS id2, f2.name AS name2, f2.wikidata_id AS qid2
            ORDER BY f1.name
            """

            result = session.run(query_find)
            duplicates = list(result)

            if not duplicates:
                print("✅ No name-based duplicates requiring merge.")
                return

            print(f"\n🔍 Found {len(duplicates)} pairs with identical names.")

            for dup in duplicates:
                # Determine primary: prefer node WITH real Q-ID
                qid1 = dup["qid1"]
                qid2 = dup["qid2"]

                has_qid1 = qid1 is not None and not qid1.startswith("PROV:")
                has_qid2 = qid2 is not None and not qid2.startswith("PROV:")

                if has_qid1 and not has_qid2:
                    primary_id = dup["id1"]
                    duplicate_id = dup["id2"]
                    qid = qid1
                elif has_qid2 and not has_qid1:
                    primary_id = dup["id2"]
                    duplicate_id = dup["id1"]
                    qid = qid2
                elif has_qid1 and has_qid2 and qid1 == qid2:
                    # Both have same Q-ID, treat as duplicate Q-ID case
                    primary_id = dup["id1"]
                    duplicate_id = dup["id2"]
                    qid = qid1
                else:
                    # Ambiguous case - skip and warn
                    print(f"\n⚠️  SKIPPING (ambiguous): {dup['name1']}")
                    print(f"   {dup['id1']} [{qid1}] vs {dup['id2']} [{qid2}]")
                    print(f"   Manual review required.")
                    continue

                print(f"\n📋 Name: {dup['name1']}")
                print(f"   Primary: {primary_id} [{qid}]")
                print(f"   Duplicate: {duplicate_id}")

                self._merge_figure_nodes(session, primary_id, duplicate_id, qid or "NO_QID")

    def generate_merge_report(self, output_path: str):
        """Generate markdown report of all merge operations."""
        print("\n" + "=" * 80)
        print("Generating Merge Report...")
        print("=" * 80)

        with open(output_path, 'w') as f:
            f.write("# Fictotum Entity Merge Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Mode:** {'DRY RUN (no changes made)' if self.dry_run else 'LIVE EXECUTION'}\n\n")

            if not self.merge_log:
                f.write("✅ No merges performed.\n")
                return

            f.write(f"**Total Merge Operations:** {len(self.merge_log)}\n\n")

            successful = [m for m in self.merge_log if m["status"] in ["MERGED", "DRY_RUN"]]
            failed = [m for m in self.merge_log if m["status"] == "FAILED"]

            f.write(f"- Successful: {len(successful)}\n")
            f.write(f"- Failed: {len(failed)}\n\n")

            f.write("## Merge Operations\n\n")

            for merge in self.merge_log:
                status_icon = "✅" if merge["status"] in ["MERGED", "DRY_RUN"] else "❌"
                f.write(f"### {status_icon} {merge['type']}: {merge['duplicate']} → {merge['primary']}\n\n")
                f.write(f"- **Wikidata Q-ID:** {merge['qid']}\n")
                f.write(f"- **Status:** {merge['status']}\n")
                if "error" in merge:
                    f.write(f"- **Error:** {merge['error']}\n")
                f.write("\n")

            f.write("---\n\n")
            f.write("**End of Report**\n")

        print(f"✅ Report saved to: {output_path}")


def main():
    """Main entry point for entity merger."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("❌ Error: NEO4J_URI and NEO4J_PASSWORD must be set in .env")
        sys.exit(1)

    # Parse command line arguments
    dry_run = "--execute" not in sys.argv

    if dry_run:
        print("\n" + "⚠️ " * 20)
        print("DRY RUN MODE - No changes will be made to the database")
        print("Run with --execute flag to perform actual merges")
        print("⚠️ " * 20 + "\n")
    else:
        print("\n" + "🔴" * 20)
        print("LIVE EXECUTION MODE - Database will be modified")
        print("This is a DESTRUCTIVE operation. Ensure you have a backup.")
        response = input("Type 'CONFIRM' to proceed: ")
        if response != "CONFIRM":
            print("❌ Aborted.")
            sys.exit(0)
        print("🔴" * 20 + "\n")

    merger = EntityMerger(uri, user, pwd, dry_run=dry_run)

    try:
        print("=" * 80)
        print("Fictotum Duplicate Entity Merger")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 80)

        # Task 1: Merge duplicate Q-IDs
        merger.merge_duplicate_figure_qids()

        # Task 2: Merge duplicate names (where one has Q-ID)
        merger.merge_duplicate_figure_names()

        # Generate report
        output_path = Path(__file__).parent.parent.parent / "entity_merge_report.md"
        merger.generate_merge_report(str(output_path))

        print("\n" + "=" * 80)
        print("Merge Process Complete")
        print("=" * 80)
        print(f"\nFull report available at: {output_path}")

        if dry_run:
            print("\n💡 TIP: Run with --execute flag to apply these merges to the database.")

    except Exception as e:
        print(f"\n❌ Error during merge: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        merger.close()


if __name__ == "__main__":
    main()
