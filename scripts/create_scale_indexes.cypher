// ChronosGraph: Critical Index Creation for Scalability
// Execute this script to add missing indexes identified in SCALABILITY_AUDIT.md
// Database: Neo4j Aura (instance c78564a4)
// Date: 2026-01-18

// =============================================================================
// SECTION 1: HISTORICAL FIGURE INDEXES
// =============================================================================

// Index 1: HistoricalFigure.wikidata_id
// Purpose: Entity resolution, deduplication checks, cross-reference queries
// Impact: Prevents O(n) scans during Wikidata lookup operations
CREATE INDEX figure_wikidata_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.wikidata_id);

// Index 2: HistoricalFigure.era
// Purpose: Era-based filtering, temporal analysis
// Coverage: 96% of nodes have this property
// Impact: Optimizes era-based grouping and filtering queries
CREATE INDEX figure_era_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.era);

// Index 3: HistoricalFigure.birth_year
// Purpose: Temporal analysis, lifespan calculations, chronological ordering
// Coverage: 90% of nodes have this property
// Impact: Enables efficient temporal range queries
CREATE INDEX figure_birth_year_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.birth_year);

// Index 4: HistoricalFigure.death_year
// Purpose: Temporal analysis, lifespan calculations
// Coverage: 93% of nodes have this property
// Impact: Supports lifespan-based queries and historical period analysis
CREATE INDEX figure_death_year_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON (f.death_year);

// =============================================================================
// SECTION 2: MEDIAWORK INDEXES
// =============================================================================

// Index 5: MediaWork.release_year
// Purpose: Chronological sorting, timeline displays, series ordering
// Usage: Used in ORDER BY clauses for temporal organization
// Impact: Critical for series hierarchy queries and temporal navigation
CREATE INDEX media_year_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.release_year);

// Index 6: MediaWork.creator
// Purpose: Creator-based filtering and grouping
// Impact: Optimizes "works by creator" queries
CREATE INDEX media_creator_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.creator);

// =============================================================================
// SECTION 3: COMPOSITE INDEXES (PERFORMANCE OPTIMIZATION)
// =============================================================================

// Composite Index 1: MediaWork (media_type, release_year)
// Purpose: Optimizes filtered timeline queries (e.g., "all films from 1990-2000")
// Usage: WHERE m.media_type = 'Film' ORDER BY m.release_year
// Note: Order matters - most selective property first
CREATE INDEX media_type_year_idx IF NOT EXISTS
FOR (m:MediaWork) ON (m.media_type, m.release_year);

// =============================================================================
// SECTION 4: RELATIONSHIP PROPERTY INDEXES (FUTURE-PROOFING)
// =============================================================================

// Note: Neo4j Aura may not support relationship property indexes depending on version
// Uncomment if supported and relationship property filtering becomes a bottleneck

// CREATE INDEX appears_in_sentiment_idx IF NOT EXISTS
// FOR ()-[r:APPEARS_IN]-() ON (r.sentiment);

// CREATE INDEX appears_in_conflict_idx IF NOT EXISTS
// FOR ()-[r:APPEARS_IN]-() ON (r.conflict_flag);

// =============================================================================
// SECTION 5: FULL-TEXT SEARCH INDEXES (OPTIONAL, FOR ADVANCED SEARCH)
// =============================================================================

// Full-text index on HistoricalFigure names (fuzzy search, typo tolerance)
// Enables CALL db.index.fulltext.queryNodes("figure_fulltext", "julias ceasar")
CREATE FULLTEXT INDEX figure_fulltext IF NOT EXISTS
FOR (f:HistoricalFigure)
ON EACH [f.name, f.title];

// Full-text index on MediaWork titles (fuzzy search)
CREATE FULLTEXT INDEX media_fulltext IF NOT EXISTS
FOR (m:MediaWork)
ON EACH [m.title, m.creator];

// =============================================================================
// VERIFICATION QUERIES
// =============================================================================

// Verify all indexes were created successfully
SHOW INDEXES;

// Check index usage statistics (run after queries have been executed)
// CALL db.stats.retrieve('INDEX');

// =============================================================================
// PERFORMANCE VALIDATION
// =============================================================================

// Test Query 1: Verify wikidata_id index usage
// Expected: Index seek on figure_wikidata_idx
// EXPLAIN MATCH (f:HistoricalFigure {wikidata_id: "Q1048"}) RETURN f;

// Test Query 2: Verify era index usage
// Expected: Index seek on figure_era_idx
// EXPLAIN MATCH (f:HistoricalFigure) WHERE f.era = "Roman Republic" RETURN f;

// Test Query 3: Verify composite index usage
// Expected: Index seek on media_type_year_idx
// EXPLAIN MATCH (m:MediaWork) WHERE m.media_type = "Film" AND m.release_year > 2000 RETURN m;

// =============================================================================
// MAINTENANCE NOTES
// =============================================================================

// Index Statistics:
// - Indexes are automatically maintained by Neo4j
// - No manual rebuilding required for RANGE indexes
// - Full-text indexes may require periodic updates if schema changes

// Monitor Index Health:
// - Check query plans with PROFILE to verify index usage
// - Monitor slow query logs for missing index warnings
// - Review index statistics monthly

// =============================================================================
// END OF INDEX CREATION SCRIPT
// =============================================================================
