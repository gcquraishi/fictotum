#!/usr/bin/env python3
"""
Bulk import individual MediaWork nodes from top 10 historical fiction book series.
Uses Wikidata SPARQL to discover series members and imports with full provenance.

Target: 150-200 MediaWork nodes with PART_OF relationships to Series nodes.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, List, Optional
import requests
from neo4j import GraphDatabase

# Target series with Wikidata Q-IDs
TARGET_SERIES = {
    "Sharpe": "Q1240561",
    "Hornblower": "Q1626602",
    "Aubrey-Maturin": "Q378546",
    "Cadfael": "Q1024845",
    "Flashman": "Q1426970",
    "Shardlake": "Q7489558",
    "Thomas Pitt": "Q7793313",
    "William Monk": "Q8013835",
    "Amelia Peabody": "Q464414",
    "Phryne Fisher": "Q7188147"
}

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

AGENT_ID = "claude-sonnet-4.5"
BATCH_ID_PREFIX = "series-works"


class SeriesWorkImporter:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        self.session = None
        self.stats = {
            "series_created": 0,
            "works_created": 0,
            "works_skipped": 0,
            "relationships_created": 0,
            "errors": []
        }

    def __enter__(self):
        self.session = self.driver.session()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            self.session.close()
        self.driver.close()

    def query_wikidata_series_works(self, series_qid: str) -> List[Dict]:
        """
        Query Wikidata SPARQL for works that are part of a series (P179).
        Returns list of works with Q-ID, title, author, publication year, and series order.
        """
        sparql_query = f"""
        SELECT ?work ?workLabel ?authorLabel ?pubDate ?seriesOrdinal WHERE {{
          ?work wdt:P179 wd:{series_qid}.
          OPTIONAL {{ ?work wdt:P50 ?author. }}
          OPTIONAL {{ ?work wdt:P577 ?pubDate. }}
          OPTIONAL {{ ?work wdt:P1545 ?seriesOrdinal. }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        ORDER BY xsd:integer(?seriesOrdinal)
        """

        url = "https://query.wikidata.org/sparql"
        headers = {"User-Agent": "Fictotum/1.0 (Historical Fiction Research)"}

        try:
            response = requests.get(
                url,
                params={"query": sparql_query, "format": "json"},
                headers=headers,
                timeout=30
            )
            response.raise_for_status()

            data = response.json()
            works = []

            for binding in data.get("results", {}).get("bindings", []):
                work_uri = binding.get("work", {}).get("value", "")
                work_qid = work_uri.split("/")[-1] if work_uri else None

                if not work_qid or not work_qid.startswith("Q"):
                    continue

                title = binding.get("workLabel", {}).get("value", "Unknown")
                author = binding.get("authorLabel", {}).get("value")
                pub_date = binding.get("pubDate", {}).get("value", "")
                series_ordinal = binding.get("seriesOrdinal", {}).get("value")

                # Extract year from pub_date
                year = None
                if pub_date:
                    try:
                        year = int(pub_date.split("-")[0])
                    except (ValueError, IndexError):
                        pass

                # Parse series ordinal
                sequence_number = None
                if series_ordinal:
                    try:
                        sequence_number = int(series_ordinal)
                    except ValueError:
                        pass

                works.append({
                    "wikidata_id": work_qid,
                    "title": title,
                    "author": author,
                    "publication_year": year,
                    "sequence_number": sequence_number
                })

            return works

        except Exception as e:
            print(f"❌ Wikidata query failed for {series_qid}: {e}")
            self.stats["errors"].append(f"Wikidata query for {series_qid}: {str(e)}")
            return []

    def ensure_series_exists(self, series_name: str, series_qid: str, batch_id: str) -> bool:
        """
        Create Series node if it doesn't exist.
        Returns True if series was created or already exists.
        """
        try:
            result = self.session.run("""
                MERGE (s:Series {wikidata_id: $qid})
                ON CREATE SET
                    s.name = $name,
                    s.media_type = 'book_series',
                    s.created_at = datetime()
                WITH s
                MATCH (agent:Agent {agent_id: $agent_id})
                MERGE (s)-[r:CREATED_BY]->(agent)
                ON CREATE SET
                    r.timestamp = datetime(),
                    r.context = 'bulk_ingestion',
                    r.batch_id = $batch_id,
                    r.method = 'wikidata_enriched'
                RETURN s.name as name, s.wikidata_id as qid
            """, qid=series_qid, name=series_name, agent_id=AGENT_ID, batch_id=batch_id)

            record = result.single()
            if record:
                print(f"✓ Series ensured: {record['name']} ({record['qid']})")
                self.stats["series_created"] += 1
                return True
            return False

        except Exception as e:
            print(f"❌ Failed to create series {series_name}: {e}")
            self.stats["errors"].append(f"Series creation {series_name}: {str(e)}")
            return False

    def import_work(self, work: Dict, series_qid: str, batch_id: str) -> bool:
        """
        Import a single MediaWork and create PART_OF relationship to series.
        Returns True if successful.
        """
        try:
            # Check if work already exists
            check_result = self.session.run("""
                MATCH (m:MediaWork {wikidata_id: $qid})
                RETURN m.title as title
            """, qid=work["wikidata_id"])

            if check_result.single():
                print(f"  ⊙ Already exists: {work['title']} ({work['wikidata_id']})")
                self.stats["works_skipped"] += 1

                # Still ensure PART_OF relationship exists
                self.session.run("""
                    MATCH (m:MediaWork {wikidata_id: $work_qid})
                    MATCH (s:Series {wikidata_id: $series_qid})
                    MERGE (m)-[r:PART_OF]->(s)
                    ON CREATE SET
                        r.sequence_number = $sequence_number,
                        r.part_type = 'novel',
                        r.created_at = datetime()
                """, work_qid=work["wikidata_id"], series_qid=series_qid,
                     sequence_number=work.get("sequence_number"))

                return True

            # Create new MediaWork
            result = self.session.run("""
                // Create MediaWork node
                CREATE (m:MediaWork {
                    wikidata_id: $qid,
                    title: $title,
                    media_type: 'novel',
                    publication_year: $pub_year,
                    author: $author,
                    created_at: datetime()
                })

                // Link to agent
                WITH m
                MATCH (agent:Agent {agent_id: $agent_id})
                CREATE (m)-[:CREATED_BY {
                    timestamp: datetime(),
                    context: 'bulk_ingestion',
                    batch_id: $batch_id,
                    method: 'wikidata_enriched'
                }]->(agent)

                // Link to Series
                WITH m
                MATCH (s:Series {wikidata_id: $series_qid})
                CREATE (m)-[:PART_OF {
                    sequence_number: $sequence_number,
                    part_type: 'novel',
                    created_at: datetime()
                }]->(s)

                RETURN m.title as title, m.wikidata_id as qid
            """,
                qid=work["wikidata_id"],
                title=work["title"],
                pub_year=work.get("publication_year"),
                author=work.get("author"),
                agent_id=AGENT_ID,
                batch_id=batch_id,
                series_qid=series_qid,
                sequence_number=work.get("sequence_number")
            )

            record = result.single()
            if record:
                print(f"  ✓ Created: {record['title']} ({record['qid']})")
                self.stats["works_created"] += 1
                self.stats["relationships_created"] += 1
                return True

            return False

        except Exception as e:
            print(f"  ❌ Failed to import {work['title']}: {e}")
            self.stats["errors"].append(f"Work import {work['title']}: {str(e)}")
            return False

    def import_series(self, series_name: str, series_qid: str):
        """Import all works from a single series."""
        print(f"\n{'='*80}")
        print(f"Processing: {series_name} ({series_qid})")
        print(f"{'='*80}")

        batch_id = f"{BATCH_ID_PREFIX}-{series_name.lower().replace(' ', '-')}-{int(time.time())}"

        # Ensure Series node exists
        if not self.ensure_series_exists(series_name, series_qid, batch_id):
            print(f"❌ Skipping series due to creation failure")
            return

        # Query Wikidata for works
        print(f"🔍 Querying Wikidata for {series_name} works...")
        works = self.query_wikidata_series_works(series_qid)

        if not works:
            print(f"⚠️  No works found for {series_name}")
            return

        print(f"📚 Found {len(works)} works in {series_name}")

        # Import each work
        for i, work in enumerate(works, 1):
            print(f"[{i}/{len(works)}] {work['title']}")
            self.import_work(work, series_qid, batch_id)
            time.sleep(0.1)  # Be polite to database

        print(f"✓ Completed {series_name}: {self.stats['works_created']} created, {self.stats['works_skipped']} skipped")

    def run(self):
        """Run full import for all target series."""
        print("\n" + "="*80)
        print("Fictotum Series Works Import")
        print("Target: 150-200 MediaWork nodes from 10 book series")
        print("="*80 + "\n")

        start_time = time.time()

        for series_name, series_qid in TARGET_SERIES.items():
            try:
                self.import_series(series_name, series_qid)
                time.sleep(1)  # Pause between series to be polite to Wikidata
            except Exception as e:
                print(f"❌ Fatal error processing {series_name}: {e}")
                self.stats["errors"].append(f"Series {series_name}: {str(e)}")

        # Final stats
        elapsed = time.time() - start_time
        print("\n" + "="*80)
        print("IMPORT COMPLETE")
        print("="*80)
        print(f"Series processed: {self.stats['series_created']}")
        print(f"Works created: {self.stats['works_created']}")
        print(f"Works skipped (already exist): {self.stats['works_skipped']}")
        print(f"PART_OF relationships: {self.stats['relationships_created']}")
        print(f"Errors: {len(self.stats['errors'])}")
        print(f"Elapsed time: {elapsed:.1f}s")

        if self.stats["errors"]:
            print("\nErrors encountered:")
            for error in self.stats["errors"][:10]:  # Show first 10
                print(f"  - {error}")

        # Generate report
        self.generate_report()

    def generate_report(self):
        """Generate markdown report of import."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = f"/Users/gcquraishi/Documents/big-heavy/fictotum/series_works_import_report_{timestamp}.md"

        with open(report_path, "w") as f:
            f.write("# Series Works Import Report\n\n")
            f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## Summary\n\n")
            f.write(f"- **Series processed:** {self.stats['series_created']}\n")
            f.write(f"- **Works created:** {self.stats['works_created']}\n")
            f.write(f"- **Works skipped:** {self.stats['works_skipped']}\n")
            f.write(f"- **PART_OF relationships:** {self.stats['relationships_created']}\n")
            f.write(f"- **Errors:** {len(self.stats['errors'])}\n\n")

            f.write("## Target Series\n\n")
            for series_name, qid in TARGET_SERIES.items():
                f.write(f"- {series_name} ({qid})\n")

            if self.stats["errors"]:
                f.write("\n## Errors\n\n")
                for error in self.stats["errors"]:
                    f.write(f"- {error}\n")

        print(f"\n📄 Report saved to: {report_path}")


def main():
    """Main entry point."""
    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j credentials in environment")
        return 1

    try:
        with SeriesWorkImporter() as importer:
            importer.run()
        return 0
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
