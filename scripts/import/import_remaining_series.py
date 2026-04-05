#!/usr/bin/env python3
"""
Import remaining 4 series to reach 150-200 MediaWork target.
Focuses on Thomas Pitt, William Monk, Amelia Peabody, and Phryne Fisher series.
"""

import os
import time
from datetime import datetime
from typing import Dict, List
import requests
from neo4j import GraphDatabase

# Remaining series with curated book lists
SERIES_BOOKS = {
    "Thomas Pitt": {
        "qid": "Q7793313",
        "author": "Anne Perry",
        "books": [
            "The Cater Street Hangman", "Callander Square", "Paragon Walk",
            "Resurrection Row", "Rutland Place", "Bluegate Fields",
            "Death in the Devil's Acre", "Cardington Crescent", "Silence in Hanover Close",
            "Bethlehem Road", "Highgate Rise", "Belgrave Square",
            "Farriers' Lane", "The Hyde Park Headsman", "Traitors Gate",
            "Pentecost Alley", "Ashworth Hall", "Brunswick Gardens",
            "Bedford Square", "Half Moon Street", "The Whitechapel Conspiracy",
            "Southampton Row", "Seven Dials", "Long Spoon Lane",
            "Buckingham Palace Gardens", "Treason at Lisson Grove", "Dorchester Terrace",
            "Midnight at Marble Arch", "Death on Blackheath", "The Angel Court Affair",
            "Treachery at Lancaster Gate", "Murder on the Serpentine", "Death in Focus",
            "Three Debts Paid"
        ]
    },
    "William Monk": {
        "qid": "Q8013835",
        "author": "Anne Perry",
        "books": [
            "The Face of a Stranger", "A Dangerous Mourning", "Defend and Betray",
            "A Sudden, Fearful Death", "The Sins of the Wolf", "Cain His Brother",
            "Weighed in the Balance", "The Silent Cry", "A Breach of Promise",
            "The Twisted Root", "Slaves of Obsession", "Funeral in Blue",
            "Death of a Stranger", "The Shifting Tide", "Dark Assassin",
            "Execution Dock", "Acceptable Loss", "A Sunless Sea",
            "Blind Justice", "Blood on the Water", "Corridors of the Night",
            "Revenge in a Cold River", "An Echo of Murder", "Dark Tide Rising"
        ]
    },
    "Amelia Peabody": {
        "qid": "Q464414",
        "author": "Elizabeth Peters",
        "books": [
            "Crocodile on the Sandbank", "The Curse of the Pharaohs", "The Mummy Case",
            "Lion in the Valley", "The Deeds of the Disturber", "The Last Camel Died at Noon",
            "The Snake, the Crocodile and the Dog", "The Hippopotamus Pool", "Seeing a Large Cat",
            "The Ape Who Guards the Balance", "The Falcon at the Portal", "He Shall Thunder in the Sky",
            "Lord of the Silent", "The Golden One", "Children of the Storm",
            "Guardian of the Horizon", "The Serpent on the Crown", "Tomb of the Golden Bird",
            "A River in the Sky"
        ]
    },
    "Phryne Fisher": {
        "qid": "Q7188147",
        "author": "Kerry Greenwood",
        "books": [
            "Cocaine Blues", "Flying Too High", "Murder on the Ballarat Train",
            "Death at Victoria Dock", "The Green Mill Murder", "Blood and Circuses",
            "Ruddy Gore", "Urn Burial", "Raisins and Almonds",
            "Death Before Wicket", "Away With the Fairies", "Murder in Montparnasse",
            "The Castlemaine Murders", "Queen of the Flowers", "Death by Water",
            "Murder in the Dark", "Murder on a Midsummer Night", "Dead Man's Chest",
            "Unnatural Habits", "Murder and Mendelssohn", "Death in Daylesford"
        ]
    }
}

# Neo4j connection
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

AGENT_ID = "claude-sonnet-4.5"


