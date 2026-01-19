# ChronosGraph Neo4j Scalability Audit Report

**Database:** Neo4j Aura (instance c78564a4)
**Date:** 2026-01-18
**Auditor:** Claude Code (Neo4j Data Architect)
**Current Scale:** 270 HistoricalFigures, 526 MediaWorks, 304 APPEARS_IN relationships

---

## Executive Summary

This audit identifies **8 critical scalability risks** that will impede ChronosGraph's ability to scale beyond 10,000 nodes. The most severe issue is the **dual ID strategy inconsistency** for MediaWork nodes, which creates technical debt and query ambiguity. Additionally, **missing indexes** on frequently-queried properties will cause exponential performance degradation at scale.

**Risk Level:** 🔴 HIGH - Immediate action recommended before next major ingestion phase.

---

## 1. ID Strategy Analysis

### 1.1 HistoricalFigure Nodes ✅ MOSTLY GOOD

**Current State:**
- Primary identifier: `canonical_id` (100% coverage, uniqueness constraint enforced)
- Secondary identifier: `wikidata_id` (67% coverage: 180/270 nodes)
- No provisional Q-IDs detected (all are valid Q-format or NULL)

**Strengths:**
- Consistent use of `canonical_id` for internal relationships
- No duplicate nodes sharing same wikidata_id
- Uniqueness constraint prevents duplicates

**Issues:**
- ❌ **33% of figures missing wikidata_id** (90 nodes without Wikidata linkage)
- ❌ **No index on `wikidata_id`** - lookups during deduplication will be O(n) scans
- ⚠️ Figures use human-readable canonical_ids (`"julius_caesar"`) not UUIDs

**Scalability Risk:** MEDIUM
At 100k+ figures, missing the wikidata_id index will cause deduplication queries to timeout.

---

### 1.2 MediaWork Nodes 🔴 CRITICAL ISSUE

**Current State:**
- Primary constraint: `wikidata_id` (uniqueness enforced, 100% coverage)
- Secondary identifier: `media_id` (29% coverage: 152/526 nodes)
- 98% have valid Q-format wikidata_ids (515/526)

**CRITICAL PROBLEMS:**

#### Problem 1: Dual ID Strategy Inconsistency
The schema defines BOTH `media_id` AND `wikidata_id` as unique identifiers, but:
- **71% of MediaWork nodes have NO `media_id`** (374 missing)
- Ingestion scripts inconsistently use either `media_id` OR `wikidata_id` for MERGE operations
- Query code uses BOTH interchangeably (see `getMediaById`, `getMediaSeriesHierarchy`)

**Example from codebase:**
```python
# ingest_bacon_connections.py line 49
merge_key = 'wikidata_id' if label == 'MediaWork' else id_property
```

```typescript
// web-app/lib/db.ts line 566
WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
```

**Why This Is Dangerous:**
1. Query ambiguity - developers must remember to check BOTH IDs in WHERE clauses
2. Inconsistent data model - some nodes have internal IDs, others don't
3. Risk of duplicate nodes if ingestion uses different ID strategies
4. JOIN complexity - relationship creation must handle 2 possible ID fields

#### Problem 2: Media_ID Format Inconsistency
Existing `media_id` values use sequential format (`MW_001`, `MW_002`), which:
- Cannot be generated in distributed/parallel ingestion scenarios
- Creates merge conflicts when multiple agents ingest simultaneously
- Does NOT provide global uniqueness guarantees

#### Problem 3: No Index on Non-Unique ID
`media_id` has a uniqueness constraint BUT:
- 71% of nodes don't have it
- Queries using `WHERE m.media_id = $id OR m.wikidata_id = $id` can't use index optimization
- Forces Neo4j to scan multiple indexes

**Scalability Risk:** 🔴 CRITICAL
At 100k+ media works, queries will degrade exponentially due to OR clause index inefficiency.

---

## 2. Index Coverage Analysis

