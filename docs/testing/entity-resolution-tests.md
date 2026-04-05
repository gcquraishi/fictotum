# Entity Resolution Test Suite (CHR-54)

**Status:** ✅ Complete
**Owner:** DevOps & Infrastructure
**Created:** 2026-02-01

## Overview

Comprehensive test suite for Fictotum's entity resolution system, covering:
- Enhanced name similarity algorithm (70% lexical + 30% phonetic)
- Wikidata Q-ID lookup and validation
- Canonical ID collision prevention
- Duplicate detection and entity merging

## Test Files

### 1. Unit Tests
**File:** `scripts/qa/test_entity_resolution.py`

Pure algorithmic tests with no database dependencies. Tests the core similarity algorithms:

#### Test Coverage

| Test Suite | Tests | Description |
|------------|-------|-------------|
| Exact Matches | 4 | Perfect name matches should score 1.0 |
| Case Insensitivity | 3 | Case variations should match |
| Phonetic Variations | 5 | Steven/Stephen, Catherine/Katherine, etc. |
| Unicode Characters | 4 | Accents, umlauts, diacritical marks |
| Punctuation Handling | 4 | O'Brien/OBrien, Jean-Paul/Jean Paul |
| Multi-Word Names | 3 | Alexander the Great variations |
| Known Non-Duplicates | 4 | Clearly different names score low |
| Similar But Distinct | 4 | Henry VII vs Henry VIII (different people) |
| Historical Duplicates | 4 | Real historical name variations |
| Relative Similarity | 3 | Ranking algorithm correctness |
| Edge Cases | 3 | Empty strings, single chars, long names |
| Canonical ID Format | 8 | Q-ID and PROV: format validation |

**Total:** 49 unit tests

#### Key Test Cases

```python
# Phonetic matching
"Stephen" vs "Steven" → 0.70-0.95 (high phonetic similarity)
"Catherine" vs "Katherine" → 0.70-0.95 (C/K phonetic variant)

# Unicode handling
"José" vs "Jose" → 0.80-1.0 (accent normalization)
"Müller" vs "Mueller" → 0.65-0.90 (umlaut to ue)

# Historical variations
"Gaius Julius Caesar" vs "Julius Caesar" → 0.75-0.95 (known variant)
"Napoleon I" vs "Napoleon Bonaparte" → 0.65-0.85 (regnal vs full name)

# Non-duplicates
"Napoleon Bonaparte" vs "Julius Caesar" → 0.0-0.40 (clearly different)
"Henry VII" vs "Henry VIII" → 0.50-0.80 (similar but distinct)
```

### 2. Integration Tests
**File:** `scripts/qa/test_entity_resolution_integration.py`

Tests against the live Neo4j Aura database (instance c78564a4).

#### Test Coverage

| Test | Description | Target |
|------|-------------|--------|
| Canonical ID Uniqueness | No duplicate canonical_ids | 100% unique |
| Wikidata ID Uniqueness | No duplicate Q-IDs | 100% unique |
| Canonical ID Format | Q-ID or PROV: format | 100% valid |
| Connected Figures | Figures have media relationships | <5% orphaned |
| Wikidata Coverage | Figures with Q-IDs | ≥30% coverage |
| Duplicate Detection | Similar name detection works | System functional |
| Era Coverage | Figures with era classification | ≥70% coverage |
| Primary Key Validation | No NULL canonical_ids | 0 nulls |
| Relationship Integrity | APPEARS_IN has is_protagonist | ≥80% complete |

**Total:** 9 integration tests

#### Prerequisites

- Neo4j credentials in `.env` file:
  ```bash
  NEO4J_URI=neo4j+s://...
  NEO4J_USERNAME=neo4j
  NEO4J_PASSWORD=...
  ```
- At least 100+ HistoricalFigure nodes in database
- Python packages: `neo4j`, `python-dotenv`

## Running Tests

### Quick Start

```bash
# Run all tests (unit + integration)
./scripts/qa/run_all_entity_resolution_tests.sh

# Run unit tests only (no database required)
./scripts/qa/run_all_entity_resolution_tests.sh --unit-only

# Run integration tests only (requires database)
./scripts/qa/run_all_entity_resolution_tests.sh --integration-only
```

### Individual Test Files

```bash
# Unit tests
python3 scripts/qa/test_entity_resolution.py

# Integration tests
python3 scripts/qa/test_entity_resolution_integration.py
```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Entity Resolution Tests
  run: |
    ./scripts/qa/run_all_entity_resolution_tests.sh --unit-only
  env:
    NEO4J_URI: ${{ secrets.NEO4J_URI }}
    NEO4J_USERNAME: ${{ secrets.NEO4J_USERNAME }}
    NEO4J_PASSWORD: ${{ secrets.NEO4J_PASSWORD }}
