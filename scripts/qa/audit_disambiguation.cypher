-- ChronosGraph Disambiguation Audit Queries
-- Purpose: Comprehensive assessment of entity resolution and data integrity
-- Database: Neo4j Aura (instance c78564a4)
-- Author: Claude Code (Data Architect)
-- Date: 2026-01-18

-- =============================================================================
-- SECTION 1: HISTORICAL FIGURE DISAMBIGUATION AUDIT
-- =============================================================================

-- Query 1.1: Check for duplicate canonical_ids (should be ZERO due to constraint)
-- Expected: 0 rows
MATCH (f:HistoricalFigure)
WITH f.canonical_id AS canonical_id, COUNT(*) AS count
WHERE count > 1
RETURN canonical_id, count
ORDER BY count DESC;

-- Query 1.2: Detect multiple figures sharing the same Wikidata Q-ID
-- Critical: Multiple canonical_id values for same Q-ID indicates duplicate entities
MATCH (f:HistoricalFigure)
WHERE f.wikidata_id IS NOT NULL
  AND NOT f.wikidata_id STARTS WITH 'PROV:'
WITH f.wikidata_id AS qid,
     COLLECT(DISTINCT f.canonical_id) AS canonical_ids,
     COLLECT(DISTINCT f.name) AS names,
     COUNT(DISTINCT f) AS figure_count
WHERE figure_count > 1
RETURN qid,
       figure_count,
       canonical_ids,
       names
ORDER BY figure_count DESC;

-- Query 1.3: Figures with provisional IDs that may need Wikidata resolution
-- Action Required: These should be researched and upgraded to real Q-IDs
MATCH (f:HistoricalFigure)
WHERE f.wikidata_id STARTS WITH 'PROV:'
   OR f.wikidata_id IS NULL
RETURN f.canonical_id,
       f.name,
       f.wikidata_id,
       f.birth_year,
       f.death_year,
       f.era
ORDER BY f.name;

-- Query 1.4: Detect similar names (potential duplicates missed by deduplication)
-- Uses fuzzy name matching patterns
MATCH (f1:HistoricalFigure)
MATCH (f2:HistoricalFigure)
WHERE f1.canonical_id < f2.canonical_id
  AND (
    toLower(f1.name) = toLower(f2.name)
    OR toLower(f1.name) CONTAINS toLower(f2.name)
    OR toLower(f2.name) CONTAINS toLower(f1.name)
  )
RETURN f1.canonical_id AS fig1_id,
       f1.name AS fig1_name,
       f1.wikidata_id AS fig1_qid,
       f2.canonical_id AS fig2_id,
       f2.name AS fig2_name,
       f2.wikidata_id AS fig2_qid
ORDER BY f1.name;

-- Query 1.5: Figures with identical birth/death years but different canonical_ids
-- Heuristic: Same lifespan + similar name = likely duplicate
MATCH (f1:HistoricalFigure)
MATCH (f2:HistoricalFigure)
WHERE f1.canonical_id < f2.canonical_id
  AND f1.birth_year = f2.birth_year
  AND f1.death_year = f2.death_year
  AND f1.birth_year IS NOT NULL
  AND f1.death_year IS NOT NULL
RETURN f1.canonical_id, f1.name, f1.wikidata_id,
       f2.canonical_id, f2.name, f2.wikidata_id,
       f1.birth_year, f1.death_year
ORDER BY f1.birth_year;

-- Query 1.6: Orphaned figures (no relationships to any MediaWork)
-- May indicate stale data or incomplete ingestion
MATCH (f:HistoricalFigure)
WHERE NOT (f)-[:APPEARS_IN]->(:MediaWork)
  AND NOT (f)<-[:APPEARS_IN]-(:MediaWork)
RETURN f.canonical_id,
       f.name,
       f.wikidata_id,
       f.era
ORDER BY f.name
LIMIT 50;

-- =============================================================================
-- SECTION 2: MEDIAWORK DISAMBIGUATION AUDIT
-- =============================================================================

