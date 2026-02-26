#!/usr/bin/env python3
"""
Quick status check for the Kanban enrichment pipeline.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"

TODO_FILE = DATA_DIR / "1_todo_harvest.json"
DONE_FILE = DATA_DIR / "2_done_enriched.json"
FAILED_FILE = DATA_DIR / "3_failed_qa.json"


def load_json(filepath):
    if not filepath.exists():
        return []
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    print("📊 Fictotum Enrichment Pipeline Status")
    print("=" * 50)

    todo = load_json(TODO_FILE)
    done = load_json(DONE_FILE)
    failed = load_json(FAILED_FILE)

    todo_count = len(todo)
    done_count = len(done)
    failed_count = len(failed)
    total = todo_count + done_count + failed_count

    if total == 0:
        print("⚠️  No works found. Run setup_kanban.py first.")
        return

    # Get processed IDs
    processed_ids = set()
    for work in done + failed:
        if "wikidata_id" in work:
            processed_ids.add(work["wikidata_id"])

    # Count truly remaining (not in processed)
    remaining = 0
    for work in todo:
        if work.get("wikidata_id") not in processed_ids:
            remaining += 1

    print(f"\n📥 TODO Queue:     {todo_count:4} works (file size)")
    print(f"   Unprocessed:   {remaining:4} works (actual remaining)")
    print(f"✅ DONE Queue:     {done_count:4} works")
    print(f"❌ FAILED Queue:   {failed_count:4} works")
    print(f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"📊 Total:          {total:4} works")

    if total > 0:
        done_pct = (done_count / total) * 100
        failed_pct = (failed_count / total) * 100
        remaining_pct = (remaining / total) * 100

        print(f"\n📈 Progress:")
        print(f"   ✅ Success:  {done_pct:5.1f}%  {'█' * int(done_pct // 2)}")
        print(f"   ❌ Failed:   {failed_pct:5.1f}%  {'░' * int(failed_pct // 2)}")
        print(f"   ⏳ Remain:   {remaining_pct:5.1f}%  {'▒' * int(remaining_pct // 2)}")

    # Show next 3 works to process
    if remaining > 0:
        print(f"\n🔜 Next {min(3, remaining)} works to process:")
        count = 0
        for work in todo:
            if work.get("wikidata_id") not in processed_ids:
                title = work.get("title", "Unknown")
                wid = work.get("wikidata_id", "???")
                print(f"   {count + 1}. {title} ({wid})")
                count += 1
                if count >= 3:
                    break

    # Show failed works if any
    if failed_count > 0:
        print(f"\n⚠️  Failed works (need manual review):")
        for work in failed[:5]:  # Show first 5
            title = work.get("title", "Unknown")
            error = work.get("error", "Unknown error")
            error_short = error[:60] + "..." if len(error) > 60 else error
            print(f"   • {title}: {error_short}")
        if failed_count > 5:
            print(f"   ... and {failed_count - 5} more")

    print()


if __name__ == "__main__":
    main()