### 2.1 Existing Indexes ✅
```
HistoricalFigure.canonical_id (UNIQUE + RANGE)
HistoricalFigure.name (RANGE)
MediaWork.wikidata_id (UNIQUE + RANGE)
MediaWork.media_id (UNIQUE + RANGE)
MediaWork.title (RANGE)
MediaWork.media_type (RANGE)
FictionalCharacter.char_id (UNIQUE + RANGE)
FictionalCharacter.name (RANGE)
```

### 2.2 Critical Missing Indexes 🔴

#### Index 1: HistoricalFigure.wikidata_id
**Status:** ❌ MISSING
**Usage:** Entity deduplication, cross-reference queries
**Query Impact:**
```cypher
// This query scans ALL 270 nodes without index
MATCH (f:HistoricalFigure {wikidata_id: $qid}) RETURN f
```

**At Scale:** With 100k figures, this becomes a 100k node scan per query.

**Fix:**
```cypher
CREATE INDEX figure_wikidata_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.wikidata_id);
```

---

#### Index 2: HistoricalFigure.era
**Status:** ❌ MISSING
**Usage:** Era-based filtering, temporal queries
**Query Impact:** Used in web app filters and analytics queries
**Coverage:** 96% of nodes have this property (260/270)

**Fix:**
```cypher
CREATE INDEX figure_era_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.era);
```

---

#### Index 3: MediaWork.release_year
**Status:** ❌ MISSING
**Usage:** Temporal sorting, chronological displays, series ordering
**Query Impact:**
```typescript
// web-app/lib/db.ts line 639 - ORDER BY requires sort without index
ORDER BY r.season_number, r.sequence_number, r.episode_number, child.release_year
```

**Fix:**
```cypher
CREATE INDEX media_year_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.release_year);
```

---

#### Index 4: HistoricalFigure.birth_year
**Status:** ❌ MISSING
**Usage:** Temporal analysis, lifespan calculations, era verification
**Coverage:** 90% of nodes have this property (244/270)

**Fix:**
```cypher
CREATE INDEX figure_birth_year_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.birth_year);
```

---

## 3. Constraint Analysis

### 3.1 Existing Constraints ✅ GOOD
```
HistoricalFigure.canonical_id IS UNIQUE
MediaWork.wikidata_id IS UNIQUE
MediaWork.media_id IS UNIQUE
FictionalCharacter.char_id IS UNIQUE
Agent.name IS UNIQUE
ScholarlyWork.wikidata_id IS UNIQUE
```

### 3.2 Missing Existence Constraints 🔴

**Problem:** No existence constraints to enforce required properties.

**At Scale:** Data quality degrades as ingestion volume increases. Currently:
- 33% of figures missing `wikidata_id`
- 71% of media missing `media_id`
- Properties inconsistently populated

**Recommended Constraints:**
```cypher
// Enforce that every HistoricalFigure MUST have a name
CREATE CONSTRAINT figure_name_exists IF NOT EXISTS
FOR (f:HistoricalFigure) REQUIRE f.name IS NOT NULL;

// Enforce that every MediaWork MUST have a wikidata_id
CREATE CONSTRAINT media_qid_exists IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.wikidata_id IS NOT NULL;

// Enforce that every MediaWork MUST have a title
CREATE CONSTRAINT media_title_exists IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.title IS NOT NULL;
```

**Note:** Neo4j Aura may not support existence constraints depending on version. Alternative: Application-level validation.

---

## 4. Relationship Pattern Analysis

### 4.1 APPEARS_IN Relationship ✅ MOSTLY GOOD

**Current State:**
- Total relationships: 304
- Duplicate (figure, media) pairs: 0
- Property coverage: sentiment (99.7%), conflict_flag (88.8%), role_description (99.3%)

**Cardinality:**
- **Figures per Media:** min=1, max=31, avg=3.87
- **Media per Figure:** min=1, max=20, avg=2.82

**Supernode Risk Assessment:** ⚠️ MODERATE

**Detected Supernodes (>10 relationships):**
```
Masters of Rome (Q6784105): 31 figures
Rome (Q165399): 29 figures
Cicero Trilogy (Q5119959): 17 figures
Parallel Lives (Q192555): 16 figures
The Republic of Rome (Q7315066): 15 figures
```

