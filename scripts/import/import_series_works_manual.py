#!/usr/bin/env python3
"""
Manual import of series works using curated book lists.
Since Wikidata P179 relationships are incomplete, we'll use known book titles.
"""

import os
import time
from datetime import datetime
from typing import Dict, List
import requests
from neo4j import GraphDatabase

# Manually curated book lists with known titles
SERIES_BOOKS = {
    "Sharpe": {
        "qid": "Q1240561",
        "author": "Bernard Cornwell",
        "books": [
            "Sharpe's Eagle", "Sharpe's Gold", "Sharpe's Company", "Sharpe's Sword",
            "Sharpe's Enemy", "Sharpe's Honour", "Sharpe's Regiment", "Sharpe's Siege",
            "Sharpe's Revenge", "Sharpe's Waterloo", "Sharpe's Devil", "Sharpe's Rifles",
            "Sharpe's Havoc", "Sharpe's Eagle", "Sharpe's Fury", "Sharpe's Battle",
            "Sharpe's Skirmish", "Sharpe's Escape", "Sharpe's Fortress", "Sharpe's Triumph",
            "Sharpe's Tiger", "Sharpe's Trafalgar", "Sharpe's Prey", "Sharpe's Assassin"
        ]
    },
    "Hornblower": {
        "qid": "Q1626602",
        "author": "C. S. Forester",
        "books": [
            "Mr. Midshipman Hornblower", "Lieutenant Hornblower", "Hornblower and the Hotspur",
            "Hornblower and the Atropos", "Hornblower and the Crisis", "The Happy Return",
            "A Ship of the Line", "Flying Colours", "The Commodore", "Lord Hornblower",
            "Hornblower in the West Indies"
        ]
    },
    "Aubrey-Maturin": {
        "qid": "Q378546",
        "author": "Patrick O'Brian",
        "books": [
            "Master and Commander", "Post Captain", "H.M.S. Surprise", "The Mauritius Command",
            "Desolation Island", "The Fortune of War", "The Surgeon's Mate", "The Ionian Mission",
            "Treason's Harbour", "The Far Side of the World", "The Reverse of the Medal",
            "The Letter of Marque", "The Thirteen-Gun Salute", "The Nutmeg of Consolation",
            "Clarissa Oakes", "The Wine-Dark Sea", "The Commodore", "The Yellow Admiral",
            "The Hundred Days", "Blue at the Mizzen"
        ]
    },
    "Cadfael": {
        "qid": "Q1024845",
        "author": "Ellis Peters",
        "books": [
            "A Morbid Taste for Bones", "One Corpse Too Many", "Monk's-Hood",
            "Saint Peter's Fair", "The Leper of Saint Giles", "The Virgin in the Ice",
            "The Sanctuary Sparrow", "The Devil's Novice", "Dead Man's Ransom",
            "The Pilgrim of Hate", "An Excellent Mystery", "The Raven in the Foregate",
            "The Rose Rent", "The Hermit of Eyton Forest", "The Confession of Brother Haluin",
            "The Heretic's Apprentice", "The Potter's Field", "The Summer of the Danes",
            "The Holy Thief", "Brother Cadfael's Penance"
        ]
    },
    "Flashman": {
        "qid": "Q1426970",
        "author": "George MacDonald Fraser",
        "books": [
            "Flashman", "Royal Flash", "Flash for Freedom!", "Flashman at the Charge",
            "Flashman in the Great Game", "Flashman's Lady", "Flashman and the Redskins",
            "Flashman and the Dragon", "Flashman and the Mountain of Light",
            "Flashman and the Angel of the Lord", "Flashman and the Tiger"
        ]
    },
    "Shardlake": {
        "qid": "Q7489558",
        "author": "C. J. Sansom",
        "books": [
            "Dissolution", "Dark Fire", "Sovereign", "Revelation",
            "Heartstone", "Lamentation", "Tombland"
        ]
    }
}

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

AGENT_ID = "claude-sonnet-4.5"


