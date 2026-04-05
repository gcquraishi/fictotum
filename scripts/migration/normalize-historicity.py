#!/usr/bin/env python3
"""
Normalize Historicity Classification — FIC-149

Normalizes the historicity_status field on all HistoricalFigure nodes to a
canonical enum: Historical, Fictional, Legendary.

Steps:
  1. Normalize existing inconsistent values (no API needed)
  2. For remaining nulls: query Wikidata P31 (instance-of) in batches
  3. Default remaining unknowns to 'Historical' (safe for real-person Q-IDs)
  4. Report results

Usage:
    python3 scripts/migration/normalize-historicity.py --dry-run
    python3 scripts/migration/normalize-historicity.py --execute
"""

import os
import sys
import time
import argparse
from pathlib import Path
from typing import Dict, List, Set
from dotenv import load_dotenv
from neo4j import GraphDatabase
import requests

load_dotenv(Path(__file__).parent.parent.parent / ".env")

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
SPARQL_HEADERS = {
    "Accept": "application/sparql-results+json",
    "User-Agent": "FictotumHistoricity/1.0 (https://fictotum.com)"
}
SPARQL_DELAY = 1.5
BATCH_SIZE = 50

# Wikidata P31 (instance-of) Q-IDs for classification
FICTIONAL_QIDS = {"Q15632617", "Q95074", "Q15773347", "Q14514600"}  # fictional human, fictional character, etc.
LEGENDARY_QIDS = {"Q4271324", "Q13002315", "Q22988604"}  # mythical character, legendary figure, legendary creature
HUMAN_QIDS = {"Q5"}  # human

