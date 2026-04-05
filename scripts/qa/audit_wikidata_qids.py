#!/usr/bin/env python3
"""
Audit Wikidata Q-IDs across all entity types (HistoricalFigure + MediaWork).

Queries Wikidata for the English label of every Q-ID in the database, compares
it against the node's name/title using SequenceMatcher similarity, and flags
mismatches below a configurable threshold.  For flagged items the script
searches Wikidata for the correct Q-ID and suggests a fix.

Usage:
    # Audit only (report mode)
    python3 scripts/qa/audit_wikidata_qids.py

    # Audit + auto-fix confirmed mismatches
    python3 scripts/qa/audit_wikidata_qids.py --fix

    # Custom similarity threshold (default 0.45)
    python3 scripts/qa/audit_wikidata_qids.py --threshold 0.5

    # Audit only figures or only works
    python3 scripts/qa/audit_wikidata_qids.py --figures-only
    python3 scripts/qa/audit_wikidata_qids.py --works-only
"""

import argparse
import difflib
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
from dotenv import load_dotenv
from neo4j import GraphDatabase

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"
USER_AGENT = "Fictotum-QID-Audit/1.0 (https://fictotum.com; Data Quality)"
BATCH_SIZE = 50  # wbgetentities supports up to 50 IDs per call
REQUEST_DELAY = 0.5  # seconds between Wikidata API calls
DEFAULT_THRESHOLD = 0.45  # flag anything below this similarity


# ---------------------------------------------------------------------------
# Wikidata helpers
# ---------------------------------------------------------------------------

