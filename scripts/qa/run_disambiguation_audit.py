"""
Fictotum Disambiguation Audit Runner
Executes comprehensive entity resolution audit and generates detailed report.

Purpose:
- Detects duplicate HistoricalFigure nodes (via Q-ID, name, or heuristics)
- Validates MediaWork wikidata_id compliance
- Identifies relationship integrity issues
- Generates actionable remediation recommendations

Author: Claude Code (Data Architect)
Date: 2026-01-18
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple
from dotenv import load_dotenv
from neo4j import GraphDatabase


class DisambiguationAuditor:
    """Comprehensive auditor for Fictotum entity resolution."""

    def __init__(self, uri: str, user: str, pwd: str):
        """Initialize Neo4j connection."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.issues: Dict[str, List[Any]] = {
            "duplicate_qids_figures": [],
            "duplicate_qids_media": [],
            "missing_qids_media": [],
            "invalid_qid_format_media": [],
            "provisional_qids_figures": [],
            "similar_names_figures": [],
            "duplicate_titles_media": [],
            "duplicate_relationships": [],
            "orphaned_figures": [],
            "orphaned_media": []
        }
        self.stats: Dict[str, Any] = {}

    def close(self):
        """Close Neo4j connection."""
        self.driver.close()

    def run_audit(self):
        """Execute all audit queries and collect results."""
        print("=" * 80)
        print("Fictotum Disambiguation Audit")
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 80)
        print()

        with self.driver.session() as session:
            # Section 1: HistoricalFigure Disambiguation
            print("Section 1: HistoricalFigure Disambiguation Audit")
            print("-" * 80)

            self._audit_duplicate_figure_qids(session)
            self._audit_provisional_figure_qids(session)
            self._audit_similar_figure_names(session)
            self._audit_orphaned_figures(session)

            # Section 2: MediaWork Disambiguation
            print("\nSection 2: MediaWork Disambiguation Audit")
            print("-" * 80)

            self._audit_duplicate_media_qids(session)
            self._audit_missing_media_qids(session)
            self._audit_invalid_media_qid_format(session)
            self._audit_duplicate_media_titles(session)
            self._audit_orphaned_media(session)

            # Section 3: Relationship Integrity
            print("\nSection 3: Relationship Integrity Audit")
            print("-" * 80)

            self._audit_duplicate_relationships(session)

            # Section 4: Statistical Summary
            print("\nSection 4: Statistical Summary")
            print("-" * 80)

            self._gather_statistics(session)

            # Section 5: Constraints and Indexes
            print("\nSection 5: Schema Integrity")
            print("-" * 80)

            self._verify_constraints(session)

    def _audit_duplicate_figure_qids(self, session):
        """Detect multiple HistoricalFigure nodes with same Wikidata Q-ID."""
        print("  [1.1] Checking for duplicate Wikidata Q-IDs in HistoricalFigure...")

        query = """
        MATCH (f:HistoricalFigure)
        WHERE f.wikidata_id IS NOT NULL
          AND NOT f.wikidata_id STARTS WITH 'PROV:'
        WITH f.wikidata_id AS qid,
             COLLECT(DISTINCT f.canonical_id) AS canonical_ids,
             COLLECT(DISTINCT f.name) AS names,
             COUNT(DISTINCT f) AS figure_count
        WHERE figure_count > 1
        RETURN qid, figure_count, canonical_ids, names
        ORDER BY figure_count DESC
        """

        result = session.run(query)
        duplicates = list(result)

        if duplicates:
            print(f"    ❌ CRITICAL: Found {len(duplicates)} Q-IDs shared by multiple figures!")
            for dup in duplicates:
                self.issues["duplicate_qids_figures"].append({
                    "qid": dup["qid"],
                    "count": dup["figure_count"],
                    "canonical_ids": dup["canonical_ids"],
                    "names": dup["names"]
                })
                print(f"       - {dup['qid']}: {dup['figure_count']} figures")
                print(f"         canonical_ids: {dup['canonical_ids']}")
                print(f"         names: {dup['names']}")
        else:
            print("    ✅ PASS: No duplicate Q-IDs found.")

    def _audit_provisional_figure_qids(self, session):
        """Identify figures with provisional or missing Wikidata IDs."""
        print("  [1.2] Checking for provisional/missing Wikidata IDs...")

        query = """
        MATCH (f:HistoricalFigure)
        WHERE f.wikidata_id STARTS WITH 'PROV:'
           OR f.wikidata_id IS NULL
        RETURN f.canonical_id AS canonical_id,
               f.name AS name,
               f.wikidata_id AS wikidata_id,
               f.era AS era
        ORDER BY f.name
        """

        result = session.run(query)
        provisional = list(result)

        if provisional:
            print(f"    ⚠️  WARNING: Found {len(provisional)} figures with provisional/missing Q-IDs.")
            for fig in provisional[:10]:  # Show first 10
                self.issues["provisional_qids_figures"].append({
                    "canonical_id": fig["canonical_id"],
                    "name": fig["name"],
                    "wikidata_id": fig.get("wikidata_id"),
                    "era": fig.get("era")
                })
            if len(provisional) > 10:
                print(f"       (Showing first 10 of {len(provisional)})")
            for fig in provisional[:10]:
                qid_status = fig.get("wikidata_id") or "NULL"
                print(f"       - {fig['canonical_id']}: {fig['name']} [{qid_status}]")
        else:
            print("    ✅ EXCELLENT: All figures have real Wikidata Q-IDs.")

    def _audit_similar_figure_names(self, session):
        """Detect figures with similar names (potential duplicates)."""
        print("  [1.3] Checking for similar figure names...")

        query = """
        MATCH (f1:HistoricalFigure)
        MATCH (f2:HistoricalFigure)
        WHERE f1.canonical_id < f2.canonical_id
          AND toLower(f1.name) = toLower(f2.name)
        RETURN f1.canonical_id AS fig1_id, f1.name AS fig1_name, f1.wikidata_id AS fig1_qid,
               f2.canonical_id AS fig2_id, f2.name AS fig2_name, f2.wikidata_id AS fig2_qid
        """

        result = session.run(query)
        similar = list(result)

        if similar:
            print(f"    ⚠️  WARNING: Found {len(similar)} pairs with identical names!")
            for pair in similar:
                self.issues["similar_names_figures"].append({
                    "fig1_id": pair["fig1_id"],
                    "fig1_name": pair["fig1_name"],
                    "fig1_qid": pair["fig1_qid"],
                    "fig2_id": pair["fig2_id"],
                    "fig2_name": pair["fig2_name"],
                    "fig2_qid": pair["fig2_qid"]
                })
                print(f"       - {pair['fig1_name']}")
                print(f"         ID1: {pair['fig1_id']} [{pair['fig1_qid']}]")
                print(f"         ID2: {pair['fig2_id']} [{pair['fig2_qid']}]")
        else:
            print("    ✅ PASS: No exact name duplicates found.")

    def _audit_orphaned_figures(self, session):
        """Identify figures not connected to any MediaWork."""
        print("  [1.4] Checking for orphaned HistoricalFigure nodes...")

        query = """
        MATCH (f:HistoricalFigure)
        WHERE NOT (f)-[:APPEARS_IN]->(:MediaWork)
        RETURN COUNT(f) AS orphan_count
        """

        result = session.run(query)
        count = result.single()["orphan_count"]

        if count > 0:
            print(f"    ⚠️  INFO: Found {count} orphaned figures (no media relationships).")
            # Get sample
            query_sample = """
            MATCH (f:HistoricalFigure)
            WHERE NOT (f)-[:APPEARS_IN]->(:MediaWork)
            RETURN f.canonical_id AS canonical_id,
                   f.name AS name,
                   f.era AS era
            ORDER BY f.name
            LIMIT 10
            """
            result = session.run(query_sample)
            orphans = list(result)
            for fig in orphans:
                self.issues["orphaned_figures"].append({
                    "canonical_id": fig["canonical_id"],
                    "name": fig["name"],
                    "era": fig.get("era")
                })
            print(f"       (Showing first 10 of {count})")
            for fig in orphans:
                print(f"       - {fig['canonical_id']}: {fig['name']}")
        else:
            print("    ✅ EXCELLENT: All figures are connected to at least one media work.")

    def _audit_duplicate_media_qids(self, session):
        """Detect multiple MediaWork nodes with same Wikidata Q-ID."""
        print("  [2.1] Checking for duplicate Wikidata Q-IDs in MediaWork...")

        query = """
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NOT NULL
        WITH m.wikidata_id AS qid, COUNT(*) AS count,
             COLLECT(m.media_id) AS media_ids,
             COLLECT(m.title) AS titles
        WHERE count > 1
        RETURN qid, count, media_ids, titles
        ORDER BY count DESC
        """

        result = session.run(query)
        duplicates = list(result)

        if duplicates:
            print(f"    ❌ CRITICAL: Found {len(duplicates)} Q-IDs shared by multiple media works!")
            for dup in duplicates:
                self.issues["duplicate_qids_media"].append({
                    "qid": dup["qid"],
                    "count": dup["count"],
                    "media_ids": dup["media_ids"],
                    "titles": dup["titles"]
                })
                print(f"       - {dup['qid']}: {dup['count']} media works")
                print(f"         media_ids: {dup['media_ids']}")
                print(f"         titles: {dup['titles']}")
        else:
            print("    ✅ PASS: No duplicate Q-IDs found.")

    def _audit_missing_media_qids(self, session):
        """Identify MediaWork nodes missing Wikidata Q-IDs."""
        print("  [2.2] Checking for missing Wikidata Q-IDs in MediaWork...")

        query = """
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NULL OR m.wikidata_id = ''
        RETURN m.media_id AS media_id,
               m.title AS title,
               m.media_type AS media_type,
               m.release_year AS release_year
        ORDER BY m.title
        """

        result = session.run(query)
        missing = list(result)

        if missing:
            print(f"    ❌ CRITICAL: Found {len(missing)} media works WITHOUT Q-IDs!")
            print(f"       This violates the MediaWork Ingestion Protocol in CLAUDE.md!")
            for media in missing[:10]:
                self.issues["missing_qids_media"].append({
                    "media_id": media["media_id"],
                    "title": media["title"],
                    "media_type": media["media_type"],
                    "release_year": media.get("release_year")
                })
            if len(missing) > 10:
                print(f"       (Showing first 10 of {len(missing)})")
            for media in missing[:10]:
                print(f"       - {media['media_id']}: {media['title']} [{media['media_type']}]")
        else:
            print("    ✅ EXCELLENT: All media works have Wikidata Q-IDs.")

    def _audit_invalid_media_qid_format(self, session):
        """Detect MediaWork nodes with invalid Q-ID format."""
        print("  [2.3] Checking for invalid Wikidata Q-ID formats...")

        query = """
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NOT NULL
          AND NOT m.wikidata_id =~ '^Q[0-9]+$'
        RETURN m.media_id AS media_id,
               m.title AS title,
               m.wikidata_id AS wikidata_id,
               m.media_type AS media_type
        ORDER BY m.title
        """

        result = session.run(query)
        invalid = list(result)

        if invalid:
            print(f"    ⚠️  WARNING: Found {len(invalid)} media works with invalid Q-ID format!")
            for media in invalid:
                self.issues["invalid_qid_format_media"].append({
                    "media_id": media["media_id"],
                    "title": media["title"],
                    "wikidata_id": media["wikidata_id"],
                    "media_type": media["media_type"]
                })
                print(f"       - {media['media_id']}: {media['title']} [{media['wikidata_id']}]")
        else:
            print("    ✅ PASS: All Q-IDs match valid format (Q followed by digits).")

    def _audit_duplicate_media_titles(self, session):
        """Detect media works with same title but different Q-IDs."""
        print("  [2.4] Checking for duplicate titles with different Q-IDs...")

        query = """
        MATCH (m1:MediaWork)
        MATCH (m2:MediaWork)
        WHERE m1.media_id < m2.media_id
          AND toLower(m1.title) = toLower(m2.title)
          AND m1.wikidata_id <> m2.wikidata_id
        RETURN m1.media_id AS id1, m1.title AS title1, m1.wikidata_id AS qid1,
               m2.media_id AS id2, m2.title AS title2, m2.wikidata_id AS qid2
        ORDER BY m1.title
        LIMIT 20
        """

        result = session.run(query)
        duplicates = list(result)

        if duplicates:
            print(f"    ⚠️  WARNING: Found {len(duplicates)} title duplicates with different Q-IDs!")
            for dup in duplicates:
                self.issues["duplicate_titles_media"].append({
                    "id1": dup["id1"],
                    "title1": dup["title1"],
                    "qid1": dup["qid1"],
                    "id2": dup["id2"],
                    "title2": dup["title2"],
                    "qid2": dup["qid2"]
                })
                print(f"       - {dup['title1']}")
                print(f"         {dup['id1']} [{dup['qid1']}] vs {dup['id2']} [{dup['qid2']}]")
        else:
            print("    ✅ PASS: No duplicate titles with different Q-IDs.")

    def _audit_orphaned_media(self, session):
        """Identify MediaWork nodes not connected to any HistoricalFigure."""
        print("  [2.5] Checking for orphaned MediaWork nodes...")

        query = """
        MATCH (m:MediaWork)
        WHERE NOT (m)<-[:APPEARS_IN]-(:HistoricalFigure)
        RETURN COUNT(m) AS orphan_count
        """

        result = session.run(query)
        count = result.single()["orphan_count"]

        if count > 0:
            print(f"    ℹ️  INFO: Found {count} orphaned media works (no figure relationships).")
            print(f"       Note: These may be fiction-only works or incomplete ingestions.")
            # Get sample
            query_sample = """
            MATCH (m:MediaWork)
            WHERE NOT (m)<-[:APPEARS_IN]-(:HistoricalFigure)
            RETURN m.media_id AS media_id,
                   m.title AS title,
                   m.media_type AS media_type
            ORDER BY m.title
            LIMIT 10
            """
            result = session.run(query_sample)
            orphans = list(result)
            for media in orphans:
                self.issues["orphaned_media"].append({
                    "media_id": media["media_id"],
                    "title": media["title"],
                    "media_type": media["media_type"]
                })
        else:
            print("    ✅ EXCELLENT: All media works are connected to at least one figure.")

    def _audit_duplicate_relationships(self, session):
        """Detect duplicate APPEARS_IN relationships."""
        print("  [3.1] Checking for duplicate APPEARS_IN relationships...")

        query = """
        MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
        WITH f, m, COUNT(r) AS rel_count
        WHERE rel_count > 1
        RETURN f.canonical_id, f.name, m.media_id, m.title, rel_count
        ORDER BY rel_count DESC
        """

        result = session.run(query)
        duplicates = list(result)

        if duplicates:
            print(f"    ❌ CRITICAL: Found {len(duplicates)} duplicate relationships!")
            for dup in duplicates:
                self.issues["duplicate_relationships"].append({
                    "figure_id": dup["f.canonical_id"],
                    "figure_name": dup["f.name"],
                    "media_id": dup["m.media_id"],
                    "media_title": dup["m.title"],
                    "count": dup["rel_count"]
                })
                print(f"       - {dup['f.name']} → {dup['m.title']}: {dup['rel_count']} relationships")
        else:
            print("    ✅ PASS: No duplicate relationships found.")

    def _gather_statistics(self, session):
        """Gather overall database statistics."""
        print("  [4.1] Gathering database statistics...")

        query = """
        MATCH (f:HistoricalFigure)
        WITH COUNT(f) AS total_figures,
             COUNT(CASE WHEN f.wikidata_id IS NOT NULL AND NOT f.wikidata_id STARTS WITH 'PROV:' THEN 1 END) AS figures_with_qid,
             COUNT(CASE WHEN f.wikidata_id STARTS WITH 'PROV:' OR f.wikidata_id IS NULL THEN 1 END) AS figures_without_qid
        MATCH (m:MediaWork)
        WITH total_figures, figures_with_qid, figures_without_qid,
             COUNT(m) AS total_media,
             COUNT(CASE WHEN m.wikidata_id IS NOT NULL THEN 1 END) AS media_with_qid,
             COUNT(CASE WHEN m.wikidata_id IS NULL THEN 1 END) AS media_without_qid
        MATCH (:HistoricalFigure)-[r:APPEARS_IN]->(:MediaWork)
        WITH total_figures, figures_with_qid, figures_without_qid,
             total_media, media_with_qid, media_without_qid,
             COUNT(r) AS total_portrayals
        RETURN total_figures, figures_with_qid, figures_without_qid,
               total_media, media_with_qid, media_without_qid,
               total_portrayals
        """

        result = session.run(query)
        stats = result.single()

        self.stats = {
            "total_figures": stats["total_figures"],
            "figures_with_qid": stats["figures_with_qid"],
            "figures_without_qid": stats["figures_without_qid"],
            "pct_figures_with_qid": round(100.0 * stats["figures_with_qid"] / stats["total_figures"], 2) if stats["total_figures"] > 0 else 0,
            "total_media": stats["total_media"],
            "media_with_qid": stats["media_with_qid"],
            "media_without_qid": stats["media_without_qid"],
            "pct_media_with_qid": round(100.0 * stats["media_with_qid"] / stats["total_media"], 2) if stats["total_media"] > 0 else 0,
            "total_portrayals": stats["total_portrayals"]
        }

        print(f"\n    Database Overview:")
        print(f"      Total HistoricalFigure nodes: {self.stats['total_figures']}")
        print(f"        - With real Q-ID: {self.stats['figures_with_qid']} ({self.stats['pct_figures_with_qid']}%)")
        print(f"        - Without Q-ID: {self.stats['figures_without_qid']}")
        print(f"      Total MediaWork nodes: {self.stats['total_media']}")
        print(f"        - With Q-ID: {self.stats['media_with_qid']} ({self.stats['pct_media_with_qid']}%)")
        print(f"        - Without Q-ID: {self.stats['media_without_qid']}")
        print(f"      Total APPEARS_IN relationships: {self.stats['total_portrayals']}")

    def _verify_constraints(self, session):
        """Verify database constraints and indexes."""
        print("  [5.1] Verifying database schema constraints...")

        try:
            query = "SHOW CONSTRAINTS"
            result = session.run(query)
            constraints = list(result)

            print(f"    Found {len(constraints)} constraints:")
            for constraint in constraints:
                constraint_type = constraint.get("type", "UNKNOWN")
                entity_type = constraint.get("entityType", "UNKNOWN")
                properties = constraint.get("properties", [])
                print(f"      - {constraint_type} on {entity_type}({', '.join(properties)})")

            # Check for required constraints
            required_constraints = [
                ("HistoricalFigure", "canonical_id"),
                ("MediaWork", "wikidata_id"),
                ("MediaWork", "media_id")
            ]

            found_constraints = set()
            for constraint in constraints:
                entity = constraint.get("entityType", "")
                props = constraint.get("properties", [])
                if props:
                    found_constraints.add((entity, props[0]))

            print(f"\n    Required constraint verification:")
            for entity, prop in required_constraints:
                if (entity, prop) in found_constraints:
                    print(f"      ✅ {entity}.{prop} - PRESENT")
                else:
                    print(f"      ❌ {entity}.{prop} - MISSING!")

        except Exception as e:
            print(f"    ⚠️  Could not verify constraints: {e}")

    def generate_report(self, output_path: str):
        """Generate comprehensive markdown report."""
        print("\n" + "=" * 80)
        print("Generating Disambiguation Audit Report...")
        print("=" * 80)

        with open(output_path, 'w') as f:
            f.write("# Fictotum Disambiguation Audit Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Database:** Neo4j Aura (instance c78564a4)\n\n")
            f.write(f"**Auditor:** Claude Code (Data Architect)\n\n")

            # Executive Summary
            f.write("## Executive Summary\n\n")

            total_critical_issues = (
                len(self.issues["duplicate_qids_figures"]) +
                len(self.issues["duplicate_qids_media"]) +
                len(self.issues["missing_qids_media"]) +
                len(self.issues["duplicate_relationships"])
            )

            total_warnings = (
                len(self.issues["provisional_qids_figures"]) +
                len(self.issues["similar_names_figures"]) +
                len(self.issues["invalid_qid_format_media"]) +
                len(self.issues["duplicate_titles_media"])
            )

            if total_critical_issues == 0 and total_warnings == 0:
                f.write("✅ **Status:** EXCELLENT - No critical issues or warnings detected.\n\n")
            elif total_critical_issues == 0:
                f.write(f"⚠️  **Status:** GOOD - {total_warnings} warnings found (no critical issues).\n\n")
            else:
                f.write(f"❌ **Status:** ACTION REQUIRED - {total_critical_issues} critical issues found.\n\n")

            # Database Statistics
            f.write("## Database Statistics\n\n")
            f.write(f"- **Total HistoricalFigure nodes:** {self.stats['total_figures']}\n")
            f.write(f"  - With real Wikidata Q-ID: {self.stats['figures_with_qid']} ({self.stats['pct_figures_with_qid']}%)\n")
            f.write(f"  - Without Q-ID: {self.stats['figures_without_qid']}\n")
            f.write(f"- **Total MediaWork nodes:** {self.stats['total_media']}\n")
            f.write(f"  - With Wikidata Q-ID: {self.stats['media_with_qid']} ({self.stats['pct_media_with_qid']}%)\n")
            f.write(f"  - Without Q-ID: {self.stats['media_without_qid']}\n")
            f.write(f"- **Total APPEARS_IN relationships:** {self.stats['total_portrayals']}\n\n")

            # Critical Issues
            f.write("## Critical Issues\n\n")

            if self.issues["duplicate_qids_figures"]:
                f.write(f"### 1. Duplicate Wikidata Q-IDs in HistoricalFigure ({len(self.issues['duplicate_qids_figures'])} found)\n\n")
                f.write("**Impact:** CRITICAL - Violates entity resolution protocol. Multiple canonical_ids for same person.\n\n")
                for issue in self.issues["duplicate_qids_figures"]:
                    f.write(f"- **Q-ID:** `{issue['qid']}`\n")
                    f.write(f"  - Count: {issue['count']}\n")
                    f.write(f"  - canonical_ids: {issue['canonical_ids']}\n")
                    f.write(f"  - Names: {issue['names']}\n\n")
                f.write("**Remediation:** Merge duplicate nodes, redirect all relationships to primary canonical_id.\n\n")

            if self.issues["duplicate_qids_media"]:
                f.write(f"### 2. Duplicate Wikidata Q-IDs in MediaWork ({len(self.issues['duplicate_qids_media'])} found)\n\n")
                f.write("**Impact:** CRITICAL - Violates uniqueness constraint on wikidata_id.\n\n")
                for issue in self.issues["duplicate_qids_media"]:
                    f.write(f"- **Q-ID:** `{issue['qid']}`\n")
                    f.write(f"  - Count: {issue['count']}\n")
                    f.write(f"  - media_ids: {issue['media_ids']}\n")
                    f.write(f"  - Titles: {issue['titles']}\n\n")
                f.write("**Remediation:** Merge duplicate nodes, preserve all unique properties and relationships.\n\n")

            if self.issues["missing_qids_media"]:
                f.write(f"### 3. MediaWork Nodes Missing Wikidata Q-IDs ({len(self.issues['missing_qids_media'])} found)\n\n")
                f.write("**Impact:** CRITICAL - Violates MediaWork Ingestion Protocol (CLAUDE.md).\n\n")
                f.write("Sample works missing Q-IDs:\n\n")
                for issue in self.issues["missing_qids_media"][:20]:
                    f.write(f"- `{issue['media_id']}`: {issue['title']} [{issue['media_type']}]\n")
                if len(self.issues["missing_qids_media"]) > 20:
                    f.write(f"\n(Showing 20 of {len(self.issues['missing_qids_media'])} total)\n")
                f.write("\n**Remediation:** Research Wikidata for each work, assign canonical Q-ID.\n\n")

            if self.issues["duplicate_relationships"]:
                f.write(f"### 4. Duplicate APPEARS_IN Relationships ({len(self.issues['duplicate_relationships'])} found)\n\n")
                f.write("**Impact:** CRITICAL - Data integrity violation. Same (figure, media) pair has multiple relationships.\n\n")
                for issue in self.issues["duplicate_relationships"]:
                    f.write(f"- {issue['figure_name']} → {issue['media_title']}: {issue['count']} relationships\n")
                f.write("\n**Remediation:** Consolidate relationship properties, delete duplicates.\n\n")

            if total_critical_issues == 0:
                f.write("✅ **No critical issues detected.**\n\n")

            # Warnings
            f.write("## Warnings\n\n")

            if self.issues["provisional_qids_figures"]:
                f.write(f"### 1. Provisional/Missing Wikidata Q-IDs in HistoricalFigure ({len(self.issues['provisional_qids_figures'])} found)\n\n")
                f.write("**Impact:** MEDIUM - Reduces canonical entity resolution capability.\n\n")
                f.write("Sample figures:\n\n")
                for issue in self.issues["provisional_qids_figures"][:20]:
                    qid = issue.get("wikidata_id") or "NULL"
                    f.write(f"- `{issue['canonical_id']}`: {issue['name']} [{qid}] - {issue.get('era', 'Unknown Era')}\n")
                if len(self.issues["provisional_qids_figures"]) > 20:
                    f.write(f"\n(Showing 20 of {len(self.issues['provisional_qids_figures'])} total)\n")
                f.write("\n**Recommendation:** Research Wikidata for these figures and upgrade to real Q-IDs.\n\n")

            if self.issues["similar_names_figures"]:
                f.write(f"### 2. HistoricalFigure Nodes with Identical Names ({len(self.issues['similar_names_figures'])} pairs found)\n\n")
                f.write("**Impact:** MEDIUM - Potential duplicates not caught by Q-ID matching.\n\n")
                for issue in self.issues["similar_names_figures"]:
                    f.write(f"- **{issue['fig1_name']}**\n")
                    f.write(f"  - ID1: `{issue['fig1_id']}` [{issue['fig1_qid']}]\n")
                    f.write(f"  - ID2: `{issue['fig2_id']}` [{issue['fig2_qid']}]\n\n")
                f.write("**Recommendation:** Manual review to determine if these are truly different people.\n\n")

            if self.issues["duplicate_titles_media"]:
                f.write(f"### 3. MediaWork Nodes with Duplicate Titles but Different Q-IDs ({len(self.issues['duplicate_titles_media'])} pairs found)\n\n")
                f.write("**Impact:** MEDIUM - May indicate incorrect Q-ID assignment.\n\n")
                for issue in self.issues["duplicate_titles_media"]:
                    f.write(f"- **{issue['title1']}**\n")
                    f.write(f"  - `{issue['id1']}` [{issue['qid1']}]\n")
                    f.write(f"  - `{issue['id2']}` [{issue['qid2']}]\n\n")
                f.write("**Recommendation:** Verify Q-IDs against Wikidata. May be different editions/adaptations.\n\n")

            if total_warnings == 0:
                f.write("✅ **No warnings detected.**\n\n")

            # Recommendations
            f.write("## Recommendations\n\n")

            if total_critical_issues > 0:
                f.write("### Immediate Actions Required\n\n")
                f.write("1. **Merge duplicate entities** identified in critical issues section\n")
                f.write("2. **Resolve missing Q-IDs** for MediaWork nodes\n")
                f.write("3. **Consolidate duplicate relationships**\n")
                f.write("4. **Verify constraint enforcement** on wikidata_id uniqueness\n\n")

            f.write("### Process Improvements\n\n")
            f.write("1. **Pre-ingestion validation:** Run deduplication scripts BEFORE every ingestion\n")
            f.write("2. **Wikidata verification:** Mandatory Q-ID lookup for all new MediaWork nodes\n")
            f.write("3. **Automated audits:** Schedule weekly disambiguation audits\n")
            f.write("4. **Constraint hardening:** Ensure all uniqueness constraints are enforced at DB level\n")
            f.write("5. **Alias resolution:** Implement Wikidata alias fetching for better duplicate detection\n\n")

            f.write("## Audit Queries\n\n")
            f.write("All audit queries are available in:\n")
            f.write("`scripts/qa/audit_disambiguation.cypher`\n\n")

            f.write("---\n\n")
            f.write("**End of Report**\n")

        print(f"✅ Report saved to: {output_path}")


def main():
    """Main entry point for disambiguation audit."""
    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("❌ Error: NEO4J_URI and NEO4J_PASSWORD must be set in .env")
        sys.exit(1)

    auditor = DisambiguationAuditor(uri, user, pwd)

    try:
        auditor.run_audit()

        # Generate report
        output_path = Path(__file__).parent.parent.parent / "disambiguation_audit_report.md"
        auditor.generate_report(str(output_path))

        print("\n" + "=" * 80)
        print("Audit Complete")
        print("=" * 80)
        print(f"\nFull report available at: {output_path}")

    except Exception as e:
        print(f"\n❌ Error during audit: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        auditor.close()


if __name__ == "__main__":
    main()
