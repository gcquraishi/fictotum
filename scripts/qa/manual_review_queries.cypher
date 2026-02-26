-- ChronosGraph Manual Review Queries
-- Purpose: Diagnostic queries for ambiguous disambiguation cases
-- Author: Claude Code (Data Architect)
-- Date: 2026-01-18

-- =============================================================================
-- SECTION 1: CAO CAO Q-ID CONFLICT INVESTIGATION
-- =============================================================================

-- Query 1.1: Examine both Cao Cao nodes
MATCH (f:HistoricalFigure)
WHERE f.name = 'Cao Cao'
RETURN f.canonical_id,
       f.name,
       f.wikidata_id,
       f.birth_year,
       f.death_year,
       f.era,
       f.title,
       f.historicity_level
ORDER BY f.canonical_id;

-- Query 1.2: Check relationships for HF_CN_001 (Q201584)
MATCH (f:HistoricalFigure {canonical_id: 'HF_CN_001'})-[r:APPEARS_IN]->(m:MediaWork)
RETURN f.canonical_id,
       f.wikidata_id,
       type(r) AS relationship,
       m.media_id,
       m.title,
       m.wikidata_id AS media_qid
ORDER BY m.title;

-- Query 1.3: Check relationships for cao_cao (Q204344)
MATCH (f:HistoricalFigure {canonical_id: 'cao_cao'})-[r:APPEARS_IN]->(m:MediaWork)
RETURN f.canonical_id,
       f.wikidata_id,
       type(r) AS relationship,
       m.media_id,
       m.title,
       m.wikidata_id AS media_qid
ORDER BY m.title;

-- Query 1.4: Decision support - If both have same media connections, likely duplicate
MATCH (f1:HistoricalFigure {canonical_id: 'HF_CN_001'})-[:APPEARS_IN]->(m:MediaWork)
MATCH (f2:HistoricalFigure {canonical_id: 'cao_cao'})-[:APPEARS_IN]->(m)
RETURN COUNT(m) AS shared_media_count,
       COLLECT(m.title) AS shared_media_titles;

-- DECISION RULES:
-- If shared_media_count > 0 → Likely duplicates, merge into Q201584 (historical person)
-- If shared_media_count = 0 → Possibly distinct (historical vs literary character)
-- RECOMMENDATION: Check Wikidata.org to verify if Q204344 is character-specific Q-ID

-- =============================================================================
-- SECTION 2: LIU BEI Q-ID CONFLICT INVESTIGATION
-- =============================================================================

-- Query 2.1: Examine both Liu Bei nodes
MATCH (f:HistoricalFigure)
WHERE f.name = 'Liu Bei'
RETURN f.canonical_id,
       f.name,
       f.wikidata_id,
       f.birth_year,
       f.death_year,
       f.era,
       f.title,
       f.historicity_level
ORDER BY f.canonical_id;

-- Query 2.2: Check relationships for HF_CN_002 (Q31730)
MATCH (f:HistoricalFigure {canonical_id: 'HF_CN_002'})-[r:APPEARS_IN]->(m:MediaWork)
RETURN f.canonical_id,
       f.wikidata_id,
       type(r) AS relationship,
       m.media_id,
       m.title,
       m.wikidata_id AS media_qid
ORDER BY m.title;

-- Query 2.3: Check relationships for liu_bei (Q245347)
MATCH (f:HistoricalFigure {canonical_id: 'liu_bei'})-[r:APPEARS_IN]->(m:MediaWork)
RETURN f.canonical_id,
       f.wikidata_id,
       type(r) AS relationship,
       m.media_id,
       m.title,
       m.wikidata_id AS media_qid
ORDER BY m.title;

-- Query 2.4: Decision support - If both have same media connections, likely duplicate
MATCH (f1:HistoricalFigure {canonical_id: 'HF_CN_002'})-[:APPEARS_IN]->(m:MediaWork)
MATCH (f2:HistoricalFigure {canonical_id: 'liu_bei'})-[:APPEARS_IN]->(m)
RETURN COUNT(m) AS shared_media_count,
       COLLECT(m.title) AS shared_media_titles;

-- DECISION RULES: Same as Cao Cao above

-- =============================================================================
-- SECTION 3: MEDIAWORK TITLE DUPLICATES INVESTIGATION
-- =============================================================================

-- Query 3.1: "I, Claudius" - 3 nodes with same title
MATCH (m:MediaWork)
WHERE toLower(m.title) = 'i, claudius'
RETURN m.media_id,
       m.title,
       m.wikidata_id,
       m.media_type,
       m.release_year,
       m.creator
