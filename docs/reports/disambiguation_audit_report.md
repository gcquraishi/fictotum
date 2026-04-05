# Fictotum Disambiguation Audit Report

**Generated:** 2026-01-18 20:55:42

**Database:** Neo4j Aura (instance c78564a4)

**Auditor:** Claude Code (Data Architect)

## Executive Summary

❌ **Status:** ACTION REQUIRED - 1 critical issues found.

## Database Statistics

- **Total HistoricalFigure nodes:** 270
  - With real Wikidata Q-ID: 181 (67.04%)
  - Without Q-ID: 89
- **Total MediaWork nodes:** 521
  - With Wikidata Q-ID: 521 (100.0%)
  - Without Q-ID: 0
- **Total APPEARS_IN relationships:** 302

## Critical Issues

### 1. Duplicate Wikidata Q-IDs in HistoricalFigure (1 found)

**Impact:** CRITICAL - Violates entity resolution protocol. Multiple canonical_ids for same person.

- **Q-ID:** `Q171411`
  - Count: 2
  - canonical_ids: ['HF_JP_001', 'HF_JP_003']
  - Names: ['Oda Nobunaga']

**Remediation:** Merge duplicate nodes, redirect all relationships to primary canonical_id.

## Warnings

### 1. Provisional/Missing Wikidata Q-IDs in HistoricalFigure (10 found)

**Impact:** MEDIUM - Reduces canonical entity resolution capability.

Sample figures:

- `achillas`: Achillas [NULL] - Ptolemaic Egypt
- `agrippa_postumus`: Agrippa Postumus [NULL] - Roman Empire
- `agrippina_elder`: Agrippina the Elder [NULL] - Roman Empire
- `agrippina_younger`: Agrippina the Younger [NULL] - Roman Empire
- `alexander_great`: Alexander the Great [NULL] - Hellenistic
- `antonia_minor`: Antonia Minor [NULL] - Roman Empire
- `apollodorus`: Apollodorus the Sicilian [NULL] - Ptolemaic Egypt
- `atia_balba`: Atia Balba Caesonia [NULL] - Roman Republic
- `caesarion`: Caesarion (Ptolemy XV) [NULL] - Ptolemaic Egypt
- `calpurnia`: Calpurnia Pisonis [NULL] - Roman Republic

**Recommendation:** Research Wikidata for these figures and upgrade to real Q-IDs.

### 2. HistoricalFigure Nodes with Identical Names (12 pairs found)

**Impact:** MEDIUM - Potential duplicates not caught by Q-ID matching.

- **Julius Caesar**
  - ID1: `HF_RM_001` [Q1048]
  - ID2: `julius_caesar` [None]

- **Pompey the Great**
  - ID1: `HF_046` [Q12541]
  - ID2: `pompey_magnus` [None]

- **Mark Antony**
  - ID1: `HF_RM_002` [Q122955]
  - ID2: `marcus_antonius` [None]

- **Cleopatra VII**
  - ID1: `HF_RM_003` [Q635]
  - ID2: `cleopatra_vii` [None]

- **Octavian (Augustus)**
  - ID1: `HF_RM_005` [Q1405]
  - ID2: `octavian_augustus` [None]

- **Marcus Junius Brutus**
  - ID1: `HF_RM_004` [Q172248]
  - ID2: `marcus_brutus` [None]

- **Cato the Younger**
  - ID1: `HF_049` [Q212624]
  - ID2: `cato_younger` [None]

- **Marcus Licinius Crassus**
  - ID1: `HF_047` [Q175127]
  - ID2: `marcus_crassus` [None]

- **Alexander the Great**
  - ID1: `HF_109` [Q8409]
  - ID2: `alexander_great` [None]

- **Oda Nobunaga**
  - ID1: `HF_JP_001` [Q171411]
  - ID2: `HF_JP_003` [Q171411]

- **Cao Cao**
  - ID1: `HF_CN_001` [Q201584]
  - ID2: `cao_cao` [Q204344]

- **Liu Bei**
  - ID1: `HF_CN_002` [Q31730]
  - ID2: `liu_bei` [Q245347]

**Recommendation:** Manual review to determine if these are truly different people.

### 3. MediaWork Nodes with Duplicate Titles but Different Q-IDs (6 pairs found)

**Impact:** MEDIUM - May indicate incorrect Q-ID assignment.

- **I, Claudius**
  - `MW_201` [Q1234450]
  - `i_claudius_bbc` [Q1344599]

- **I, Claudius**
  - `MW_201` [Q1234450]
  - `i_claudius_novel` [Q1344573]

- **I, Claudius**
  - `i_claudius_bbc` [Q1344599]
  - `i_claudius_novel` [Q1344573]

- **Quo Vadis**
  - `quo_vadis_1951` [Q607690]
  - `quo_vadis_film` [Q938137]

- **Romance of the Three Kingdoms**
  - `MW_002` [Q70782]
  - `romance_three_kingdoms` [Q76115]

- **Spartacus**
  - `spartacus_1960` [Q232000]
  - `spartacus_starz` [Q2085448]

**Recommendation:** Verify Q-IDs against Wikidata. May be different editions/adaptations.

## Recommendations

### Immediate Actions Required

1. **Merge duplicate entities** identified in critical issues section
2. **Resolve missing Q-IDs** for MediaWork nodes
3. **Consolidate duplicate relationships**
4. **Verify constraint enforcement** on wikidata_id uniqueness

### Process Improvements

1. **Pre-ingestion validation:** Run deduplication scripts BEFORE every ingestion
2. **Wikidata verification:** Mandatory Q-ID lookup for all new MediaWork nodes
3. **Automated audits:** Schedule weekly disambiguation audits
4. **Constraint hardening:** Ensure all uniqueness constraints are enforced at DB level
5. **Alias resolution:** Implement Wikidata alias fetching for better duplicate detection

## Audit Queries

All audit queries are available in:
`scripts/qa/audit_disambiguation.cypher`

---

**End of Report**