# Normalization map for existing values
NORMALIZE_MAP = {
    "verified": "Historical",
    "historical": "Historical",
    "Historical": "Historical",
    "debated": "Legendary",
    "legendary": "Legendary",
    "Legendary": "Legendary",
    "Disputed": "Legendary",
    "Fictional": "Fictional",
    "fictional": "Fictional",
    "mythological": "Legendary",
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


def get_current_distribution(driver) -> Dict[str, int]:
    """Get current historicity_status distribution."""
    with driver.session() as session:
        result = session.run(
            """MATCH (f:HistoricalFigure)
               RETURN f.historicity_status AS status, count(f) AS cnt
               ORDER BY cnt DESC"""
        )
        return {r["status"]: r["cnt"] for r in result}


def get_figures_with_existing_status(driver) -> List[Dict]:
    """Get figures with a non-null historicity_status that needs normalization."""
    with driver.session() as session:
        result = session.run(
            """MATCH (f:HistoricalFigure)
               WHERE f.historicity_status IS NOT NULL
                 AND NOT f.historicity_status IN ['Historical', 'Fictional', 'Legendary']
               RETURN f.canonical_id AS cid, f.name AS name,
                      f.historicity_status AS status"""
        )
        return [dict(r) for r in result]


def get_null_status_figures(driver) -> List[Dict]:
    """Get figures with null historicity_status that have Wikidata IDs."""
    with driver.session() as session:
        result = session.run(
            """MATCH (f:HistoricalFigure)
               WHERE f.historicity_status IS NULL
               RETURN f.canonical_id AS cid, f.name AS name,
                      f.wikidata_id AS wid
               ORDER BY f.name"""
        )
        return [dict(r) for r in result]


def classify_via_wikidata(figure_qids: List[str]) -> Dict[str, str]:
    """Query Wikidata P31 for a batch of Q-IDs and classify them."""
    if not figure_qids:
        return {}

    values = " ".join(f"wd:{q}" for q in figure_qids)
    query = f"""
    SELECT ?person ?type WHERE {{
      VALUES ?person {{ {values} }}
      ?person wdt:P31 ?type .
    }}
    """
    results = sparql_query(query)

    # Build a map of person -> set of types
    type_map: Dict[str, Set[str]] = {}
    for r in results:
        person_id = qid(r["person"]["value"])
        type_id = qid(r["type"]["value"])
        if person_id not in type_map:
            type_map[person_id] = set()
        type_map[person_id].add(type_id)

    # Classify based on types
    classifications: Dict[str, str] = {}
    for person_id, types in type_map.items():
        if types & FICTIONAL_QIDS:
            classifications[person_id] = "Fictional"
        elif types & LEGENDARY_QIDS:
            classifications[person_id] = "Legendary"
        elif types & HUMAN_QIDS:
            classifications[person_id] = "Historical"
        # else: no match, will be defaulted later

    return classifications


def normalize_existing(driver, figures: List[Dict], dry_run: bool) -> int:
    """Normalize existing non-canonical values."""
    count = 0
    for fig in figures:
        old_status = fig["status"]
        new_status = NORMALIZE_MAP.get(old_status)
        if not new_status:
            print(f"  WARNING: Unknown status '{old_status}' for {fig['name']} ({fig['cid']})")
            continue

        if old_status == new_status:
            continue

        count += 1
        if dry_run:
            print(f"  [DRY RUN] {fig['name']}: '{old_status}' -> '{new_status}'")
        else:
            with driver.session() as session:
                session.run(
                    """MATCH (f:HistoricalFigure {canonical_id: $cid})
                       SET f.historicity_status = $status""",
                    {"cid": fig["cid"], "status": new_status}
                )
    return count


def backfill_nulls(driver, figures: List[Dict], dry_run: bool) -> Dict[str, int]:
    """Backfill null historicity_status using Wikidata P31 lookup."""
    stats = {"wikidata_classified": 0, "defaulted": 0, "no_qid": 0}

    # Separate figures with and without Wikidata IDs
    with_qid = [f for f in figures if f["wid"] and f["wid"].startswith("Q")]
    without_qid = [f for f in figures if not f["wid"] or not f["wid"].startswith("Q")]

    # Batch-query Wikidata for figures with Q-IDs
    qid_list = [f["wid"] for f in with_qid]
    all_classifications: Dict[str, str] = {}

    for i in range(0, len(qid_list), BATCH_SIZE):
        batch = qid_list[i:i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1}: querying {len(batch)} figures...")
        classifications = classify_via_wikidata(batch)
        all_classifications.update(classifications)
        if i + BATCH_SIZE < len(qid_list):
            time.sleep(SPARQL_DELAY)

    # Apply Wikidata classifications
    for fig in with_qid:
        wid = fig["wid"]
        status = all_classifications.get(wid, "Historical")  # Default to Historical

        if wid in all_classifications:
            stats["wikidata_classified"] += 1
        else:
            stats["defaulted"] += 1

        if dry_run:
            source = "Wikidata" if wid in all_classifications else "default"
            print(f"  [DRY RUN] {fig['name']} ({wid}): NULL -> '{status}' ({source})")
        else:
            with driver.session() as session:
                session.run(
                    """MATCH (f:HistoricalFigure {canonical_id: $cid})
                       SET f.historicity_status = $status""",
                    {"cid": fig["cid"], "status": status}
                )

    # Default figures without Q-IDs to Historical
    for fig in without_qid:
        stats["no_qid"] += 1
        if dry_run:
            print(f"  [DRY RUN] {fig['name']} (no Q-ID): NULL -> 'Historical' (default)")
        else:
            with driver.session() as session:
                session.run(
                    """MATCH (f:HistoricalFigure {canonical_id: $cid})
                       SET f.historicity_status = $status""",
                    {"cid": fig["cid"], "status": "Historical"}
                )

    return stats


def main():
    parser = argparse.ArgumentParser(description="Normalize Historicity Classification")
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()

    dry_run = not args.execute

    print("=" * 70)
    print("Normalize Historicity Classification — FIC-149")
    print("=" * 70)
    print(f"Mode: {'DRY RUN' if dry_run else 'EXECUTE'}")
    print()

    uri = os.environ["NEO4J_URI"]
    user = os.environ["NEO4J_USERNAME"]
    password = os.environ["NEO4J_PASSWORD"]
    driver = GraphDatabase.driver(uri, auth=(user, password))

    # Step 0: Current distribution
    print("Step 0: Current distribution")
    dist = get_current_distribution(driver)
    for status, count in dist.items():
        label = status if status else "(NULL)"
        print(f"  {label}: {count}")
    print()

    # Step 1: Normalize existing inconsistent values
    print("Step 1: Normalizing existing values...")
    to_normalize = get_figures_with_existing_status(driver)
    print(f"  Found {len(to_normalize)} figures with non-canonical status")
    normalized_count = normalize_existing(driver, to_normalize, dry_run)
    print(f"  {'Would normalize' if dry_run else 'Normalized'}: {normalized_count}")
    print()

    # Step 2: Backfill nulls via Wikidata
    print("Step 2: Backfilling null status via Wikidata P31...")
    null_figures = get_null_status_figures(driver)
    print(f"  Found {len(null_figures)} figures with NULL status")

    if null_figures:
        backfill_stats = backfill_nulls(driver, null_figures, dry_run)
        print(f"\n  Wikidata classified: {backfill_stats['wikidata_classified']}")
        print(f"  Defaulted to Historical: {backfill_stats['defaulted']}")
        print(f"  No Q-ID (defaulted): {backfill_stats['no_qid']}")
    print()

    # Step 3: Verify
    if not dry_run:
        print("Step 3: Final distribution")
        final_dist = get_current_distribution(driver)
        for status, count in final_dist.items():
            label = status if status else "(NULL)"
            print(f"  {label}: {count}")

        # Check for remaining nulls
        null_count = final_dist.get(None, 0)
        if null_count > 0:
            print(f"\n  WARNING: {null_count} figures still have NULL status!")
        else:
            print(f"\n  100% coverage achieved!")
    else:
        print("Step 3: Run with --execute to apply changes")

    driver.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
