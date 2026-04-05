#!/usr/bin/env python3
"""
Setup Kanban Board - Initialize the digital kanban system for enrichment.
Merges harvest files into 1_todo_harvest.json
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Source harvest files
HARVEST_FILES = [
    DATA_DIR / "century_harvest.json",
    DATA_DIR / "davis_harvest.json",
]

# Kanban board files
TODO_FILE = DATA_DIR / "1_todo_harvest.json"
DONE_FILE = DATA_DIR / "2_done_enriched.json"
FAILED_FILE = DATA_DIR / "3_failed_qa.json"


def main():
    print("🎯 Initializing Kanban Board for Fictotum Enrichment")
    print()

    # Collect all works from harvest files
    all_works = []
    seen_wikidata_ids = set()

    for harvest_file in HARVEST_FILES:
        if not harvest_file.exists():
            print(f"⚠️  Skipping {harvest_file.name} (not found)")
            continue

        with open(harvest_file, "r", encoding="utf-8") as f:
            works = json.load(f)

        # Deduplicate by wikidata_id
        new_works = 0
        for work in works:
            wid = work.get("wikidata_id")
            if wid and wid not in seen_wikidata_ids:
                all_works.append(work)
                seen_wikidata_ids.add(wid)
                new_works += 1

        print(f"✅ Loaded {new_works} works from {harvest_file.name}")

    print()
    print(f"📊 Total unique works to process: {len(all_works)}")

    # Write to TODO file
    with open(TODO_FILE, "w", encoding="utf-8") as f:
        json.dump(all_works, f, indent=2, ensure_ascii=False)

    print(f"✅ Created: {TODO_FILE}")

    # Initialize DONE and FAILED files if they don't exist
    if not DONE_FILE.exists():
        with open(DONE_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        print(f"✅ Created: {DONE_FILE}")
    else:
        print(f"ℹ️  Existing: {DONE_FILE}")

    if not FAILED_FILE.exists():
        with open(FAILED_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, indent=2)
        print(f"✅ Created: {FAILED_FILE}")
    else:
        print(f"ℹ️  Existing: {FAILED_FILE}")

    print()
    print("🚀 Kanban board ready! Run:")
    print("   python scripts/research/enrich_worker.py")


if __name__ == "__main__":
    main()