class ManualSeriesImporter:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        self.session = None
        self.stats = {
            "series_processed": 0,
            "works_created": 0,
            "works_skipped": 0,
            "qids_found": 0,
            "qids_missing": 0,
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

    def search_wikidata_by_title(self, title: str, author: str = None) -> str:
        """
        Search Wikidata for a book by title and optional author.
        Returns Q-ID if found, None otherwise.
        """
        # Try exact title match first
        sparql_query = f"""
        SELECT ?work ?workLabel WHERE {{
          ?work wdt:P31 wd:Q7725634.  # instance of: literary work
          ?work rdfs:label "{title}"@en.
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        LIMIT 1
        """

        url = "https://query.wikidata.org/sparql"
        headers = {"User-Agent": "Fictotum/1.0"}

        try:
            response = requests.get(
                url,
                params={"query": sparql_query, "format": "json"},
                headers=headers,
                timeout=30
            )

            if response.status_code == 200:
                data = response.json()
                bindings = data.get("results", {}).get("bindings", [])

                if bindings:
                    work_uri = bindings[0].get("work", {}).get("value", "")
                    qid = work_uri.split("/")[-1] if work_uri else None
                    if qid and qid.startswith("Q"):
                        return qid

        except Exception as e:
            print(f"      ⚠️ Wikidata search error for '{title}': {e}")

        return None

    def ensure_series_exists(self, series_name: str, series_qid: str, batch_id: str):
        """Ensure Series node exists in database."""
        try:
            self.session.run("""
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
            """, qid=series_qid, name=series_name, agent_id=AGENT_ID, batch_id=batch_id)

        except Exception as e:
            print(f"  ❌ Failed to ensure series {series_name}: {e}")
            self.stats["errors"].append(f"Series {series_name}: {str(e)}")

    def import_book(self, title: str, series_qid: str, sequence_number: int,
                    author: str, batch_id: str) -> bool:
        """
        Import a single book, searching for its Q-ID if possible.
        """
        # Try to find Q-ID
        qid = self.search_wikidata_by_title(title, author)

        if qid:
            print(f"      ✓ Found Q-ID: {qid}")
            self.stats["qids_found"] += 1

            # Check if already exists
            check = self.session.run("""
                MATCH (m:MediaWork {wikidata_id: $qid})
                RETURN m.title
            """, qid=qid)

            if check.single():
                print(f"      ⊙ Already exists, ensuring PART_OF")
                self.stats["works_skipped"] += 1

                # Ensure PART_OF relationship
                self.session.run("""
                    MATCH (m:MediaWork {wikidata_id: $qid})
                    MATCH (s:Series {wikidata_id: $series_qid})
                    MERGE (m)-[r:PART_OF]->(s)
                    ON CREATE SET
                        r.sequence_number = $seq,
                        r.part_type = 'novel',
                        r.created_at = datetime()
                """, qid=qid, series_qid=series_qid, seq=sequence_number)

                return True

            # Create new work with Q-ID
            try:
                self.session.run("""
                    CREATE (m:MediaWork {
                        wikidata_id: $qid,
                        title: $title,
                        media_type: 'novel',
                        author: $author,
                        created_at: datetime()
                    })
                    WITH m
                    MATCH (agent:Agent {agent_id: $agent_id})
                    CREATE (m)-[:CREATED_BY {
                        timestamp: datetime(),
                        context: 'bulk_ingestion',
                        batch_id: $batch_id,
                        method: 'wikidata_enriched'
                    }]->(agent)
                    WITH m
                    MATCH (s:Series {wikidata_id: $series_qid})
                    CREATE (m)-[:PART_OF {
                        sequence_number: $seq,
                        part_type: 'novel',
                        created_at: datetime()
                    }]->(s)
                """, qid=qid, title=title, author=author, agent_id=AGENT_ID,
                     batch_id=batch_id, series_qid=series_qid, seq=sequence_number)

                self.stats["works_created"] += 1
                self.stats["relationships_created"] += 1
                print(f"      ✓ Created with Q-ID")
                return True

            except Exception as e:
                print(f"      ❌ Failed to create: {e}")
                self.stats["errors"].append(f"{title}: {str(e)}")
                return False

        else:
            print(f"      ⚠️ No Q-ID found, creating provisional node")
            self.stats["qids_missing"] += 1

            # Create without Q-ID (provisional)
            try:
                # Check if exists by title
                check = self.session.run("""
                    MATCH (m:MediaWork {title: $title})
                    RETURN m.title
                """, title=title)

                if check.single():
                    print(f"      ⊙ Already exists by title")
                    self.stats["works_skipped"] += 1
                    return True

                # Generate provisional canonical_id
                timestamp = int(time.time() * 1000)
                slug = title.lower().replace(" ", "-").replace("'", "")[:50]
                canonical_id = f"PROV:{slug}-{timestamp}"

                self.session.run("""
                    CREATE (m:MediaWork {
                        canonical_id: $canonical_id,
                        title: $title,
                        media_type: 'novel',
                        author: $author,
                        created_at: datetime(),
                        needs_wikidata_enrichment: true
                    })
                    WITH m
                    MATCH (agent:Agent {agent_id: $agent_id})
                    CREATE (m)-[:CREATED_BY {
                        timestamp: datetime(),
                        context: 'bulk_ingestion',
                        batch_id: $batch_id,
                        method: 'manual_provisional'
                    }]->(agent)
                    WITH m
                    MATCH (s:Series {wikidata_id: $series_qid})
                    CREATE (m)-[:PART_OF {
                        sequence_number: $seq,
                        part_type: 'novel',
                        created_at: datetime()
                    }]->(s)
                """, canonical_id=canonical_id, title=title, author=author,
                     agent_id=AGENT_ID, batch_id=batch_id, series_qid=series_qid,
                     seq=sequence_number)

                self.stats["works_created"] += 1
                self.stats["relationships_created"] += 1
                print(f"      ✓ Created provisional node")
                return True

            except Exception as e:
                print(f"      ❌ Failed to create provisional: {e}")
                self.stats["errors"].append(f"{title} (provisional): {str(e)}")
                return False

    def import_series(self, series_name: str, series_data: Dict):
        """Import all books from a series."""
        print(f"\n{'='*80}")
        print(f"Processing: {series_name} ({series_data['qid']})")
        print(f"{'='*80}")

        batch_id = f"series-works-{series_name.lower().replace(' ', '-')}-{int(time.time())}"

        # Ensure series exists
        self.ensure_series_exists(series_name, series_data["qid"], batch_id)

        books = series_data["books"]
        print(f"📚 Importing {len(books)} books from {series_name}")

        for i, book_title in enumerate(books, 1):
            print(f"  [{i}/{len(books)}] {book_title}")
            self.import_book(
                title=book_title,
                series_qid=series_data["qid"],
                sequence_number=i,
                author=series_data["author"],
                batch_id=batch_id
            )
            time.sleep(0.5)  # Be polite to Wikidata

        self.stats["series_processed"] += 1
        print(f"✓ Completed {series_name}")

    def run(self):
        """Run import for all series."""
        print("\n" + "="*80)
        print("Fictotum Manual Series Works Import")
        print("Target: 150-200 MediaWork nodes from book series")
        print("="*80 + "\n")

        start_time = time.time()

        for series_name, series_data in SERIES_BOOKS.items():
            try:
                self.import_series(series_name, series_data)
                time.sleep(1)
            except Exception as e:
                print(f"❌ Fatal error processing {series_name}: {e}")
                self.stats["errors"].append(f"Series {series_name}: {str(e)}")

        # Final stats
        elapsed = time.time() - start_time
        print("\n" + "="*80)
        print("IMPORT COMPLETE")
        print("="*80)
        print(f"Series processed: {self.stats['series_processed']}")
        print(f"Works created: {self.stats['works_created']}")
        print(f"Works skipped: {self.stats['works_skipped']}")
        print(f"Q-IDs found: {self.stats['qids_found']}")
        print(f"Q-IDs missing (provisional): {self.stats['qids_missing']}")
        print(f"PART_OF relationships: {self.stats['relationships_created']}")
        print(f"Errors: {len(self.stats['errors'])}")
        print(f"Elapsed time: {elapsed:.1f}s")

        if self.stats["errors"]:
            print("\nErrors:")
            for error in self.stats["errors"][:10]:
                print(f"  - {error}")

        self.generate_report()

    def generate_report(self):
        """Generate markdown report."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = f"/Users/gcquraishi/Documents/big-heavy/fictotum/series_works_import_report_{timestamp}.md"

        with open(report_path, "w") as f:
            f.write("# Series Works Import Report\n\n")
            f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## Summary\n\n")
            f.write(f"- **Series processed:** {self.stats['series_processed']}\n")
            f.write(f"- **Works created:** {self.stats['works_created']}\n")
            f.write(f"- **Works skipped:** {self.stats['works_skipped']}\n")
            f.write(f"- **Q-IDs found:** {self.stats['qids_found']}\n")
            f.write(f"- **Q-IDs missing:** {self.stats['qids_missing']}\n")
            f.write(f"- **PART_OF relationships:** {self.stats['relationships_created']}\n")
            f.write(f"- **Errors:** {len(self.stats['errors'])}\n\n")

            f.write("## Series Imported\n\n")
            for series_name, data in SERIES_BOOKS.items():
                f.write(f"- **{series_name}** ({data['qid']}) - {len(data['books'])} books\n")

            if self.stats["errors"]:
                f.write("\n## Errors\n\n")
                for error in self.stats["errors"]:
                    f.write(f"- {error}\n")

        print(f"\n📄 Report saved: {report_path}")


def main():
    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j credentials")
        return 1

    try:
        with ManualSeriesImporter() as importer:
            importer.run()
        return 0
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