def fetch_labels_batch(qids: List[str]) -> Dict[str, Dict]:
    """Fetch English labels + descriptions for a batch of Q-IDs (max 50).

    Returns dict mapping Q-ID -> {"label": str, "description": str} or None
    if the entity is missing.
    """
    if not qids:
        return {}

    params = {
        "action": "wbgetentities",
        "ids": "|".join(qids),
        "props": "labels|descriptions",
        "languages": "en",
        "format": "json",
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.get(WIKIDATA_API, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  WARNING: Wikidata batch request failed: {e}", file=sys.stderr)
        return {}

    results: Dict[str, Dict] = {}
    for qid in qids:
        entity = data.get("entities", {}).get(qid, {})
        if "missing" in entity:
            results[qid] = None
            continue

        label = entity.get("labels", {}).get("en", {}).get("value")
        description = entity.get("descriptions", {}).get("en", {}).get("value", "")
        results[qid] = {"label": label, "description": description}

    return results


def search_correct_qid(name: str, entity_type: str) -> Optional[Dict]:
    """Search Wikidata for the correct Q-ID given a name.

    Args:
        name: Entity name to search for
        entity_type: "figure" or "work" — used to refine search

    Returns:
        Dict with qid, label, description, similarity or None
    """
    params = {
        "action": "wbsearchentities",
        "search": name,
        "language": "en",
        "limit": 5,
        "format": "json",
        "type": "item",
    }
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.get(WIKIDATA_API, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"  WARNING: search failed for '{name}': {e}", file=sys.stderr)
        return None

    if not data.get("search"):
        return None

    # Score candidates
    best = None
    best_score = 0.0

    for result in data["search"]:
        label = result.get("label", "")
        description = result.get("description", "")
        similarity = difflib.SequenceMatcher(None, name.lower(), label.lower()).ratio()

        # For figures, prefer results with "person" / human-related descriptions
        # For works, prefer results with media-related descriptions
        bonus = 0.0
        desc_lower = description.lower()
        if entity_type == "figure":
            person_keywords = ["human", "person", "king", "queen", "emperor", "pharaoh",
                               "president", "politician", "writer", "artist", "composer",
                               "scientist", "philosopher", "military", "general", "saint",
                               "character", "fictional", "legendary"]
            if any(kw in desc_lower for kw in person_keywords):
                bonus = 0.1
        elif entity_type == "work":
            work_keywords = ["film", "movie", "novel", "book", "series", "television",
                             "play", "game", "comic", "opera", "musical"]
            if any(kw in desc_lower for kw in work_keywords):
                bonus = 0.1

        score = similarity + bonus
        if score > best_score:
            best_score = score
            best = {
                "qid": result["id"],
                "label": label,
                "description": description,
                "similarity": similarity,
                "score": score,
            }

    return best if best and best["score"] >= 0.5 else None


def similarity(s1: str, s2: str) -> float:
    """Calculate similarity ratio between two strings (0-1)."""
    if not s1 or not s2:
        return 0.0
    return difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio()


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def connect_neo4j() -> GraphDatabase.driver:
    """Connect to Neo4j using environment variables."""
    load_dotenv()
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("ERROR: NEO4J_URI and NEO4J_PASSWORD environment variables required.")
        sys.exit(1)

    # SSL certificate handling for Neo4j Aura
    if uri.startswith("neo4j+s://"):
        uri = uri.replace("neo4j+s://", "neo4j+ssc://")

    return GraphDatabase.driver(uri, auth=(user, pwd))


def fetch_all_entities(driver, entity_type: str) -> List[Dict]:
    """Fetch all entities of a given type with Q-IDs from Neo4j.

    Args:
        entity_type: "HistoricalFigure" or "MediaWork"

    Returns:
        List of dicts with keys: id_field, name_field, qid, canonical_id
    """
    if entity_type == "HistoricalFigure":
        query = """
            MATCH (n:HistoricalFigure)
            WHERE n.wikidata_id IS NOT NULL AND n.wikidata_id STARTS WITH 'Q'
            RETURN n.canonical_id AS canonical_id,
                   n.name AS name,
                   n.wikidata_id AS wikidata_id
            ORDER BY n.name
        """
        name_field = "name"
    elif entity_type == "MediaWork":
        query = """
            MATCH (n:MediaWork)
            WHERE n.wikidata_id IS NOT NULL AND n.wikidata_id STARTS WITH 'Q'
            RETURN n.media_id AS canonical_id,
                   n.title AS name,
                   n.wikidata_id AS wikidata_id
            ORDER BY n.title
        """
        name_field = "name"
    else:
        raise ValueError(f"Unknown entity type: {entity_type}")

    with driver.session() as session:
        result = session.run(query)
        return [dict(record) for record in result]


# ---------------------------------------------------------------------------
# Core audit logic
# ---------------------------------------------------------------------------

class AuditResult:
    """Container for a single entity audit result."""

    def __init__(self, canonical_id: str, name: str, qid: str, entity_type: str):
        self.canonical_id = canonical_id
        self.name = name
        self.qid = qid
        self.entity_type = entity_type  # "HistoricalFigure" or "MediaWork"
        self.wikidata_label: Optional[str] = None
        self.wikidata_description: Optional[str] = None
        self.similarity: float = 0.0
        self.status: str = "pending"  # ok, mismatch, missing, error
        self.suggested_qid: Optional[str] = None
        self.suggested_label: Optional[str] = None
        self.suggested_description: Optional[str] = None
        self.suggested_similarity: float = 0.0


def audit_entities(
    driver,
    entity_type: str,
    threshold: float,
    search_corrections: bool = True,
) -> List[AuditResult]:
    """Audit all entities of a given type.

    Returns list of AuditResult for flagged entities only.
    """
    type_label = "figure" if entity_type == "HistoricalFigure" else "work"
    entities = fetch_all_entities(driver, entity_type)
    total = len(entities)

    print(f"\n{'='*80}")
    print(f"AUDITING {entity_type} Q-IDs ({total} entities)")
    print(f"{'='*80}\n")

    if total == 0:
        print("  No entities to audit.")
        return []

    flagged: List[AuditResult] = []
    ok_count = 0
    missing_count = 0
    error_count = 0

    # Process in batches
    for batch_start in range(0, total, BATCH_SIZE):
        batch = entities[batch_start : batch_start + BATCH_SIZE]
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"  Batch {batch_num}/{total_batches} ({batch_start+1}-{batch_end} of {total})...")

        qids = [e["wikidata_id"] for e in batch]
        labels = fetch_labels_batch(qids)

        for entity in batch:
            qid = entity["wikidata_id"]
            name = entity["name"]
            canonical_id = entity["canonical_id"]

            result = AuditResult(canonical_id, name, qid, entity_type)

            wd_data = labels.get(qid)

            if wd_data is None:
                result.status = "missing"
                missing_count += 1
                flagged.append(result)
                continue

            if wd_data.get("label") is None:
                result.status = "error"
                result.wikidata_description = wd_data.get("description", "")
                error_count += 1
                flagged.append(result)
                continue

            result.wikidata_label = wd_data["label"]
            result.wikidata_description = wd_data.get("description", "")
            result.similarity = similarity(name, wd_data["label"])

            if result.similarity >= threshold:
                result.status = "ok"
                ok_count += 1
            else:
                result.status = "mismatch"
                flagged.append(result)

        time.sleep(REQUEST_DELAY)

    # Search for correct Q-IDs for flagged items
    if search_corrections and flagged:
        print(f"\n  Searching Wikidata for correct Q-IDs for {len(flagged)} flagged entities...")
        for i, result in enumerate(flagged):
            if result.status in ("mismatch", "missing"):
                suggestion = search_correct_qid(result.name, type_label)
                if suggestion:
                    result.suggested_qid = suggestion["qid"]
                    result.suggested_label = suggestion["label"]
                    result.suggested_description = suggestion.get("description", "")
                    result.suggested_similarity = suggestion["similarity"]
                time.sleep(REQUEST_DELAY)

    # Summary
    mismatch_count = sum(1 for r in flagged if r.status == "mismatch")
    print(f"\n  Summary for {entity_type}:")
    print(f"    OK:        {ok_count}")
    print(f"    Mismatch:  {mismatch_count}")
    print(f"    Missing:   {missing_count}")
    print(f"    Error:     {error_count}")

    return flagged


# ---------------------------------------------------------------------------
# Fix logic
# ---------------------------------------------------------------------------

def apply_fixes(driver, results: List[AuditResult], auto_fix: bool = False):
    """Apply Q-ID corrections to the database.

    Only fixes items where:
    - Status is 'mismatch'
    - A suggested Q-ID was found
    - The suggested Q-ID has high similarity (>= 0.8)
    - No existing node already uses the suggested Q-ID (conflict check)
    """
    fixable = [
        r for r in results
        if r.status in ("mismatch", "missing")
        and r.suggested_qid
        and r.suggested_similarity >= 0.8
        and r.suggested_qid != r.qid
    ]

    if not fixable:
        print("\nNo auto-fixable mismatches found.")
        return

    # Check for conflicts: does any existing node already use the suggested Q-ID?
    print("\nChecking for Q-ID conflicts...")
    safe_fixes = []
    conflicts = []

    with driver.session() as session:
        for r in fixable:
            if r.entity_type == "HistoricalFigure":
                conflict_check = session.run(
                    "MATCH (n:HistoricalFigure) WHERE n.canonical_id = $qid OR n.wikidata_id = $qid RETURN n.name AS name, n.canonical_id AS cid",
                    qid=r.suggested_qid,
                )
                conflict = conflict_check.single()
                if conflict:
                    conflicts.append((r, conflict["name"], conflict["cid"]))
                else:
                    safe_fixes.append(r)
            else:
                conflict_check = session.run(
                    "MATCH (n:MediaWork {wikidata_id: $qid}) RETURN n.title AS name, n.media_id AS mid",
                    qid=r.suggested_qid,
                )
                conflict = conflict_check.single()
                if conflict:
                    conflicts.append((r, conflict["name"], conflict["mid"]))
                else:
                    safe_fixes.append(r)

    if conflicts:
        print(f"\n  {len(conflicts)} fixes SKIPPED due to Q-ID conflicts:")
        for r, existing_name, existing_id in conflicts:
            print(f"    {r.name}: {r.suggested_qid} already used by '{existing_name}' ({existing_id})")

    print(f"\n{'='*80}")
    print(f"PROPOSED FIXES ({len(safe_fixes)} entities, {len(conflicts)} skipped)")
    print(f"{'='*80}\n")

    for r in safe_fixes[:30]:  # Show first 30
        print(f"  {r.name}")
        print(f"    Current:   {r.qid} -> '{r.wikidata_label}' (sim: {r.similarity:.2%})")
        print(f"    Suggested: {r.suggested_qid} -> '{r.suggested_label}' (sim: {r.suggested_similarity:.2%})")
        print()

    if len(safe_fixes) > 30:
        print(f"  ... and {len(safe_fixes) - 30} more")
        print()

    if not auto_fix:
        print("Run with --fix to apply these corrections.")
        return

    print(f"Applying {len(safe_fixes)} fixes...")
    fixed_count = 0
    error_count = 0

    with driver.session() as session:
        for r in safe_fixes:
            if r.entity_type == "HistoricalFigure":
                query = """
                    MATCH (n:HistoricalFigure {canonical_id: $old_id})
                    SET n.wikidata_id = $new_qid,
                        n.canonical_id = $new_qid
                    RETURN n.name AS name
                """
            else:
                query = """
                    MATCH (n:MediaWork {wikidata_id: $old_id})
                    SET n.wikidata_id = $new_qid
                    RETURN n.title AS name
                """

            try:
                result = session.run(
                    query,
                    old_id=r.qid if r.entity_type == "MediaWork" else r.canonical_id,
                    new_qid=r.suggested_qid,
                )
                record = result.single()
                if record:
                    print(f"    FIXED: {r.name} ({r.qid} -> {r.suggested_qid})")
                    fixed_count += 1
                else:
                    print(f"    WARNING: No node found for {r.name} ({r.canonical_id})")
            except Exception as e:
                print(f"    ERROR fixing {r.name}: {e}")
                error_count += 1

    print(f"\nFixes applied: {fixed_count} fixed, {error_count} errors.")
    print("Run audit again to verify.")


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def generate_report(results: List[AuditResult], output_path: str):
    """Generate a JSON report of all flagged entities."""
    report = {
        "generated": datetime.now().isoformat(),
        "total_flagged": len(results),
        "mismatches": [],
        "missing": [],
        "errors": [],
    }

    for r in results:
        entry = {
            "canonical_id": r.canonical_id,
            "name": r.name,
            "current_qid": r.qid,
            "entity_type": r.entity_type,
            "wikidata_label": r.wikidata_label,
            "wikidata_description": r.wikidata_description,
            "similarity": round(r.similarity, 4),
        }
        if r.suggested_qid:
            entry["suggested_qid"] = r.suggested_qid
            entry["suggested_label"] = r.suggested_label
            entry["suggested_description"] = r.suggested_description
            entry["suggested_similarity"] = round(r.suggested_similarity, 4)

        if r.status == "mismatch":
            report["mismatches"].append(entry)
        elif r.status == "missing":
            report["missing"].append(entry)
        elif r.status == "error":
            report["errors"].append(entry)

    # Sort mismatches by similarity (worst first)
    report["mismatches"].sort(key=lambda x: x["similarity"])

    with open(output_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nReport saved to: {output_path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Audit Wikidata Q-IDs for all entities in the Fictotum database"
    )
    parser.add_argument(
        "--fix", action="store_true",
        help="Apply auto-fixable corrections (high-confidence suggestions only)"
    )
    parser.add_argument(
        "--threshold", type=float, default=DEFAULT_THRESHOLD,
        help=f"Similarity threshold below which to flag (default: {DEFAULT_THRESHOLD})"
    )
    parser.add_argument(
        "--figures-only", action="store_true",
        help="Only audit HistoricalFigure nodes"
    )
    parser.add_argument(
        "--works-only", action="store_true",
        help="Only audit MediaWork nodes"
    )
    parser.add_argument(
        "--report", type=str, default=None,
        help="Output JSON report path (default: docs/reports/qid-audit-<date>.json)"
    )
    parser.add_argument(
        "--no-search", action="store_true",
        help="Skip searching Wikidata for correct Q-IDs (faster, report-only)"
    )
    args = parser.parse_args()

    print(f"{'='*80}")
    print(f"FICTOTUM Q-ID AUDIT")
    print(f"Threshold: {args.threshold}  |  Fix mode: {'ON' if args.fix else 'OFF'}")
    print(f"{'='*80}")

    driver = connect_neo4j()
    all_flagged: List[AuditResult] = []

    try:
        if not args.works_only:
            figure_flagged = audit_entities(
                driver, "HistoricalFigure", args.threshold,
                search_corrections=not args.no_search
            )
            all_flagged.extend(figure_flagged)

        if not args.figures_only:
            work_flagged = audit_entities(
                driver, "MediaWork", args.threshold,
                search_corrections=not args.no_search
            )
            all_flagged.extend(work_flagged)

        # Print detailed results
        if all_flagged:
            print(f"\n{'='*80}")
            print(f"FLAGGED ENTITIES ({len(all_flagged)} total)")
            print(f"{'='*80}\n")

            for r in sorted(all_flagged, key=lambda x: x.similarity):
                status_icon = {
                    "mismatch": "MISMATCH",
                    "missing": "MISSING",
                    "error": "ERROR",
                }.get(r.status, r.status.upper())

                print(f"  [{status_icon}] {r.name} ({r.entity_type})")
                print(f"    Q-ID:      {r.qid}")
                if r.wikidata_label:
                    print(f"    WD Label:  '{r.wikidata_label}' ({r.wikidata_description})")
                    print(f"    Sim:       {r.similarity:.2%}")
                if r.suggested_qid:
                    print(f"    Suggest:   {r.suggested_qid} -> '{r.suggested_label}' (sim: {r.suggested_similarity:.2%})")
                    print(f"               {r.suggested_description}")
                print()

            # Apply fixes if requested
            if args.fix:
                apply_fixes(driver, all_flagged, auto_fix=True)
            else:
                # Show how many are auto-fixable
                fixable = [
                    r for r in all_flagged
                    if r.status == "mismatch"
                    and r.suggested_qid
                    and r.suggested_similarity >= 0.8
                    and r.suggested_qid != r.qid
                ]
                if fixable:
                    print(f"  {len(fixable)} entities are auto-fixable. Run with --fix to apply.")

        else:
            print("\nAll Q-IDs validated successfully!")

        # Generate report
        if all_flagged:
            report_dir = Path(__file__).parent.parent.parent / "docs" / "reports"
            report_dir.mkdir(parents=True, exist_ok=True)
            report_path = args.report or str(
                report_dir / f"qid-audit-{datetime.now().strftime('%Y-%m-%d')}.json"
            )
            generate_report(all_flagged, report_path)

    finally:
        driver.close()


if __name__ == "__main__":
    main()
