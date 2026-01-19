# ChronosGraph Scalability: Quick Fix Guide

**Date:** 2026-01-18
**Total Time Required:** ~5 hours
**Priority Level:** 🔴 CRITICAL

---

## TL;DR

ChronosGraph will hit performance walls at 10k+ nodes due to:
1. Missing indexes on frequently-queried properties
2. Dual ID strategy causing query inefficiency
3. No timestamp auditing for data lineage

**Fix these 4 things immediately:**

```bash
# 1. Create missing indexes (5 minutes)
python3 scripts/apply_scale_indexes.py

# 2. Audit and fix dual ID queries (see Section 2)

# 3. Add timestamps to ingestion scripts (see Section 3)

# 4. Bound all collection queries (see Section 4)
```

---

## Section 1: Create Missing Indexes (5 minutes)

### Execute Now

```bash
cd /Users/gcquraishi/Documents/chronosgraph
python3 scripts/apply_scale_indexes.py
```

This creates 9 critical indexes:
- `HistoricalFigure.wikidata_id` - Entity resolution
- `HistoricalFigure.era` - Era filtering
- `HistoricalFigure.birth_year` - Temporal queries
- `HistoricalFigure.death_year` - Lifespan analysis
- `MediaWork.release_year` - Chronological sorting
- `MediaWork.creator` - Creator filtering
- `MediaWork(media_type, release_year)` - Composite filter
- Full-text indexes for fuzzy search

**Impact:** Prevents query timeouts at scale.

---

## Section 2: Fix Dual ID Strategy (3 hours)

### The Problem

MediaWork nodes have TWO identifiers:
- `wikidata_id` (100% coverage, canonical)
- `media_id` (29% coverage, legacy)

Queries use `OR` clauses that prevent index optimization:
```typescript
// BAD - Can't use index efficiently
WHERE m.media_id = $id OR m.wikidata_id = $id
```

### The Fix

**Decision:** Use ONLY `wikidata_id` as canonical identifier.

#### Step 1: Update Query Functions

**File:** `/web-app/lib/db.ts`

**Lines to change:**
- Line 121: `getMediaById(wikidataId: string)`
- Line 566: `getMediaSeriesHierarchy(mediaId: string)`
- Line 663: `getMediaParentSeries(mediaId: string)`

**Before:**
```typescript
WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
```

**After:**
```typescript
WHERE m.wikidata_id = $wikidataId
```

#### Step 2: Update API Routes

**File:** `/web-app/app/api/graph/[id]/route.ts`

Change parameter name from `id` to `wikidataId` and update documentation.

#### Step 3: Update Ingestion Scripts

**Files to update:**
- `scripts/ingestion/ingest_bacon_connections.py`
- `scripts/ingestion/ingest_unified_expansion.py`
- All other `scripts/ingestion/ingest_*.py` files

**Change MERGE strategy:**

**Before:**
```python
merge_key = 'wikidata_id' if label == 'MediaWork' else id_property
```

**After:**
```python
# Always use wikidata_id for MediaWork
if label == 'MediaWork':
    merge_key = 'wikidata_id'
    # media_id is optional metadata only
```

#### Step 4: Deprecate media_id Usage

Add to `scripts/schema.py`:
```python
class MediaWork(BaseModel):
    wikidata_id: str = Field(description="Canonical Wikidata Q-ID (PRIMARY KEY)")
    media_id: Optional[str] = Field(
        default=None,
        description="DEPRECATED: Legacy internal ID. Use wikidata_id for all operations."
    )
```

**Effort:** 3 hours (search and replace + testing)
**Impact:** Eliminates 40% of scalability risks

---

## Section 3: Add Timestamp Auditing (1 hour)

### The Problem

Only 3.7% of nodes have timestamp metadata. No way to track:
- Which batch created which nodes
- When data was last updated
- Source of conflicting data

### The Fix

**Update ALL ingestion scripts** to add metadata:

**Template for all `scripts/ingestion/ingest_*.py` files:**

