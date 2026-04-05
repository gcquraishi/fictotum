#!/usr/bin/env python3
"""
Direct Cypher import for orphan connections.
Bypasses batch_import.py to avoid session management issues.
"""

import os
import json
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from neo4j import GraphDatabase

load_dotenv(Path(__file__).parent.parent.parent / ".env")

INPUT_FILE = Path(__file__).parent.parent.parent / "data" / "orphan_connections.json"


def main():
    uri = os.environ["NEO4J_URI"]
    user = os.environ["NEO4J_USERNAME"]
    password = os.environ["NEO4J_PASSWORD"]
    driver = GraphDatabase.driver(uri, auth=(user, password))

    with open(INPUT_FILE) as f:
        data = json.load(f)

    works = data["works"]
    rels = data["relationships"]
    timestamp = datetime.utcnow().isoformat()

    print(f"Works to create: {len(works)}")
    print(f"Relationships to create: {len(rels)}")

    # Ensure agent exists
    with driver.session() as session:
        session.run(
            "MERGE (a:Agent {name: $name}) "
            "ON CREATE SET a.created_at = datetime()",
            name="orphan-connector"
        )

    # Create works one at a time (MERGE to avoid duplicates)
    created_works = 0
    skipped_works = 0
    for w in works:
        with driver.session() as session:
            # Generate media_id in Python to avoid Cypher quoting issues
            import re
            slug = re.sub(r'[^a-z0-9]+', '-', w["title"].lower()).strip('-')[:60]
            media_id = f"media-{slug}-{w['wikidata_id']}"
            result = session.run(
                """MERGE (m:MediaWork {wikidata_id: $wid})
                   ON CREATE SET
                     m.title = $title,
                     m.media_type = $media_type,
                     m.release_year = $release_year,
                     m.media_id = $media_id
                   WITH m
                   MERGE (a:Agent {name: 'orphan-connector'})
                   MERGE (m)-[:CREATED_BY {timestamp: datetime(), context: 'orphan_connection', method: 'wikidata_sparql'}]->(a)
                   RETURN m.title AS title, m.wikidata_id AS wid""",
                wid=w["wikidata_id"],
                title=w["title"],
                media_type=w.get("media_type", "FILM"),
                release_year=w.get("release_year"),
                media_id=media_id,
            )
            rec = result.single()
            if rec:
                created_works += 1
            else:
                skipped_works += 1

    print(f"\nWorks created/merged: {created_works}")

    # Create relationships
    created_rels = 0
    skipped_rels = 0
    for r in rels:
        with driver.session() as session:
            try:
                result = session.run(
                    """MATCH (f:HistoricalFigure)
                       WHERE f.canonical_id = $from_id OR f.wikidata_id = $from_id
                       MATCH (m:MediaWork {wikidata_id: $to_id})
                       MERGE (f)-[rel:APPEARS_IN]->(m)
                       ON CREATE SET rel.source = 'wikidata_sparql',
                                     rel.timestamp = datetime(),
                                     rel.notes = $notes
                       RETURN f.name AS fname, m.title AS mtitle""",
                    from_id=r["from_id"],
                    to_id=r["to_id"],
                    notes=r.get("properties", {}).get("notes", "orphan connection"),
                )
                rec = result.single()
                if rec:
                    created_rels += 1
                else:
                    skipped_rels += 1
            except Exception as e:
                print(f"  Error: {r['from_id']} -> {r['to_id']}: {e}")
                skipped_rels += 1

    print(f"Relationships created/merged: {created_rels}")
    print(f"Relationships skipped/failed: {skipped_rels}")

    # Check orphan count after
    with driver.session() as session:
        result = session.run(
            """MATCH (f:HistoricalFigure)
               WHERE NOT (f)-[:APPEARS_IN]->(:MediaWork)
                 AND NOT (f)-[:INTERACTED_WITH]-(:HistoricalFigure)
               RETURN count(f) AS orphan_count"""
        )
        count = result.single()["orphan_count"]
        print(f"\nOrphan figures remaining: {count}")

    # Check total entity count
    with driver.session() as session:
        result = session.run(
            "MATCH (n) WHERE n:HistoricalFigure OR n:MediaWork RETURN count(n) AS total"
        )
        total = result.single()["total"]
        print(f"Total entities (figures + works): {total}")

    driver.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
