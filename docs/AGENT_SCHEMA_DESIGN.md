# Agent Node Schema Design (CHR-26)

## Overview
This document defines the enhanced schema for `:Agent` nodes and `:CREATED_BY` relationships in Fictotum, enabling comprehensive provenance tracking for all contributed data.

## Agent Node Schema

```cypher
(:Agent {
  agent_id: STRING,           // Primary identifier: "claude-sonnet-4.5" or "user:email@domain.com"
  name: STRING,               // Display name: "Claude Code (Sonnet 4.5)" or user's name
  type: STRING,               // "ai_agent" | "human_user"
  version: STRING,            // For AI agents: "claude-sonnet-4-5-20250929"
  created_at: DATETIME,       // When this agent was first registered
  metadata: STRING            // JSON string with additional info (model params, user role, etc.)
})
```

### Agent Types

#### AI Agents
- `agent_id`: Normalized model identifier (e.g., `"claude-sonnet-4.5"`, `"claude-haiku-4.5"`)
- `type`: `"ai_agent"`
- `version`: Full model version string (e.g., `"claude-sonnet-4-5-20250929"`)
- `metadata`: JSON with keys:
  - `provider`: `"anthropic"`
  - `interface`: `"claude_code"` | `"api"` | `"console"`
  - `capabilities`: Array of strings (e.g., `["entity_resolution", "wikidata_integration"]`)

#### Human Users
- `agent_id`: `"user:{email}"` (e.g., `"user:gcquraishi@gmail.com"`)
- `type`: `"human_user"`
- `version`: null
- `metadata`: JSON with keys:
  - `auth_provider`: `"github"` | `"google"`
  - `role`: `"contributor"` | `"admin"`
  - `joined_at`: ISO timestamp of first contribution

## CREATED_BY Relationship Schema

```cypher
(entity)-[:CREATED_BY {
  timestamp: DATETIME,        // When the entity was created
  context: STRING,            // "bulk_ingestion" | "web_ui" | "api" | "migration"
  batch_id: STRING,           // Ingestion batch identifier (e.g., "web_ui_1738462847293")
  source_file: STRING,        // For bulk ingestion: original data file path
  method: STRING              // Creation method: "wikidata_enriched" | "user_generated" | "manual"
}]->(agent:Agent)
```

### Relationship Properties

- **timestamp**: Required. Millisecond-precision creation time.
- **context**: Required. Categorizes the creation context:
  - `"bulk_ingestion"`: Script-based batch import
  - `"web_ui"`: User contribution via web interface
  - `"api"`: Direct API call
  - `"migration"`: Created during database migration/cleanup
- **batch_id**: Optional. Groups related entities from same operation.
- **source_file**: Optional. For bulk ingestion, tracks the data file (e.g., `"data/global_mvp_batch11.json"`).
- **method**: Optional. Data source quality indicator:
  - `"wikidata_enriched"`: Auto-enriched from Wikidata
  - `"user_generated"`: Manually entered by user
  - `"manual"`: Manual curation by admin

## Migration Strategy

### Phase 1: Enhance Agent Nodes (CHR-26)
```cypher
// Add metadata to existing Agent nodes
MATCH (a:Agent {name: "Claude Code (Sonnet 4.5)"})
SET
  a.agent_id = "claude-sonnet-4.5",
  a.type = "ai_agent",
  a.version = "claude-sonnet-4-5-20250929",
  a.created_at = datetime("2025-01-15T00:00:00Z"),
  a.metadata = '{"provider":"anthropic","interface":"claude_code","capabilities":["entity_resolution","wikidata_integration"]}'

MATCH (a:Agent {name: "Claude Code (Haiku 4.5)"})
SET
  a.agent_id = "claude-haiku-4.5",
  a.type = "ai_agent",
  a.version = "claude-3-5-haiku-20241022",
  a.created_at = datetime("2025-01-15T00:00:00Z"),
  a.metadata = '{"provider":"anthropic","interface":"claude_code","capabilities":["fast_ingestion"]}'
```

### Phase 2: Backfill Missing CREATED_BY Relationships (CHR-27)
Parse git history, CHANGELOG.md, and `ingestion_batch` properties to infer provenance for nodes without CREATED_BY relationships.

### Phase 3: Update Contribution APIs (CHR-28)
All new node creation must include CREATED_BY relationship creation.

### Phase 4: Create Audit Endpoint (CHR-29)
Enable querying provenance for any node.

## Constraints

```cypher
// Ensure agent_id uniqueness
CREATE CONSTRAINT agent_id_unique IF NOT EXISTS
FOR (a:Agent) REQUIRE a.agent_id IS UNIQUE;

// Ensure every Agent has required properties
CREATE CONSTRAINT agent_required_props IF NOT EXISTS
FOR (a:Agent) REQUIRE (a.agent_id, a.name, a.type) IS NOT NULL;
```

## Query Patterns

### Find all entities created by a specific agent
```cypher
MATCH (n)-[:CREATED_BY]->(a:Agent {agent_id: $agentId})
RETURN labels(n)[0] AS node_type, count(n) AS count
ORDER BY count DESC
```

### Find entities created via web UI in last 7 days
```cypher
MATCH (n)-[r:CREATED_BY {context: "web_ui"}]->(a:Agent)
WHERE r.timestamp > datetime() - duration({days: 7})
RETURN n, a, r
ORDER BY r.timestamp DESC
```

### Find all nodes missing provenance
```cypher
MATCH (n)
WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
  AND NOT EXISTS((n)-[:CREATED_BY]->())
RETURN labels(n)[0] AS node_type, count(n) AS count
ORDER BY count DESC
```

### Audit trail for specific entity
```cypher
MATCH (n {canonical_id: $entityId})-[r:CREATED_BY]->(a:Agent)
RETURN {
  entity_type: labels(n)[0],
  entity_name: coalesce(n.name, n.title),
  created_by: a.name,
  created_at: r.timestamp,
  creation_context: r.context,
  batch_id: r.batch_id,
  method: r.method
} AS provenance
```

## Benefits

1. **Accountability**: Track who/what created every entity
2. **Data Quality**: Identify high-confidence vs user-generated data
3. **Debugging**: Trace issues back to ingestion batch or API call
4. **Analytics**: Understand contribution patterns (AI vs human, bulk vs incremental)
5. **Multi-User Support**: Foundation for user reputation/contribution tracking
6. **Audit Compliance**: Full creation history for all data

## Related Tickets
- CHR-26: Design Agent node schema and CREATED_BY relationship
- CHR-27: Create migration script to backfill CREATED_BY for existing data
- CHR-28: Update contribution APIs to set CREATED_BY on new nodes
- CHR-29: Create audit query endpoint for node provenance
