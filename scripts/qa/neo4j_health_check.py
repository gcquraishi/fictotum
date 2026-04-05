#!/usr/bin/env python3
"""
Neo4j Health Check Script (Sprint 3 - CHR-42 Enhancement)

Verifies database health and generates health reports:
- Connection verification
- Node and relationship counts
- Orphaned node detection
- CREATED_BY provenance coverage
- Index health
- Performance metrics

Run with: python3 scripts/qa/neo4j_health_check.py
          python3 scripts/qa/neo4j_health_check.py --report report.md
"""

import os
import sys
import argparse
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv()

class Neo4jHealthChecker:
    """Neo4j database health monitoring"""

    def __init__(self, uri, user, pwd):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.health_status = {
            "timestamp": datetime.now().isoformat(),
            "connection": False,
            "node_counts": {},
            "relationship_counts": {},
            "orphaned_nodes": {},
            "provenance_coverage": {},
            "index_health": [],
            "warnings": [],
            "errors": []
        }

    def close(self):
        self.driver.close()

    def log(self, message, level="INFO"):
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        prefix = {
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌"
        }.get(level, "")
        print(f"[{timestamp}] {prefix} {message}")

    def check_connection(self):
        """Verify Neo4j connection"""
        self.log("Checking database connection...")
        try:
            with self.driver.session() as session:
                result = session.run("RETURN 1 AS num")
                record = result.single()
                if record and record["num"] == 1:
                    self.health_status["connection"] = True
                    self.log("Database connection successful", "SUCCESS")
                    return True
        except Exception as e:
            self.health_status["connection"] = False
            self.health_status["errors"].append(f"Connection failed: {str(e)}")
            self.log(f"Database connection failed: {str(e)}", "ERROR")
            return False

    def get_node_counts(self):
        """Count nodes by label"""
        self.log("Counting nodes by label...")
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n)
                    WITH labels(n)[0] AS label, count(n) AS count
                    WHERE label IS NOT NULL
                    RETURN label, count
                    ORDER BY count DESC
                """)

                for record in result:
                    label = record["label"]
                    count = record["count"]
                    self.health_status["node_counts"][label] = count
                    self.log(f"  {label}: {count:,} nodes")

                total = sum(self.health_status["node_counts"].values())
                self.log(f"Total nodes: {total:,}", "SUCCESS")
        except Exception as e:
            self.health_status["errors"].append(f"Node count failed: {str(e)}")
            self.log(f"Failed to count nodes: {str(e)}", "ERROR")

    def get_relationship_counts(self):
        """Count relationships by type"""
        self.log("Counting relationships by type...")
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH ()-[r]->()
                    WITH type(r) AS rel_type, count(r) AS count
                    RETURN rel_type, count
                    ORDER BY count DESC
                """)

                for record in result:
                    rel_type = record["rel_type"]
                    count = record["count"]
                    self.health_status["relationship_counts"][rel_type] = count
                    self.log(f"  {rel_type}: {count:,} relationships")

                total = sum(self.health_status["relationship_counts"].values())
                self.log(f"Total relationships: {total:,}", "SUCCESS")
        except Exception as e:
            self.health_status["errors"].append(f"Relationship count failed: {str(e)}")
            self.log(f"Failed to count relationships: {str(e)}", "ERROR")

    def check_orphaned_nodes(self):
        """Detect orphaned nodes (no relationships)"""
        self.log("Checking for orphaned nodes...")
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (n)
                    WHERE NOT (n)--()
                    WITH labels(n)[0] AS label, count(n) AS count
                    WHERE label IS NOT NULL
                    RETURN label, count
                    ORDER BY count DESC
                """)

                orphaned_found = False
                for record in result:
                    label = record["label"]
                    count = record["count"]
                    self.health_status["orphaned_nodes"][label] = count
                    self.log(f"  {label}: {count} orphaned nodes", "WARNING")
                    self.health_status["warnings"].append(
                        f"{count} orphaned {label} nodes detected"
                    )
                    orphaned_found = True

                if not orphaned_found:
                    self.log("No orphaned nodes found", "SUCCESS")
        except Exception as e:
            self.health_status["errors"].append(f"Orphan check failed: {str(e)}")
            self.log(f"Failed to check orphaned nodes: {str(e)}", "ERROR")

    def check_provenance_coverage(self):
        """Check CREATED_BY relationship coverage"""
        self.log("Checking provenance coverage...")
        try:
            with self.driver.session() as session:
                # Nodes with CREATED_BY
                result = session.run("""
                    MATCH (n)-[:CREATED_BY]->(a:Agent)
                    WHERE n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter
                    WITH labels(n)[0] AS label, count(n) AS with_provenance
                    RETURN label, with_provenance
                    ORDER BY with_provenance DESC
                """)

                provenance_counts = {}
                for record in result:
                    label = record["label"]
                    count = record["with_provenance"]
                    provenance_counts[label] = {"with": count, "without": 0}

                # Nodes without CREATED_BY
                result = session.run("""
                    MATCH (n)
                    WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
                      AND NOT EXISTS((n)-[:CREATED_BY]->())
                    WITH labels(n)[0] AS label, count(n) AS without_provenance
                    RETURN label, without_provenance
                    ORDER BY without_provenance DESC
                """)

                missing_found = False
                for record in result:
                    label = record["label"]
                    count = record["without_provenance"]
                    if label not in provenance_counts:
                        provenance_counts[label] = {"with": 0, "without": count}
                    else:
                        provenance_counts[label]["without"] = count

                    if count > 0:
                        self.log(f"  {label}: {count} nodes missing CREATED_BY", "WARNING")
                        self.health_status["warnings"].append(
                            f"{count} {label} nodes missing CREATED_BY"
                        )
                        missing_found = True

                # Calculate coverage percentages
                for label, counts in provenance_counts.items():
                    total = counts["with"] + counts["without"]
                    coverage = (counts["with"] / total * 100) if total > 0 else 0
                    self.health_status["provenance_coverage"][label] = {
                        "with_provenance": counts["with"],
                        "without_provenance": counts["without"],
                        "coverage_percent": round(coverage, 2)
                    }
                    self.log(f"  {label}: {coverage:.1f}% coverage ({counts['with']}/{total})")

                if not missing_found:
                    self.log("100% provenance coverage", "SUCCESS")
        except Exception as e:
            self.health_status["errors"].append(f"Provenance check failed: {str(e)}")
            self.log(f"Failed to check provenance: {str(e)}", "ERROR")

    def check_index_health(self):
        """Check database indexes"""
        self.log("Checking index health...")
        try:
            with self.driver.session() as session:
                result = session.run("SHOW INDEXES")

                index_count = 0
                for record in result:
                    index_name = record.get("name", "unknown")
                    state = record.get("state", "UNKNOWN")
                    index_type = record.get("type", "UNKNOWN")

                    self.health_status["index_health"].append({
                        "name": index_name,
                        "state": state,
                        "type": index_type
                    })

                    if state != "ONLINE":
                        self.log(f"  Index '{index_name}' is {state}", "WARNING")
                        self.health_status["warnings"].append(
                            f"Index '{index_name}' is not ONLINE (state: {state})"
                        )

                    index_count += 1

                self.log(f"Found {index_count} indexes", "SUCCESS")
        except Exception as e:
            self.health_status["errors"].append(f"Index check failed: {str(e)}")
            self.log(f"Failed to check indexes: {str(e)}", "ERROR")

    def run_health_check(self):
        """Run all health checks"""
        self.log("=" * 70)
        self.log("Neo4j Health Check Report")
        self.log("=" * 70)

        if not self.check_connection():
            self.log("Cannot proceed - database connection failed", "ERROR")
            return False

        self.get_node_counts()
        self.get_relationship_counts()
        self.check_orphaned_nodes()
        self.check_provenance_coverage()
        self.check_index_health()

        # Summary
        self.log("=" * 70)
        self.log("Health Check Summary")
        self.log("=" * 70)

        error_count = len(self.health_status["errors"])
        warning_count = len(self.health_status["warnings"])

        if error_count == 0 and warning_count == 0:
            self.log("Database health: EXCELLENT ✅", "SUCCESS")
        elif error_count == 0:
            self.log(f"Database health: GOOD (⚠️ {warning_count} warnings)", "WARNING")
        else:
            self.log(f"Database health: CRITICAL (❌ {error_count} errors)", "ERROR")

        return True

    def generate_report(self, output_path):
        """Generate markdown health report"""
        report = [
            "# Neo4j Health Check Report",
            f"**Generated**: {self.health_status['timestamp']}",
            "",
            "## Connection Status",
            f"✅ Connected" if self.health_status["connection"] else "❌ Connection Failed",
            "",
            "## Node Counts",
            "| Label | Count |",
            "|-------|-------|"
        ]

        for label, count in sorted(self.health_status["node_counts"].items(),
                                   key=lambda x: x[1], reverse=True):
            report.append(f"| {label} | {count:,} |")

        total_nodes = sum(self.health_status["node_counts"].values())
        report.append(f"| **TOTAL** | **{total_nodes:,}** |")
        report.append("")

        report.append("## Relationship Counts")
        report.append("| Type | Count |")
        report.append("|------|-------|")

        for rel_type, count in sorted(self.health_status["relationship_counts"].items(),
                                      key=lambda x: x[1], reverse=True):
            report.append(f"| {rel_type} | {count:,} |")

        total_rels = sum(self.health_status["relationship_counts"].values())
        report.append(f"| **TOTAL** | **{total_rels:,}** |")
        report.append("")

        if self.health_status["orphaned_nodes"]:
            report.append("## ⚠️ Orphaned Nodes")
            report.append("| Label | Count |")
            report.append("|-------|-------|")
            for label, count in self.health_status["orphaned_nodes"].items():
                report.append(f"| {label} | {count} |")
            report.append("")

        report.append("## Provenance Coverage")
        report.append("| Label | With CREATED_BY | Without CREATED_BY | Coverage |")
        report.append("|-------|-----------------|-------------------|----------|")

        for label, stats in sorted(self.health_status["provenance_coverage"].items()):
            with_prov = stats["with_provenance"]
            without_prov = stats["without_provenance"]
            coverage = stats["coverage_percent"]
            status = "✅" if coverage == 100 else "⚠️"
            report.append(
                f"| {label} | {with_prov:,} | {without_prov:,} | {status} {coverage:.1f}% |"
            )
        report.append("")

        if self.health_status["warnings"]:
            report.append("## ⚠️ Warnings")
            for warning in self.health_status["warnings"]:
                report.append(f"- {warning}")
            report.append("")

        if self.health_status["errors"]:
            report.append("## ❌ Errors")
            for error in self.health_status["errors"]:
                report.append(f"- {error}")
            report.append("")

        report.append("---")
        report.append(f"*Report generated by Fictotum Neo4j Health Check*")

        # Write report
        output_path = Path(output_path)
        output_path.write_text("\n".join(report))
        self.log(f"Health report saved to: {output_path}", "SUCCESS")


def main():
    parser = argparse.ArgumentParser(
        description="Neo4j Health Check for Fictotum"
    )
    parser.add_argument(
        "--report",
        type=str,
        default="neo4j_health_report.md",
        help="Output path for health report (default: neo4j_health_report.md)"
    )
    args = parser.parse_args()

    # Get Neo4j credentials
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not all([uri, user, pwd]):
        print("❌ ERROR: Missing Neo4j credentials in environment")
        print("Required: NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    # Run health check
    checker = Neo4jHealthChecker(uri, user, pwd)
    try:
        success = checker.run_health_check()
        if success:
            checker.generate_report(args.report)
    finally:
        checker.close()


if __name__ == "__main__":
    main()
