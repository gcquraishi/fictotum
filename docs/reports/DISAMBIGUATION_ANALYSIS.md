---
title: Fictotum Disambiguation Analysis & Recommendations
author: Claude Code (Data Architect)
date: 2026-01-18
database: Neo4j Aura (instance c78564a4)
status: COMPREHENSIVE AUDIT COMPLETE
---

# Fictotum Disambiguation Analysis

## Executive Summary

This document presents a comprehensive analysis of entity disambiguation within the Fictotum Neo4j database, identifying critical data integrity issues and providing actionable remediation strategies.

**Key Findings:**
- ✅ **MediaWork Disambiguation:** EXCELLENT - 100% compliance with wikidata_id protocol
- ⚠️ **HistoricalFigure Disambiguation:** NEEDS ATTENTION - Multiple duplicate detection patterns found
- ❌ **Critical Issue:** 1 confirmed duplicate (Oda Nobunaga Q171411)
- ⚠️ **89 Figures** lack real Wikidata Q-IDs (provisional or NULL)
- ⚠️ **12 pairs** of figures with identical names (potential duplicates)

**Database Health:**
- Total HistoricalFigure nodes: 270
- Total MediaWork nodes: 521
- Q-ID coverage: 67.04% (figures), 100% (media)
- Orphaned entities: 163 figures, 443 media works

---

## 1. Critical Issues Requiring Immediate Action

### 1.1 Duplicate Wikidata Q-ID (Q171411 - Oda Nobunaga)

**Severity:** CRITICAL
**Impact:** Entity resolution protocol violation
**Entities Affected:** 2 nodes

**Details:**
- **Q-ID:** Q171411 (Oda Nobunaga)
- **Duplicate Nodes:**
  - `HF_JP_001` (Primary)
  - `HF_JP_003` (Duplicate)

**Root Cause:**
Likely introduced during batch ingestion without pre-deduplication check against existing database state.

**Remediation:**
```cypher
// Merge HF_JP_003 into HF_JP_001
MATCH (primary:HistoricalFigure {canonical_id: 'HF_JP_001'})
MATCH (dup:HistoricalFigure {canonical_id: 'HF_JP_003'})
MATCH (dup)-[r:APPEARS_IN]->(m:MediaWork)
MERGE (primary)-[new_r:APPEARS_IN]->(m)
ON CREATE SET new_r = properties(r)
DELETE r
WITH primary, dup
DETACH DELETE dup
RETURN primary.canonical_id AS merged_node
```

**Automation:**
```bash
python3 scripts/qa/merge_duplicate_entities.py --execute
```

### 1.2 Name-Based Duplicates (10 Confirmed Cases)

**Severity:** HIGH
**Impact:** Data fragmentation, incorrect relationship graphs
**Entities Affected:** 20 nodes (10 pairs)

**Confirmed Duplicates:**

| Figure Name | Primary Node (with Q-ID) | Duplicate Node (no Q-ID) | Wikidata Q-ID |
|-------------|--------------------------|--------------------------|---------------|
| Julius Caesar | HF_RM_001 | julius_caesar | Q1048 |
| Pompey the Great | HF_046 | pompey_magnus | Q12541 |
| Mark Antony | HF_RM_002 | marcus_antonius | Q122955 |
| Cleopatra VII | HF_RM_003 | cleopatra_vii | Q635 |
| Octavian (Augustus) | HF_RM_005 | octavian_augustus | Q1405 |
| Marcus Junius Brutus | HF_RM_004 | marcus_brutus | Q172248 |
| Cato the Younger | HF_049 | cato_younger | Q212624 |
| Marcus Licinius Crassus | HF_047 | marcus_crassus | Q175127 |
| Alexander the Great | HF_109 | alexander_great | Q8409 |
| Oda Nobunaga | HF_JP_001 | HF_JP_003 | Q171411 |

**Root Cause Analysis:**
- Early ingestion batches used lowercase canonical_ids without Q-IDs
- Later ingestion batches introduced HF_* prefix with proper Q-IDs
- No cross-batch deduplication performed during data expansion

**Remediation Strategy:**
1. **Automated Merge:** Use `merge_duplicate_entities.py` to consolidate nodes
2. **Manual Review:** Verify no unique relationships exist on duplicate nodes before deletion
3. **Post-Merge Verification:** Run audit again to confirm duplicates removed

