#!/usr/bin/env python3
"""
Fictotum CSV to Batch JSON Converter

Converts CSV files to Fictotum batch import JSON format.
Supports both historical figures and media works.

Usage:
    python csv_to_batch_json.py <input.csv> <output.json> --type figures
    python csv_to_batch_json.py <input.csv> <output.json> --type works
"""

import sys
import csv
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any


def parse_csv_to_figures(csv_path: str) -> List[Dict]:
    """
    Parse CSV file to HistoricalFigure objects.

    Expected CSV columns:
    - name (required)
    - wikidata_id (recommended)
    - canonical_id (optional)
    - birth_year (optional)
    - death_year (optional)
    - title (optional)
    - era (optional)
    - description (optional)
    """
    figures = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for idx, row in enumerate(reader):
            # Required field
            if not row.get("name"):
                print(f"⚠️  Warning: Row {idx + 2} missing 'name', skipping")
                continue

            figure = {
                "name": row["name"].strip()
            }

            # Optional fields
            if row.get("wikidata_id"):
                figure["wikidata_id"] = row["wikidata_id"].strip()

            if row.get("canonical_id"):
                figure["canonical_id"] = row["canonical_id"].strip()

            if row.get("birth_year"):
                try:
                    figure["birth_year"] = int(row["birth_year"])
                except ValueError:
                    print(f"⚠️  Warning: Row {idx + 2} invalid birth_year: {row['birth_year']}")

            if row.get("death_year"):
                try:
                    figure["death_year"] = int(row["death_year"])
                except ValueError:
                    print(f"⚠️  Warning: Row {idx + 2} invalid death_year: {row['death_year']}")

            if row.get("title"):
                figure["title"] = row["title"].strip()

            if row.get("era"):
                figure["era"] = row["era"].strip()

            if row.get("description"):
                figure["description"] = row["description"].strip()

            if row.get("historicity_status"):
                figure["historicity_status"] = row["historicity_status"].strip()

            figures.append(figure)

    return figures


def parse_csv_to_works(csv_path: str) -> List[Dict]:
    """
    Parse CSV file to MediaWork objects.

    Expected CSV columns:
    - title (required)
    - wikidata_id (strongly recommended)
    - media_type (optional)
    - release_year (optional)
    - creator (optional)
    - creator_wikidata_id (optional)
    - publisher (optional)
    - description (optional)
    - setting (optional)
    """
    works = []

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for idx, row in enumerate(reader):
            # Required field
            if not row.get("title"):
                print(f"⚠️  Warning: Row {idx + 2} missing 'title', skipping")
                continue

            work = {
                "title": row["title"].strip()
            }

            # Optional fields
            if row.get("wikidata_id"):
                work["wikidata_id"] = row["wikidata_id"].strip()

            if row.get("media_id"):
                work["media_id"] = row["media_id"].strip()

            if row.get("media_type"):
                work["media_type"] = row["media_type"].strip().upper()

            if row.get("release_year"):
                try:
                    work["release_year"] = int(row["release_year"])
                except ValueError:
                    print(f"⚠️  Warning: Row {idx + 2} invalid release_year: {row['release_year']}")

            if row.get("creator"):
                work["creator"] = row["creator"].strip()

            if row.get("creator_wikidata_id"):
                work["creator_wikidata_id"] = row["creator_wikidata_id"].strip()

            if row.get("publisher"):
                work["publisher"] = row["publisher"].strip()

            if row.get("description"):
                work["description"] = row["description"].strip()

            if row.get("setting"):
                work["setting"] = row["setting"].strip()

            works.append(work)

    return works


def create_batch_json(
    data_items: List[Dict],
    data_type: str,
    source: str,
    curator: str,
    description: str = None
) -> Dict:
    """Create batch import JSON structure."""

    batch = {
        "metadata": {
            "source": source,
            "curator": curator,
            "date": datetime.now().strftime("%Y-%m-%d")
        }
    }

    if description:
        batch["metadata"]["description"] = description

    if data_type == "figures":
        batch["figures"] = data_items
    elif data_type == "works":
        batch["works"] = data_items

    return batch


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Convert CSV to Fictotum batch import JSON",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
CSV Format Requirements:

For Figures (--type figures):
  Required columns: name
  Recommended: wikidata_id
  Optional: canonical_id, birth_year, death_year, title, era, description

For Works (--type works):
  Required columns: title
  Strongly Recommended: wikidata_id
  Optional: media_type, release_year, creator, creator_wikidata_id,
            publisher, description, setting

Example:
  python csv_to_batch_json.py data/figures.csv data/batch.json --type figures \\
    --source "Wikipedia Export" --curator "Research Team"
        """
    )

    parser.add_argument("input_csv", help="Input CSV file path")
    parser.add_argument("output_json", help="Output JSON file path")
    parser.add_argument(
        "--type",
        required=True,
        choices=["figures", "works"],
        help="Type of data: 'figures' or 'works'"
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Data source (e.g., 'Wikipedia', 'IMDb Export')"
    )
    parser.add_argument(
        "--curator",
        required=True,
        help="Name of person/team curating this data"
    )
    parser.add_argument(
        "--description",
        help="Optional description of this batch"
    )

    args = parser.parse_args()

    # Check input file exists
    input_path = Path(args.input_csv)
    if not input_path.exists():
        print(f"❌ Error: Input file not found: {input_path}")
        sys.exit(1)

    print("=" * 80)
    print("Fictotum CSV to JSON Converter")
    print("=" * 80)
    print(f"Input CSV: {input_path}")
    print(f"Output JSON: {args.output_json}")
    print(f"Type: {args.type}")
    print(f"Source: {args.source}")
    print(f"Curator: {args.curator}")
    print("=" * 80)

    # Parse CSV
    try:
        if args.type == "figures":
            print(f"\n📖 Parsing CSV as historical figures...")
            data_items = parse_csv_to_figures(str(input_path))
        else:
            print(f"\n📖 Parsing CSV as media works...")
            data_items = parse_csv_to_works(str(input_path))

        print(f"✅ Parsed {len(data_items)} records")

    except Exception as e:
        print(f"\n❌ Error parsing CSV: {e}")
        sys.exit(1)

    # Create batch JSON
    batch_data = create_batch_json(
        data_items,
        args.type,
        args.source,
        args.curator,
        args.description
    )

    # Write output
    try:
        output_path = Path(args.output_json)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(batch_data, f, indent=2, ensure_ascii=False)

        print(f"\n✅ JSON file created: {output_path}")
        print(f"\nNext steps:")
        print(f"  1. Validate: python scripts/import/validate_batch_json.py {output_path}")
        print(f"  2. Dry run: python scripts/import/batch_import.py {output_path} --dry-run")
        print(f"  3. Import: python scripts/import/batch_import.py {output_path} --execute")

    except Exception as e:
        print(f"\n❌ Error writing JSON file: {e}")
        sys.exit(1)

    print("=" * 80)


if __name__ == "__main__":
    main()