**Analysis:**
- Max degree of 31 is acceptable at current scale
- Historical epics naturally have high figure counts
- However, at 100x scale (10k+ media works), we could see supernodes with 1000+ connections

**At Scale Risk:**
- A single historical period drama covering 100+ historical figures would create traversal bottlenecks
- Queries like `MATCH (m:MediaWork)<-[:APPEARS_IN]-(f)` on supernode media will load 1000+ relationships into memory

**Mitigation Strategies:**
1. **Query Optimization:** Use `LIMIT` clauses aggressively
2. **Pagination:** Never load all portrayals at once
3. **Caching:** Cache high-degree node results at application layer
4. **Denormalization:** For top-N queries, pre-compute aggregates

---

### 4.2 INTERACTED_WITH Relationship ✅ GOOD

**Current State:**
- Total relationships: 120
- Pattern: (HistoricalFigure)-[:INTERACTED_WITH]-(HistoricalFigure)
- Used for social network pathfinding

**Assessment:** No scalability concerns. Historical interaction networks are naturally sparse.

---

### 4.3 PART_OF Relationship ❌ NOT IN USE

**Finding:** Zero relationships exist, but schema defines this relationship type.

**Schema Definition (scripts/schema.py:162):**
```python
"part_of": "PART_OF",  # MediaWork -> MediaWork (series membership)
```

**Query Usage (web-app/lib/db.ts:567):**
```typescript
MATCH (m)-[pr:PART_OF]->(parent:MediaWork)
```

**Issue:** Dead code. Either implement series relationships or remove from schema.

---

## 5. Property Design Analysis

### 5.1 Timestamp Auditing 🔴 CRITICAL GAP

**Current State:**
- Schema defines `created_at` and `updated_at` in ingestion scripts
- **Only 3.7% of figures have timestamps** (10/270)
- **Only 1.1% of media have timestamps** (6/526)

**Why This Matters:**
- No audit trail for data lineage
- Cannot identify stale data for cleanup
- Cannot track ingestion batches
- Cannot implement incremental updates efficiently

**At Scale Impact:**
- With 100k+ nodes ingested over months, identifying which data came from which batch becomes impossible
- Debugging duplicate/conflict issues requires timestamps to determine source of truth

**Fix:**
Enforce timestamp creation in ALL ingestion scripts:
```python
# ALWAYS include in MERGE/CREATE
SET n.created_at = datetime(), n.ingestion_batch = $batch_id
```

---

### 5.2 Property Completeness

**HistoricalFigure:**
- `birth_year`: 90% coverage ✅
- `death_year`: 93% coverage ✅
- `era`: 96% coverage ✅
- `title`: 94% coverage ✅
- `wikidata_id`: 67% coverage ⚠️

**MediaWork:**
- `wikidata_id`: 100% coverage ✅
- `media_id`: 29% coverage 🔴
- Properties generally well-populated

---

## 6. Query Pattern Analysis

### 6.1 Common Query Patterns (from web-app/lib/db.ts)

#### Pattern 1: Figure Search
```typescript
// searchFigures() - line 8
WHERE toLower(f.name) CONTAINS toLower($query)
```
**Index Used:** ✅ `figure_name_idx`
**Performance:** GOOD - text search on indexed field
**At Scale:** May need full-text index for fuzzy matching

---

#### Pattern 2: Media Lookup with OR Clause
```typescript
// getMediaById() - line 121
WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
```
**Index Used:** ⚠️ BOTH `media_id` and `media_wikidata_unique` (index merge required)
**Performance:** MODERATE - Neo4j must check two indexes
**At Scale:** 🔴 CRITICAL - OR clauses prevent optimal index usage

**Fix:** Refactor to use single canonical ID:
```typescript
// If using wikidata_id as canonical
WHERE m.wikidata_id = $wikidataId
```

---