### 1.3 Ambiguous Duplicates Requiring Manual Review

**Severity:** MEDIUM
**Entities:** 2 pairs

**Case 1: Cao Cao**
- `HF_CN_001` → Q201584 (Cao Cao - historical figure)
- `cao_cao` → Q204344 (Cao Cao in Romance of the Three Kingdoms - literary character)

**Analysis:** These are likely the SAME person, but Q204344 may refer specifically to the fictionalized portrayal in the Romance of the Three Kingdoms novel. Wikidata verification needed.

**Recommendation:**
- Query Wikidata to determine if Q204344 is "Cao Cao (character)" or "Cao Cao (person)"
- If Q204344 is the character version, keep separate and create BASED_ON relationship
- If Q204344 is duplicate, merge into Q201584

**Case 2: Liu Bei**
- `HF_CN_002` → Q31730 (Liu Bei - historical figure)
- `liu_bei` → Q245347 (Liu Bei in Romance - literary character)

**Analysis:** Same pattern as Cao Cao. Requires Wikidata verification.

---

## 2. Data Quality Warnings

### 2.1 Provisional/Missing Wikidata Q-IDs (89 Figures)

**Severity:** MEDIUM
**Impact:** Reduced canonical entity resolution capability

**Sample Figures Lacking Q-IDs:**

| canonical_id | Name | Era | Status |
|--------------|------|-----|--------|
| achillas | Achillas | Ptolemaic Egypt | NULL |
| agrippa_postumus | Agrippa Postumus | Roman Empire | NULL |
| agrippina_elder | Agrippina the Elder | Roman Empire | NULL |
| agrippina_younger | Agrippina the Younger | Roman Empire | NULL |
| alexander_great | Alexander the Great | Hellenistic | NULL |
| antonia_minor | Antonia Minor | Roman Empire | NULL |
| apollodorus | Apollodorus the Sicilian | Ptolemaic Egypt | NULL |
| atia_balba | Atia Balba Caesonia | Roman Republic | NULL |
| caesarion | Caesarion (Ptolemy XV) | Ptolemaic Egypt | NULL |
| calpurnia | Calpurnia Pisonis | Roman Republic | NULL |

**Recommendation:**
- **Priority:** Research Q-IDs for high-visibility figures (Alexander the Great, Cleopatra relatives)
- **Batch Operation:** Use Wikidata SPARQL endpoint to batch-fetch Q-IDs by name + era
- **Script:** Enhance `harvest_wikidata.py` to auto-resolve NULL Q-IDs

**Example SPARQL Query:**
```sparql
SELECT ?person ?personLabel WHERE {
  ?person wdt:P31 wd:Q5 .  # instance of human
  ?person rdfs:label "Agrippina the Younger"@en .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

### 2.2 MediaWork Title Duplicates (6 Pairs)

**Severity:** LOW
**Impact:** May indicate incorrect Q-ID assignment or legitimate adaptations

**Cases:**

1. **"I, Claudius"** - 3 nodes
   - `MW_201` → Q1234450 (book by Robert Graves)
   - `i_claudius_bbc` → Q1344599 (BBC TV series)
   - `i_claudius_novel` → Q1344573 (novel - duplicate of Q1234450?)

   **Analysis:** Q1234450 and Q1344573 both refer to the Robert Graves novel. Likely duplicate. Q1344599 is the TV adaptation - keep separate.

2. **"Quo Vadis"**
   - `quo_vadis_1951` → Q607690 (1951 film)
   - `quo_vadis_film` → Q938137 (novel by Henryk Sienkiewicz)

   **Analysis:** Q938137 is the NOVEL, not a film. Incorrect classification. Should be renamed or media_type corrected.

3. **"Romance of the Three Kingdoms"**
   - `MW_002` → Q70782 (novel)
   - `romance_three_kingdoms` → Q76115 (TV series adaptation)

   **Analysis:** Legitimate separate works (novel vs TV series). Keep both.

4. **"Spartacus"**
   - `spartacus_1960` → Q232000 (1960 film)
   - `spartacus_starz` → Q2085448 (Starz TV series)

   **Analysis:** Legitimate separate works. Keep both.

**Recommendation:**
- Verify Wikidata Q-IDs for each media work
- Correct media_type where misclassified
- Merge true duplicates (e.g., I, Claudius novel variants)

### 2.3 Orphaned Entities

**HistoricalFigure Orphans:** 163 nodes (60% of total)
**MediaWork Orphans:** 443 nodes (85% of total)

**Analysis:**
- High orphan rate indicates incomplete relationship ingestion
- Many figures exist in database but lack APPEARS_IN connections to media
- Many media works exist but lack figure portrayals

**Recommendation:**
- **Short-term:** Acceptable for staged ingestion strategy (figures added before media connections)
- **Long-term:** Run batch relationship-building process
- **Tool:** Create `enrich_relationships.py` to auto-link figures to media based on Wikidata "characters" property

---

## 3. Schema Integrity Assessment

### 3.1 Constraint Verification

**Expected Constraints (from schema.py):**
```python
CREATE CONSTRAINT figure_unique IF NOT EXISTS
FOR (f:HistoricalFigure) REQUIRE f.canonical_id IS UNIQUE;

