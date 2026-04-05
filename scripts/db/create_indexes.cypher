// Neo4j Index Creation Script for ChronosGraph
// Execute these commands in Neo4j Browser or via cypher-shell

// ============================================================================
// SENTIMENT TAGS FULL-TEXT INDEX (CHR-12)
// ============================================================================
// Enables efficient search queries like:
//   - "Find all portrayals tagged as 'tragic'"
//   - "Show tag frequency distribution"
//   - "Filter by multiple tags"
//
// Created: 2026-01-21
// Issue: CHR-12
// ============================================================================

CREATE FULLTEXT INDEX sentiment_tag_search IF NOT EXISTS
FOR ()-[r:APPEARS_IN]-()
ON EACH [r.sentiment_tags];

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

// Example 1: Find all "tragic" portrayals
// CALL db.index.fulltext.queryRelationships(
//   'sentiment_tag_search',
//   'tragic'
// ) YIELD relationship, score
// MATCH (f:HistoricalFigure)-[relationship]->(m:MediaWork)
// RETURN f.name, m.title, relationship.sentiment_tags, score
// ORDER BY score DESC
// LIMIT 20;

// Example 2: Tag frequency distribution (tag cloud data)
// MATCH ()-[r:APPEARS_IN]->()
// UNWIND r.sentiment_tags AS tag
// RETURN tag, count(*) as frequency
// ORDER BY frequency DESC
// LIMIT 20;

// Example 3: Find portrayals with multiple tags (AND logic)
// MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
// WHERE ALL(t IN ['tragic', 'sympathetic'] WHERE t IN r.sentiment_tags)
// RETURN f.name, m.title, r.sentiment_tags;

// Example 4: Figure sentiment profile
// MATCH (f:HistoricalFigure {canonical_id: 'napoleon-bonaparte'})-[r:APPEARS_IN]->()
// UNWIND r.sentiment_tags AS tag
// RETURN tag, count(*) as count
// ORDER BY count DESC;

// ============================================================================
// VERIFICATION
// ============================================================================

// List all fulltext indexes
// SHOW INDEXES YIELD name, type, labelsOrTypes, properties
// WHERE type = 'FULLTEXT'
// RETURN name, labelsOrTypes, properties;

// ============================================================================
// ROLLBACK (if needed)
// ============================================================================

// DROP INDEX sentiment_tag_search IF EXISTS;
