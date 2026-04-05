#!/usr/bin/env python3
"""
Fictotum: Generalized Batch Pre-flight Deduplication

Replaces the 11 batch-specific dedupe_batch{3..11}.py scripts with a single
reusable tool. Accepts any batch JSON file, queries live Neo4j for existing
Wikidata IDs, filters out duplicates, and writes a deduplicated output file.

Usage:
    python3 scripts/maintenance/dedup_batch.py data/ancient_egypt_near_east_batch.json
    python3 scripts/maintenance/dedup_batch.py data/tudor_stuart_batch.json --dry-run

Output:
    data/ancient_egypt_near_east_batch_deduplicated.json

Exit codes:
    0 — success (deduplicated file written)
    1 — error (missing env vars, Neo4j unreachable, entities without wikidata_id)
"""

import os
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables from web-app/.env.local
env_path = Path(__file__).parent.parent.parent / "web-app" / ".env.local"
load_dotenv(env_path)


def get_driver():
    """Create Neo4j driver using environment variables."""
    uri = os.getenv("NEO4J_URI", "")
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD", "")

    if not uri or not pwd:
        print("ERROR: NEO4J_URI and NEO4J_PASSWORD environment variables must be set.")
        sys.exit(1)

    return GraphDatabase.driver(uri, auth=(user, pwd))


def fetch_existing_ids(driver) -> tuple:
    """Fetch all existing wikidata_id values from Neo4j for figures and works."""
    with driver.session() as session:
        figure_result = session.run(
            "MATCH (f:HistoricalFigure) WHERE f.wikidata_id IS NOT NULL "
            "RETURN collect(f.wikidata_id) AS ids"
        )
        figure_ids = set(figure_result.single()["ids"])

        work_result = session.run(
            "MATCH (m:MediaWork) WHERE m.wikidata_id IS NOT NULL "
            "RETURN collect(m.wikidata_id) AS ids"
        )
        work_ids = set(work_result.single()["ids"])

    return figure_ids, work_ids


def validate_wikidata_ids(entities: list, entity_type: str) -> list:
    """Check that all entities have a wikidata_id. Return list of violations."""
    missing = []
    for idx, entity in enumerate(entities):
        wikidata_id = entity.get("wikidata_id")
        name = entity.get("name") or entity.get("title") or f"[index {idx}]"
        if not wikidata_id:
            missing.append(name)
    return missing


def dedup_entities(entities: list, existing_ids: set, id_field: str = "wikidata_id",
                   name_field: str = "name") -> tuple:
    """Split entities into new and duplicate lists based on existing IDs."""
    new = []
    duplicates = []
    for entity in entities:
        wid = entity.get(id_field)
        if wid and wid in existing_ids:
            duplicates.append(entity)
        else:
            new.append(entity)
    return new, duplicates


