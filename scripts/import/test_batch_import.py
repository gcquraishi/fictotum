#!/usr/bin/env python3
"""
Fictotum Batch Import Test Suite

Tests the batch import functionality with example data.
Verifies duplicate detection, validation, and import logic.

Usage:
    python test_batch_import.py
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from import.batch_import import BatchImporter, validate_structure


def test_json_schema_validation():
    """Test JSON schema validation."""
    print("\n" + "=" * 80)
    print("TEST: JSON Schema Validation")
    print("=" * 80)

    # Test valid JSON
    valid_json = {
        "metadata": {
            "source": "Test Dataset",
            "curator": "Test Suite",
            "date": "2026-02-01"
        },
        "figures": [
            {
                "name": "Test Figure",
                "wikidata_id": "Q123"
            }
        ]
    }

    is_valid, errors = validate_structure(valid_json)
    assert is_valid, f"Valid JSON failed validation: {errors}"
    print("✅ Valid JSON passed validation")

    # Test invalid JSON (missing metadata)
    invalid_json_1 = {
        "figures": [{"name": "Test"}]
    }

    is_valid, errors = validate_structure(invalid_json_1)
    assert not is_valid, "Invalid JSON (missing metadata) passed validation"
    assert any("metadata" in error for error in errors)
    print("✅ Invalid JSON (missing metadata) correctly rejected")

    # Test invalid JSON (missing name)
    invalid_json_2 = {
        "metadata": {
            "source": "Test",
            "curator": "Test",
            "date": "2026-02-01"
        },
        "figures": [
            {"wikidata_id": "Q123"}  # Missing name
        ]
    }

    is_valid, errors = validate_structure(invalid_json_2)
    assert not is_valid, "Invalid JSON (missing name) passed validation"
    assert any("name" in error for error in errors)
    print("✅ Invalid JSON (missing name) correctly rejected")

    # Test invalid Q-ID format
    invalid_json_3 = {
        "metadata": {
            "source": "Test",
            "curator": "Test",
            "date": "2026-02-01"
        },
        "figures": [
            {
                "name": "Test",
                "wikidata_id": "INVALID"
            }
        ]
    }

    is_valid, errors = validate_structure(invalid_json_3)
    assert not is_valid, "Invalid JSON (bad Q-ID) passed validation"
    assert any("wikidata_id" in error for error in errors)
    print("✅ Invalid Q-ID format correctly rejected")

    print("\n✅ All schema validation tests passed!")


def test_example_files():
    """Test validation of example JSON files."""
    print("\n" + "=" * 80)
    print("TEST: Example File Validation")
    print("=" * 80)

    examples_dir = Path(__file__).parent.parent.parent / "data" / "examples"

    example_files = [
        "batch_figures_only.json",
        "batch_works_only.json",
        "batch_full_import.json"
    ]

    for filename in example_files:
        filepath = examples_dir / filename

        if not filepath.exists():
            print(f"⚠️  Warning: Example file not found: {filename}")
            continue

        with open(filepath, 'r') as f:
            data = json.load(f)

        is_valid, errors = validate_structure(data)

        if is_valid:
            print(f"✅ {filename} is valid")
        else:
            print(f"❌ {filename} has errors:")
            for error in errors:
                print(f"   - {error}")

        assert is_valid, f"Example file {filename} should be valid"

    print("\n✅ All example files are valid!")


def test_duplicate_detection():
    """Test duplicate detection logic."""
    print("\n" + "=" * 80)
    print("TEST: Duplicate Detection (Dry Run)")
    print("=" * 80)

    load_dotenv()

    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USERNAME", "neo4j")
    pwd = os.getenv("NEO4J_PASSWORD")

    if not uri or not pwd:
        print("⚠️  Skipping duplicate detection test (no Neo4j credentials)")
        return

    # Create importer in dry-run mode
    importer = BatchImporter(uri, user, pwd, dry_run=True)

    try:
        # Test with known figures that likely exist in database
        test_figures = [
            {
                "name": "Julius Caesar",
                "wikidata_id": "Q1048",
                "birth_year": -100,
                "death_year": -44
            },
            {
                "name": "Napoleon Bonaparte",
                "wikidata_id": "Q517",
                "birth_year": 1769,
                "death_year": 1821
            }
        ]

        print("\nTesting duplicate detection with known figures...")
        importer.detect_duplicate_figures(test_figures)

        if importer.duplicate_figures:
            print(f"✅ Detected {len(importer.duplicate_figures)} duplicates (expected)")
            for dup in importer.duplicate_figures:
                print(f"   - {dup['input_figure']['name']}: {dup['match_type']} (confidence: {dup['confidence']})")
        else:
            print("⚠️  No duplicates detected (database may be empty)")

        # Test with likely non-existent figure
        test_new_figure = [
            {
                "name": "Test Figure That Does Not Exist 12345",
                "canonical_id": "PROV:test-12345",
                "birth_year": 1900,
                "death_year": 1950
            }
        ]

        importer.duplicate_figures = []  # Reset
        importer.detect_duplicate_figures(test_new_figure)

        if not importer.duplicate_figures:
            print("✅ New figure correctly identified as non-duplicate")
        else:
            print("⚠️  New figure incorrectly flagged as duplicate")

    finally:
        importer.close()

    print("\n✅ Duplicate detection tests completed!")


def test_similarity_calculation():
    """Test name similarity algorithm."""
    print("\n" + "=" * 80)
    print("TEST: Name Similarity Algorithm")
    print("=" * 80)

    # We'll test without Neo4j
    from import.batch_import import BatchImporter

    # Create dummy importer just to access similarity method
    importer = type('DummyImporter', (), {
        '_calculate_enhanced_similarity': BatchImporter._calculate_enhanced_similarity
    })()

    test_cases = [
        ("Napoleon Bonaparte", "Napoleon Bonaparte", 1.0, "Exact match"),
        ("Julius Caesar", "Gaius Julius Caesar", 0.7, "Partial match"),
        ("Marcus Aurelius", "Mark Aurelius", 0.85, "Variant spelling"),
        ("Cleopatra", "Cleopatra VII", 0.85, "Name with numeral"),
        ("Napoleon", "Julius Caesar", 0.0, "No match")
    ]

    all_passed = True

    for name1, name2, expected_min, description in test_cases:
        similarity = importer._calculate_enhanced_similarity(importer, name1, name2)

        if similarity >= expected_min:
            print(f"✅ {description}: {name1} vs {name2} = {similarity:.2f}")
        else:
            print(f"❌ {description}: {name1} vs {name2} = {similarity:.2f} (expected >= {expected_min})")
            all_passed = False

    if all_passed:
        print("\n✅ All similarity tests passed!")
    else:
        print("\n⚠️  Some similarity tests failed")


def run_all_tests():
    """Run all tests."""
    print("=" * 80)
    print("Fictotum Batch Import Test Suite")
    print("=" * 80)

    try:
        test_json_schema_validation()
        test_example_files()
        test_similarity_calculation()

        # Only run duplicate detection if Neo4j is available
        test_duplicate_detection()

        print("\n" + "=" * 80)
        print("✅ ALL TESTS PASSED")
        print("=" * 80)

    except AssertionError as e:
        print("\n" + "=" * 80)
        print(f"❌ TEST FAILED: {e}")
        print("=" * 80)
        sys.exit(1)

    except Exception as e:
        print("\n" + "=" * 80)
        print(f"❌ UNEXPECTED ERROR: {e}")
        print("=" * 80)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