ORDER BY m.wikidata_id;

-- Query 3.2: Verify Q1234450 vs Q1344573 on Wikidata
-- RECOMMENDATION: Check Wikidata.org to confirm if these are duplicates
-- Expected: Q1234450 = novel, Q1344573 = possibly duplicate or TV series
-- Action: If duplicates, merge into Q1234450 (keep older/canonical Q-ID)

-- Query 3.3: "Quo Vadis" - 2 nodes with same title
MATCH (m:MediaWork)
WHERE toLower(m.title) CONTAINS 'quo vadis'
RETURN m.media_id,
       m.title,
       m.wikidata_id,
       m.media_type,
       m.release_year,
       m.creator
ORDER BY m.wikidata_id;

-- Query 3.4: Verify Q607690 vs Q938137
-- EXPECTED FINDING: Q607690 = 1951 film, Q938137 = novel by Henryk Sienkiewicz
-- ACTION: Correct media_type for quo_vadis_film if misclassified

-- =============================================================================
-- SECTION 4: ORPHANED ENTITIES INVESTIGATION
-- =============================================================================

-- Query 4.1: Sample orphaned HistoricalFigure nodes (no media relationships)
MATCH (f:HistoricalFigure)
WHERE NOT (f)-[:APPEARS_IN]->(:MediaWork)
RETURN f.canonical_id,
       f.name,
       f.wikidata_id,
       f.era,
       f.birth_year,
       f.death_year
ORDER BY f.name
LIMIT 20;

-- Query 4.2: Sample orphaned MediaWork nodes (no figure portrayals)
MATCH (m:MediaWork)
WHERE NOT (m)<-[:APPEARS_IN]-(:HistoricalFigure)
RETURN m.media_id,
       m.title,
       m.wikidata_id,
       m.media_type,
       m.release_year
ORDER BY m.title
LIMIT 20;

-- Query 4.3: Identify figures that SHOULD be in specific media works
-- Example: Find all Roman Republic figures that should appear in "Rome" TV series
MATCH (m:MediaWork {media_id: 'MW_001'})  -- HBO Rome
MATCH (f:HistoricalFigure)
WHERE f.era CONTAINS 'Roman Republic'
  AND NOT (f)-[:APPEARS_IN]->(m)
RETURN f.canonical_id,
       f.name,
       f.wikidata_id,
       m.title AS media_work
ORDER BY f.name
LIMIT 30;

-- =============================================================================
-- SECTION 5: PROVISIONAL Q-ID INVESTIGATION
-- =============================================================================

-- Query 5.1: List all MediaWork nodes with provisional Q-IDs
MATCH (m:MediaWork)
WHERE m.wikidata_id STARTS WITH 'PROV:'
RETURN m.media_id,
       m.title,
       m.wikidata_id,
       m.media_type,
       m.creator,
       m.release_year
ORDER BY m.title;

-- Query 5.2: Check if Lindsey Davis books exist in Wikidata
-- MANUAL ACTION: Search Wikidata for each title
-- If found → Update with real Q-ID
-- If not found → Consider creating Wikidata entries or documenting as edge cases

-- =============================================================================
-- SECTION 6: MERGE VERIFICATION QUERIES (POST-MERGE)
-- =============================================================================

-- Query 6.1: Verify Oda Nobunaga merge (should return 1 node)
MATCH (f:HistoricalFigure {wikidata_id: 'Q171411'})
RETURN COUNT(f) AS node_count,
       COLLECT(f.canonical_id) AS canonical_ids,
       COLLECT(f.name) AS names;

-- Expected: node_count = 1, canonical_ids = ['HF_JP_001']

-- Query 6.2: Verify Julius Caesar merge (should return 1 node)
MATCH (f:HistoricalFigure)
WHERE f.name = 'Julius Caesar'
RETURN COUNT(f) AS node_count,
       COLLECT(f.canonical_id) AS canonical_ids,
       COLLECT(f.wikidata_id) AS qids;

-- Expected: node_count = 1, canonical_ids = ['HF_RM_001'], qids = ['Q1048']

-- Query 6.3: Verify ALL duplicate Q-IDs are resolved
MATCH (f:HistoricalFigure)
WHERE f.wikidata_id IS NOT NULL
  AND NOT f.wikidata_id STARTS WITH 'PROV:'
WITH f.wikidata_id AS qid, COUNT(*) AS count
WHERE count > 1
RETURN qid, count
ORDER BY count DESC;

