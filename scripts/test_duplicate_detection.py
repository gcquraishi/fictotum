#!/usr/bin/env python3
"""
Test script for Fictotum Duplicate Detection System

Tests the duplicate detection API and merge operations.
Run after starting the Next.js dev server.

Usage:
    python scripts/test_duplicate_detection.py
"""

import requests
import json
from typing import Dict, List, Any

API_BASE = "http://localhost:3000"

def test_duplicate_detection_api():
    """Test the duplicate detection endpoint"""
    print("\n" + "="*80)
    print("TEST 1: Duplicate Detection API")
    print("="*80)

    # Test with different thresholds
    for threshold in [0.7, 0.8, 0.9]:
        print(f"\n→ Testing with threshold={threshold}")
        response = requests.get(
            f"{API_BASE}/api/audit/duplicates",
            params={
                "threshold": threshold,
                "min_confidence": "medium",
                "limit": 10
            }
        )

        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ Status: {response.status_code}")
            print(f"  ✓ Total scanned: {data['total_scanned']}")
            print(f"  ✓ Duplicates found: {data['count']}")

            if data['count'] > 0:
                print(f"\n  Top duplicate pair:")
                pair = data['duplicates'][0]
                print(f"    - Figure 1: {pair['figure1']['name']} ({pair['figure1']['canonical_id']})")
                print(f"    - Figure 2: {pair['figure2']['name']} ({pair['figure2']['canonical_id']})")
                print(f"    - Similarity: {pair['similarity']['combined']:.3f}")
                print(f"    - Confidence: {pair['similarity']['confidence']}")
                print(f"    - Lexical: {pair['similarity']['lexical']:.3f}")
                print(f"    - Phonetic: {pair['similarity']['phonetic']:.3f}")
        else:
            print(f"  ✗ Error: {response.status_code}")
            print(f"  ✗ Response: {response.text}")

def test_confidence_filtering():
    """Test confidence level filtering"""
    print("\n" + "="*80)
    print("TEST 2: Confidence Level Filtering")
    print("="*80)

    for confidence in ['high', 'medium', 'low']:
        print(f"\n→ Testing with min_confidence={confidence}")
        response = requests.get(
            f"{API_BASE}/api/audit/duplicates",
            params={
                "threshold": 0.7,
                "min_confidence": confidence,
                "limit": 100
            }
        )

        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ Duplicates found: {data['count']}")

            # Count by confidence
            high_count = sum(1 for d in data['duplicates'] if d['similarity']['confidence'] == 'high')
            medium_count = sum(1 for d in data['duplicates'] if d['similarity']['confidence'] == 'medium')
            low_count = sum(1 for d in data['duplicates'] if d['similarity']['confidence'] == 'low')

            print(f"    - High: {high_count}")
            print(f"    - Medium: {medium_count}")
            print(f"    - Low: {low_count}")
        else:
            print(f"  ✗ Error: {response.status_code}")

def test_dry_run_merge():
    """Test merge operation in dry-run mode"""
    print("\n" + "="*80)
    print("TEST 3: Dry-Run Merge Operation")
    print("="*80)

    # First, get a duplicate pair
    response = requests.get(
        f"{API_BASE}/api/audit/duplicates",
        params={"threshold": 0.9, "limit": 1}
    )

    if response.status_code == 200:
        data = response.json()
        if data['count'] > 0:
            pair = data['duplicates'][0]
            primary_id = pair['figure1']['canonical_id']
            secondary_id = pair['figure2']['canonical_id']

            print(f"\n→ Testing dry-run merge:")
            print(f"  Primary: {pair['figure1']['name']} ({primary_id})")
            print(f"  Secondary: {pair['figure2']['name']} ({secondary_id})")

            # NOTE: This endpoint requires authentication
            # For testing purposes, this will return 401
            merge_response = requests.post(
                f"{API_BASE}/api/audit/duplicates/merge",
                json={
                    "primary_id": primary_id,
                    "secondary_id": secondary_id,
                    "dry_run": True
                }
            )

            if merge_response.status_code == 401:
                print(f"  ⚠ Auth required (expected): {merge_response.status_code}")
                print(f"  ℹ To test merge, authenticate via web UI")
            elif merge_response.status_code == 200:
                merge_data = merge_response.json()
                print(f"  ✓ Dry-run successful")
                print(f"  ✓ Relationships: {merge_data.get('relationship_counts', [])}")
            else:
                print(f"  ✗ Error: {merge_response.status_code}")
                print(f"  ✗ Response: {merge_response.text}")
        else:
            print("  ℹ No high-confidence duplicates found for dry-run test")
    else:
        print(f"  ✗ Failed to fetch duplicates: {response.status_code}")

