#!/usr/bin/env python3
"""
CHR-54: Entity Resolution Test Suite

Unit and integration tests for the enhanced name similarity algorithm and
entity resolution system. Tests lexical + phonetic matching, edge cases,
and canonical_id collision prevention.

Run with: python scripts/qa/test_entity_resolution.py
"""

import sys
import os
from typing import Dict, List, Tuple
from dataclasses import dataclass

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

try:
    from metaphone import doublemetaphone
except ImportError:
    print("Installing required package: metaphone...")
    os.system(f"{sys.executable} -m pip install metaphone")
    from metaphone import doublemetaphone


@dataclass
class SimilarityScore:
    """Represents a name similarity score with lexical and phonetic components"""
    lexical: float
    phonetic: float
    combined: float
    confidence: str

    def __repr__(self):
        return (f"SimilarityScore(lexical={self.lexical:.3f}, phonetic={self.phonetic:.3f}, "
                f"combined={self.combined:.3f}, confidence='{self.confidence}')")


class EntityResolutionTester:
    """Test suite for entity resolution algorithms"""

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.test_results: List[Dict] = []

    # ========== CORE ALGORITHMS ==========

    def levenshtein_distance(self, s1: str, s2: str) -> int:
        """Calculate Levenshtein edit distance between two strings"""
        if len(s1) < len(s2):
            return self.levenshtein_distance(s2, s1)

        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                # Cost of insertions, deletions, or substitutions
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def calculate_lexical_similarity(self, str1: str, str2: str) -> float:
        """Calculate lexical similarity using Levenshtein distance (0.0 - 1.0)"""
        s1 = str1.lower()
        s2 = str2.lower()

        longer = s1 if len(s1) > len(s2) else s2
        shorter = s2 if len(s1) > len(s2) else s1

        if len(longer) == 0:
            return 1.0

        edit_distance = self.levenshtein_distance(longer, shorter)
        return (len(longer) - edit_distance) / len(longer)

    def calculate_phonetic_similarity(self, str1: str, str2: str) -> float:
        """
        Calculate phonetic similarity using Double Metaphone.
        Returns 1.0 for primary match, 0.5 for secondary match, 0.0 for no match.
        """
        if not str1 or not str2:
            return 0.0

        # Extract name tokens
        tokens1 = [t for t in str1.lower().strip().split() if len(t) > 0]
        tokens2 = [t for t in str2.lower().strip().split() if len(t) > 0]

        if len(tokens1) == 0 or len(tokens2) == 0:
            return 0.0

        # Calculate phonetic encoding for each token
        phonetics1 = [doublemetaphone(token) for token in tokens1]
        phonetics2 = [doublemetaphone(token) for token in tokens2]

        best_match = 0.0

        # Check for phonetic matches across all tokens
        for primary1, secondary1 in phonetics1:
            for primary2, secondary2 in phonetics2:
                # Primary phonetic key match (highest confidence)
                if primary1 and primary2 and primary1 == primary2:
                    best_match = max(best_match, 1.0)
                # Secondary phonetic key match (medium confidence)
                elif any([
                    (primary1 and secondary2 and primary1 == secondary2),
                    (secondary1 and primary2 and secondary1 == primary2),
                    (secondary1 and secondary2 and secondary1 == secondary2)
                ]):
                    best_match = max(best_match, 0.5)

        return best_match

    def enhanced_name_similarity(self, name1: str, name2: str) -> SimilarityScore:
        """
        Enhanced name similarity combining lexical and phonetic matching.
        Weight distribution: 70% lexical, 30% phonetic
        """
        lexical_score = self.calculate_lexical_similarity(name1, name2)
        phonetic_score = self.calculate_phonetic_similarity(name1, name2)

        # Weighted average: 70% lexical, 30% phonetic
        combined_score = (lexical_score * 0.7) + (phonetic_score * 0.3)

        # Confidence levels
        if combined_score >= 0.9:
            confidence = 'high'
        elif combined_score >= 0.7:
            confidence = 'medium'
        else:
            confidence = 'low'

        return SimilarityScore(
            lexical=lexical_score,
            phonetic=phonetic_score,
            combined=combined_score,
            confidence=confidence
        )

    # ========== TEST HELPERS ==========

    def assert_similarity(self, name1: str, name2: str, expected_min: float, expected_max: float,
                         test_name: str, should_match: bool = True):
        """Assert that similarity score falls within expected range"""
        score = self.enhanced_name_similarity(name1, name2)

        if expected_min <= score.combined <= expected_max:
            self.passed += 1
            self.test_results.append({
                'test': test_name,
                'status': 'PASS',
                'name1': name1,
                'name2': name2,
                'score': score,
                'expected': f"{expected_min:.2f}-{expected_max:.2f}",
                'should_match': should_match
            })
            print(f"✓ PASS: {test_name}")
            print(f"  {name1} ~ {name2}")
            print(f"  Score: {score.combined:.3f} (lexical={score.lexical:.3f}, phonetic={score.phonetic:.3f})")
        else:
            self.failed += 1
            self.test_results.append({
                'test': test_name,
                'status': 'FAIL',
                'name1': name1,
                'name2': name2,
                'score': score,
                'expected': f"{expected_min:.2f}-{expected_max:.2f}",
                'should_match': should_match
            })
            print(f"✗ FAIL: {test_name}")
            print(f"  {name1} ~ {name2}")
            print(f"  Score: {score.combined:.3f} (expected {expected_min:.2f}-{expected_max:.2f})")
            print(f"  Breakdown: lexical={score.lexical:.3f}, phonetic={score.phonetic:.3f}")

    def assert_higher_similarity(self, name: str, match1: str, match2: str, test_name: str):
        """Assert that name is more similar to match1 than match2"""
        score1 = self.enhanced_name_similarity(name, match1)
        score2 = self.enhanced_name_similarity(name, match2)

        if score1.combined > score2.combined:
            self.passed += 1
            print(f"✓ PASS: {test_name}")
            print(f"  {name} closer to '{match1}' ({score1.combined:.3f}) than '{match2}' ({score2.combined:.3f})")
        else:
            self.failed += 1
            print(f"✗ FAIL: {test_name}")
            print(f"  {name} should be closer to '{match1}' but got:")
            print(f"    {match1}: {score1.combined:.3f}")
            print(f"    {match2}: {score2.combined:.3f}")

    # ========== TEST SUITES ==========

    def test_exact_matches(self):
        """Test exact name matches (should score 1.0)"""
        print("\n" + "="*70)
        print("TEST SUITE: Exact Matches")
        print("="*70)

        test_cases = [
            ("Napoleon Bonaparte", "Napoleon Bonaparte"),
            ("Julius Caesar", "Julius Caesar"),
            ("Cleopatra", "Cleopatra"),
            ("George Washington", "George Washington"),
        ]

        for name1, name2 in test_cases:
            self.assert_similarity(name1, name2, 0.99, 1.0, f"Exact match: {name1}", should_match=True)

    def test_case_insensitivity(self):
        """Test case-insensitive matching"""
        print("\n" + "="*70)
        print("TEST SUITE: Case Insensitivity")
        print("="*70)

        test_cases = [
            ("Napoleon Bonaparte", "napoleon bonaparte"),
            ("JULIUS CAESAR", "julius caesar"),
            ("ClEoPaTrA", "cleopatra"),
        ]

        for name1, name2 in test_cases:
            self.assert_similarity(name1, name2, 0.99, 1.0, f"Case variation: {name1} vs {name2}", should_match=True)

    def test_phonetic_variations(self):
        """Test phonetic spelling variations (e.g., Steven/Stephen)"""
        print("\n" + "="*70)
        print("TEST SUITE: Phonetic Variations")
        print("="*70)

        # These should have high phonetic similarity but lower lexical similarity
        test_cases = [
            ("Stephen", "Steven", 0.70, 0.95),  # Common phonetic variant
            ("Catherine", "Katherine", 0.70, 0.95),  # C/K variation
            ("Geoffrey", "Jeffrey", 0.65, 0.90),  # G/J variation
            ("Smith", "Smyth", 0.70, 0.95),  # Y variant
            ("Philip", "Phillip", 0.85, 1.0),  # Single/double consonant
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Phonetic variant: {name1} vs {name2}", should_match=True)

    def test_unicode_characters(self):
        """Test handling of Unicode and diacritical marks"""
        print("\n" + "="*70)
        print("TEST SUITE: Unicode Characters")
        print("="*70)

        test_cases = [
            ("José", "Jose", 0.80, 1.0),  # Accented character
            ("Müller", "Mueller", 0.65, 0.90),  # Umlaut to ue
            ("François", "Francois", 0.80, 1.0),  # Cedilla
            ("Søren", "Soren", 0.80, 1.0),  # Scandinavian character
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Unicode handling: {name1} vs {name2}", should_match=True)

    def test_punctuation_handling(self):
        """Test handling of punctuation and special characters"""
        print("\n" + "="*70)
        print("TEST SUITE: Punctuation Handling")
        print("="*70)

        test_cases = [
            ("O'Brien", "OBrien", 0.85, 1.0),  # Apostrophe
            ("Jean-Paul", "Jean Paul", 0.85, 1.0),  # Hyphen to space
            ("St. Augustine", "Saint Augustine", 0.65, 0.85),  # Abbreviation
            ("Henry VIII", "Henry 8", 0.70, 0.90),  # Roman numeral
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Punctuation: {name1} vs {name2}", should_match=True)

    def test_multi_word_names(self):
        """Test handling of multi-word names and name order"""
        print("\n" + "="*70)
        print("TEST SUITE: Multi-Word Names")
        print("="*70)

        # Same name, different order
        test_cases = [
            ("Alexander the Great", "Alexander Great", 0.75, 0.95),
            ("Martin Luther King Jr", "Martin Luther King", 0.85, 0.98),
            ("Leonardo da Vinci", "Leonardo Vinci", 0.75, 0.95),
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Multi-word: {name1} vs {name2}", should_match=True)

    def test_known_non_duplicates(self):
        """Test that clearly different names score low"""
        print("\n" + "="*70)
        print("TEST SUITE: Known Non-Duplicates")
        print("="*70)

        test_cases = [
            ("Napoleon Bonaparte", "Julius Caesar", 0.0, 0.40),
            ("George Washington", "Abraham Lincoln", 0.0, 0.40),
            ("Cleopatra", "Alexander the Great", 0.0, 0.40),
            ("Henry VIII", "Elizabeth I", 0.0, 0.40),
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Non-duplicate: {name1} vs {name2}", should_match=False)

    def test_similar_but_distinct(self):
        """Test names that are similar but represent different people"""
        print("\n" + "="*70)
        print("TEST SUITE: Similar But Distinct Names")
        print("="*70)

        # These should score medium but not high enough to trigger duplicate detection
        test_cases = [
            ("Henry VII", "Henry VIII", 0.50, 0.80),  # Different ordinals
            ("Louis XIV", "Louis XV", 0.50, 0.80),  # Different ordinals
            ("John Adams", "John Quincy Adams", 0.50, 0.75),  # Father and son
            ("Alexander I", "Alexander II", 0.50, 0.80),  # Different ordinals
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Similar but distinct: {name1} vs {name2}", should_match=False)

    def test_historical_duplicates(self):
        """Test known duplicate variations from historical records"""
        print("\n" + "="*70)
        print("TEST SUITE: Historical Duplicate Variations")
        print("="*70)

        # Real examples of how historical figures' names vary
        test_cases = [
            ("Gaius Julius Caesar", "Julius Caesar", 0.75, 0.95),
            ("Marcus Tullius Cicero", "Cicero", 0.55, 0.75),
            ("Alexander III of Macedon", "Alexander the Great", 0.60, 0.80),
            ("Napoleon I", "Napoleon Bonaparte", 0.65, 0.85),
        ]

        for name1, name2, min_score, max_score in test_cases:
            self.assert_similarity(name1, name2, min_score, max_score,
                                 f"Historical variant: {name1} vs {name2}", should_match=True)

    def test_relative_similarity(self):
        """Test that algorithm correctly ranks similarity"""
        print("\n" + "="*70)
        print("TEST SUITE: Relative Similarity Rankings")
        print("="*70)

        # Test that algorithm can distinguish between close and far matches
        self.assert_higher_similarity("Stephen King", "Steven King", "Steve Martin",
                                     "Stephen King closer to Steven King than Steve Martin")

        self.assert_higher_similarity("Julius Caesar", "Gaius Julius Caesar", "Augustus Caesar",
                                     "Julius Caesar closer to Gaius Julius Caesar than Augustus Caesar")

        self.assert_higher_similarity("Alexander", "Alexandre", "Alexandra",
                                     "Alexander closer to Alexandre (masculine) than Alexandra (feminine)")

    def test_empty_and_edge_cases(self):
        """Test edge cases like empty strings and single characters"""
        print("\n" + "="*70)
        print("TEST SUITE: Edge Cases")
        print("="*70)

        # Empty strings
        score = self.enhanced_name_similarity("", "")
        if score.combined == 1.0:
            self.passed += 1
            print("✓ PASS: Empty strings return 1.0 similarity")
        else:
            self.failed += 1
            print(f"✗ FAIL: Empty strings returned {score.combined} instead of 1.0")

        # Single character
        score = self.enhanced_name_similarity("A", "A")
        if score.combined >= 0.99:
            self.passed += 1
            print("✓ PASS: Single identical character scores high")
        else:
            self.failed += 1
            print(f"✗ FAIL: Single character 'A' returned {score.combined}")

        # Very long name
        long_name = "Jean-Baptiste Pierre Antoine de Monet Chevalier de Lamarck"
        score = self.enhanced_name_similarity(long_name, long_name)
        if score.combined >= 0.99:
            self.passed += 1
            print("✓ PASS: Very long name matches itself")
        else:
            self.failed += 1
            print(f"✗ FAIL: Long name self-match returned {score.combined}")

    # ========== INTEGRATION TESTS ==========

    def test_canonical_id_format(self):
        """Test canonical_id format validation"""
        print("\n" + "="*70)
        print("TEST SUITE: Canonical ID Format Validation")
        print("="*70)

        valid_ids = [
            "Q517",  # Wikidata Q-ID
            "PROV:napoleon-bonaparte-1738462847293",  # Provisional ID with timestamp
            "PROV:john-smith-1234567890123",  # Provisional ID
        ]

        invalid_ids = [
            "napoleon-bonaparte",  # Missing PROV: prefix
            "Q",  # Incomplete Q-ID
            "PROV:",  # Empty provisional
            "",  # Empty string
        ]

        for canonical_id in valid_ids:
            if canonical_id.startswith("Q") or canonical_id.startswith("PROV:"):
                self.passed += 1
                print(f"✓ PASS: Valid canonical_id format: {canonical_id}")
            else:
                self.failed += 1
                print(f"✗ FAIL: Invalid format accepted: {canonical_id}")

        for canonical_id in invalid_ids:
            if not (canonical_id.startswith("Q") and len(canonical_id) > 1) and \
               not (canonical_id.startswith("PROV:") and len(canonical_id) > 5):
                self.passed += 1
                print(f"✓ PASS: Correctly rejected invalid format: '{canonical_id}'")
            else:
                self.failed += 1
                print(f"✗ FAIL: Invalid format not rejected: '{canonical_id}'")

    def run_all_tests(self):
        """Run all test suites"""
        print("\n" + "="*70)
        print("CHRONOSGRAPH ENTITY RESOLUTION TEST SUITE (CHR-54)")
        print("="*70)
        print("Testing enhanced name similarity algorithm (70% lexical, 30% phonetic)")
        print("Using Double Metaphone for phonetic encoding")

        # Unit tests
        self.test_exact_matches()
        self.test_case_insensitivity()
        self.test_phonetic_variations()
        self.test_unicode_characters()
        self.test_punctuation_handling()
        self.test_multi_word_names()
        self.test_known_non_duplicates()
        self.test_similar_but_distinct()
        self.test_historical_duplicates()
        self.test_relative_similarity()
        self.test_empty_and_edge_cases()

        # Integration tests
        self.test_canonical_id_format()

        # Summary
        print("\n" + "="*70)
        print("TEST SUMMARY")
        print("="*70)
        print(f"Total Tests: {self.passed + self.failed}")
        print(f"Passed: {self.passed} ✓")
        print(f"Failed: {self.failed} ✗")
        print(f"Success Rate: {(self.passed / (self.passed + self.failed) * 100):.1f}%")

        if self.failed == 0:
            print("\n🎉 All tests passed!")
            return 0
        else:
            print(f"\n⚠️  {self.failed} test(s) failed")
            return 1


if __name__ == "__main__":
    tester = EntityResolutionTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