-- Query 2.1: Check for duplicate wikidata_id in MediaWork (should be ZERO)
-- Expected: 0 rows due to uniqueness constraint
MATCH (m:MediaWork)
WHERE m.wikidata_id IS NOT NULL
WITH m.wikidata_id AS qid, COUNT(*) AS count
WHERE count > 1
RETURN qid, count
ORDER BY count DESC;

-- Query 2.2: MediaWorks missing wikidata_id (protocol violation)
-- Critical: All MediaWork nodes MUST have wikidata_id per CLAUDE.md
MATCH (m:MediaWork)
WHERE m.wikidata_id IS NULL
   OR m.wikidata_id = ''
RETURN m.media_id,
       m.title,
       m.media_type,
       m.release_year,
       m.creator
ORDER BY m.title;

-- Query 2.3: MediaWorks with provisional or invalid wikidata_id format
-- Invalid format: Not starting with 'Q' followed by digits
MATCH (m:MediaWork)
WHERE m.wikidata_id IS NOT NULL
  AND NOT m.wikidata_id =~ '^Q[0-9]+$'
RETURN m.media_id,
       m.title,
       m.wikidata_id,
       m.media_type
ORDER BY m.title;

-- Query 2.4: Detect duplicate titles with different wikidata_ids
-- Potential: Same work incorrectly assigned different Q-IDs
MATCH (m1:MediaWork)
MATCH (m2:MediaWork)
WHERE m1.media_id < m2.media_id
  AND toLower(m1.title) = toLower(m2.title)
  AND m1.wikidata_id <> m2.wikidata_id
RETURN m1.media_id, m1.title, m1.wikidata_id, m1.release_year,
       m2.media_id, m2.title, m2.wikidata_id, m2.release_year
ORDER BY m1.title;

-- Query 2.5: Detect near-duplicate titles (fuzzy matching)
-- Heuristic: Similar title + same release year = potential duplicate
MATCH (m1:MediaWork)
MATCH (m2:MediaWork)
WHERE m1.media_id < m2.media_id
  AND m1.release_year = m2.release_year
  AND m1.release_year IS NOT NULL
  AND (
    toLower(m1.title) CONTAINS toLower(m2.title)
    OR toLower(m2.title) CONTAINS toLower(m1.title)
  )
RETURN m1.title, m1.wikidata_id, m1.media_type,
       m2.title, m2.wikidata_id, m2.media_type,
       m1.release_year
ORDER BY m1.release_year;

-- Query 2.6: Orphaned MediaWorks (no HistoricalFigure relationships)
-- May indicate incomplete data or works focused purely on fictional characters
MATCH (m:MediaWork)
WHERE NOT (m)<-[:APPEARS_IN]-(:HistoricalFigure)
  AND NOT (m)-[:APPEARS_IN]->(:HistoricalFigure)
RETURN m.media_id,
       m.title,
       m.wikidata_id,
       m.media_type,
       m.release_year
ORDER BY m.title
LIMIT 50;

-- =============================================================================
-- SECTION 3: RELATIONSHIP INTEGRITY AUDIT
-- =============================================================================

-- Query 3.1: APPEARS_IN relationships with missing source or target nodes
-- Should be ZERO due to Neo4j referential integrity
MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
WHERE f IS NULL OR m IS NULL
RETURN COUNT(*) AS broken_relationships;

-- Query 3.2: Duplicate APPEARS_IN relationships (same figure in same media multiple times)
-- Expected: Each (figure, media) pair should appear only once
MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
WITH f, m, COUNT(r) AS rel_count
WHERE rel_count > 1
RETURN f.canonical_id,
       f.name,
       m.media_id,
       m.title,
       rel_count
ORDER BY rel_count DESC;

