#!/usr/bin/env python3
"""
Orphan Connection Script — finds media works for orphan figures via Wikidata SPARQL.

For each orphan HistoricalFigure (no APPEARS_IN or INTERACTED_WITH):
  1. Query Wikidata for works they appear in (P1441 — present in work)
  2. Query Wikidata for works about them (P921 — main subject)
  3. Create batch-import JSON with new MediaWorks + APPEARS_IN relationships

Usage:
    python3 scripts/qa/connect-orphans.py --dry-run
    python3 scripts/qa/connect-orphans.py --execute
    python3 scripts/qa/connect-orphans.py --dry-run --limit 20
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Optional
from dotenv import load_dotenv
from neo4j import GraphDatabase
import requests

load_dotenv(Path(__file__).parent.parent.parent / ".env")

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
SPARQL_HEADERS = {
    "Accept": "application/sparql-results+json",
    "User-Agent": "FictotumOrphanConnector/1.0 (https://fictotum.com)"
}
SPARQL_DELAY = 1.5
BATCH_SIZE = 50

# Media types we care about (Wikidata instance-of Q-IDs → our types)
MEDIA_TYPE_MAP = {
    "Q11424": "FILM",          # film
    "Q5398426": "TV_SERIES",   # television series
    "Q7725634": "BOOK",        # literary work
    "Q571": "BOOK",            # book
    "Q8261": "BOOK",           # novel
    "Q25379": "PLAY",          # play
    "Q7889": "GAME",           # video game
    "Q21198342": "COMIC",      # comic book series
    "Q1004": "COMIC",          # comic
    "Q24856": "FILM_SERIES",   # film series
    "Q5398426": "TV_SERIES",   # television series
    "Q581714": "BOOK_SERIES",  # book series
    "Q20937557": "TV_SERIES",  # television miniseries
    "Q506240": "TV_SERIES",    # TV film
}


def sparql_query(query: str, retries: int = 3) -> list:
    for attempt in range(retries):
        try:
            resp = requests.get(
                SPARQL_ENDPOINT,
                params={"query": query},
                headers=SPARQL_HEADERS,
                timeout=60
            )
            if resp.status_code == 429:
                wait = int(resp.headers.get("Retry-After", 30))
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()["results"]["bindings"]
        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                print(f"  SPARQL error (attempt {attempt+1}): {e}")
                time.sleep(5 * (attempt + 1))
            else:
                print(f"  SPARQL failed after {retries} attempts: {e}")
                return []
    return []


def qid(uri: str) -> str:
    return uri.split("/")[-1]


def get_orphan_figures(driver) -> List[Dict]:
    """Get all orphan HistoricalFigures with Wikidata IDs."""
    with driver.session() as session:
        result = session.run(
            """MATCH (f:HistoricalFigure)
               WHERE NOT (f)-[:APPEARS_IN]->(:MediaWork)
                 AND NOT (f)-[:INTERACTED_WITH]-(:HistoricalFigure)
                 AND f.wikidata_id IS NOT NULL
                 AND f.wikidata_id STARTS WITH 'Q'
               RETURN f.canonical_id AS cid, f.name AS name,
                      f.wikidata_id AS wid, f.era AS era
               ORDER BY f.name"""
        )
        return [dict(r) for r in result]


def get_existing_work_qids(driver) -> Set[str]:
    """Get all existing MediaWork Wikidata IDs."""
    with driver.session() as session:
        result = session.run(
            "MATCH (m:MediaWork) WHERE m.wikidata_id IS NOT NULL RETURN m.wikidata_id AS wid"
        )
        return {r["wid"] for r in result}


def query_figure_media_appearances(figure_qids: List[str]) -> List[dict]:
    """Query Wikidata for media works featuring these figures.
    Uses P1441 (present in work) and reverse P161 (cast member)."""
    values = " ".join(f"wd:{q}" for q in figure_qids)
    query = f"""
    SELECT DISTINCT ?person ?work ?workLabel ?workTypeLabel ?year ?directorLabel WHERE {{
      VALUES ?person {{ {values} }}
      {{
        # Figure appears in work (P1441)
        ?person wdt:P1441 ?work .
      }} UNION {{
        # Work has this figure as main subject (P921)
        ?work wdt:P921 ?person .
      }} UNION {{
        # Work is about this figure (P180 - depicts)
        ?work wdt:P180 ?person .
      }}
      # Get work type
      OPTIONAL {{ ?work wdt:P31 ?workType . }}
      # Get year
      OPTIONAL {{ ?work wdt:P577 ?pubDate . BIND(YEAR(?pubDate) AS ?year) }}
      OPTIONAL {{ ?work wdt:P57 ?director . }}
      # Filter to creative works (films, books, TV, etc.)
      FILTER EXISTS {{ ?work wdt:P31 ?type .
        VALUES ?type {{ wd:Q11424 wd:Q5398426 wd:Q7725634 wd:Q571 wd:Q8261
                        wd:Q25379 wd:Q7889 wd:Q24856 wd:Q20937557 wd:Q506240
                        wd:Q21198342 wd:Q1004 wd:Q581714 }} }}
      # Only modern media works (post-1800) — skip ancient manuscripts
      FILTER(!BOUND(?year) || ?year >= 1800)
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    results = sparql_query(query)
    out = []
    for r in results:
        out.append({
            "person_qid": qid(r["person"]["value"]),
            "work_qid": qid(r["work"]["value"]),
            "work_title": r.get("workLabel", {}).get("value", ""),
            "work_type": r.get("workTypeLabel", {}).get("value", ""),
            "year": int(r["year"]["value"]) if "year" in r and r["year"].get("value") else None,
            "director": r.get("directorLabel", {}).get("value", ""),
        })
    return out


def map_media_type(wikidata_type: str) -> str:
    """Map Wikidata work type label to our media_type enum."""
    t = wikidata_type.lower()
    if 'film' in t and 'series' not in t:
        return 'FILM'
    if 'television' in t or 'tv' in t:
        return 'TV_SERIES'
    if 'novel' in t or 'book' in t or 'literary' in t:
        return 'BOOK'
    if 'play' in t:
        return 'PLAY'
    if 'video game' in t or 'game' in t:
        return 'GAME'
    if 'comic' in t:
        return 'COMIC'
    if 'miniseries' in t:
        return 'TV_SERIES'
    return 'FILM'  # default


def build_batch_json(
    appearances: List[dict],
    existing_work_qids: Set[str],
    orphan_map: Dict[str, str],  # qid -> name
) -> dict:
    """Build batch-import JSON from appearance data."""
    works = {}  # work_qid -> work dict
    relationships = []

    for app in appearances:
        work_qid = app["work_qid"]
        person_qid = app["person_qid"]

        # Add work if not already in DB and not already added
        if work_qid not in existing_work_qids and work_qid not in works:
            works[work_qid] = {
                "title": app["work_title"],
                "wikidata_id": work_qid,
                "media_type": map_media_type(app["work_type"]),
            }
            if app["year"]:
                works[work_qid]["release_year"] = app["year"]
            if app["director"]:
                works[work_qid]["creator"] = app["director"]

        # Add APPEARS_IN relationship
        relationships.append({
            "from_id": person_qid,
            "from_type": "HistoricalFigure",
            "to_id": work_qid,
            "to_type": "MediaWork",
            "rel_type": "APPEARS_IN",
            "properties": {
                "notes": f"Wikidata SPARQL discovery for orphan connection"
            }
        })

    today = datetime.now().strftime("%Y-%m-%d")
    return {
        "metadata": {
            "source": "Wikidata SPARQL (orphan connection)",
            "curator": "connect-orphans-script",
            "date": today,
            "description": f"Media works discovered for {len(orphan_map)} orphan figures via Wikidata"
        },
        "works": list(works.values()),
        "relationships": relationships,
    }


def main():
    parser = argparse.ArgumentParser(description="Connect Orphan Figures")
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--limit", type=int, default=0, help="Limit figures to process")
    parser.add_argument("--output", type=str, default="data/orphan_connections.json")
    args = parser.parse_args()

    dry_run = not args.execute

    print("=" * 70)
    print("Orphan Figure Connection Script")
    print("=" * 70)
    print(f"Mode: {'DRY RUN' if dry_run else 'GENERATE OUTPUT'}")
    print()

    uri = os.environ["NEO4J_URI"]
    user = os.environ["NEO4J_USERNAME"]
    password = os.environ["NEO4J_PASSWORD"]
    driver = GraphDatabase.driver(uri, auth=(user, password))

    # Step 1: Get orphans
    print("Step 1: Finding orphan figures...")
    orphans = get_orphan_figures(driver)
    if args.limit:
        orphans = orphans[:args.limit]
    print(f"  Found {len(orphans)} orphan figures with Wikidata IDs")

    orphan_map = {o["wid"]: o["name"] for o in orphans}

    # Step 2: Get existing works
    print("\nStep 2: Loading existing MediaWorks...")
    existing_work_qids = get_existing_work_qids(driver)
    print(f"  {len(existing_work_qids)} works already in database")

    # Step 3: Query Wikidata for appearances
    print("\nStep 3: Querying Wikidata for media appearances...")
    all_appearances = []
    figure_qids = [o["wid"] for o in orphans]

    for i in range(0, len(figure_qids), BATCH_SIZE):
        batch = figure_qids[i:i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1}: querying {len(batch)} figures...")
        results = query_figure_media_appearances(batch)
        all_appearances.extend(results)
        if i + BATCH_SIZE < len(figure_qids):
            time.sleep(SPARQL_DELAY)

    print(f"  Total appearances found: {len(all_appearances)}")

    # Deduplicate and filter out works with no proper title (just Q-IDs)
    seen = set()
    unique_appearances = []
    for app in all_appearances:
        key = (app["person_qid"], app["work_qid"])
        if key in seen:
            continue
        # Skip works whose title is just a Q-ID (label not resolved)
        title = app.get("work_title", "")
        if not title or title.startswith("Q") and title[1:].isdigit():
            continue
        seen.add(key)
        unique_appearances.append(app)
    print(f"  Unique figure→work pairs: {len(unique_appearances)}")

    # Count figures that would be connected
    connected_figures = set(app["person_qid"] for app in unique_appearances)
    still_orphan = set(figure_qids) - connected_figures
    print(f"\n  Figures that would be connected: {len(connected_figures)}")
    print(f"  Figures still orphaned: {len(still_orphan)}")

    if still_orphan:
        print(f"\n  Still-orphaned figures:")
        for qid_val in sorted(still_orphan):
            name = orphan_map.get(qid_val, "?")
            print(f"    {qid_val}: {name}")

    # Step 4: Build output
    if len(unique_appearances) == 0:
        print("\n  No new connections found. Nothing to output.")
        driver.close()
        return

    batch_json = build_batch_json(unique_appearances, existing_work_qids, orphan_map)

    new_works = len(batch_json["works"])
    existing_work_connections = len(unique_appearances) - new_works

    print(f"\n  New MediaWorks to create: {new_works}")
    print(f"  Connections to existing works: {existing_work_connections}")
    print(f"  Total APPEARS_IN relationships: {len(batch_json['relationships'])}")

    if dry_run:
        print("\n  DRY RUN — showing first 20 connections:")
        for app in unique_appearances[:20]:
            existing = "EXISTS" if app["work_qid"] in existing_work_qids else "NEW"
            print(f"    [{existing}] {orphan_map.get(app['person_qid'], '?')} → {app['work_title']} ({app.get('year', '?')})")
    else:
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(batch_json, f, indent=2, ensure_ascii=False)
        print(f"\n  Output saved to: {output_path}")
        print(f"\n  Next steps:")
        print(f"    1. Review the JSON")
        print(f"    2. python3 scripts/import/validate_batch_json.py {output_path}")
        print(f"    3. python3 scripts/import/batch_import.py {output_path} --dry-run")
        print(f"    4. python3 scripts/import/batch_import.py {output_path} --execute")

    driver.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