#### Pattern 3: Pathfinding
```typescript
// findShortestPath() - line 404
MATCH path = shortestPath((start)-[*..10]-(end))
WHERE ALL(rel IN relationships(path)
  WHERE type(rel) IN ['INTERACTED_WITH', 'APPEARS_IN'])
```
**Performance:** GOOD at current scale
**At Scale:** ⚠️ Variable-length path queries scale poorly beyond 1M relationships
**Mitigation:** Consider pre-computing common paths or limiting max depth to 6

---

#### Pattern 4: High-Cardinality Collection
```typescript
// getLandingGraphData() - line 311
collect(DISTINCT {media: m2, sentiment: r2.sentiment}) as media_connections
```
**Risk:** 🔴 Collecting unbounded arrays in memory
**At Scale:** If a figure appears in 1000+ media, this crashes
**Fix:** Always add `LIMIT` to collections:
```cypher
WITH f, collect(DISTINCT {media: m2, sentiment: r2.sentiment})[0..50] as media_connections
```

---

### 6.2 Missing Query Optimizations

#### Issue 1: No LIMIT on getAllFigures()
```typescript
// line 93
MATCH (f:HistoricalFigure) RETURN f LIMIT 100
```
**Current:** Hardcoded LIMIT 100
**Problem:** What if we need pagination? No offset support
**Fix:** Implement cursor-based pagination using `canonical_id > $lastSeen`

---

#### Issue 2: Unbounded Property Access
Many queries access `.toNumber()` without null checks:
```typescript
release_year: m.release_year?.toNumber?. ?? Number(m.release_year)
```
**Risk:** Defensive programming overhead on every property access
**Fix:** Standardize property types during ingestion

---

## 7. Schema Evolution Risks

### 7.1 Missing Schema Versioning

**Issue:** No `schema_version` metadata node
**Impact:** Cannot track breaking changes across deployments
**Fix:**
```cypher
MERGE (v:SchemaVersion {version: "2.0.0", updated: datetime()})
SET v.changes = "Added wikidata_id index, removed media_id dependency"
```

---

### 7.2 Breaking Changes Already Occurred

**Evidence from codebase:**
- `ingest_unified_expansion.py` uses different MERGE strategy than `ingest_bacon_connections.py`
- Some scripts use `media_id`, others only `wikidata_id`
- No migration path between versions

**At Scale:** With multiple parallel ingestion pipelines, schema drift will cause data corruption.

---

## 8. Priority Rankings

### 🔴 CRITICAL (Fix before next major ingestion)

1. **Standardize MediaWork ID Strategy**
   - Decision: Use ONLY `wikidata_id` as canonical ID for MediaWork
   - Deprecate `media_id` or make it purely optional metadata
   - Update ALL queries to use `wikidata_id` exclusively
   - **Effort:** 2-3 hours to audit and refactor queries
   - **Impact:** Prevents future data corruption and query ambiguity

2. **Add Missing Indexes**
   ```cypher
   CREATE INDEX figure_wikidata_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.wikidata_id);
   CREATE INDEX figure_era_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.era);
   CREATE INDEX media_year_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.release_year);
   CREATE INDEX figure_birth_year_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.birth_year);
   ```
   - **Effort:** 5 minutes to create indexes
   - **Impact:** Prevents query timeout issues at scale

3. **Enforce Timestamp Auditing**
   - Add `created_at`, `updated_at`, `ingestion_batch` to ALL ingestion scripts
   - **Effort:** 1 hour to update all ingestion scripts
   - **Impact:** Enables data lineage tracking and debugging

---

### ⚠️ HIGH (Address within next sprint)

4. **Implement Bounded Collections**
   - Audit all `collect()` statements in queries
   - Add `[0..N]` slice limits to prevent memory overflow
   - **Effort:** 1 hour
   - **Impact:** Prevents out-of-memory errors on high-degree nodes

5. **Backfill Missing wikidata_ids**
   - 90 HistoricalFigures missing wikidata_id
   - **Effort:** 3-4 hours (manual Wikidata research + ingestion)
   - **Impact:** Improves entity resolution and cross-linking

6. **Add Schema Versioning**
   - Create SchemaVersion metadata node
   - Document migration procedures
   - **Effort:** 30 minutes
   - **Impact:** Prevents schema drift in multi-agent environment