-- Query 3.3: Relationships pointing to nodes that should have been merged
-- Detect when two nodes with same Q-ID both have relationships
MATCH (f1:HistoricalFigure)-[:APPEARS_IN]->(m:MediaWork)
MATCH (f2:HistoricalFigure)-[:APPEARS_IN]->(m)
WHERE f1.canonical_id < f2.canonical_id
  AND f1.wikidata_id = f2.wikidata_id
  AND f1.wikidata_id IS NOT NULL
  AND NOT f1.wikidata_id STARTS WITH 'PROV:'
RETURN f1.canonical_id, f1.name, f1.wikidata_id,
       f2.canonical_id, f2.name, f2.wikidata_id,
       m.title, m.wikidata_id
ORDER BY f1.wikidata_id;

-- =============================================================================
-- SECTION 4: STATISTICAL SUMMARY
-- =============================================================================

-- Query 4.1: Overall database statistics
MATCH (f:HistoricalFigure)
WITH COUNT(f) AS total_figures,
     COUNT(CASE WHEN f.wikidata_id IS NOT NULL AND NOT f.wikidata_id STARTS WITH 'PROV:' THEN 1 END) AS figures_with_qid,
     COUNT(CASE WHEN f.wikidata_id STARTS WITH 'PROV:' OR f.wikidata_id IS NULL THEN 1 END) AS figures_without_qid
MATCH (m:MediaWork)
WITH total_figures, figures_with_qid, figures_without_qid,
     COUNT(m) AS total_media,
     COUNT(CASE WHEN m.wikidata_id IS NOT NULL THEN 1 END) AS media_with_qid,
     COUNT(CASE WHEN m.wikidata_id IS NULL THEN 1 END) AS media_without_qid
MATCH (:HistoricalFigure)-[r:APPEARS_IN]->(:MediaWork)
WITH total_figures, figures_with_qid, figures_without_qid,
     total_media, media_with_qid, media_without_qid,
     COUNT(r) AS total_portrayals
RETURN total_figures,
       figures_with_qid,
       figures_without_qid,
       ROUND(100.0 * figures_with_qid / total_figures, 2) AS pct_figures_with_qid,
       total_media,
       media_with_qid,
       media_without_qid,
       ROUND(100.0 * media_with_qid / total_media, 2) AS pct_media_with_qid,
       total_portrayals;

-- Query 4.2: Wikidata ID coverage by era
MATCH (f:HistoricalFigure)
WHERE f.era IS NOT NULL
WITH f.era AS era,
     COUNT(*) AS total,
     COUNT(CASE WHEN f.wikidata_id IS NOT NULL AND NOT f.wikidata_id STARTS WITH 'PROV:' THEN 1 END) AS with_qid
RETURN era,
       total,
       with_qid,
       ROUND(100.0 * with_qid / total, 2) AS pct_coverage
ORDER BY pct_coverage ASC, total DESC;

-- Query 4.3: MediaWork type distribution and Q-ID coverage
MATCH (m:MediaWork)
WITH m.media_type AS type,
     COUNT(*) AS total,
     COUNT(CASE WHEN m.wikidata_id IS NOT NULL THEN 1 END) AS with_qid
RETURN type,
       total,
       with_qid,
       ROUND(100.0 * with_qid / total, 2) AS pct_coverage
ORDER BY total DESC;

-- =============================================================================
-- SECTION 5: CONSTRAINT AND INDEX VERIFICATION
-- =============================================================================

-- Query 5.1: List all constraints (run via SHOW CONSTRAINTS)
-- Expected: Uniqueness constraints on canonical_id and wikidata_id
SHOW CONSTRAINTS;

-- Query 5.2: List all indexes (run via SHOW INDEXES)
-- Expected: Indexes on name, title, media_type, etc.
SHOW INDEXES;

-- =============================================================================
-- END OF AUDIT QUERIES
-- =============================================================================

-- USAGE INSTRUCTIONS:
-- 1. Run each query section sequentially
-- 2. Document any rows returned in sections 1-3 (these indicate issues)
-- 3. Review statistical summaries in section 4
-- 4. Verify constraints/indexes in section 5 match schema.py definitions
-- 5. Generate disambiguation report with findings and remediation plan
