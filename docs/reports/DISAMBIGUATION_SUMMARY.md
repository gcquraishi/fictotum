---
title: Fictotum Disambiguation Audit - Executive Summary
date: 2026-01-18
author: Claude Code (Data Architect)
database: Neo4j Aura (instance c78564a4)
---

# Fictotum Disambiguation Audit - Executive Summary

## Overview

A comprehensive disambiguation audit has been completed for the Fictotum Neo4j database. This document summarizes findings, provides actionable remediation steps, and introduces new tools to maintain data integrity.

## Audit Results at a Glance

| Metric | Value | Status |
|--------|-------|--------|
| **HistoricalFigure Nodes** | 270 total | |
| - With real Q-IDs | 181 (67.04%) | ⚠️ MODERATE |
| - Missing Q-IDs | 89 (32.96%) | ⚠️ NEEDS IMPROVEMENT |
| - Duplicate Q-IDs Found | 1 (Oda Nobunaga) | ❌ CRITICAL |
| - Name-Based Duplicates | 10 pairs | ⚠️ HIGH PRIORITY |
| **MediaWork Nodes** | 521 total | |
| - With Q-IDs | 521 (100%) | ✅ EXCELLENT |
| - Duplicate Q-IDs Found | 0 | ✅ PERFECT |
| - Provisional Q-IDs (PROV:) | 11 | ⚠️ MINOR |
| **Relationships** | 302 APPEARS_IN | |
| - Duplicate Relationships | 0 | ✅ EXCELLENT |
| **Orphaned Entities** | | |
| - Orphaned Figures | 163 (60%) | ℹ️ EXPECTED (staged ingestion) |
| - Orphaned Media | 443 (85%) | ℹ️ EXPECTED (staged ingestion) |

## Critical Findings

### 1. Duplicate Wikidata Q-ID (Q171411)

**Issue:** Two HistoricalFigure nodes exist for the same person (Oda Nobunaga).

**Nodes:**
- `HF_JP_001` (Primary - keep)
- `HF_JP_003` (Duplicate - merge into primary)

**Impact:** Violates canonical entity resolution protocol. Creates fragmented relationship graphs.

**Remediation:**
```bash
python3 scripts/qa/merge_duplicate_entities.py --execute
```

### 2. Name-Based Duplicates (10 Confirmed Cases)

**Issue:** Ten historical figures have duplicate nodes where one has a Q-ID and the other doesn't.

**Examples:**
- Julius Caesar: `HF_RM_001` (Q1048) + `julius_caesar` (NULL)
- Cleopatra VII: `HF_RM_003` (Q635) + `cleopatra_vii` (NULL)
- Alexander the Great: `HF_109` (Q8409) + `alexander_great` (NULL)

**Root Cause:** Early ingestion batches used lowercase canonical_ids without Q-IDs. Later batches introduced HF_* prefixes with proper Q-IDs. No cross-batch deduplication was performed.

**Remediation:** Same script as above (handles both duplicate types).

### 3. Ambiguous Duplicate Cases (Manual Review Required)

**Cao Cao:**
- `HF_CN_001` → Q201584 (historical person)
- `cao_cao` → Q204344 (possibly literary character in Romance of Three Kingdoms)

**Liu Bei:**
- `HF_CN_002` → Q31730 (historical person)
- `liu_bei` → Q245347 (possibly literary character)

**Action Required:** Verify on Wikidata whether Q204344 and Q245347 are character-specific Q-IDs or duplicates of the historical figures.

## Data Quality Issues

### Missing Wikidata Q-IDs (89 Figures)

**Impact:** Reduces canonical entity resolution capability. Makes future deduplication harder.

**Sample Figures:**
- Alexander the Great (major figure - high priority)
- Agrippina the Elder, Agrippina the Younger (Roman Imperial family)
- Caesarion, Calpurnia, Achillas (Ptolemaic/Roman figures)

**Remediation:**
```bash
# Attempt auto-resolution via Wikidata SPARQL
python3 scripts/research/auto_resolve_missing_qids.py

# Review resolution report and manually assign remaining Q-IDs
```

### Provisional Q-IDs in MediaWork (11 Nodes)

**Issue:** 11 MediaWork nodes have `PROV:BOOK:...` format instead of real Wikidata Q-IDs.