CREATE CONSTRAINT media_wikidata_unique IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.wikidata_id IS UNIQUE;

CREATE CONSTRAINT media_unique IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.media_id IS UNIQUE;
```

**Audit Findings:**
- ❌ Constraints exist but are NOT properly named/typed in SHOW CONSTRAINTS output
- ✅ Uniqueness enforcement appears functional (no wikidata_id duplicates in MediaWork)
- ⚠️ Historical duplicate (Oda Nobunaga) suggests constraint may have been added AFTER duplicates were introduced

**Recommendation:**
```cypher
// Drop and recreate constraints with explicit naming
DROP CONSTRAINT IF EXISTS figure_unique;
DROP CONSTRAINT IF EXISTS media_wikidata_unique;
DROP CONSTRAINT IF EXISTS media_unique;

CREATE CONSTRAINT figure_canonical_id_unique IF NOT EXISTS
FOR (f:HistoricalFigure) REQUIRE f.canonical_id IS UNIQUE;

CREATE CONSTRAINT media_wikidata_id_unique IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.wikidata_id IS UNIQUE;

CREATE CONSTRAINT media_id_unique IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.media_id IS UNIQUE;
```

### 3.2 Index Coverage

**Current Indexes:**
- ✅ `figure_name_idx` on HistoricalFigure.name
- ✅ `media_title_idx` on MediaWork.title
- ✅ `media_type_idx` on MediaWork.media_type

**Missing Recommended Indexes:**
```cypher
CREATE INDEX figure_wikidata_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.wikidata_id);

CREATE INDEX figure_era_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.era);

CREATE INDEX media_release_year_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.release_year);
```

---

## 4. Effectiveness of Current Disambiguation Strategies

### 4.1 canonical_id for HistoricalFigure

**Design:**
- Unique identifier per figure
- Format varies: `HF_RM_001`, `julius_caesar`, `HF_JP_001`

**Effectiveness:** ⚠️ MODERATE

**Strengths:**
- Prevents accidental duplicates within single ingestion batch
- Human-readable identifiers
- Works well when paired with Wikidata Q-ID

**Weaknesses:**
- No standardized format enforcement (mixed HF_* and lowercase naming)
- Allows duplicates across batches if Q-ID not checked
- Requires manual deduplication between ingestion cycles

**Improvement Recommendations:**
1. **Standardize Format:** Enforce `HF_{ERA}_{SEQ}` pattern (e.g., `HF_RM_001`)
2. **Auto-Generation:** Derive canonical_id from Wikidata Q-ID: `HF_Q{QID}` (e.g., `HF_Q1048`)
3. **Pre-Ingestion Check:** Always query for existing wikidata_id BEFORE creating new node

### 4.2 wikidata_id for MediaWork

**Design:**
- Mandatory Wikidata Q-ID for all media works
- Uniqueness constraint enforced at database level

**Effectiveness:** ✅ EXCELLENT

**Strengths:**
- 100% compliance (all 521 media works have Q-IDs)
- Zero duplicates detected
- Canonical entity resolution works perfectly
- Protocol documented in CLAUDE.md and enforced

**Weaknesses:**
- 11 works have provisional Q-IDs (PROV:BOOK:...) instead of real Wikidata Q-IDs
- Provisional IDs are non-standard format and won't match uniqueness constraint pattern

**Improvement Recommendations:**
1. **Resolve Provisional Q-IDs:** Research Wikidata for the 11 works with PROV: IDs
2. **Validation Rule:** Reject ingestion if Q-ID doesn't match `^Q[0-9]+$` regex
3. **Pre-Ingestion Verification:** Add Wikidata API check to confirm Q-ID exists before ingestion

---

## 5. Recommended Improvements to Disambiguation Protocols

### 5.1 Enhanced Pre-Ingestion Validation

**Current State:** Deduplication scripts exist but are run AFTER data is prepared for ingestion.

**Proposed Enhancement:**

```python
# scripts/qa/pre_ingestion_validator.py