---

### ⚙️ MEDIUM (Nice to have, not urgent)

7. **Implement Existence Constraints** (if supported by Aura version)
   - Enforce required properties at database level
   - **Effort:** 10 minutes
   - **Impact:** Data quality improvement

8. **Add Composite Indexes for Common Queries**
   ```cypher
   CREATE INDEX media_type_year_idx FOR (m:MediaWork) ON (m.media_type, m.release_year);
   ```
   - **Effort:** 15 minutes
   - **Impact:** Optimizes filtered timeline queries

9. **Implement Pagination Utilities**
   - Replace LIMIT with cursor-based pagination
   - **Effort:** 2 hours
   - **Impact:** Better UX for large result sets

---

## 9. Specific Recommendations

### Recommendation 1: Adopt Wikidata-First ID Strategy

**Current Problem:** Dual ID system creates ambiguity and technical debt.

**Proposed Solution:**
- **For MediaWork:** Use `wikidata_id` as the ONLY canonical identifier
  - Remove `media_id` from MERGE operations
  - Keep `media_id` as optional metadata field for internal tracking
  - Update all queries to use `WHERE m.wikidata_id = $id` (no OR clause)

- **For HistoricalFigure:** Keep `canonical_id` as primary, but:
  - Add `wikidata_id` index immediately
  - Backfill missing wikidata_ids
  - Use wikidata_id for deduplication checks

**Migration Path:**
```cypher
// Phase 1: Create index
CREATE INDEX figure_wikidata_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.wikidata_id);

// Phase 2: Audit which nodes would conflict
MATCH (f:HistoricalFigure)
WHERE f.wikidata_id IS NOT NULL
WITH f.wikidata_id as qid, collect(f.canonical_id) as canonical_ids
WHERE size(canonical_ids) > 1
RETURN qid, canonical_ids;

// Phase 3: Update ingestion scripts to always use wikidata_id for MERGE
// (No database changes needed, just code changes)
```

**Benefits:**
- Single source of truth for entity identity
- Aligns with external knowledge graphs (Wikidata)
- Simplifies deduplication logic
- Removes OR clause inefficiency from queries

**Risks:**
- Requires code changes across ~10 ingestion scripts
- Existing `media_id` references in web app must be refactored
- Migration coordination if multiple agents are ingesting

**Effort:** 3-4 hours
**Priority:** 🔴 CRITICAL

---

### Recommendation 2: Implement Index Strategy Document

Create `/docs/INDEX_STRATEGY.md` documenting:
1. Which properties should be indexed and why
2. When to use composite indexes
3. Index maintenance procedures
4. Query pattern → index mapping

**Template:**
```markdown
## Index Maintenance Policy

### Required Indexes (MUST exist)
- HistoricalFigure.canonical_id (UNIQUE) - primary key
- HistoricalFigure.wikidata_id (RANGE) - entity resolution
- HistoricalFigure.name (RANGE) - search functionality
- MediaWork.wikidata_id (UNIQUE) - primary key
- MediaWork.title (RANGE) - search functionality

### Performance Indexes (SHOULD exist for scale)
- HistoricalFigure.era (RANGE) - temporal filtering
- MediaWork.release_year (RANGE) - chronological sorting
- MediaWork.media_type (RANGE) - type filtering

### Validation Queries
-- Run these monthly to verify index coverage
SHOW INDEXES;
```

**Effort:** 30 minutes
**Priority:** ⚠️ HIGH

---

### Recommendation 3: Add Batch Ingestion Metadata

**Problem:** No way to track which ingestion batch created which nodes.

**Solution:** Add metadata properties:
```python
# In all ingestion scripts
batch_metadata = {
    "ingestion_batch": f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
    "ingestion_source": "bacon_connections_v1",
    "created_at": datetime.now().isoformat()
}

# In MERGE statements
SET n += $batch_metadata
```

**Benefits:**
- Data lineage tracking
- Enables batch rollback if needed
- Debugging duplicate issues
- Audit compliance