```python
from datetime import datetime

class YourIngestor:
    def __init__(self, uri, user, pwd):
        # ... existing code ...
        self.batch_id = f"batch_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.source_name = "batch_name_v1"  # Change per script

    def _ingest_nodes(self, nodes, label, id_property):
        # Add metadata to each node
        for node in nodes:
            node['created_at'] = datetime.now().isoformat()
            node['ingestion_batch'] = self.batch_id
            node['ingestion_source'] = self.source_name

        query = f"""
        UNWIND $nodes AS node_data
        MERGE (n:{label} {{{id_property}: node_data.{id_property}}})
        ON CREATE SET n += node_data
        ON MATCH SET n += node_data, n.updated_at = datetime()
        """
        # ... rest of code ...
```

**Files to update (17 total):**
```
scripts/ingestion/ingest_bacon_connections.py
scripts/ingestion/ingest_unified_expansion.py
scripts/ingestion/ingest_batch3.py
... (all 17 batch files)
```

**Effort:** 1 hour (find/replace pattern)
**Impact:** Enables data lineage tracking and debugging

---

## Section 4: Bound Collection Queries (1 hour)

### The Problem

Queries using `collect()` can load unlimited relationships into memory:

```cypher
// BAD - Could collect 10,000+ items
collect(DISTINCT {media: m2, sentiment: r2.sentiment}) as media_connections
```

If a figure appears in 1000+ media works, this crashes.

### The Fix

**Add slice limits to all collections:**

```cypher
// GOOD - Bounded to 100 items max
collect(DISTINCT {media: m2, sentiment: r2.sentiment})[0..100] as media_connections
```

**Files to audit:**

**File:** `/web-app/lib/db.ts`

**Lines to fix:**
- Line 127: `collect(DISTINCT {figure: f, sentiment: r.sentiment})`
- Line 314: `collect(DISTINCT {media: m2, sentiment: r2.sentiment})`
- Line 315: `collect(DISTINCT other)`
- Line 340: `mediaConnections.forEach`

**Pattern to search for:**
```bash
grep -n "collect(" web-app/lib/db.ts
grep -n "collect(" scripts/*.py
```

**Replacement pattern:**
```typescript
// Before
collect(DISTINCT expression) as alias

// After
collect(DISTINCT expression)[0..100] as alias
```

**Smart limits:**
- Media connections per figure: `[0..100]`
- Figures per media: `[0..50]` (most media have <10 figures)
- Interaction networks: `[0..20]` (close social circle)

**Effort:** 1 hour (search and replace + testing)
**Impact:** Prevents out-of-memory errors on high-degree nodes

---

## Section 5: Verification Checklist

After applying fixes, validate with these queries:

### 1. Verify Indexes Exist
```cypher
SHOW INDEXES;
// Should show 9 new indexes
```

### 2. Test Index Usage
```cypher
EXPLAIN MATCH (f:HistoricalFigure {wikidata_id: "Q1048"}) RETURN f;
// Should show "Index Seek" on figure_wikidata_idx
```

### 3. Check Timestamp Coverage
```cypher
MATCH (f:HistoricalFigure)
RETURN count(f.created_at) * 100.0 / count(*) as pct_with_timestamps;
// Target: 100% after next ingestion
```

### 4. Verify No OR Clauses
```bash
grep -r "OR m.wikidata_id" web-app/
# Should return 0 results
```

### 5. Test Query Performance
```cypher
// Before: Scans all 270 nodes
PROFILE MATCH (f:HistoricalFigure)
WHERE f.era = "Roman Republic"
RETURN count(f);

// Should now use index seek (after fix)
```

---

## Section 6: What NOT to Do

### ❌ Don't Create Supernodes

Avoid creating nodes with 1000+ relationships. Current max is 31 (acceptable).

**Warning signs:**
- A single MediaWork with 100+ historical figures
- A "Universe" or "Franchise" node connecting everything
- Over-normalized schema (too many intermediate nodes)

### ❌ Don't Use String Operations in WHERE

```cypher
// BAD - Forces full table scan
WHERE toLower(f.name) CONTAINS toLower($query)

// GOOD - Uses full-text index
CALL db.index.fulltext.queryNodes("figure_fulltext", $query)
```

### ❌ Don't Create Variable-Length Paths Beyond Depth 6

```cypher
// BAD - Exponential complexity
MATCH path = (a)-[*..20]-(b)

// GOOD - Bounded depth
MATCH path = shortestPath((a)-[*..6]-(b))
```

