#!/usr/bin/env python3
"""
Fictotum Enrichment Worker - Digital Kanban System
Processes works one-at-a-time with resilient API retry logic.
"""

import json
import os
import time
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception,
    before_sleep_log
)
import logging

# Load environment
load_dotenv()

# Configure logging for retry visibility
logging.basicConfig(level=logging.INFO, format='   ⚠️  %(message)s')
logger = logging.getLogger(__name__)

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Kanban board file paths (relative to project root)
PROJECT_ROOT = Path(__file__).parent.parent.parent
TODO_FILE = PROJECT_ROOT / "data" / "1_todo_harvest.json"
DONE_FILE = PROJECT_ROOT / "data" / "2_done_enriched.json"
FAILED_FILE = PROJECT_ROOT / "data" / "3_failed_qa.json"


def load_json_file(filepath):
    """Load JSON file, return empty list if file doesn't exist."""
    if not filepath.exists():
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"⚠️  Warning: {filepath} is corrupted. Treating as empty.")
        return []


def append_to_json_file(filepath, work_data):
    """Append a work object to a JSON file (maintaining list structure)."""
    # Load existing data
    existing_data = load_json_file(filepath)

    # Append new work
    existing_data.append(work_data)

    # Write back
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(existing_data, f, indent=2, ensure_ascii=False)


def get_processed_ids():
    """Return set of wikidata_ids that have been processed (done or failed)."""
    done_works = load_json_file(DONE_FILE)
    failed_works = load_json_file(FAILED_FILE)

    processed_ids = set()
    for work in done_works + failed_works:
        if "wikidata_id" in work:
            processed_ids.add(work["wikidata_id"])

    return processed_ids


def find_next_work():
    """Find the next unprocessed work from the TODO list."""
    todo_works = load_json_file(TODO_FILE)
    processed_ids = get_processed_ids()

    for work in todo_works:
        if work.get("wikidata_id") not in processed_ids:
            return work

    return None


def is_rate_limit_error(exception):
    """
    Check if exception is a rate limit (429) error.
    Only these errors should trigger retry logic.
    """
    error_str = str(exception).lower()
    return (
        "429" in error_str or
        "rate" in error_str or
        "quota" in error_str or
        "resource" in error_str and "exhaust" in error_str
    )


@retry(
    retry=retry_if_exception(is_rate_limit_error),
    wait=wait_exponential(multiplier=1, min=20, max=300),  # 20s, ~40s, ~80s, ~160s, ~300s (with jitter)
    stop=stop_after_attempt(5),
    before_sleep=before_sleep_log(logger, logging.INFO),
    reraise=True
)
def call_gemini_api(prompt):
    """
    Call Gemini API with retry logic for rate limit errors (429).
    Uses exponential backoff with jitter: 20s, 40s, 80s, 160s, 300s.
    Raises exception after 5 failed attempts.
    """
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type='application/json'
        )
    )
    return response.text


def enrich_single_work(work):
    """
    Enrich a single work by calling Gemini API to extract characters.
    Returns the enriched work object with portrayals and historical_figures.
    """
    title = work.get("title", "Unknown")
    release_year = work.get("release_year", "Unknown")
    media_type = work.get("media_type", "")
    era = work.get("era_set_in", "Ancient Rome")

    prompt = f"""You are a historian and literary expert. Analyze this work set in {era}:

Title: {title}
Type: {media_type}
Release Year: {release_year}

Identify up to 3 key figures (historical or fictional protagonists/antagonists).
Return a JSON object with this exact schema:

{{
  "characters": [
    {{
      "name": "Character Full Name",
      "is_fictional": true or false,
      "sentiment": "Heroic" or "Villainous" or "Complex",
      "role": "One sentence describing their role in this work."
    }}
  ]
}}

Rules:
- Do NOT output markdown formatting
- Output ONLY raw JSON
- If you don't know this work, return {{"characters": []}}
"""

    try:
        # Call API with retry logic
        response_text = call_gemini_api(prompt)
        enrichment_data = json.loads(response_text)

        # Transform to ingestion schema
        work["portrayals"] = []
        work["historical_figures"] = []

        for char in enrichment_data.get("characters", []):
            # Generate canonical_id (slug)
            slug = char["name"].lower().replace(" ", "_").replace(".", "").replace("'", "")

            work["historical_figures"].append({
                "canonical_id": slug,
                "name": char["name"],
                "historicity_status": "Fictional" if char.get("is_fictional") else "Historical"
            })

            work["portrayals"].append({
                "figure_id": slug,
                "sentiment": char["sentiment"],
                "role_description": char["role"],
                "is_protagonist": False  # Default, can be refined later
            })

        return work

    except genai.errors.ClientError as e:
        # Rate limit error after all retries exhausted
        if "429" in str(e) or "ResourceExhausted" in str(e):
            print(f"❌ Rate limit persists after retries: {e}")
            raise  # Re-raise to be caught by main loop
        else:
            print(f"❌ API Client Error: {e}")
            raise

    except Exception as e:
        print(f"❌ Unexpected error during enrichment: {e}")
        raise


def main():
    """
    Main worker loop - processes works one at a time until TODO list is empty.
    """
    print("🚀 Fictotum Enrichment Worker Started")
    print(f"📋 Kanban Board:")
    print(f"   TODO:   {TODO_FILE}")
    print(f"   DONE:   {DONE_FILE}")
    print(f"   FAILED: {FAILED_FILE}")
    print()

    # Verify TODO file exists
    if not TODO_FILE.exists():
        print(f"❌ ERROR: TODO file not found at {TODO_FILE}")
        print("   Please create it with your harvest data.")
        return

    iteration = 0

    while True:
        iteration += 1

        # Find next work to process
        next_work = find_next_work()

        if next_work is None:
            print("\n✅ Work Complete! All items processed.")
            print(f"   Total iterations: {iteration - 1}")

            # Print summary
            done_count = len(load_json_file(DONE_FILE))
            failed_count = len(load_json_file(FAILED_FILE))
            print(f"   Successfully enriched: {done_count}")
            print(f"   Failed (needs QA): {failed_count}")
            break

        # Process the work
        wikidata_id = next_work.get("wikidata_id", "UNKNOWN")
        title = next_work.get("title", "Unknown")

        print(f"[{iteration}] Processing: {title} ({wikidata_id})")

        try:
            # Enrich the work (with retry logic inside)
            enriched_work = enrich_single_work(next_work)

            # Success - append to DONE
            append_to_json_file(DONE_FILE, enriched_work)

            char_count = len(enriched_work.get("portrayals", []))
            print(f"   ✅ Success! Found {char_count} character(s). Added to DONE.")

            # Polite delay to respect API rate limits on successful calls
            print(f"   ⏳ Waiting 5 seconds before next work...")
            time.sleep(5)

        except Exception as e:
            # Permanent failure - append to FAILED
            print(f"   ❌ Failed permanently: {str(e)[:100]}")

            # Add error metadata
            next_work["error"] = str(e)
            next_work["error_type"] = type(e).__name__

            append_to_json_file(FAILED_FILE, next_work)
            print(f"   🔴 Added to FAILED queue for manual review.")

            # Brief delay before trying next item
            print(f"   ⏳ Waiting 5 seconds before next work...")
            time.sleep(5)


if __name__ == "__main__":
    main()