class RemainingSeriesImporter:
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
        """Search Wikidata for book Q-ID by title."""
        sparql_query = f"""
        SELECT ?work ?workLabel WHERE {{
          ?work wdt:P31 wd:Q7725634.
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
            print(f"      ⚠️ Wikidata search error: {e}")

        return None

    def ensure_series_exists(self, series_name: str, series_qid: str, batch_id: str):
        """Ensure Series node exists."""
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
            print(f"  ❌ Series creation error: {e}")
            self.stats["errors"].append(f"Series {series_name}: {str(e)}")

    def import_book(self, title: str, series_qid: str, sequence_number: int,
                    author: str, batch_id: str) -> bool:
        """Import a single book with Q-ID search."""
        qid = self.search_wikidata_by_title(title, author)

        if qid:
            print(f"      ✓ Q-ID: {qid}")
            self.stats["qids_found"] += 1

            # Check if exists
            check = self.session.run("""
                MATCH (m:MediaWork {wikidata_id: $qid})
                RETURN m.title
            """, qid=qid)

            if check.single():
                print(f"      ⊙ Exists, ensuring PART_OF")
                self.stats["works_skipped"] += 1

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

            # Create with Q-ID
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
                print(f"      ✓ Created")
                return True

            except Exception as e:
                print(f"      ❌ Create failed: {e}")
                self.stats["errors"].append(f"{title}: {str(e)}")
                return False

        else:
            print(f"      ⚠️ No Q-ID, creating provisional")
            self.stats["qids_missing"] += 1

            # Check by title
            check = self.session.run("""
                MATCH (m:MediaWork {title: $title})
                RETURN m.title
            """, title=title)

            if check.single():
                print(f"      ⊙ Exists by title")
                self.stats["works_skipped"] += 1
                return True

            # Create provisional
            try:
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
                print(f"      ✓ Created provisional")
                return True

            except Exception as e:
                print(f"      ❌ Provisional failed: {e}")
                self.stats["errors"].append(f"{title} (prov): {str(e)}")
                return False

    def import_series(self, series_name: str, series_data: Dict):
        """Import all books from a series."""
        print(f"\n{'='*80}")
        print(f"Processing: {series_name} ({series_data['qid']})")
        print(f"{'='*80}")

        batch_id = f"series-works-{series_name.lower().replace(' ', '-')}-{int(time.time())}"
        self.ensure_series_exists(series_name, series_data["qid"], batch_id)

        books = series_data["books"]
        print(f"📚 Importing {len(books)} books")

        for i, book_title in enumerate(books, 1):
            print(f"  [{i}/{len(books)}] {book_title}")
            self.import_book(
                title=book_title,
                series_qid=series_data["qid"],
                sequence_number=i,
                author=series_data["author"],
                batch_id=batch_id
            )
            time.sleep(0.5)

        self.stats["series_processed"] += 1
        print(f"✓ Completed {series_name}")

    def run(self):
        """Run import for remaining series."""
        print("\n" + "="*80)
        print("Fictotum Remaining Series Import")
        print("Target: Add 80+ books to reach 150-200 total")
        print("="*80 + "\n")

        start_time = time.time()

        for series_name, series_data in SERIES_BOOKS.items():
            try:
                self.import_series(series_name, series_data)
                time.sleep(1)
            except Exception as e:
                print(f"❌ Fatal error: {e}")
                self.stats["errors"].append(f"Series {series_name}: {str(e)}")

        elapsed = time.time() - start_time
        print("\n" + "="*80)
        print("IMPORT COMPLETE")
        print("="*80)
        print(f"Series processed: {self.stats['series_processed']}")
        print(f"Works created: {self.stats['works_created']}")
        print(f"Works skipped: {self.stats['works_skipped']}")
        print(f"Q-IDs found: {self.stats['qids_found']}")
        print(f"Q-IDs missing: {self.stats['qids_missing']}")
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
        report_path = f"/Users/gcquraishi/Documents/big-heavy/fictotum/remaining_series_import_report_{timestamp}.md"

        with open(report_path, "w") as f:
            f.write("# Remaining Series Import Report\n\n")
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

        print(f"\n📄 Report: {report_path}")


def main():
    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j credentials")
        return 1

    try:
        with RemainingSeriesImporter() as importer:
            importer.run()
        return 0
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