def main():
    parser = argparse.ArgumentParser(
        description="Pre-flight deduplication: filter batch JSON against live Neo4j"
    )
    parser.add_argument(
        "input_file",
        help="Path to batch JSON file (e.g., data/ancient_egypt_near_east_batch.json)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report duplicates without writing output file"
    )
    parser.add_argument(
        "--allow-missing-qids",
        action="store_true",
        help="Don't exit with error if entities lack wikidata_id"
    )
    args = parser.parse_args()

    input_path = Path(args.input_file)
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}")
        sys.exit(1)

    # Load batch JSON
    with open(input_path) as f:
        data = json.load(f)

    # Detect field names — support both conventions
    figures = data.get("figures", data.get("historical_figures", []))
    works = data.get("works", data.get("media_works", []))
    relationships = data.get("relationships", data.get("interactions", []))
    metadata = data.get("metadata", {})

    # Determine original key names for output
    figures_key = "figures" if "figures" in data else "historical_figures" if "historical_figures" in data else "figures"
    works_key = "works" if "works" in data else "media_works" if "media_works" in data else "works"
    rels_key = "relationships" if "relationships" in data else "interactions" if "interactions" in data else "relationships"

    print("=" * 70)
    print(f"Fictotum Batch Pre-flight Deduplication")
    print(f"Input: {input_path}")
    print(f"Date:  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    print(f"\nBatch contents:")
    print(f"  Figures:       {len(figures)}")
    print(f"  Works:         {len(works)}")
    print(f"  Relationships: {len(relationships)}")

    # Validate wikidata_id presence
    missing_figure_qids = validate_wikidata_ids(figures, "figure")
    missing_work_qids = validate_wikidata_ids(works, "work")

    if missing_figure_qids or missing_work_qids:
        print(f"\nWARNING: Entities without wikidata_id:")
        for name in missing_figure_qids:
            print(f"  Figure: {name}")
        for name in missing_work_qids:
            print(f"  Work:   {name}")

        if not args.allow_missing_qids:
            print("\nERROR: All entities must have a wikidata_id for dedup to work.")
            print("Use --allow-missing-qids to proceed anyway (entities without Q-IDs will be kept).")
            sys.exit(1)

    # Connect to Neo4j and fetch existing IDs
    print("\nConnecting to Neo4j...")
    try:
        driver = get_driver()
        with driver.session() as session:
            session.run("RETURN 1")
        print("Connected.")
    except Exception as e:
        print(f"ERROR: Cannot connect to Neo4j: {e}")
        print("Is the database paused? Resume at console.neo4j.io")
        sys.exit(1)

    figure_ids, work_ids = fetch_existing_ids(driver)
    driver.close()

    print(f"\nExisting in database:")
    print(f"  Figure Wikidata IDs: {len(figure_ids)}")
    print(f"  Work Wikidata IDs:   {len(work_ids)}")

    # Deduplicate
    new_figures, dup_figures = dedup_entities(figures, figure_ids, name_field="name")
    new_works, dup_works = dedup_entities(works, work_ids, name_field="title")

    print(f"\nDeduplication results:")
    print(f"  Figures: {len(dup_figures)} duplicates removed, {len(new_figures)} new")
    print(f"  Works:   {len(dup_works)} duplicates removed, {len(new_works)} new")

    if dup_figures:
        print(f"\n  Duplicate figures (already in DB):")
        for fig in dup_figures:
            print(f"    - {fig.get('name', '?')} ({fig.get('wikidata_id', '?')})")

    if dup_works:
        print(f"\n  Duplicate works (already in DB):")
        for work in dup_works:
            print(f"    - {work.get('title', work.get('name', '?'))} ({work.get('wikidata_id', '?')})")

    # Build deduplicated output
    deduplicated = {
        "metadata": {
            **metadata,
            "deduplication": {
                "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "source_file": str(input_path),
                "figures_removed": len(dup_figures),
                "figures_kept": len(new_figures),
                "works_removed": len(dup_works),
                "works_kept": len(new_works),
                "relationships_kept": len(relationships),
            }
        },
        figures_key: new_figures,
        works_key: new_works,
        rels_key: relationships,
    }

    # Preserve any extra keys (e.g., fictional_characters)
    for key in data:
        if key not in ("metadata", figures_key, works_key, rels_key,
                       "figures", "historical_figures", "works", "media_works",
                       "relationships", "interactions"):
            deduplicated[key] = data[key]

    if args.dry_run:
        print(f"\nDRY RUN — no output file written.")
    else:
        output_path = input_path.with_name(
            input_path.stem + "_deduplicated" + input_path.suffix
        )
        with open(output_path, 'w') as f:
            json.dump(deduplicated, f, indent=2, ensure_ascii=False)
        print(f"\nDeduplicated batch written to: {output_path}")

    print("=" * 70)

    total_new = len(new_figures) + len(new_works)
    total_dup = len(dup_figures) + len(dup_works)
    print(f"\nSummary: {total_new} new entities, {total_dup} duplicates removed")

    if total_new == 0:
        print("NOTE: All entities already exist in the database. Nothing to import.")


if __name__ == "__main__":
    main()