def test_figure_appearances():
    """Test the figure appearances endpoint"""
    print("\n" + "="*80)
    print("TEST 4: Figure Appearances Endpoint")
    print("="*80)

    # Test with a known figure ID
    test_ids = ["titus_emperor", "HF_001", "Q1434"]

    for figure_id in test_ids:
        print(f"\n→ Testing appearances for: {figure_id}")
        response = requests.get(f"{API_BASE}/api/figures/{figure_id}/appearances")

        if response.status_code == 200:
            data = response.json()
            print(f"  ✓ Status: {response.status_code}")
            print(f"  ✓ Appearances: {data['appearances_count']}")

            if data['appearances_count'] > 0:
                print(f"  ✓ Sample: {data['appearances'][0]['title']}")
        elif response.status_code == 404:
            print(f"  ℹ Figure not found (expected for some IDs)")
        else:
            print(f"  ✗ Error: {response.status_code}")

def display_summary():
    """Display summary of known duplicates"""
    print("\n" + "="*80)
    print("SUMMARY: Known Duplicates in Database")
    print("="*80)

    response = requests.get(
        f"{API_BASE}/api/audit/duplicates",
        params={"threshold": 0.7, "limit": 100}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"\nTotal Historical Figures Scanned: {data['total_scanned']}")
        print(f"Total Duplicate Pairs Found: {data['count']}")

        # Group by confidence
        high = [d for d in data['duplicates'] if d['similarity']['confidence'] == 'high']
        medium = [d for d in data['duplicates'] if d['similarity']['confidence'] == 'medium']
        low = [d for d in data['duplicates'] if d['similarity']['confidence'] == 'low']

        print(f"\nBreakdown by Confidence:")
        print(f"  - High:   {len(high)} pairs")
        print(f"  - Medium: {len(medium)} pairs")
        print(f"  - Low:    {len(low)} pairs")

        if len(high) > 0:
            print(f"\nTop 5 High-Confidence Duplicates:")
            for i, pair in enumerate(high[:5], 1):
                print(f"\n  {i}. {pair['figure1']['name']} / {pair['figure2']['name']}")
                print(f"     IDs: {pair['figure1']['canonical_id']} / {pair['figure2']['canonical_id']}")
                print(f"     Similarity: {pair['similarity']['combined']:.1%}")
                print(f"     Year Match: {'✓' if pair['year_match'] else '✗'}")

def main():
    print("\n" + "="*80)
    print("Fictotum Duplicate Detection System - Test Suite")
    print("="*80)
    print("\nEnsure Next.js dev server is running on http://localhost:3000")

    try:
        # Run all tests
        test_duplicate_detection_api()
        test_confidence_filtering()
        test_figure_appearances()
        test_dry_run_merge()
        display_summary()

        print("\n" + "="*80)
        print("✓ Test suite completed!")
        print("="*80)
        print("\nNext steps:")
        print("  1. Visit http://localhost:3000/admin/duplicates to test the UI")
        print("  2. Review high-confidence duplicates")
        print("  3. Perform test merge with dry_run=true")
        print("  4. Execute actual merge when ready")
        print()

    except requests.exceptions.ConnectionError:
        print("\n✗ Error: Could not connect to API")
        print("  Make sure Next.js dev server is running:")
        print("  cd web-app && npm run dev")
    except Exception as e:
        print(f"\n✗ Error: {e}")

if __name__ == "__main__":
    main()