**Examples:**
- `a_body_in_the_bath_house` → PROV:BOOK:LINDSEY_DAVIS:A_BODY_IN_THE_BATH_HOUSE
- `dying_light_in_corduba` → PROV:BOOK:LINDSEY_DAVIS:A_DYING_LIGHT_IN_CORDUBA

**Note:** These are Lindsey Davis novels (Marcus Didius Falco series) that may not have individual Wikidata entries.

**Recommendation:** Research each book on Wikidata. If no Q-ID exists, consider creating Wikidata entries or documenting as edge cases.

## Tools Created

### 1. Disambiguation Audit Suite

**Purpose:** Comprehensive entity resolution health check.

**Files:**
- `scripts/qa/audit_disambiguation.cypher` - Manual audit queries
- `scripts/qa/run_disambiguation_audit.py` - Automated audit runner
- Output: `disambiguation_audit_report.md`

**Usage:**
```bash
python3 scripts/qa/run_disambiguation_audit.py
```

**Schedule:** Run weekly or after every 5 ingestion batches.

### 2. Entity Merge Tool

**Purpose:** Safely merge duplicate HistoricalFigure and MediaWork nodes.

**File:** `scripts/qa/merge_duplicate_entities.py`

**Features:**
- Dry-run mode (default)
- Redirects all relationships to primary node
- Merges properties without data loss
- Generates merge audit log

**Usage:**
```bash
# Dry run (preview changes)
python3 scripts/qa/merge_duplicate_entities.py

# Execute merges
python3 scripts/qa/merge_duplicate_entities.py --execute
```

### 3. Automated Q-ID Resolver

**Purpose:** Automatically resolve missing Wikidata Q-IDs using SPARQL queries.

**File:** `scripts/research/auto_resolve_missing_qids.py`

**Strategy:**
- Query Wikidata with figure name + birth/death year
- If exactly 1 match: auto-assign Q-ID
- If 0 or >1 matches: flag for manual review

**Usage:**
```bash
# Dry run (preview resolutions)
python3 scripts/research/auto_resolve_missing_qids.py

# Execute Q-ID updates
python3 scripts/research/auto_resolve_missing_qids.py --execute
```

## Remediation Roadmap

### Phase 1: Critical Fixes (This Week)

**Priority:** URGENT

- [ ] Run `merge_duplicate_entities.py --execute` to resolve 11 duplicates
- [ ] Manually review Cao Cao and Liu Bei Q-ID conflicts
- [ ] Re-run disambiguation audit to verify zero critical issues
- [ ] Commit audit reports to git for historical tracking

**Estimated Time:** 2 hours

### Phase 2: Data Quality (Next 2 Weeks)

**Priority:** HIGH

- [ ] Run `auto_resolve_missing_qids.py --execute` to resolve ~30-50% of missing Q-IDs
- [ ] Manually research Q-IDs for top 20 high-priority figures
- [ ] Resolve 11 provisional MediaWork Q-IDs
- [ ] Correct MediaWork title duplicates (I, Claudius, Quo Vadis, etc.)

**Estimated Time:** 8-10 hours

### Phase 3: Process Improvements (Month 1)

**Priority:** MEDIUM

- [ ] Implement pre-ingestion validator (prevents future duplicates)
- [ ] Update CLAUDE.md with enhanced ingestion protocols
- [ ] Set up weekly automated disambiguation audits
- [ ] Create relationship enrichment script for orphaned entities

**Estimated Time:** 12-15 hours

## Success Metrics

### Current State (Baseline)
```
HistoricalFigure:
  - Total: 270 nodes
  - Q-ID Coverage: 67.04% (181/270)
  - Duplicates: 11 pairs

MediaWork:
  - Total: 521 nodes
  - Q-ID Coverage: 100% (521/521)
  - Duplicates: 0
```

### Target State (End of Phase 3)
```
HistoricalFigure:
  - Total: 259 nodes (11 duplicates merged)
  - Q-ID Coverage: >90% (233+/259)
  - Duplicates: 0

MediaWork:
  - Total: 521 nodes
  - Q-ID Coverage: 100% (all PROV: resolved)
  - Duplicates: 0
```

### Long-Term Goals (6 Months)
```
HistoricalFigure:
  - Q-ID Coverage: >95%
  - Orphaned Figures: <5%
  - Zero duplicates maintained

MediaWork:
  - Q-ID Coverage: 100%
  - Zero provisional Q-IDs
  - Zero duplicates maintained

Process:
  - 100% pre-ingestion validation coverage
  - Weekly automated audits with zero critical findings
  - Full audit trail of all merge operations
```