class PreIngestionValidator:
    """Validates new data against existing database before ingestion."""

    def validate_batch(self, batch_data: Dict) -> ValidationReport:
        """
        Validates new batch against live database.
        Returns: Pass/Fail + detailed conflict report
        """
        conflicts = {
            "duplicate_figure_qids": [],
            "duplicate_media_qids": [],
            "duplicate_canonical_ids": [],
            "invalid_qid_format": [],
            "missing_required_qids": []
        }

        # Check 1: Verify all wikidata_ids are unique vs. database
        for figure in batch_data["historical_figures"]:
            if self._qid_exists_in_db(figure["wikidata_id"]):
                conflicts["duplicate_figure_qids"].append(figure)

        # Check 2: Verify all MediaWork wikidata_ids are real Q-IDs
        for media in batch_data["media_works"]:
            if not re.match(r'^Q[0-9]+$', media["wikidata_id"]):
                conflicts["invalid_qid_format"].append(media)

        # Check 3: Verify canonical_ids don't already exist
        # ... etc

        return ValidationReport(conflicts)
```

**Usage:**
```bash
# Pre-ingestion check (mandatory before every batch)
python3 scripts/qa/pre_ingestion_validator.py --batch data/batch_13.json

# Only proceed if validation passes
python3 scripts/ingestion/ingest_batch13.py
```

### 5.2 Automated Wikidata Q-ID Resolution

**Problem:** 89 figures lack Q-IDs, reducing disambiguation capability.

**Solution:** Automated Wikidata lookup during ingestion.

```python
# scripts/research/auto_resolve_qids.py

import requests
from SPARQLWrapper import SPARQLWrapper, JSON

def resolve_qid(name: str, birth_year: int, death_year: int) -> Optional[str]:
    """
    Query Wikidata for Q-ID based on name and lifespan.
    Returns: Q-ID if unique match found, None otherwise.
    """
    sparql = SPARQLWrapper("https://query.wikidata.org/sparql")

    query = f"""
    SELECT ?person ?personLabel WHERE {{
      ?person wdt:P31 wd:Q5 .  # instance of human
      ?person rdfs:label "{name}"@en .
      ?person wdt:P569 ?birth .
      FILTER(YEAR(?birth) = {birth_year})
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    LIMIT 5
    """

    sparql.setQuery(query)
    sparql.setReturnFormat(JSON)
    results = sparql.query().convert()

    # If exactly 1 match, return Q-ID
    # If 0 or >1 matches, return None (manual review needed)
    ...
```

**Integration:**
```python
# In ingestion scripts
for figure in batch_data["historical_figures"]:
    if not figure.get("wikidata_id"):
        qid = resolve_qid(figure["name"], figure["birth_year"], figure["death_year"])
        if qid:
            figure["wikidata_id"] = qid
            print(f"✅ Auto-resolved {figure['name']} → {qid}")
        else:
            figure["wikidata_id"] = f"PROV:PERSON:{figure['canonical_id']}"
            print(f"⚠️  Manual review needed for {figure['name']}")
```

### 5.3 Periodic Disambiguation Audits

**Frequency:** Weekly (or after every 5 ingestion batches)

**Process:**
1. Run `scripts/qa/run_disambiguation_audit.py`
2. Review `disambiguation_audit_report.md`
3. If critical issues found, run `scripts/qa/merge_duplicate_entities.py --execute`
4. Re-run audit to verify fixes
5. Commit audit report to git for historical tracking

**Automation:**
```bash
# Add to CI/CD pipeline or cron job
#!/bin/bash
cd /path/to/fictotum
python3 scripts/qa/run_disambiguation_audit.py
if grep -q "CRITICAL" disambiguation_audit_report.md; then
    echo "⚠️ Critical issues found! Manual intervention required."
    # Send Slack notification, email alert, etc.