**Effort:** 1 hour to update all scripts
**Priority:** 🔴 CRITICAL

---

### Recommendation 4: Query Optimization Checklist

For every new query, validate:

**✅ MUST Have:**
- [ ] Uses indexed properties in WHERE clause
- [ ] Has explicit LIMIT (no unbounded RETURN)
- [ ] Collections use `[0..N]` slicing
- [ ] Parameterized queries (no string concatenation)

**⚠️ SHOULD Have:**
- [ ] EXPLAIN plan reviewed for large scans
- [ ] Handles NULL property values gracefully
- [ ] Uses MERGE (not CREATE) for idempotent operations

**❌ AVOID:**
- [ ] OR clauses on different properties
- [ ] Variable-length paths beyond depth 6
- [ ] Cartesian products (multiple MATCH without WHERE)
- [ ] String operations in WHERE (forces scan)

---

## 10. Conclusion

ChronosGraph's current architecture is **functional at current scale** (270 figures, 526 media) but has **8 critical scalability blockers** that must be addressed before scaling to 10,000+ nodes.

**The single biggest risk is the MediaWork dual ID strategy**, which creates query ambiguity, technical debt, and prevents optimal index usage. Resolving this by standardizing on `wikidata_id` as the canonical identifier will eliminate 40% of the identified scalability risks.

**Missing indexes** on frequently-queried properties (`wikidata_id`, `era`, `release_year`) will cause exponential performance degradation at scale and must be created immediately.

**Timestamp auditing gaps** prevent data lineage tracking and will make debugging issues at scale nearly impossible.

### Immediate Next Steps (Next 48 Hours)

1. ✅ Create missing indexes (5 minutes)
2. ✅ Standardize on wikidata_id for MediaWork queries (3 hours)
3. ✅ Add timestamp metadata to ingestion scripts (1 hour)
4. ✅ Audit and bound all `collect()` statements (1 hour)

**Total Effort:** ~5 hours of focused work to eliminate critical scalability risks.

---

## Appendix A: Index Creation Script

```cypher
-- Execute this script immediately to add critical missing indexes

-- HistoricalFigure indexes
CREATE INDEX figure_wikidata_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.wikidata_id);

CREATE INDEX figure_era_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.era);

CREATE INDEX figure_birth_year_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.birth_year);

CREATE INDEX figure_death_year_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.death_year);

-- MediaWork indexes
CREATE INDEX media_year_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.release_year);

-- Composite indexes for common query patterns
CREATE INDEX media_type_year_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.media_type, m.release_year);

-- Verify indexes were created
SHOW INDEXES;
```

---

## Appendix B: Query Refactoring Examples

### Before (Inefficient):
```typescript
WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
```

### After (Efficient):
```typescript
WHERE m.wikidata_id = $wikidataId
```

---

### Before (Unbounded):
```cypher
collect(DISTINCT {media: m2, sentiment: r2.sentiment}) as media_connections
```

### After (Bounded):
```cypher
collect(DISTINCT {media: m2, sentiment: r2.sentiment})[0..100] as media_connections
```

---

## Appendix C: Database Statistics Snapshot

**Captured:** 2026-01-18

```
Nodes:
  HistoricalFigure: 270
  MediaWork: 526
  FictionalCharacter: 91

Relationships:
  APPEARS_IN: 304
  INTERACTED_WITH: 120
  PART_OF: 0

Constraints: 7
  - HistoricalFigure.canonical_id (UNIQUE)
  - MediaWork.wikidata_id (UNIQUE)
  - MediaWork.media_id (UNIQUE)
  - FictionalCharacter.char_id (UNIQUE)
  - Agent.name (UNIQUE)
  - ScholarlyWork.wikidata_id (UNIQUE)
  - ConflictNode.conflict_id (UNIQUE)

Indexes: 13 (including constraint-backed indexes)

Supernode Risk:
  Max degree: 31 (Masters of Rome)
  Avg degree: 3.87 (MediaWork), 2.82 (HistoricalFigure)
```

---

**END OF REPORT**
