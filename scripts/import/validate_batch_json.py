#!/usr/bin/env python3
"""
Fictotum JSON Schema Validator

Validates batch import JSON files against the official schema.
Provides detailed error messages for schema violations.

Usage:
    python validate_batch_json.py <json_file>
"""

import sys
import json
from pathlib import Path
from typing import List, Tuple

def validate_structure(data: dict) -> Tuple[bool, List[str]]:
    """
    Validate JSON structure against Fictotum batch import schema.

    Returns:
        Tuple of (is_valid, error_messages)
    """
    errors = []

    # Check root structure
    if not isinstance(data, dict):
        errors.append("Root must be an object/dict")
        return False, errors

    # Validate metadata section
    if "metadata" not in data:
        errors.append("Missing required 'metadata' section")
    else:
        metadata = data["metadata"]
        if not isinstance(metadata, dict):
            errors.append("'metadata' must be an object")
        else:
            required_meta = ["source", "curator", "date"]
            for field in required_meta:
                if field not in metadata:
                    errors.append(f"metadata.{field} is required")
                elif not metadata[field]:
                    errors.append(f"metadata.{field} cannot be empty")

            # Validate date format
            if "date" in metadata and metadata["date"]:
                import re
                if not re.match(r'^\d{4}-\d{2}-\d{2}$', metadata["date"]):
                    errors.append("metadata.date must be in YYYY-MM-DD format")

    # Check that at least one data section exists
    has_data = any(key in data for key in ["figures", "works", "relationships"])
    if not has_data:
        errors.append("Must provide at least one of: 'figures', 'works', 'relationships'")

    # Validate figures array
    if "figures" in data:
        if not isinstance(data["figures"], list):
            errors.append("'figures' must be an array")
        else:
            for idx, figure in enumerate(data["figures"]):
                figure_errors = validate_figure(figure, idx)
                errors.extend(figure_errors)

    # Validate works array
    if "works" in data:
        if not isinstance(data["works"], list):
            errors.append("'works' must be an array")
        else:
            for idx, work in enumerate(data["works"]):
                work_errors = validate_work(work, idx)
                errors.extend(work_errors)

    # Validate relationships array
    if "relationships" in data:
        if not isinstance(data["relationships"], list):
            errors.append("'relationships' must be an array")
        else:
            for idx, rel in enumerate(data["relationships"]):
                rel_errors = validate_relationship(rel, idx)
                errors.extend(rel_errors)

    return len(errors) == 0, errors


def validate_figure(figure: dict, idx: int) -> List[str]:
    """Validate a HistoricalFigure object."""
    errors = []
    prefix = f"figures[{idx}]"

    if not isinstance(figure, dict):
        errors.append(f"{prefix} must be an object")
        return errors

    # Required: name
    if "name" not in figure:
        errors.append(f"{prefix}.name is required")
    elif not figure["name"]:
        errors.append(f"{prefix}.name cannot be empty")

    # At least one identifier required
    has_canonical = "canonical_id" in figure and figure["canonical_id"]
    has_wikidata = "wikidata_id" in figure and figure["wikidata_id"]

    if not has_canonical and not has_wikidata:
        errors.append(f"{prefix}: must provide either 'canonical_id' or 'wikidata_id'")

    # Validate wikidata_id format
    if has_wikidata:
        qid = figure["wikidata_id"]
        if not qid.startswith("Q") or not qid[1:].isdigit():
            errors.append(f"{prefix}.wikidata_id invalid format: '{qid}' (must be Q followed by digits)")

    # Validate canonical_id format
    if has_canonical:
        cid = figure["canonical_id"]
        import re
        if not re.match(r'^(Q\d+|PROV:[a-z0-9-]+|[a-z_][a-z0-9_-]*)$', cid):
            errors.append(f"{prefix}.canonical_id invalid format: '{cid}'")

    # Validate year fields
    for year_field in ["birth_year", "death_year"]:
        if year_field in figure and figure[year_field] is not None:
            if not isinstance(figure[year_field], int):
                errors.append(f"{prefix}.{year_field} must be an integer")
            else:
                year = figure[year_field]
                if year < -10000 or year > 2100:
                    errors.append(f"{prefix}.{year_field} out of valid range (-10000 to 2100)")

    # Validate birth/death year logic
    if "birth_year" in figure and "death_year" in figure:
        if figure["birth_year"] and figure["death_year"]:
            if figure["death_year"] < figure["birth_year"]:
                errors.append(f"{prefix}: death_year cannot be before birth_year")

    # Validate historicity_status if present
    if "historicity_status" in figure and figure["historicity_status"]:
        valid_statuses = ["historical", "legendary", "mythological", "fictional"]
        if figure["historicity_status"] not in valid_statuses:
            errors.append(f"{prefix}.historicity_status must be one of: {valid_statuses}")

    return errors


