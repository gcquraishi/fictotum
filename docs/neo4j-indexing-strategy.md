# Neo4j Database Indexing Strategy

**Last Updated:** 2026-02-01
**Database:** Neo4j Aura (Instance: c78564a4)
**Current Database Size:** 1,196 nodes, 2,033 relationships
**Performance Target:** <500ms graph queries, <200ms search queries

## Executive Summary

This document outlines the indexing strategy for Fictotum's Neo4j database to maintain sub-500ms query performance as the database scales beyond 640+ nodes and 2000+ relationships.

## Index Inventory

### Node Label Indexes

#### HistoricalFigure Indexes
| Index Name | Type | Properties | Purpose | Read Count | Status |
|------------|------|------------|---------|------------|--------|
| `figure_unique` | CONSTRAINT | `canonical_id` | Primary key uniqueness | 5,243 | ONLINE |
| `figure_name_idx` | RANGE | `name` | Name-based search | 8 | ONLINE |
| `figure_wikidata_idx` | RANGE | `wikidata_id` | Wikidata lookup | 255 | ONLINE |
| `figure_era_idx` | RANGE | `era` | Era filtering | 8 | ONLINE |
| `figure_birth_year_idx` | RANGE | `birth_year` | Timeline queries | 1 | ONLINE |
| `figure_death_year_idx` | RANGE | `death_year` | Timeline queries | 0 | ONLINE |
| `figure_fulltext` | FULLTEXT | `name`, `title` | Text search | 0 | ONLINE |
| **`figure_era_name_composite`** | RANGE | `era`, `name` | Era + name filtering | 0 | ONLINE |
| **`figure_birth_death_composite`** | RANGE | `birth_year`, `death_year` | Lifespan range queries | 0 | ONLINE |

#### MediaWork Indexes
| Index Name | Type | Properties | Purpose | Read Count | Status |
|------------|------|------------|---------|------------|--------|
| `media_unique` | CONSTRAINT | `media_id` | Primary key uniqueness | 1,234 | ONLINE |
| `media_wikidata_unique` | CONSTRAINT | `wikidata_id` | Wikidata Q-ID uniqueness | 3,137 | ONLINE |
| `media_title_idx` | RANGE | `title` | Title-based search | 28 | ONLINE |
| `media_type_idx` | RANGE | `media_type` | Type filtering (film/book/etc) | 532 | ONLINE |
| `media_creator_idx` | RANGE | `creator` | Creator-based search | 0 | ONLINE |
| `media_year_idx` | RANGE | `release_year` | Timeline queries | 1 | ONLINE |
| `media_type_year_idx` | RANGE (COMPOSITE) | `media_type`, `release_year` | Type + year filtering | 0 | ONLINE |
| `media_fulltext` | FULLTEXT | `title`, `creator` | Text search | 0 | ONLINE |

#### FictionalCharacter Indexes
| Index Name | Type | Properties | Purpose | Read Count | Status |
|------------|------|------------|---------|------------|--------|
| `fictional_character_unique` | CONSTRAINT | `char_id` | Primary key uniqueness | 423 | ONLINE |
| `fictional_character_name_idx` | RANGE | `name` | Name-based search | 0 | ONLINE |

#### Other Entity Indexes
- `agent_unique` (Agent.name) - 17 reads
- `conflict_unique` (ConflictNode.conflict_id) - 27 reads
- `scholarly_work_wikidata_unique` (ScholarlyWork.wikidata_id) - 0 reads

### Relationship Indexes

| Index Name | Relationship Type | Property | Purpose | Status |
|------------|-------------------|----------|---------|--------|
| **`appears_in_protagonist_idx`** | `APPEARS_IN` | `is_protagonist` | Filter by protagonist role (329 rels) | ONLINE |
| **`appears_in_sentiment_idx`** | `APPEARS_IN` | `sentiment` | Sentiment-based filtering (380 rels) | ONLINE |

### System Indexes
- `index_460996c0` - NODE LOOKUP (2,069 reads)
- `index_1b9dcc97` - RELATIONSHIP LOOKUP (13 reads)

## New Indexes Created (CHR-39)

1. **`figure_era_name_composite`** - Composite index on `(era, name)`
   - **Rationale:** Supports common query pattern of filtering figures by era and then searching by name
   - **Use Case:** "Find all Ancient Roman figures named 'Julius'"
   - **Data Coverage:** 502 figures have both era and name properties

2. **`figure_birth_death_composite`** - Composite index on `(birth_year, death_year)`
   - **Rationale:** Enables efficient lifespan range queries for timeline features
   - **Use Case:** "Find all figures who lived between 1800-1900"
   - **Data Coverage:** Most figures have birth/death year data

3. **`appears_in_protagonist_idx`** - Relationship property index on `is_protagonist`
   - **Rationale:** Frequently filter portrayals by protagonist status
   - **Use Case:** "Find all works where Napoleon is the protagonist"
   - **Data Coverage:** 329 relationships have `is_protagonist` property

