#!/usr/bin/env python3
"""
Populate alternate_names (aka) for HistoricalFigure nodes from Wikidata skos:altLabel.

Queries Wikidata SPARQL for English alternate labels for each figure's Q-ID,
then updates Neo4j nodes with the alternate_names array property.

The UI already supports displaying alternate names (FIC-24).

Usage:
    python3 scripts/migration/populate_alternate_names.py [--dry-run] [--limit N]

Author: claude-research-analyst
Date: 2026-03-13
"""

import os
import sys
import time
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables from web-app/.env.local
env_path = Path(__file__).parent.parent.parent / "web-app" / ".env.local"
load_dotenv(env_path)

WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql"
REQUEST_DELAY = 0.5  # seconds between Wikidata requests to avoid rate limiting
BATCH_SIZE = 20       # how many Q-IDs to query per SPARQL request


def get_driver():
    """Create Neo4j driver using environment variables."""
    uri = os.getenv("NEO4J_URI", "")
    # Neo4j Aura SSL certificate handling
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD", "")
    return GraphDatabase.driver(uri, auth=(user, pwd))


def get_figures_needing_alternate_names(driver, limit=None):
    """
    Fetch all HistoricalFigure nodes that have a wikidata_id but no alternate_names,
    or have an empty alternate_names array.
    """
    limit_clause = f"LIMIT {limit}" if limit else ""
    query = f"""
        MATCH (f:HistoricalFigure)
        WHERE f.wikidata_id IS NOT NULL
          AND (f.alternate_names IS NULL OR size(f.alternate_names) = 0)
        RETURN f.canonical_id AS canonical_id,
               f.wikidata_id AS wikidata_id,
               f.name AS name
        ORDER BY f.name
        {limit_clause}
    """
    with driver.session() as session:
        result = session.run(query)
        return [{"canonical_id": r["canonical_id"],
                 "wikidata_id": r["wikidata_id"],
                 "name": r["name"]} for r in result]


def fetch_alternate_names_batch(qids: list[str]) -> dict[str, list[str]]:
    """
    Query Wikidata SPARQL for English skos:altLabel for a batch of Q-IDs.
    Returns a dict mapping Q-ID -> list of alternate names.
    """
    if not qids:
        return {}

    # Build VALUES clause
    values_list = " ".join(f"(wd:{qid})" for qid in qids)

    sparql_query = f"""
    SELECT ?item ?altLabel WHERE {{
      VALUES (?item) {{ {values_list} }}
      ?item skos:altLabel ?altLabel .
      FILTER(LANG(?altLabel) = "en")
    }}
    """

    headers = {
        "Accept": "application/sparql-results+json",
        "User-Agent": "Fictotum-AltNames-Bot/1.0 (https://fictotum.com)"
    }

    try:
        resp = requests.get(
            WIKIDATA_SPARQL_URL,
            params={"query": sparql_query, "format": "json"},
            headers=headers,
            timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException as e:
        print(f"  WARNING: Wikidata request failed: {e}")
        return {}
    except Exception as e:
        print(f"  WARNING: Failed to parse Wikidata response: {e}")
        return {}

    # Aggregate results by Q-ID
    result: dict[str, list[str]] = {}
    for binding in data.get("results", {}).get("bindings", []):
        item_uri = binding.get("item", {}).get("value", "")
        alt_label = binding.get("altLabel", {}).get("value", "")
        if not item_uri or not alt_label:
            continue
        # Extract Q-ID from URI: http://www.wikidata.org/entity/Q517
        qid = item_uri.rsplit("/", 1)[-1]
        if qid not in result:
            result[qid] = []
        if alt_label not in result[qid]:
            result[qid].append(alt_label)

    return result


def update_alternate_names(driver, canonical_id: str, alternate_names: list[str], dry_run: bool) -> bool:
    """
    Update the alternate_names property on a HistoricalFigure node.
    """
    if dry_run:
        return True

    query = """
        MATCH (f:HistoricalFigure {canonical_id: $canonical_id})
        SET f.alternate_names = $alternate_names
        RETURN f.name AS name
    """
    with driver.session() as session:
        result = session.run(query, canonical_id=canonical_id, alternate_names=alternate_names)
        record = result.single()
        return record is not None


def main():
    parser = argparse.ArgumentParser(
        description="Populate alternate_names for HistoricalFigure nodes from Wikidata"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing to Neo4j"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of figures to process (useful for testing)"
    )
    args = parser.parse_args()

    print("=" * 70)
    print("Fictotum — Populate Alternate Names from Wikidata")
    print("=" * 70)
    if args.dry_run:
        print("MODE: DRY RUN (no changes will be written)")
    else:
        print("MODE: EXECUTE (changes will be written to Neo4j)")
    print()

    # Connect to Neo4j
    try:
        driver = get_driver()
        # Test connection
        with driver.session() as session:
            session.run("RETURN 1")
        print("Connected to Neo4j.")
    except Exception as e:
        print(f"ERROR: Cannot connect to Neo4j: {e}")
        sys.exit(1)

    # Get figures needing alternate names
    print(f"Fetching figures that need alternate names...")
    figures = get_figures_needing_alternate_names(driver, limit=args.limit)
    print(f"Found {len(figures)} figures to process.\n")

    if not figures:
        print("All figures already have alternate names populated.")
        driver.close()
        return

    # Process in batches
    total_updated = 0
    total_skipped = 0
    total_errors = 0

    for batch_start in range(0, len(figures), BATCH_SIZE):
        batch = figures[batch_start:batch_start + BATCH_SIZE]
        qids = [f["wikidata_id"] for f in batch if f["wikidata_id"]]

        print(f"Processing batch {batch_start // BATCH_SIZE + 1} "
              f"({batch_start + 1}-{min(batch_start + BATCH_SIZE, len(figures))} "
              f"of {len(figures)})...")

        # Fetch alternate names from Wikidata
        alt_names_by_qid = fetch_alternate_names_batch(qids)
        time.sleep(REQUEST_DELAY)

        for figure in batch:
            qid = figure["wikidata_id"]
            canonical_id = figure["canonical_id"]
            name = figure["name"]

            if not qid:
                total_skipped += 1
                continue

            alt_names = alt_names_by_qid.get(qid, [])

            if not alt_names:
                print(f"  SKIP: {name} ({qid}) — no English alternate labels on Wikidata")
                total_skipped += 1
                continue

            print(f"  {'[DRY RUN] ' if args.dry_run else ''}UPDATE: {name} ({qid})")
            print(f"    Alternate names: {alt_names}")

            success = update_alternate_names(driver, canonical_id, alt_names, args.dry_run)
            if success:
                total_updated += 1
            else:
                print(f"    ERROR: Failed to update {name} ({canonical_id})")
                total_errors += 1

    driver.close()

    print()
    print("=" * 70)
    print("Summary")
    print("=" * 70)
    print(f"Figures processed: {len(figures)}")
    print(f"Updated:  {total_updated}")
    print(f"Skipped (no Wikidata alt labels): {total_skipped}")
    print(f"Errors:   {total_errors}")
    if args.dry_run:
        print()
        print("DRY RUN complete — no changes written. Run without --dry-run to execute.")
    print("=" * 70)


if __name__ == "__main__":
    main()