def validate_work(work: dict, idx: int) -> List[str]:
    """Validate a MediaWork object."""
    errors = []
    prefix = f"works[{idx}]"

    if not isinstance(work, dict):
        errors.append(f"{prefix} must be an object")
        return errors

    # Required: title
    if "title" not in work:
        errors.append(f"{prefix}.title is required")
    elif not work["title"]:
        errors.append(f"{prefix}.title cannot be empty")

    # Strongly recommended: wikidata_id
    if "wikidata_id" not in work or not work["wikidata_id"]:
        # This is a warning, not an error
        pass
    else:
        qid = work["wikidata_id"]
        if not qid.startswith("Q") or not qid[1:].isdigit():
            errors.append(f"{prefix}.wikidata_id invalid format: '{qid}' (must be Q followed by digits)")

    # Validate creator_wikidata_id if present
    if "creator_wikidata_id" in work and work["creator_wikidata_id"]:
        qid = work["creator_wikidata_id"]
        if not qid.startswith("Q") or not qid[1:].isdigit():
            errors.append(f"{prefix}.creator_wikidata_id invalid format: '{qid}'")

    # Validate media_type if present
    if "media_type" in work and work["media_type"]:
        valid_types = [
            "BOOK", "FILM", "TV_SERIES", "GAME", "PLAY", "COMIC",
            "BOOK_SERIES", "FILM_SERIES", "TV_SERIES_COLLECTION", "GAME_SERIES"
        ]
        if work["media_type"] not in valid_types:
            errors.append(f"{prefix}.media_type must be one of: {valid_types}")

    # Validate release_year if present
    if "release_year" in work and work["release_year"] is not None:
        if not isinstance(work["release_year"], int):
            errors.append(f"{prefix}.release_year must be an integer")
        else:
            year = work["release_year"]
            if year < -3000 or year > 2100:
                errors.append(f"{prefix}.release_year out of valid range (-3000 to 2100)")

    return errors


def validate_relationship(rel: dict, idx: int) -> List[str]:
    """Validate a Relationship object."""
    errors = []
    prefix = f"relationships[{idx}]"

    if not isinstance(rel, dict):
        errors.append(f"{prefix} must be an object")
        return errors

    # Required fields
    required = ["from_id", "from_type", "to_id", "to_type", "rel_type"]
    for field in required:
        if field not in rel:
            errors.append(f"{prefix}.{field} is required")
        elif not rel[field]:
            errors.append(f"{prefix}.{field} cannot be empty")

    # Validate node types
    valid_types = ["HistoricalFigure", "MediaWork", "FictionalCharacter"]
    if "from_type" in rel and rel["from_type"]:
        if rel["from_type"] not in valid_types:
            errors.append(f"{prefix}.from_type must be one of: {valid_types}")

    if "to_type" in rel and rel["to_type"]:
        if rel["to_type"] not in valid_types:
            errors.append(f"{prefix}.to_type must be one of: {valid_types}")

    # Validate relationship type
    valid_rels = [
        "APPEARS_IN", "PORTRAYED_IN", "INTERACTED_WITH",
        "BASED_ON", "FICTIONAL_PROXY", "CONTEMPORARY",
        "NEMESIS_OF", "SUBJECT_OF"
    ]
    if "rel_type" in rel and rel["rel_type"]:
        if rel["rel_type"] not in valid_rels:
            errors.append(f"{prefix}.rel_type must be one of: {valid_rels}")

    # Validate properties if present
    if "properties" in rel and rel["properties"]:
        if not isinstance(rel["properties"], dict):
            errors.append(f"{prefix}.properties must be an object")
        else:
            props = rel["properties"]

            # Validate sentiment if present
            if "sentiment" in props and props["sentiment"]:
                valid_sentiments = ["heroic", "villainous", "neutral", "complex"]
                if props["sentiment"] not in valid_sentiments:
                    errors.append(f"{prefix}.properties.sentiment must be one of: {valid_sentiments}")

            # Validate is_protagonist if present
            if "is_protagonist" in props and props["is_protagonist"] is not None:
                if not isinstance(props["is_protagonist"], bool):
                    errors.append(f"{prefix}.properties.is_protagonist must be a boolean")

    return errors


def print_validation_report(is_valid: bool, errors: List[str], filepath: str):
    """Print formatted validation report."""
    print("=" * 80)
    print("Fictotum JSON Validation Report")
    print("=" * 80)
    print(f"File: {filepath}")
    print(f"Status: {'✅ VALID' if is_valid else '❌ INVALID'}")
    print("=" * 80)

    if is_valid:
        print("\n✅ All validation checks passed!")
        print("\nFile is ready for batch import.")
    else:
        print(f"\n❌ Found {len(errors)} validation error(s):\n")
        for error in errors:
            print(f"  • {error}")
        print("\nPlease fix these errors before importing.")

    print("=" * 80)


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python validate_batch_json.py <json_file>")
        print("\nExample:")
        print("  python validate_batch_json.py data/my_batch.json")
        sys.exit(1)

    filepath = sys.argv[1]

    # Check file exists
    if not Path(filepath).exists():
        print(f"❌ Error: File not found: {filepath}")
        sys.exit(1)

    # Load JSON
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON syntax in '{filepath}'")
        print(f"\nDetails: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        sys.exit(1)

    # Validate structure
    is_valid, errors = validate_structure(data)

    # Print report
    print_validation_report(is_valid, errors, filepath)

    # Exit with appropriate code
    sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
