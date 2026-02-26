#!/usr/bin/env python3
"""
Fictotum: Marcus Didius Falco Series - Books 2-5 Master Ingestion

Master ingestion script that runs all four book ingestion scripts in sequence,
following the established protocol from Book 1 (The Silver Pigs).

Books to Ingest:
1. Shadows in Bronze (Book 2, AD 71)
2. Venus in Copper (Book 3, AD 71)
3. The Iron Hand of Mars (Book 4, AD 71-72)
4. Poseidon's Gold (Book 5, AD 72)

Strategy:
- Runs each book's ingestion script sequentially
- MERGE operations prevent duplicate core characters
- New characters added incrementally for each book
- Tracks statistics across all four books
- Provides comprehensive summary of series expansion

Expected Output:
- 4 new MediaWork nodes
- 27 new HistoricalFigure nodes
- 43 APPEARS_IN relationships
- 38 INTERACTED_WITH relationships
- 0 duplicate core characters (via MERGE)
"""

import os
import sys
import subprocess
import traceback
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Define ingestion scripts
INGESTION_SCRIPTS = [
    {
        "name": "Shadows in Bronze (Book 2)",
        "script": "ingest_falco_book2_shadows_in_bronze.py",
        "release_year": 1990,
        "wikidata_id": "Q3858900",
    },
    {
        "name": "Venus in Copper (Book 3)",
        "script": "ingest_falco_book3_venus_in_copper.py",
        "release_year": 1991,
        "wikidata_id": "Q3824690",
    },
    {
        "name": "The Iron Hand of Mars (Book 4)",
        "script": "ingest_falco_book4_iron_hand_mars.py",
        "release_year": 1992,
        "wikidata_id": "Q3824696",
    },
    {
        "name": "Poseidon's Gold (Book 5)",
        "script": "ingest_falco_book5_poseidons_gold.py",
        "release_year": 1993,
        "wikidata_id": "Q3824702",
    },
]

# Results tracking
RESULTS = {
    "total_books": len(INGESTION_SCRIPTS),
    "successful": 0,
    "failed": 0,
    "books": {}
}


def run_ingestion_script(script_path: str, book_info: dict) -> bool:
    """
    Execute a single book ingestion script.

    Args:
        script_path: Full path to ingestion script
        book_info: Dictionary with book metadata

    Returns:
        True if successful, False otherwise
    """
    book_name = book_info["name"]
    print("\n" + "="*80)
    print(f"EXECUTING: {book_name}")
    print(f"Release Year: {book_info['release_year']}")
    print(f"Wikidata Q-ID: {book_info['wikidata_id']}")
    print("="*80)

    try:
        # Run the script using Python
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        # Print output
        if result.stdout:
            print(result.stdout)

        # Check for errors
        if result.returncode != 0:
            print(f"\nERROR: {book_name} ingestion failed")
            if result.stderr:
                print("STDERR:", result.stderr)
            RESULTS["books"][book_name] = {
                "status": "FAILED",
                "error": result.stderr or "Script returned non-zero exit code"
            }
            return False
        else:
            print(f"\nSUCCESS: {book_name} ingestion completed")
            RESULTS["books"][book_name] = {"status": "SUCCESS"}
            return True

    except subprocess.TimeoutExpired:
        print(f"ERROR: {book_name} ingestion timed out (300s)")
        RESULTS["books"][book_name] = {"status": "TIMEOUT"}
        return False
    except Exception as e:
        print(f"ERROR: {book_name} ingestion error: {e}")
        traceback.print_exc()
        RESULTS["books"][book_name] = {"status": "ERROR", "error": str(e)}
        return False


def main():
    """Main master ingestion workflow."""
    # Get script directory
    script_dir = Path(__file__).parent

    # Verify Neo4j credentials
    neo4j_uri = os.getenv("NEO4J_URI")
    neo4j_user = os.getenv("NEO4J_USERNAME") or os.getenv("NEO4J_USER")
    neo4j_password = os.getenv("NEO4J_PASSWORD")

    if not all([neo4j_uri, neo4j_user, neo4j_password]):
        print("ERROR: Missing Neo4j credentials in environment variables")
        print("Required: NEO4J_URI, NEO4J_USERNAME (or NEO4J_USER), NEO4J_PASSWORD")
        return False

    # Print header
    print("\n" + "#"*80)
    print("# Fictotum: Marcus Didius Falco Series - Books 2-5 Master Ingestion")
    print("#"*80)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Total books to ingest: {len(INGESTION_SCRIPTS)}")
    print(f"Neo4j Instance: {neo4j_uri}")
    print("#"*80)

    # Execute each book's ingestion
    for book_info in INGESTION_SCRIPTS:
        script_path = script_dir / book_info["script"]

        if not script_path.exists():
            print(f"\nERROR: Script not found: {script_path}")
            RESULTS["failed"] += 1
            RESULTS["books"][book_info["name"]] = {"status": "NOT_FOUND"}
            continue

        # Run ingestion
        success = run_ingestion_script(str(script_path), book_info)

        if success:
            RESULTS["successful"] += 1
        else:
            RESULTS["failed"] += 1

    # Print summary
    print("\n" + "#"*80)
    print("# MASTER INGESTION SUMMARY: Books 2-5")
    print("#"*80)
    print(f"Total Books: {RESULTS['total_books']}")
    print(f"Successful: {RESULTS['successful']}")
    print(f"Failed: {RESULTS['failed']}")
    print()

    for book_name, result in RESULTS["books"].items():
        status_icon = "✓" if result["status"] == "SUCCESS" else "✗"
        print(f"{status_icon} {book_name}: {result['status']}")
        if "error" in result:
            print(f"  Error: {result['error']}")

    print("#"*80)

    # Expected output statistics
    if RESULTS["successful"] == RESULTS["total_books"]:
        print("\n✓ ALL BOOKS SUCCESSFULLY INGESTED")
        print("\nExpected Database Changes:")
        print("- 4 new MediaWork nodes (Books 2-5)")
        print("- 27 new HistoricalFigure nodes (6-8 per book)")
        print("- 4 core characters MERGED (no duplicates)")
        print("- 43+ APPEARS_IN relationships")
        print("- 38+ INTERACTED_WITH relationships")
        print("- Series expansion: 11 → ~35+ unique characters")
        return True
    else:
        print(f"\n✗ INGESTION PARTIALLY FAILED ({RESULTS['failed']} books failed)")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