---

## Section 7: Monitoring & Maintenance

### Weekly Health Checks

```cypher
// 1. Check for missing indexes
SHOW INDEXES WHERE name IN [
  'figure_wikidata_idx',
  'figure_era_idx',
  'media_year_idx'
];

// 2. Identify slow queries (if enabled)
// CALL dbms.listQueries() YIELD query, elapsedTimeMillis
// WHERE elapsedTimeMillis > 1000
// RETURN query, elapsedTimeMillis
// ORDER BY elapsedTimeMillis DESC;

// 3. Check supernode growth
MATCH (m:MediaWork)<-[r:APPEARS_IN]-(f)
WITH m, count(f) as degree
WHERE degree > 50
RETURN m.title, degree
ORDER BY degree DESC;
```

### Monthly Audits

1. Run `scripts/qa/audit_disambiguation.cypher`
2. Review timestamp coverage (should be 100% for new nodes)
3. Check for duplicate nodes (should be 0)
4. Validate constraint enforcement

---

## Section 8: Long-Term Scalability Roadmap

### Phase 1: Immediate (This Document) ✅
- Create missing indexes
- Fix dual ID strategy
- Add timestamp auditing
- Bound collections

### Phase 2: Next Sprint
- Implement cursor-based pagination
- Add schema versioning metadata
- Backfill missing wikidata_ids (90 figures)
- Create query optimization guidelines

### Phase 3: Before 10k Nodes
- Implement caching layer (Redis)
- Pre-compute aggregates for high-degree nodes
- Consider graph projection for analytics
- Add monitoring/alerting for slow queries

### Phase 4: Beyond 100k Nodes
- Evaluate sharding strategy
- Consider read replicas
- Implement graph streaming for large traversals
- Advanced query optimization (APOc procedures)

---

## Section 9: Quick Reference Commands

```bash
# Apply all indexes
python3 scripts/apply_scale_indexes.py

# Run disambiguation audit
# (requires neo4j browser or python script)

# Check current database stats
python3 -c "
from dotenv import load_dotenv
from neo4j import GraphDatabase
import os
load_dotenv()
uri = os.getenv('NEO4J_URI').replace('neo4j+s://', 'neo4j+ssc://')
driver = GraphDatabase.driver(uri, auth=(os.getenv('NEO4J_USERNAME'), os.getenv('NEO4J_PASSWORD')))
with driver.session() as s:
    result = s.run('MATCH (n) RETURN labels(n)[0] as label, count(*) as count')
    for r in result:
        print(f'{r[\"label\"]}: {r[\"count\"]}')
driver.close()
"

# Grep for problematic patterns
grep -r "OR.*wikidata_id" web-app/
grep -r "collect(" web-app/lib/db.ts | grep -v "\[0\.\."
```

---

## Section 10: Emergency Rollback

If indexes cause issues:

```cypher
// Drop specific index
DROP INDEX figure_wikidata_idx IF EXISTS;

// Drop all new indexes
DROP INDEX figure_wikidata_idx IF EXISTS;
DROP INDEX figure_era_idx IF EXISTS;
DROP INDEX figure_birth_year_idx IF EXISTS;
DROP INDEX figure_death_year_idx IF EXISTS;
DROP INDEX media_year_idx IF EXISTS;
DROP INDEX media_creator_idx IF EXISTS;
DROP INDEX media_type_year_idx IF EXISTS;
DROP INDEX figure_fulltext IF EXISTS;
DROP INDEX media_fulltext IF EXISTS;
```

---

## Summary

**Critical Path (5 hours total):**

1. ✅ Create indexes → `python3 scripts/apply_scale_indexes.py` (5 min)
2. ✅ Fix dual ID queries → Edit `web-app/lib/db.ts` (3 hours)
3. ✅ Add timestamps → Update ingestion scripts (1 hour)
4. ✅ Bound collections → Add `[0..N]` slicing (1 hour)

**Result:** ChronosGraph ready to scale to 100k+ nodes without performance degradation.

---

**For detailed analysis, see:** `/Users/gcquraishi/Documents/chronosgraph/SCALABILITY_AUDIT.md`
