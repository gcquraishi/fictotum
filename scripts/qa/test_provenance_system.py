"""
Fictotum: Provenance System Test Suite

This script tests the Phase 2.1 CREATED_BY provenance tracking system.
Run after production migration to verify everything works correctly.
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from neo4j import GraphDatabase


class ProvenanceSystemTester:
    def __init__(self, uri, user, pwd):
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.tests_passed = 0
        self.tests_failed = 0

    def close(self):
        self.driver.close()

    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        symbols = {"INFO": "ℹ️", "PASS": "✅", "FAIL": "❌", "WARNING": "⚠️"}
        symbol = symbols.get(level, "ℹ️")
        print(f"[{timestamp}] {symbol} {level}: {message}")

    def test_agent_nodes_exist(self):
        """Test 1: Verify Agent nodes exist with proper schema"""
        self.log("Test 1: Checking Agent nodes...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH (a:Agent)
                RETURN
                    a.agent_id AS agent_id,
                    a.name AS name,
                    a.type AS type,
                    a.version AS version,
                    a.created_at AS created_at,
                    a.metadata AS metadata
                ORDER BY a.name
            """)

            agents = list(result)
            if len(agents) >= 3:
                self.log(f"Found {len(agents)} Agent nodes", "PASS")
                self.tests_passed += 1

                for agent in agents:
                    name = agent["name"]
                    agent_id = agent["agent_id"]
                    agent_type = agent["type"]

                    if all([agent_id, name, agent_type]):
                        self.log(f"  - {name} ({agent_id}): {agent_type}", "INFO")
                    else:
                        self.log(f"  - {name}: Missing required properties", "WARNING")
            else:
                self.log(f"Expected at least 3 Agent nodes, found {len(agents)}", "FAIL")
                self.tests_failed += 1

    def test_created_by_relationships(self):
        """Test 2: Verify CREATED_BY relationships exist"""
        self.log("Test 2: Checking CREATED_BY relationships...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH ()-[r:CREATED_BY]->()
                RETURN count(r) AS total
            """)

            record = result.single()
            total = record["total"]

            if total >= 1000:
                self.log(f"Found {total} CREATED_BY relationships", "PASS")
                self.tests_passed += 1
            else:
                self.log(f"Expected ~1200 relationships, found {total}", "FAIL")
                self.tests_failed += 1

    def test_missing_provenance(self):
        """Test 3: Check for nodes missing CREATED_BY"""
        self.log("Test 3: Checking for nodes missing provenance...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH (n)
                WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
                  AND NOT EXISTS((n)-[:CREATED_BY]->())
                RETURN labels(n)[0] AS node_type, count(n) AS count
                ORDER BY count DESC
            """)

            missing = list(result)
            total_missing = sum(record["count"] for record in missing)

            if total_missing == 0:
                self.log("All nodes have CREATED_BY relationships", "PASS")
                self.tests_passed += 1
            else:
                self.log(f"Found {total_missing} nodes missing provenance", "FAIL")
                for record in missing:
                    self.log(f"  - {record['node_type']}: {record['count']}", "WARNING")
                self.tests_failed += 1

    def test_relationship_properties(self):
        """Test 4: Verify CREATED_BY relationships have required properties"""
        self.log("Test 4: Checking CREATED_BY relationship properties...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH ()-[r:CREATED_BY]->()
                WHERE r.timestamp IS NULL OR r.context IS NULL
                RETURN count(r) AS missing_required_props
            """)

            record = result.single()
            missing = record["missing_required_props"]

            if missing == 0:
                self.log("All CREATED_BY relationships have required properties", "PASS")
                self.tests_passed += 1
            else:
                self.log(f"Found {missing} relationships missing required properties", "FAIL")
                self.tests_failed += 1

    def test_provenance_distribution(self):
        """Test 5: Check provenance distribution by agent"""
        self.log("Test 5: Analyzing provenance distribution...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH ()-[r:CREATED_BY]->(a:Agent)
                RETURN
                    a.name AS agent,
                    count(r) AS count,
                    round(100.0 * count(r) / $total, 2) AS percentage
                ORDER BY count DESC
            """, total=1200)  # Approximate total

            distributions = list(result)

            if len(distributions) > 0:
                self.log("Provenance distribution by agent:", "PASS")
                self.tests_passed += 1

                for dist in distributions:
                    agent = dist["agent"]
                    count = dist["count"]
                    percentage = dist["percentage"]
                    self.log(f"  - {agent}: {count} nodes ({percentage}%)", "INFO")
            else:
                self.log("No provenance distribution found", "FAIL")
                self.tests_failed += 1

    def test_context_distribution(self):
        """Test 6: Check creation context distribution"""
        self.log("Test 6: Analyzing creation context distribution...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH ()-[r:CREATED_BY]->()
                RETURN r.context AS context, count(r) AS count
                ORDER BY count DESC
            """)

            contexts = list(result)

            if len(contexts) > 0:
                self.log("Creation context distribution:", "PASS")
                self.tests_passed += 1

                for ctx in contexts:
                    context = ctx["context"]
                    count = ctx["count"]
                    self.log(f"  - {context}: {count} nodes", "INFO")
            else:
                self.log("No context distribution found", "FAIL")
                self.tests_failed += 1

    def test_method_distribution(self):
        """Test 7: Check data quality method distribution"""
        self.log("Test 7: Analyzing data quality method distribution...")

        with self.driver.session() as session:
            result = session.run("""
                MATCH ()-[r:CREATED_BY]->()
                WHERE r.method IS NOT NULL
                RETURN r.method AS method, count(r) AS count
                ORDER BY count DESC
            """)

            methods = list(result)

            if len(methods) > 0:
                self.log("Data quality method distribution:", "PASS")
                self.tests_passed += 1

                for meth in methods:
                    method = meth["method"]
                    count = meth["count"]
                    self.log(f"  - {method}: {count} nodes", "INFO")
            else:
                self.log("No method distribution found", "WARNING")
                self.tests_passed += 1  # Not critical

    def test_sample_queries(self):
        """Test 8: Run sample provenance queries"""
        self.log("Test 8: Testing sample provenance queries...")

        with self.driver.session() as session:
            # Query 1: Find entities by specific agent
            result = session.run("""
                MATCH (n)-[:CREATED_BY]->(a:Agent {agent_id: "claude-sonnet-4.5"})
                RETURN labels(n)[0] AS node_type, count(n) AS count
                ORDER BY count DESC
                LIMIT 5
            """)

            sonnet_entities = list(result)

            if len(sonnet_entities) > 0:
                self.log("Successfully queried entities by agent", "PASS")
                self.tests_passed += 1
            else:
                self.log("Failed to query entities by agent", "FAIL")
                self.tests_failed += 1

    def run_all_tests(self):
        """Run all test suites"""
        self.log("=" * 70)
        self.log("Fictotum Provenance System Test Suite")
        self.log("=" * 70)

        try:
            self.test_agent_nodes_exist()
            self.test_created_by_relationships()
            self.test_missing_provenance()
            self.test_relationship_properties()
            self.test_provenance_distribution()
            self.test_context_distribution()
            self.test_method_distribution()
            self.test_sample_queries()

            self.log("=" * 70)
            self.log(f"Test Results: {self.tests_passed} passed, {self.tests_failed} failed")
            self.log("=" * 70)

            if self.tests_failed == 0:
                self.log("All tests passed! Provenance system is working correctly.", "PASS")
                return True
            else:
                self.log(f"{self.tests_failed} test(s) failed. Review output above.", "FAIL")
                return False

        except Exception as e:
            self.log(f"Test suite failed with error: {str(e)}", "FAIL")
            return False


def main():
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not pwd:
        print("❌ Error: NEO4J_PASSWORD environment variable not set.")
        sys.exit(1)

    tester = ProvenanceSystemTester(uri, user, pwd)
    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    finally:
        tester.close()


if __name__ == "__main__":
    main()
