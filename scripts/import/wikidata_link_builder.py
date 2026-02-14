#!/usr/bin/env python3
"""
Wikidata Link Builder — connect orphan HistoricalFigures to MediaWorks via SPARQL.

Zero LLM compute. Queries Wikidata structured data for:
  - Cast (P161) per MediaWork
  - Director (P57), Writer (P58), Creator (P170), Composer (P86) per MediaWork
  - Present-in-work (P1441), Notable work (P800) per HistoricalFigure

Cross-references against Neo4j and creates relationships for matches.

Usage:
    python3 scripts/import/wikidata_link_builder.py --dry-run
    python3 scripts/import/wikidata_link_builder.py --execute
"""

import os
import sys
import json
import argparse
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dotenv import load_dotenv
from neo4j import GraphDatabase
import requests

load_dotenv(Path(__file__).parent.parent.parent / ".env")

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
SPARQL_HEADERS = {
    "Accept": "application/sparql-results+json",
    "User-Agent": "FictotumLinkBuilder/1.0 (https://github.com/fictotum; contact@bigheavy.fun)"
}
# Wikidata rate limit: be polite
SPARQL_DELAY = 1.5  # seconds between requests
BATCH_SIZE = 80  # Q-IDs per SPARQL VALUES clause


def get_neo4j_driver():
    uri = os.environ["NEO4J_URI"]
    user = os.environ["NEO4J_USERNAME"]
    password = os.environ["NEO4J_PASSWORD"]
    return GraphDatabase.driver(uri, auth=(user, password))


def sparql_query(query: str, retries: int = 3) -> list:
    """Execute a SPARQL query against Wikidata with retry logic."""
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
    """Extract Q-ID from Wikidata URI."""
    return uri.split("/")[-1]


# ---------------------------------------------------------------------------
# Phase 1: Load DB state
# ---------------------------------------------------------------------------

def load_mediawork_qids(driver) -> Dict[str, str]:
    """Returns {wikidata_id: title} for all MediaWorks with a Q-ID."""
    with driver.session() as session:
        results = session.run(
            "MATCH (m:MediaWork) WHERE m.wikidata_id IS NOT NULL "
            "RETURN m.wikidata_id AS qid, m.title AS title"
        )
        return {r["qid"]: r["title"] for r in results}


def load_figure_qids(driver, orphans_only: bool = False) -> Dict[str, str]:
    """Returns {canonical_id: name} for HistoricalFigures.
    If orphans_only, restricts to figures with no APPEARS_IN/PORTRAYED_IN/DIRECTED/WROTE/CREATED/COMPOSED."""
    orphan_clause = ""
    if orphans_only:
        orphan_clause = (
            "AND NOT EXISTS((f)-[:APPEARS_IN]->()) "
            "AND NOT EXISTS((f)-[:PORTRAYED_IN]->()) "
            "AND NOT EXISTS((f)-[:DIRECTED]->()) "
            "AND NOT EXISTS((f)-[:WROTE]->()) "
            "AND NOT EXISTS((f)-[:CREATED]->()) "
            "AND NOT EXISTS((f)-[:COMPOSED]->()) "
        )
    with driver.session() as session:
        results = session.run(
            f"MATCH (f:HistoricalFigure) "
            f"WHERE f.canonical_id IS NOT NULL {orphan_clause}"
            f"RETURN f.canonical_id AS cid, f.name AS name, "
            f"f.wikidata_id AS wid"
        )
        out = {}
        for r in results:
            # Use wikidata_id if it looks like a Q-ID, else canonical_id
            key = r["wid"] if r["wid"] and r["wid"].startswith("Q") else r["cid"]
            if key and key.startswith("Q"):
                out[key] = r["name"]
        return out


def load_all_figure_qids(driver) -> Dict[str, str]:
    """Returns {qid: name} for ALL HistoricalFigures with Q-IDs (for matching)."""
    with driver.session() as session:
        results = session.run(
            "MATCH (f:HistoricalFigure) "
            "WHERE f.canonical_id IS NOT NULL "
            "RETURN f.canonical_id AS cid, f.name AS name, f.wikidata_id AS wid"
        )
        out = {}
        for r in results:
            cid = r["cid"]
            wid = r["wid"]
            name = r["name"]
            if wid and wid.startswith("Q"):
                out[wid] = name
            if cid and cid.startswith("Q"):
                out[cid] = name
        return out


