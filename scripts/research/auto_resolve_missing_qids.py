"""
Fictotum Automated Q-ID Resolver
Attempts to resolve missing Wikidata Q-IDs for HistoricalFigure nodes using SPARQL queries.

Strategy:
1. Fetch all figures with NULL or PROV: wikidata_ids
2. For each figure, query Wikidata SPARQL endpoint with name + birth/death year
3. If exactly 1 match found, update figure with resolved Q-ID
4. If 0 or >1 matches, flag for manual review
5. Generate resolution report with success rate and review queue

Author: Claude Code (Data Architect)
Date: 2026-01-18
"""

import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv
from neo4j import GraphDatabase
from SPARQLWrapper import SPARQLWrapper, JSON
import time


class QIDResolver:
    """Resolves missing Wikidata Q-IDs for historical figures."""

    def __init__(self, uri: str, user: str, pwd: str, dry_run: bool = True):
        """Initialize Neo4j connection and SPARQL endpoint."""
        if uri.startswith("neo4j+s://"):
            uri = uri.replace("neo4j+s://", "neo4j+ssc://")
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.sparql = SPARQLWrapper("https://query.wikidata.org/sparql")
        self.sparql.setReturnFormat(JSON)
        self.dry_run = dry_run

        self.stats = {
            "total_figures": 0,
            "auto_resolved": 0,
            "ambiguous": 0,
            "no_match": 0,
            "errors": 0
        }

        self.resolutions: List[Dict] = []
        self.manual_review_queue: List[Dict] = []

    def close(self):
        """Close Neo4j connection."""
        self.driver.close()

    def fetch_figures_without_qids(self) -> List[Dict]:
        """Fetch all HistoricalFigure nodes without real Q-IDs."""
        print("📊 Fetching figures without Wikidata Q-IDs...")

        with self.driver.session() as session:
            query = """
            MATCH (f:HistoricalFigure)
            WHERE f.wikidata_id IS NULL
               OR f.wikidata_id STARTS WITH 'PROV:'
            RETURN f.canonical_id AS canonical_id,
                   f.name AS name,
                   f.birth_year AS birth_year,
                   f.death_year AS death_year,
                   f.era AS era,
                   f.wikidata_id AS current_qid
            ORDER BY f.name
            """

            result = session.run(query)
            figures = [dict(record) for record in result]

            print(f"✅ Found {len(figures)} figures needing Q-ID resolution.\n")
            self.stats["total_figures"] = len(figures)

            return figures

    def resolve_qid_for_figure(self, figure: Dict) -> Optional[str]:
        """
        Query Wikidata for Q-ID using name and lifespan.
        Returns Q-ID if unique match found, None otherwise.
        """
        name = figure["name"]
        birth_year = figure.get("birth_year")
        death_year = figure.get("death_year")

        print(f"🔍 Resolving: {name} ({birth_year or '?'} - {death_year or '?'})")

        # Build SPARQL query
        if birth_year and death_year:
            # Use both birth and death years for precision
            query = f"""
            SELECT ?person ?personLabel ?birth ?death WHERE {{
              ?person wdt:P31 wd:Q5 .  # instance of human
              ?person rdfs:label "{name}"@en .
              ?person wdt:P569 ?birth .
              ?person wdt:P570 ?death .
              FILTER(YEAR(?birth) = {birth_year})
              FILTER(YEAR(?death) = {death_year})
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
            }}
            LIMIT 10
            """
        elif birth_year:
            # Use birth year only
            query = f"""
            SELECT ?person ?personLabel ?birth WHERE {{
              ?person wdt:P31 wd:Q5 .  # instance of human
              ?person rdfs:label "{name}"@en .
              ?person wdt:P569 ?birth .
              FILTER(YEAR(?birth) = {birth_year})
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
            }}
            LIMIT 10
            """
        else:
            # Name-only search (risky, likely to have multiple matches)
            query = f"""
            SELECT ?person ?personLabel WHERE {{
              ?person wdt:P31 wd:Q5 .  # instance of human
              ?person rdfs:label "{name}"@en .
              SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
            }}
            LIMIT 10
            """

        try:
            self.sparql.setQuery(query)
            results = self.sparql.query().convert()

            # Rate limiting - be nice to Wikidata
            time.sleep(0.5)

            bindings = results["results"]["bindings"]

            if len(bindings) == 1:
                # Unique match found!
                qid = bindings[0]["person"]["value"].split("/")[-1]
                print(f"   ✅ Resolved to {qid}\n")
                self.stats["auto_resolved"] += 1
                return qid

            elif len(bindings) == 0:
                # No matches found
                print(f"   ⚠️  No matches found in Wikidata\n")
                self.stats["no_match"] += 1
                self.manual_review_queue.append({
                    "canonical_id": figure["canonical_id"],
                    "name": name,
                    "reason": "No Wikidata matches found",
                    "suggestion": "Verify name spelling or check if figure exists in Wikidata"
                })
                return None

            else:
                # Multiple matches - needs manual review
                print(f"   ⚠️  Multiple matches ({len(bindings)}) - manual review required")
                for binding in bindings[:5]:  # Show first 5
                    candidate_qid = binding["person"]["value"].split("/")[-1]
                    candidate_label = binding.get("personLabel", {}).get("value", "Unknown")
                    print(f"      - {candidate_qid}: {candidate_label}")
                print()

                self.stats["ambiguous"] += 1
                self.manual_review_queue.append({
                    "canonical_id": figure["canonical_id"],
                    "name": name,
                    "reason": f"Ambiguous ({len(bindings)} candidates)",
                    "candidates": [
                        {
                            "qid": b["person"]["value"].split("/")[-1],
                            "label": b.get("personLabel", {}).get("value", "Unknown")
                        }
                        for b in bindings[:10]
                    ]
                })
                return None

        except Exception as e:
            print(f"   ❌ ERROR: {e}\n")
            self.stats["errors"] += 1
            return None

    def update_figure_qid(self, canonical_id: str, new_qid: str):
        """Update HistoricalFigure node with resolved Q-ID."""
        if self.dry_run:
            print(f"   [DRY RUN] Would update {canonical_id} with Q-ID: {new_qid}")
            return

        with self.driver.session() as session:
            query = """
            MATCH (f:HistoricalFigure {canonical_id: $canonical_id})
            SET f.wikidata_id = $new_qid
            RETURN f.canonical_id AS updated_id
            """

            session.run(query, canonical_id=canonical_id, new_qid=new_qid)
            print(f"   ✅ Updated {canonical_id} → {new_qid}")

    def run_resolution(self):
        """Main resolution workflow."""
        print("=" * 80)
        print("Fictotum Automated Q-ID Resolution")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'LIVE EXECUTION'}")
        print("=" * 80)
        print()

        # Fetch figures
        figures = self.fetch_figures_without_qids()

        if not figures:
            print("✅ All figures already have Wikidata Q-IDs!")
            return

        # Attempt resolution for each figure
        for idx, figure in enumerate(figures, 1):
            print(f"[{idx}/{len(figures)}] ", end="")

            resolved_qid = self.resolve_qid_for_figure(figure)

            if resolved_qid:
                self.resolutions.append({
                    "canonical_id": figure["canonical_id"],
                    "name": figure["name"],
                    "old_qid": figure.get("current_qid"),
                    "new_qid": resolved_qid,
                    "status": "RESOLVED"
                })

                self.update_figure_qid(figure["canonical_id"], resolved_qid)

    def generate_report(self, output_path: str):
        """Generate markdown report of resolution results."""
        print("\n" + "=" * 80)
        print("Generating Resolution Report...")
        print("=" * 80)

        with open(output_path, 'w') as f:
            f.write("# Fictotum Q-ID Auto-Resolution Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Mode:** {'DRY RUN (no changes made)' if self.dry_run else 'LIVE EXECUTION'}\n\n")

            # Statistics
            f.write("## Resolution Statistics\n\n")
            f.write(f"- **Total Figures Processed:** {self.stats['total_figures']}\n")
            f.write(f"- **Auto-Resolved:** {self.stats['auto_resolved']} ({100.0 * self.stats['auto_resolved'] / max(self.stats['total_figures'], 1):.1f}%)\n")
            f.write(f"- **Ambiguous (Multiple Matches):** {self.stats['ambiguous']}\n")
            f.write(f"- **No Matches Found:** {self.stats['no_match']}\n")
            f.write(f"- **Errors:** {self.stats['errors']}\n\n")

            # Successful resolutions
            if self.resolutions:
                f.write(f"## Successfully Resolved ({len(self.resolutions)} figures)\n\n")
                f.write("| canonical_id | Name | Old Q-ID | New Q-ID |\n")
                f.write("|--------------|------|----------|----------|\n")
                for res in self.resolutions:
                    old_qid = res["old_qid"] or "NULL"
                    f.write(f"| `{res['canonical_id']}` | {res['name']} | {old_qid} | `{res['new_qid']}` |\n")
                f.write("\n")

            # Manual review queue
            if self.manual_review_queue:
                f.write(f"## Manual Review Required ({len(self.manual_review_queue)} figures)\n\n")

                for item in self.manual_review_queue:
                    f.write(f"### {item['name']} (`{item['canonical_id']}`)\n\n")
                    f.write(f"**Reason:** {item['reason']}\n\n")

                    if "suggestion" in item:
                        f.write(f"**Suggestion:** {item['suggestion']}\n\n")

                    if "candidates" in item:
                        f.write("**Candidates:**\n\n")
                        for candidate in item["candidates"]:
                            f.write(f"- [{candidate['qid']}](https://www.wikidata.org/wiki/{candidate['qid']}): {candidate['label']}\n")
                        f.write("\n")

            # Recommendations
            f.write("## Recommendations\n\n")

            if self.stats["auto_resolved"] > 0:
                f.write(f"1. **Verify Auto-Resolved Q-IDs:** Review the {self.stats['auto_resolved']} automatically resolved Q-IDs to ensure correctness.\n")

            if self.manual_review_queue:
                f.write(f"2. **Manual Review Queue:** Research and manually assign Q-IDs for {len(self.manual_review_queue)} figures.\n")

            if self.stats["no_match"] > 0:
                f.write(f"3. **Create Wikidata Entries:** Consider creating Wikidata entries for {self.stats['no_match']} figures not found in Wikidata.\n")

            f.write("\n---\n\n")
            f.write("**End of Report**\n")

        print(f"✅ Report saved to: {output_path}")

        # Print summary
        print("\n" + "=" * 80)
        print("Resolution Summary")
        print("=" * 80)
        print(f"Total figures: {self.stats['total_figures']}")
        print(f"Auto-resolved: {self.stats['auto_resolved']} ({100.0 * self.stats['auto_resolved'] / max(self.stats['total_figures'], 1):.1f}%)")
        print(f"Manual review: {len(self.manual_review_queue)}")
        print(f"Errors: {self.stats['errors']}")
        print()

        if self.dry_run:
            print("💡 TIP: Run with --execute flag to apply Q-ID updates to the database.")


def main():
    """Main entry point for Q-ID resolver."""
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
        print("Run with --execute flag to apply Q-ID updates")
        print("⚠️ " * 20 + "\n")
    else:
        print("\n" + "🟢" * 20)
        print("LIVE EXECUTION MODE - Database will be updated with resolved Q-IDs")
        response = input("Type 'CONFIRM' to proceed: ")
        if response != "CONFIRM":
            print("❌ Aborted.")
            sys.exit(0)
        print("🟢" * 20 + "\n")

    resolver = QIDResolver(uri, user, pwd, dry_run=dry_run)

    try:
        resolver.run_resolution()

        # Generate report
        output_path = Path(__file__).parent.parent.parent / "qid_resolution_report.md"
        resolver.generate_report(str(output_path))

    except Exception as e:
        print(f"\n❌ Error during resolution: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        resolver.close()


if __name__ == "__main__":
    main()