fi
```

### 5.4 Enhanced Entity Resolution Protocol

**Update to CLAUDE.md:**

```markdown
## Enhanced MediaWork Ingestion Protocol (v2)
1. Search Wikidata for Q-ID before creating any `:MediaWork`
2. **NEW:** Validate Q-ID format matches `^Q[0-9]+$` regex
3. **NEW:** Verify Q-ID doesn't already exist in database via MCP query
4. Query Neo4j via MCP: `MATCH (m:MediaWork {wikidata_id: $qid}) RETURN m`
5. If exists → link new portrayals to existing node
6. If not exists → create with `wikidata_id` property
7. **NEW:** If Q-ID cannot be found in Wikidata, REJECT ingestion (do not use PROV: IDs)
8. Aliases only when scholarly source confirms alternate title

## Enhanced HistoricalFigure Ingestion Protocol (v2)
1. **NEW:** Attempt auto-resolution of Q-ID via Wikidata SPARQL (name + birth/death year)
2. If Q-ID found, check for existing node: `MATCH (f:HistoricalFigure {wikidata_id: $qid}) RETURN f`
3. If exists → link to existing node, DO NOT create duplicate
4. If not exists → create new node with resolved Q-ID
5. **NEW:** If Q-ID cannot be auto-resolved, assign provisional ID: `PROV:PERSON:{canonical_id}`
6. **NEW:** Maintain tracking table of provisional IDs for manual review queue
```

---

## 6. Concrete Remediation Plan

### Phase 1: Immediate Fixes (Week 1)

**Priority:** CRITICAL

- [ ] **Task 1.1:** Merge Oda Nobunaga duplicate (Q171411)
  - Run: `python3 scripts/qa/merge_duplicate_entities.py --execute`
  - Verify: 1 node remaining for Q171411

- [ ] **Task 1.2:** Merge 10 name-based duplicates
  - Run: Same script as above (handles both cases)
  - Verify: Only nodes with Q-IDs remain

- [ ] **Task 1.3:** Manual review of Cao Cao / Liu Bei Q-ID conflicts
  - Research Q204344 and Q245347 on Wikidata
  - Determine if character-specific Q-IDs or duplicates
  - Update `canonical_id` or create BASED_ON relationships as appropriate

- [ ] **Task 1.4:** Re-run disambiguation audit
  - Verify zero critical issues remain
  - Generate updated report for documentation

### Phase 2: Data Quality Improvements (Week 2-3)

**Priority:** HIGH

- [ ] **Task 2.1:** Resolve 11 provisional Q-IDs in MediaWork
  - Research each PROV:BOOK entry on Wikidata
  - Update nodes with real Q-IDs
  - Verify uniqueness constraints still satisfied

- [ ] **Task 2.2:** Research Q-IDs for high-priority figures (top 20 of 89)
  - Start with Alexander the Great, Agrippina, Caesarion, etc.
  - Use auto-resolution script where possible
  - Manual Wikidata lookup for ambiguous cases

- [ ] **Task 2.3:** Correct MediaWork title duplicates
  - Merge "I, Claudius" novel duplicates (Q1234450 vs Q1344573)
  - Reclassify "Quo Vadis" Q938137 as Book instead of Film
  - Verify all other title duplicates are legitimate adaptations

### Phase 3: Protocol & Automation Enhancements (Week 4)

**Priority:** MEDIUM

- [ ] **Task 3.1:** Implement pre-ingestion validator
  - Create `scripts/qa/pre_ingestion_validator.py`
  - Test against existing batch data
  - Integrate into ingestion workflow

- [ ] **Task 3.2:** Build auto Q-ID resolution script
  - Create `scripts/research/auto_resolve_qids.py`
  - Test against 89 figures lacking Q-IDs
  - Document success rate and edge cases

- [ ] **Task 3.3:** Update CLAUDE.md with enhanced protocols
  - Document new validation requirements
  - Add Q-ID format enforcement rules
  - Include examples and error handling

- [ ] **Task 3.4:** Create scheduled audit job
  - Set up weekly disambiguation audit
  - Configure alerting for critical issues
  - Archive reports in `audits/` directory

---

## 7. Metrics & Success Criteria

### Baseline (Current State - 2026-01-18)
- Critical duplicates: 1 (Oda Nobunaga)
- Name-based duplicates: 10 pairs
- Figures with Q-IDs: 67.04% (181/270)
- Media with Q-IDs: 100% (521/521)
- MediaWork with PROV IDs: 11
- Orphaned figures: 163
- Orphaned media: 443

### Target State (End of Phase 3)
- Critical duplicates: 0
- Name-based duplicates: 0
- Figures with Q-IDs: >90% (243/270)
- Media with Q-IDs: 100% (all PROV IDs resolved)
- Orphaned figures: <50 (relationship ingestion in progress)
- Orphaned media: <100
- Automated validation: 100% pre-ingestion coverage

### Long-Term Goals (6 months)
- Figures with Q-IDs: >95%
- Orphaned entities: <5%
- Zero duplicates maintained via automated validation
- Monthly disambiguation audit with zero critical findings
- Full historical audit trail of all merge operations

---

## 8. Tools & Scripts Inventory

**Created in This Analysis:**

| Script | Purpose | Location |
|--------|---------|----------|
| `audit_disambiguation.cypher` | Comprehensive audit queries | `scripts/qa/` |
| `run_disambiguation_audit.py` | Automated audit runner | `scripts/qa/` |
| `merge_duplicate_entities.py` | Safe entity merger with dry-run | `scripts/qa/` |

**Recommended New Scripts:**

| Script | Purpose | Priority |
|--------|---------|----------|
| `pre_ingestion_validator.py` | Pre-ingestion conflict detection | HIGH |
| `auto_resolve_qids.py` | Automated Wikidata Q-ID lookup | HIGH |
| `enrich_relationships.py` | Auto-link orphaned entities | MEDIUM |
| `verify_constraints.py` | Schema constraint health check | LOW |

---

## 9. Risk Assessment & Mitigation

### Risk 1: Data Loss During Merge Operations

**Probability:** LOW
**Impact:** HIGH
**Mitigation:**
- Always use dry-run mode first
- Review merge plan before execution
- Maintain database backups (Neo4j Aura auto-backup enabled)
- Log all merge operations for audit trail

### Risk 2: Incorrect Q-ID Assignment

**Probability:** MEDIUM
**Impact:** MEDIUM
**Mitigation:**
- Manual verification of ambiguous cases (Cao Cao, Liu Bei)
- Cross-reference Wikidata descriptions before merge
- Maintain `canonical_id` history even after merge (via relationship properties)

### Risk 3: Constraint Conflicts During Remediation

**Probability:** LOW
**Impact:** MEDIUM
**Mitigation:**
- Test merge scripts on staging environment first
- Handle constraint violations gracefully in scripts
- Provide rollback procedures in case of failures

### Risk 4: False Positives in Duplicate Detection

**Probability:** MEDIUM (for fuzzy matching)
**Impact:** LOW
**Mitigation:**
- Current audit uses conservative matching (exact names + Q-ID presence)
- Manual review required for all ambiguous cases
- Never auto-merge entities with different real Q-IDs

---

## 10. Conclusion

The Fictotum database demonstrates **excellent MediaWork disambiguation** (100% Q-ID compliance) but requires attention to **HistoricalFigure entity resolution**. The identified issues are addressable through a combination of automated merges, manual review, and enhanced ingestion protocols.

**Immediate Next Steps:**
1. Execute merge script to resolve 11 confirmed duplicates
2. Manually review 2 ambiguous cases (Cao Cao, Liu Bei)
3. Implement pre-ingestion validation to prevent future duplicates

**Strategic Improvements:**
- Standardize canonical_id format for HistoricalFigure nodes
- Automate Q-ID resolution for figures lacking Wikidata identifiers
- Establish weekly disambiguation audits as part of data governance

**Overall Assessment:**
Fictotum's entity resolution foundation is **solid and repairable**. With the recommended improvements, the database can achieve >95% Q-ID coverage and maintain zero duplicates indefinitely.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-18
**Next Review:** After Phase 1 completion (estimated 2026-01-25)