# ---------------------------------------------------------------------------
# Phase 2: SPARQL queries — Work → People
# ---------------------------------------------------------------------------

def query_work_cast_and_crew(work_qids: List[str]) -> List[dict]:
    """Query Wikidata for cast/crew of given works.
    Returns list of {work_qid, person_qid, person_name, role, actor_name}."""
    values = " ".join(f"wd:{q}" for q in work_qids)
    query = f"""
    SELECT ?work ?person ?personLabel ?role ?actorLabel WHERE {{
      VALUES ?work {{ {values} }}
      {{
        ?work wdt:P161 ?person .
        BIND("cast" AS ?role)
        OPTIONAL {{ ?work p:P161 ?stmt . ?stmt ps:P161 ?person . ?stmt pq:P453 ?actor . }}
      }} UNION {{
        ?work wdt:P57 ?person .
        BIND("director" AS ?role)
      }} UNION {{
        ?work wdt:P58 ?person .
        BIND("screenwriter" AS ?role)
      }} UNION {{
        ?work wdt:P170 ?person .
        BIND("creator" AS ?role)
      }} UNION {{
        ?work wdt:P86 ?person .
        BIND("composer" AS ?role)
      }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    results = sparql_query(query)
    out = []
    for r in results:
        out.append({
            "work_qid": qid(r["work"]["value"]),
            "person_qid": qid(r["person"]["value"]),
            "person_name": r.get("personLabel", {}).get("value", ""),
            "role": r["role"]["value"],
            "actor_name": r.get("actorLabel", {}).get("value", ""),
        })
    return out


# ---------------------------------------------------------------------------
# Phase 3: SPARQL queries — Person → Works
# ---------------------------------------------------------------------------

def query_figure_works(figure_qids: List[str]) -> List[dict]:
    """Query Wikidata for works a figure appears in or created.
    Returns list of {person_qid, work_qid, work_name, role}."""
    values = " ".join(f"wd:{q}" for q in figure_qids)
    query = f"""
    SELECT ?person ?work ?workLabel ?role WHERE {{
      VALUES ?person {{ {values} }}
      {{
        ?person wdt:P1441 ?work .
        BIND("appears_in" AS ?role)
      }} UNION {{
        ?person wdt:P800 ?work .
        BIND("notable_work" AS ?role)
      }} UNION {{
        ?work wdt:P57 ?person .
        BIND("director" AS ?role)
      }} UNION {{
        ?work wdt:P58 ?person .
        BIND("screenwriter" AS ?role)
      }} UNION {{
        ?work wdt:P170 ?person .
        BIND("creator" AS ?role)
      }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    results = sparql_query(query)
    out = []
    for r in results:
        out.append({
            "person_qid": qid(r["person"]["value"]),
            "work_qid": qid(r["work"]["value"]),
            "work_name": r.get("workLabel", {}).get("value", ""),
            "role": r["role"]["value"],
        })
    return out


# ---------------------------------------------------------------------------
# Phase 4: Cross-reference and build link proposals
# ---------------------------------------------------------------------------

ROLE_TO_REL = {
    "cast": "APPEARS_IN",
    "appears_in": "APPEARS_IN",
    "director": "DIRECTED",
    "screenwriter": "WROTE",
    "creator": "CREATED",
    "composer": "COMPOSED",
    "notable_work": "CREATED",
}


def build_proposals(
    work_results: List[dict],
    figure_results: List[dict],
    all_figure_qids: Dict[str, str],
    work_qids: Dict[str, str],
) -> List[dict]:
    """Build deduplicated link proposals from SPARQL results."""
    proposals = {}  # (figure_qid, work_qid, rel_type) -> proposal

    # From work→person results: only keep people who exist in our DB
    for r in work_results:
        person_q = r["person_qid"]
        if person_q not in all_figure_qids:
            continue
        work_q = r["work_qid"]
        rel = ROLE_TO_REL.get(r["role"], "APPEARS_IN")
        key = (person_q, work_q, rel)
        if key not in proposals:
            proposals[key] = {
                "figure_qid": person_q,
                "figure_name": all_figure_qids[person_q],
                "work_qid": work_q,
                "work_title": work_qids.get(work_q, "?"),
                "rel_type": rel,
                "actor_name": r.get("actor_name", ""),
                "source": "work_to_person",
            }

    # From person→work results: only keep works that exist in our DB
    for r in figure_results:
        work_q = r["work_qid"]
        if work_q not in work_qids:
            continue
        person_q = r["person_qid"]
        rel = ROLE_TO_REL.get(r["role"], "APPEARS_IN")
        key = (person_q, work_q, rel)
        if key not in proposals:
            proposals[key] = {
                "figure_qid": person_q,
                "figure_name": all_figure_qids.get(person_q, "?"),
                "work_qid": work_q,
                "work_title": work_qids[work_q],
                "rel_type": rel,
                "actor_name": "",
                "source": "person_to_work",
            }

    return list(proposals.values())


# ---------------------------------------------------------------------------
# Phase 5: Write to Neo4j
# ---------------------------------------------------------------------------

def check_existing_rels(driver, proposals: List[dict]) -> List[dict]:
    """Filter out proposals where the relationship already exists."""
    new_proposals = []
    with driver.session() as session:
        for p in proposals:
            rel = p["rel_type"]
            result = session.run(
                f"MATCH (f:HistoricalFigure)-[r:{rel}]->(m:MediaWork) "
                f"WHERE (f.canonical_id = $fqid OR f.wikidata_id = $fqid) "
                f"AND m.wikidata_id = $wqid "
                f"RETURN count(r) AS cnt",
                fqid=p["figure_qid"],
                wqid=p["work_qid"],
            )
            if result.single()["cnt"] == 0:
                new_proposals.append(p)
    return new_proposals


def write_relationships(driver, proposals: List[dict], dry_run: bool = True) -> int:
    """Create relationships in Neo4j. Returns count created."""
    if dry_run:
        return len(proposals)

    created = 0
    with driver.session() as session:
        for p in proposals:
            rel = p["rel_type"]
            props = {
                "source": "wikidata_sparql",
                "timestamp": datetime.utcnow().isoformat(),
            }
            if p.get("actor_name"):
                props["actor"] = p["actor_name"]

            prop_str = ", ".join(f"{k}: ${k}" for k in props)
            try:
                session.run(
                    f"MATCH (f:HistoricalFigure), (m:MediaWork) "
                    f"WHERE (f.canonical_id = $fqid OR f.wikidata_id = $fqid) "
                    f"AND m.wikidata_id = $wqid "
                    f"MERGE (f)-[r:{rel} {{{prop_str}}}]->(m) "
                    f"RETURN type(r) AS t",
                    fqid=p["figure_qid"],
                    wqid=p["work_qid"],
                    **props,
                )
                created += 1
            except Exception as e:
                print(f"  Error creating {rel} {p['figure_name']} → {p['work_title']}: {e}")
    return created


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Wikidata Link Builder")
    parser.add_argument("--dry-run", action="store_true", default=True,
                        help="Preview only (default)")
    parser.add_argument("--execute", action="store_true",
                        help="Write relationships to Neo4j")
    parser.add_argument("--orphans-only", action="store_true", default=False,
                        help="Only query for orphan figures (faster)")
    parser.add_argument("--limit-works", type=int, default=0,
                        help="Limit number of works to query (0=all)")
    parser.add_argument("--report", type=str, default="wikidata_link_report.md",
                        help="Output report filename")
    args = parser.parse_args()

    dry_run = not args.execute

    print("=" * 70)
    print("Wikidata Link Builder")
    print("=" * 70)
    print(f"Mode: {'DRY RUN' if dry_run else 'LIVE EXECUTION'}")
    print()

    # Step 1: Load DB state
    print("Step 1: Loading Neo4j state...")
    driver = get_neo4j_driver()

    work_qids = load_mediawork_qids(driver)
    print(f"  MediaWorks with Q-IDs: {len(work_qids)}")

    all_figure_qids = load_all_figure_qids(driver)
    print(f"  HistoricalFigures with Q-IDs: {len(all_figure_qids)}")

    orphan_qids = load_figure_qids(driver, orphans_only=True)
    print(f"  Orphan figures with Q-IDs: {len(orphan_qids)}")
    print()

    # Step 2: Query Wikidata — Work → People
    print("Step 2: Querying Wikidata for work cast & crew...")
    work_list = list(work_qids.keys())
    if args.limit_works:
        work_list = work_list[:args.limit_works]

    work_results = []
    for i in range(0, len(work_list), BATCH_SIZE):
        batch = work_list[i:i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1}: querying {len(batch)} works...")
        results = query_work_cast_and_crew(batch)
        work_results.extend(results)
        if i + BATCH_SIZE < len(work_list):
            time.sleep(SPARQL_DELAY)
    print(f"  Total cast/crew records from Wikidata: {len(work_results)}")
    print()

    # Step 3: Query Wikidata — Person → Works
    figure_list = list(orphan_qids.keys()) if args.orphans_only else list(all_figure_qids.keys())
    print(f"Step 3: Querying Wikidata for {len(figure_list)} figures' works...")
    figure_results = []
    for i in range(0, len(figure_list), BATCH_SIZE):
        batch = figure_list[i:i + BATCH_SIZE]
        print(f"  Batch {i // BATCH_SIZE + 1}: querying {len(batch)} figures...")
        results = query_figure_works(batch)
        figure_results.extend(results)
        if i + BATCH_SIZE < len(figure_list):
            time.sleep(SPARQL_DELAY)
    print(f"  Total figure→work records from Wikidata: {len(figure_results)}")
    print()

    # Step 4: Cross-reference
    print("Step 4: Building link proposals...")
    proposals = build_proposals(work_results, figure_results, all_figure_qids, work_qids)
    print(f"  Raw proposals: {len(proposals)}")

    # Step 5: Filter existing
    print("Step 5: Filtering already-existing relationships...")
    new_proposals = check_existing_rels(driver, proposals)
    print(f"  New relationships to create: {len(new_proposals)}")
    print(f"  Already existing (skipped): {len(proposals) - len(new_proposals)}")
    print()

    # Summarize by type
    by_type = {}
    for p in new_proposals:
        by_type.setdefault(p["rel_type"], []).append(p)
    print("  Breakdown by relationship type:")
    for rel, items in sorted(by_type.items()):
        print(f"    {rel}: {len(items)}")

    # Count orphans that would be de-orphaned
    orphan_connects = set()
    for p in new_proposals:
        if p["figure_qid"] in orphan_qids:
            orphan_connects.add(p["figure_qid"])
    print(f"\n  Orphan figures to be connected: {len(orphan_connects)}")
    print()

    # Step 6: Write or preview
    if dry_run:
        print("Step 6: DRY RUN — no changes written")
        print("\nSample proposals (first 30):")
        for p in new_proposals[:30]:
            actor = f" (played by {p['actor_name']})" if p.get("actor_name") else ""
            print(f"  [{p['rel_type']}] {p['figure_name']} → {p['work_title']}{actor}")
    else:
        if not sys.stdin.isatty():
            confirm = "CONFIRM"
        else:
            print(f"Step 6: About to create {len(new_proposals)} relationships.")
            confirm = input("Type 'CONFIRM' to proceed: ").strip()
        if confirm == "CONFIRM":
            count = write_relationships(driver, new_proposals, dry_run=False)
            print(f"\n  Created {count} relationships.")
        else:
            print("Aborted.")
            driver.close()
            return

    # Step 7: Report
    report_path = Path(args.report)
    with open(report_path, "w") as f:
        f.write(f"# Wikidata Link Builder Report\n\n")
        f.write(f"**Generated:** {datetime.utcnow().isoformat()}\n")
        f.write(f"**Mode:** {'DRY RUN' if dry_run else 'EXECUTED'}\n\n")
        f.write(f"## Summary\n\n")
        f.write(f"- Works queried: {len(work_list)}\n")
        f.write(f"- Figures queried: {len(figure_list)}\n")
        f.write(f"- Cast/crew records from Wikidata: {len(work_results)}\n")
        f.write(f"- Figure→work records from Wikidata: {len(figure_results)}\n")
        f.write(f"- New relationships proposed: {len(new_proposals)}\n")
        f.write(f"- Orphans to be connected: {len(orphan_connects)}\n\n")
        f.write(f"## By Relationship Type\n\n")
        f.write(f"| Type | Count |\n|------|-------|\n")
        for rel, items in sorted(by_type.items()):
            f.write(f"| {rel} | {len(items)} |\n")
        f.write(f"\n## All Proposals\n\n")
        f.write(f"| Figure | Work | Relationship | Actor | Source |\n")
        f.write(f"|--------|------|-------------|-------|--------|\n")
        for p in sorted(new_proposals, key=lambda x: (x["rel_type"], x["figure_name"])):
            actor = p.get("actor_name", "") or ""
            f.write(f"| {p['figure_name']} | {p['work_title']} | {p['rel_type']} | {actor} | {p['source']} |\n")
    print(f"\nReport saved to: {report_path}")

    driver.close()
    print("\nDone.")


if __name__ == "__main__":
    main()