```

## Algorithm Details

### Enhanced Name Similarity

The core algorithm combines lexical and phonetic matching:

```python
def enhanced_name_similarity(name1: str, name2: str) -> float:
    lexical_score = calculate_similarity(name1, name2)  # Levenshtein
    phonetic_score = calculate_phonetic_similarity(name1, name2)  # Double Metaphone

    # Weighted average: 70% lexical, 30% phonetic
    return (lexical_score * 0.7) + (phonetic_score * 0.3)
```

**Rationale:**
- **70% lexical**: Prioritize exact/close spelling matches
- **30% phonetic**: Catch pronunciation-based variations (Steven/Stephen)

### Double Metaphone Phonetic Matching

Superior to Soundex for:
- Non-English names (François, José, Müller)
- Multi-word names (Jean-Paul, Alexander the Great)
- Complex consonant clusters (Geoffrey, Christopher)

Returns primary and secondary phonetic keys:
- Primary match → 1.0 confidence
- Secondary match → 0.5 confidence
- No match → 0.0 confidence

### Confidence Thresholds

| Combined Score | Confidence | Action |
|----------------|------------|--------|
| ≥ 0.90 | High | Flag for immediate review |
| 0.70 - 0.89 | Medium | Flag for manual review |
| < 0.70 | Low | Unlikely duplicate |

## Test Data

### Known Duplicate Pairs (Should Match High)

```
Stephen King / Steven King
Catherine the Great / Katherine the Great
Geoffrey Chaucer / Jeffrey Chaucer
Gaius Julius Caesar / Julius Caesar
Alexander III of Macedon / Alexander the Great
```

### Known Non-Duplicates (Should Match Low)

```
Napoleon Bonaparte / Julius Caesar
George Washington / Abraham Lincoln
Henry VII / Henry VIII (different ordinals)
Louis XIV / Louis XV (different ordinals)
```

## Expected Test Results

### Unit Tests

```
✓ PASS: Exact match: Napoleon Bonaparte
✓ PASS: Case variation: JULIUS CAESAR vs julius caesar
✓ PASS: Phonetic variant: Stephen vs Steven
✓ PASS: Unicode handling: José vs Jose
✓ PASS: Punctuation: O'Brien vs OBrien
✓ PASS: Non-duplicate: Napoleon Bonaparte vs Julius Caesar

Total Tests: 49
Passed: 49 ✓
Failed: 0 ✗
Success Rate: 100.0%
```

### Integration Tests

```
✓ Connected to Neo4j Aura (c78564a4)
✓ PASS: All canonical_ids are unique
✓ PASS: All Wikidata Q-IDs are unique
✓ PASS: All 520 canonical_ids have valid format
✓ PASS: Only 8/520 (1.5%) figures are orphaned
✓ PASS: Wikidata coverage is 42.3% (target: ≥30%)
✓ PASS: Found 12 figure pairs for duplicate testing
✓ PASS: Era coverage is 96.5% (target: ≥70%)

Total Tests: 9
Passed: 9 ✓
Failed: 0 ✗
Success Rate: 100.0%
```

## Continuous Improvement

### When to Re-run Tests

1. **After entity resolution algorithm changes** → Run full suite
2. **After database schema changes** → Run integration tests
3. **Before major releases** → Run full suite
4. **Weekly scheduled** → Run integration tests (monitor data quality)

### Test Maintenance

- **Add new test cases** when bugs are discovered
- **Update thresholds** based on false positive/negative rates
- **Expand test data** with real-world duplicate examples
- **Document edge cases** that require special handling

## Troubleshooting

### Common Issues

**Unit tests fail with metaphone import error:**
```bash
pip install metaphone
```

**Integration tests can't connect to Neo4j:**
- Check `.env` file has correct credentials
- Verify network connection to Neo4j Aura
- Test connection: `python3 scripts/qa/test_neo4j_connection.py`

**Tests pass locally but fail in CI:**
- Ensure CI has access to Neo4j (may need VPN/allowlist)
- Check environment variable names match
- Verify Python version compatibility (3.9+)

## Related Documentation

- [Entity Resolution Algorithm](../entity-resolution.md) - Algorithm design details
- [CLAUDE.md](../../CLAUDE.md) - Entity resolution protocol
- [Data Quality Standards](../CONTRIBUTING.md) - Quality thresholds

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Unit Test Coverage | 49 tests | Maintain 100% pass rate |
| Integration Test Coverage | 9 tests | Maintain 100% pass rate |
| False Positive Rate | <2% | <5% |
| False Negative Rate | <5% | <10% |
| Test Execution Time | <10 seconds | <30 seconds |

## Future Enhancements

1. **Performance benchmarking** - Track algorithm speed over database growth
2. **Machine learning integration** - Train model on manually reviewed duplicates
3. **Temporal resolution** - Factor in birth/death year proximity
4. **Location-based resolution** - Use birthplace/nationality for disambiguation
5. **Network analysis** - Consider shared media connections for disambiguation

---

**Last Updated:** 2026-02-01
**Next Review:** 2026-03-01 (or when database reaches 1,500 nodes)