-- Expected: 0 rows (no duplicates)

-- Query 6.4: Verify ALL duplicate names are resolved
MATCH (f1:HistoricalFigure)
MATCH (f2:HistoricalFigure)
WHERE f1.canonical_id < f2.canonical_id
  AND toLower(f1.name) = toLower(f2.name)
RETURN f1.canonical_id, f1.name, f1.wikidata_id,
       f2.canonical_id, f2.name, f2.wikidata_id
ORDER BY f1.name;

-- Expected: 2 rows (Cao Cao and Liu Bei ambiguous cases only)

-- =============================================================================
-- SECTION 7: WIKIDATA VERIFICATION HELPERS
-- =============================================================================

-- Query 7.1: Generate Wikidata verification URLs for ambiguous Q-IDs
-- Copy these URLs to browser to verify Q-IDs on Wikidata.org

-- Cao Cao verification:
-- https://www.wikidata.org/wiki/Q201584  (HF_CN_001)
-- https://www.wikidata.org/wiki/Q204344  (cao_cao)

-- Liu Bei verification:
-- https://www.wikidata.org/wiki/Q31730   (HF_CN_002)
-- https://www.wikidata.org/wiki/Q245347  (liu_bei)

-- I, Claudius verification:
-- https://www.wikidata.org/wiki/Q1234450  (MW_201 - novel)
-- https://www.wikidata.org/wiki/Q1344599  (i_claudius_bbc - TV series)
-- https://www.wikidata.org/wiki/Q1344573  (i_claudius_novel - duplicate?)

-- Quo Vadis verification:
-- https://www.wikidata.org/wiki/Q607690   (quo_vadis_1951 - film)
-- https://www.wikidata.org/wiki/Q938137   (quo_vadis_film - novel?)

-- =============================================================================
-- SECTION 8: MANUAL MERGE TEMPLATES (IF AUTOMATED SCRIPT FAILS)
-- =============================================================================

-- Template 8.1: Manual merge of HistoricalFigure nodes
-- Replace {PRIMARY_ID} and {DUPLICATE_ID} with actual canonical_ids

/*
// Step 1: Redirect APPEARS_IN relationships
MATCH (dup:HistoricalFigure {canonical_id: {DUPLICATE_ID}})-[r:APPEARS_IN]->(m:MediaWork)
MATCH (primary:HistoricalFigure {canonical_id: {PRIMARY_ID}})
MERGE (primary)-[new_r:APPEARS_IN]->(m)
ON CREATE SET new_r = properties(r)
DELETE r;

// Step 2: Verify no remaining relationships on duplicate
MATCH (dup:HistoricalFigure {canonical_id: {DUPLICATE_ID}})-[r]-()
RETURN COUNT(r) AS remaining_relationships;

// Step 3: Delete duplicate node (only if step 2 returns 0)
MATCH (dup:HistoricalFigure {canonical_id: {DUPLICATE_ID}})
DETACH DELETE dup;

// Step 4: Verify merge
MATCH (f:HistoricalFigure)
WHERE f.name = {FIGURE_NAME}
RETURN f.canonical_id, f.wikidata_id, COUNT(*) AS node_count;
*/

-- Template 8.2: Manual Q-ID update for HistoricalFigure
-- Replace {CANONICAL_ID} and {NEW_QID}

/*
MATCH (f:HistoricalFigure {canonical_id: {CANONICAL_ID}})
SET f.wikidata_id = {NEW_QID}
RETURN f.canonical_id, f.name, f.wikidata_id;
*/

-- Template 8.3: Manual Q-ID update for MediaWork
-- Replace {MEDIA_ID} and {NEW_QID}

/*
MATCH (m:MediaWork {media_id: {MEDIA_ID}})
SET m.wikidata_id = {NEW_QID}
RETURN m.media_id, m.title, m.wikidata_id;
*/

-- =============================================================================
-- END OF MANUAL REVIEW QUERIES
-- =============================================================================

-- USAGE INSTRUCTIONS:
-- 1. Execute Section 1 & 2 queries to investigate Cao Cao and Liu Bei Q-ID conflicts
-- 2. Verify Q-IDs on Wikidata.org using URLs in Section 7
-- 3. Make merge decisions based on Wikidata verification
-- 4. Execute Section 3 queries to investigate MediaWork title duplicates
-- 5. After running merge_duplicate_entities.py, use Section 6 to verify success
-- 6. If automated merge fails, use Section 8 templates for manual intervention