## Effectiveness of Current Strategies

### ✅ MediaWork Disambiguation: EXCELLENT

**Strategy:** Mandatory Wikidata Q-ID with uniqueness constraint.

**Strengths:**
- 100% compliance (all 521 nodes have Q-IDs)
- Zero duplicates detected
- Protocol well-documented in CLAUDE.md
- Constraint enforcement at database level

**Minor Issue:** 11 provisional Q-IDs (PROV:BOOK:...) need resolution.

### ⚠️ HistoricalFigure Disambiguation: NEEDS IMPROVEMENT

**Strategy:** canonical_id as primary identifier, optional wikidata_id.

**Weaknesses:**
- Inconsistent canonical_id format (HF_* vs lowercase)
- Only 67% have real Q-IDs
- Duplicates introduced across ingestion batches
- No pre-ingestion deduplication checks

**Recommendations:**
1. Standardize canonical_id format to `HF_{ERA}_{SEQ}` or `HF_Q{QID}`
2. Make wikidata_id mandatory for all new figures
3. Implement pre-ingestion validation against existing Q-IDs
4. Auto-resolve Q-IDs during ingestion using Wikidata SPARQL

## Key Recommendations

### Immediate Actions

1. **Execute Merge Script**
   - Consolidate 11 duplicate figure pairs
   - Verify success with re-audit

2. **Manual Review**
   - Cao Cao Q-ID conflict (Q201584 vs Q204344)
   - Liu Bei Q-ID conflict (Q31730 vs Q245347)

3. **Documentation**
   - Archive audit reports in git
   - Update FICTOTUM_LOG.md with findings

### Strategic Improvements

1. **Pre-Ingestion Validation**
   - Create `pre_ingestion_validator.py` script
   - Mandatory Q-ID checks before every ingestion
   - Reject batches with duplicate Q-IDs

2. **Automated Q-ID Resolution**
   - Integrate Wikidata SPARQL into ingestion pipeline
   - Auto-resolve Q-IDs where possible
   - Flag ambiguous cases for human review

3. **Enhanced Protocols**
   - Update CLAUDE.md with stricter Q-ID requirements
   - Enforce Q-ID format validation (`^Q[0-9]+$`)
   - Document escalation path for Q-ID conflicts

4. **Regular Audits**
   - Schedule weekly disambiguation audits
   - Alert on critical issues
   - Archive reports for trend analysis

## Files Generated

| File | Purpose | Location |
|------|---------|----------|
| `disambiguation_audit_report.md` | Full audit findings | Project root |
| `entity_merge_report.md` | Merge operation log | Project root |
| `qid_resolution_report.md` | Q-ID resolution results | Project root |
| `DISAMBIGUATION_ANALYSIS.md` | Comprehensive analysis | Project root |
| `DISAMBIGUATION_SUMMARY.md` | Executive summary | Project root (this file) |
| `audit_disambiguation.cypher` | Manual audit queries | `scripts/qa/` |
| `run_disambiguation_audit.py` | Automated audit | `scripts/qa/` |
| `merge_duplicate_entities.py` | Entity merger | `scripts/qa/` |
| `auto_resolve_missing_qids.py` | Q-ID resolver | `scripts/research/` |

## Conclusion

The Fictotum database demonstrates **strong MediaWork disambiguation** but requires attention to **HistoricalFigure entity resolution**. All identified issues are addressable through:

1. **Immediate automated merges** (11 duplicates)
2. **Short-term Q-ID resolution** (89 missing Q-IDs)
3. **Long-term process improvements** (validation, protocols, audits)

**Overall Assessment:** Database is **healthy and repairable**. With recommended improvements, Fictotum can achieve >95% Q-ID coverage and maintain zero duplicates indefinitely.

---

**Next Steps:**
1. Review this summary
2. Execute merge script (Phase 1, Task 1)
3. Begin Q-ID resolution (Phase 2, Task 1)
4. Schedule follow-up audit for next week

**Questions or Concerns:**
- Consult `DISAMBIGUATION_ANALYSIS.md` for detailed technical analysis
- Review `disambiguation_audit_report.md` for full audit results
- Run `merge_duplicate_entities.py` in dry-run mode to preview changes before execution

---

**Document Version:** 1.0
**Last Updated:** 2026-01-18T21:00:00Z
**Next Review:** After Phase 1 completion