4. **`appears_in_sentiment_idx`** - Relationship property index on `sentiment`
   - **Rationale:** Enable sentiment-based filtering for analytical queries
   - **Use Case:** "Find all heroic portrayals of Alexander the Great"
   - **Data Coverage:** 380 relationships have `sentiment` property

## Query Optimization Patterns

### Pattern 1: Era-Based Figure Search
```cypher
// BEFORE: Sequential scan of all HistoricalFigure nodes
MATCH (f:HistoricalFigure)
WHERE f.era = 'Ancient Rome' AND f.name CONTAINS 'Caesar'
RETURN f

// AFTER: Uses figure_era_name_composite index
// Expected performance: <50ms for typical era (10-50 figures)
```

### Pattern 2: Timeline Range Queries
```cypher
// BEFORE: Two separate index seeks + intersection
MATCH (f:HistoricalFigure)
WHERE f.birth_year >= 1900 AND f.death_year <= 2000
RETURN f ORDER BY f.birth_year

// AFTER: Uses figure_birth_death_composite index
// Expected performance: <100ms for century-scale ranges
```

### Pattern 3: Protagonist Portrayals
```cypher
// BEFORE: Full relationship scan
MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
WHERE r.is_protagonist = true
RETURN f, m

// AFTER: Uses appears_in_protagonist_idx
// Expected performance: <200ms for 329 protagonist relationships
```

### Pattern 4: Sentiment Analysis
```cypher
// BEFORE: Full relationship scan
MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
WHERE r.sentiment = 'heroic'
RETURN f.name, count(m) as heroic_portrayals
ORDER BY heroic_portrayals DESC

// AFTER: Uses appears_in_sentiment_idx
// Expected performance: <150ms for sentiment-tagged relationships
```

## Index Maintenance Guidelines

### When to Add New Indexes

1. **Query Frequency:** Queries executed >100 times/day should be profiled for indexing
2. **Query Latency:** Queries consistently exceeding 500ms should be investigated
3. **Data Growth:** Re-evaluate indexes when node/relationship counts double
4. **Property Usage:** Properties used in WHERE clauses >50% of the time should be indexed

### Index Monitoring

Monitor index usage via:
```cypher
SHOW INDEXES
YIELD name, populationPercent, readCount, lastRead
WHERE readCount IS NOT NULL
ORDER BY readCount DESC
```

### Unused Index Cleanup

Indexes with `readCount = 0` after 30 days should be reviewed for removal:
- `figure_death_year_idx` (0 reads) - Keep for future timeline features
- `figure_fulltext` (0 reads) - Keep for planned full-text search
- `media_fulltext` (0 reads) - Keep for planned full-text search
- `media_creator_idx` (0 reads) - Keep for creator-based search

## Performance Benchmarks

### Pre-Optimization (Before CHR-39)
- Era-based queries: ~200-400ms (sequential scan)
- Timeline range queries: ~150-300ms (two index seeks + merge)
- Protagonist filtering: ~300-500ms (full relationship scan)

### Post-Optimization (After CHR-39)
- Era-based queries: **Target <50ms** (composite index)
- Timeline range queries: **Target <100ms** (composite index)
- Protagonist filtering: **Target <150ms** (relationship property index)
- Sentiment filtering: **Target <150ms** (relationship property index)

### Monitoring Plan

1. **Weekly:** Review index read counts to identify hot paths
2. **Monthly:** Profile top 10 slowest queries with PROFILE
3. **Quarterly:** Audit all indexes for unused or duplicate coverage
4. **On Growth:** Re-profile queries when database doubles in size

## Future Index Considerations

### Planned for Q1 2026
1. **Geographic Indexes** - If location-based queries become common
   - `figure_birthplace_idx` on `birthplace` property
   - Requires geo-spatial data enrichment

2. **Multi-Language Support**
   - Composite indexes on `(language, name)` for i18n
   - Requires language property on entities

3. **Relationship Timestamp Indexes**
   - Index on `created_at` for temporal analysis
   - Currently 207 INTERACTED_WITH, 559 APPEARS_IN with timestamps

### Not Recommended
1. **Over-indexing Small Properties** - Avoid indexing properties with <10 distinct values
2. **Full-Text on Descriptions** - Large text fields should use dedicated search service (Algolia/Meilisearch)
3. **Redundant Composite Indexes** - Avoid creating `(A, B, C)` if `(A, B)` already exists and `C` has low selectivity

## Database Statistics (Current)

| Metric | Count | Notes |
|--------|-------|-------|
| Total Nodes | 1,196 | 28% growth since last audit |
| HistoricalFigure | 520 | Core entity |
| MediaWork | 577 | Core entity |
| FictionalCharacter | 91 | Supporting entity |
| Total Relationships | 2,033 | |
| APPEARS_IN | 559 | Most common relationship |
| CREATED_BY | 1,188 | Lineage tracking |
| INTERACTED_WITH | 207 | Network analysis |

## Contact

For index performance issues or optimization requests, contact the DevOps team or file a ticket with label `database-performance`.

---

**Next Review Date:** 2026-03-01 (or when database reaches 1,500 nodes)
