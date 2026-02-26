# Provenance Tracking - Query Examples

This document demonstrates the value of Phase 2.1 provenance tracking through practical query examples.

---

## Use Case 1: Data Quality Audit

**Question:** Which entities were auto-enriched from Wikidata vs manually created?

### Via Audit API
```bash
# High-confidence Wikidata-enriched data
curl "http://localhost:3000/api/audit/node-provenance?method=wikidata_enriched&limit=100"

# User-generated data (needs manual review)
curl "http://localhost:3000/api/audit/node-provenance?method=user_generated&limit=100"
```

### Via Cypher
```cypher
// Count by data quality method
MATCH (n)-[r:CREATED_BY]->(a:Agent)
RETURN r.method AS data_quality, count(n) AS count
ORDER BY count DESC

// Find user-generated HistoricalFigures for quality review
MATCH (f:HistoricalFigure)-[r:CREATED_BY {method: "user_generated"}]->(a:Agent)
RETURN f.name, f.canonical_id, r.timestamp
ORDER BY r.timestamp DESC
LIMIT 20
```

---

## Use Case 2: Contribution Attribution

**Question:** How many entities has each agent created?

### Via Audit API
```bash
# Get aggregated statistics
curl -X POST http://localhost:3000/api/audit/node-provenance
```

**Response:**
```json
{
  "by_agent": [
    {
      "agent_name": "Claude Code (Sonnet 4.5)",
      "agent_id": "claude-sonnet-4.5",
      "agent_type": "ai_agent",
      "count": 850
    },
    {
      "agent_name": "Fictotum Web UI",
      "agent_id": "web-ui-generic",
      "agent_type": "human_user",
      "count": 355
    }
  ]
}
```

### Via Cypher
```cypher
// Contribution leaderboard
MATCH (n)-[:CREATED_BY]->(a:Agent)
RETURN
  a.name AS agent,
  a.type AS agent_type,
  labels(n)[0] AS entity_type,
  count(n) AS contributions
ORDER BY contributions DESC
```

---

## Use Case 3: Debugging Data Issues

**Question:** Which batch introduced duplicate "Marcus Aurelius" entries?

### Via Audit API
```bash
# Find all "Marcus Aurelius" figures and their provenance
curl "http://localhost:3000/api/audit/node-provenance?entity_name=Marcus%20Aurelius"
```

### Via Cypher
```cypher
// Find duplicate figures and trace to ingestion batch
MATCH (f:HistoricalFigure {name: "Marcus Aurelius"})-[r:CREATED_BY]->(a:Agent)
RETURN
  f.canonical_id,
  f.wikidata_id,
  r.batch_id,
  r.timestamp,
  a.name
ORDER BY r.timestamp
```

**Value:** Quickly identify which ingestion batch introduced duplicates and who/what created them.

---

## Use Case 4: Recent Activity Monitoring

**Question:** What entities were added in the last 7 days?

### Via Audit API
```bash
# Get recent contributions
curl "http://localhost:3000/api/audit/node-provenance?since=2026-01-25T00:00:00Z&limit=100"
```

### Via Cypher
```cypher
// Recent activity by context (web UI vs bulk ingestion)
MATCH (n)-[r:CREATED_BY]->(a:Agent)
WHERE r.timestamp > datetime() - duration({days: 7})
RETURN
  r.context AS creation_method,
  labels(n)[0] AS entity_type,
  count(n) AS count
ORDER BY count DESC

// Recent web UI contributions
MATCH (n)-[r:CREATED_BY {context: "web_ui"}]->(a:Agent)
WHERE r.timestamp > datetime() - duration({days: 7})
RETURN
  coalesce(n.name, n.title) AS entity_name,
  labels(n)[0] AS type,
  r.timestamp AS created_at,
  a.name AS created_by
ORDER BY r.timestamp DESC
```

---

## Use Case 5: Batch Ingestion Audit

**Question:** How many entities were created in the Falco series ingestion?

### Via Audit API
```bash
# Find all entities from Falco batch
curl "http://localhost:3000/api/audit/node-provenance?context=bulk_ingestion" \
  | jq '.provenance[] | select(.batch_id | startswith("falco"))'
```

### Via Cypher
```cypher
// Audit specific ingestion batch
MATCH (n)-[r:CREATED_BY]->(a:Agent)
WHERE r.batch_id CONTAINS "falco"
RETURN
  r.batch_id AS batch,
  labels(n)[0] AS entity_type,
  count(n) AS count,
  min(r.timestamp) AS started_at,
  max(r.timestamp) AS completed_at
ORDER BY batch
```

**Value:** Track ingestion batch success rates and identify incomplete or failed batches.

---

## Use Case 6: User Reputation System (Future)

**Question:** Which users are top contributors?

### Via Cypher
```cypher
// Top contributors (once User nodes are linked to Agent nodes)
MATCH (n)-[r:CREATED_BY]->(a:Agent {type: "human_user"})
OPTIONAL MATCH (u:User {email: n.created_by})
RETURN
  u.name AS contributor,
  u.email AS email,
  count(n) AS contributions,
  labels(n)[0] AS primary_contribution_type
ORDER BY contributions DESC
LIMIT 10
```

**Value:** Foundation for gamification, badges, and reputation tracking.

---

## Use Case 7: Quality Assurance Workflow

**Question:** Find all user-generated entities without Wikidata Q-IDs for review.

### Via Cypher
```cypher
// Entities needing Q-ID enrichment
MATCH (n)-[r:CREATED_BY {method: "user_generated"}]->(a:Agent)
WHERE (n:HistoricalFigure OR n:MediaWork)
  AND (n.wikidata_id IS NULL OR n.wikidata_id STARTS WITH "PROV:")
RETURN
  labels(n)[0] AS type,
  coalesce(n.name, n.title) AS name,
  n.canonical_id AS id,
  r.timestamp AS created_at
ORDER BY r.timestamp DESC
LIMIT 50
```

**Value:** Prioritize manual review and Wikidata enrichment efforts.

---

## Use Case 8: Agent Performance Analytics

**Question:** How does AI agent accuracy compare to human contributions?

### Via Cypher
```cypher
// Compare data quality by agent type
MATCH (n)-[r:CREATED_BY]->(a:Agent)
WITH a.type AS agent_type, r.method AS quality_method, count(n) AS count
RETURN
  agent_type,
  quality_method,
  count,
  round(100.0 * count / sum(count), 2) AS percentage
ORDER BY agent_type, count DESC
```

**Expected Output:**
```
agent_type   | quality_method      | count | percentage
-------------|---------------------|-------|------------
ai_agent     | wikidata_enriched   | 650   | 76.47%
ai_agent     | user_generated      | 200   | 23.53%
human_user   | user_generated      | 300   | 84.51%
human_user   | wikidata_enriched   | 55    | 15.49%
```

**Value:** Measure automation effectiveness and identify areas for improvement.

---

## Use Case 9: Compliance & Audit Trail

**Question:** Show complete creation history for a specific entity (for legal/compliance).

### Via Audit API
```bash
# Get full provenance for Napoleon Bonaparte
curl "http://localhost:3000/api/audit/node-provenance?entity_id=Q517"
```

**Response:**
```json
{
  "count": 1,
  "provenance": [
    {
      "entity_id": "Q517",
      "entity_type": "HistoricalFigure",
      "entity_name": "Napoleon Bonaparte",
      "created_by_agent": "Claude Code (Sonnet 4.5)",
      "agent_id": "claude-sonnet-4.5",
      "agent_type": "ai_agent",
      "created_at": "2025-01-18T22:09:09Z",
      "creation_context": "bulk_ingestion",
      "batch_id": "falco_books_6_20_20260118_220909",
      "method": "wikidata_enriched",
      "user_email": null,
      "user_name": null
    }
  ]
}
```

### Via Cypher
```cypher
// Complete audit trail
MATCH (n {canonical_id: "Q517"})-[r:CREATED_BY]->(a:Agent)
RETURN {
  entity: {
    id: n.canonical_id,
    name: n.name,
    type: labels(n)[0]
  },
  provenance: {
    created_by: a.name,
    agent_type: a.type,
    agent_version: a.version,
    created_at: r.timestamp,
    context: r.context,
    batch_id: r.batch_id,
    method: r.method
  }
} AS audit_record
```

**Value:** Full accountability for regulatory compliance, content disputes, or legal requirements.

---

## Use Case 10: Migration Impact Analysis

**Question:** How many nodes are still missing provenance?

### Via Audit API
```bash
# Check missing provenance stats
curl -X POST http://localhost:3000/api/audit/node-provenance \
  | jq '.missing_provenance'
```

**Expected (Post-Migration):**
```json
{
  "missing_provenance": []
}
```

### Via Cypher
```cypher
// Find nodes missing CREATED_BY (should be zero after migration)
MATCH (n)
WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
  AND NOT EXISTS((n)-[:CREATED_BY]->())
RETURN labels(n)[0] AS node_type, count(n) AS missing_count
ORDER BY missing_count DESC
```

**Value:** Verify migration completeness and identify any gaps.

---

## Summary

These examples demonstrate the practical value of Phase 2.1 provenance tracking:

1. **Data Quality** - Distinguish high-confidence Wikidata data from user input
2. **Attribution** - Track AI vs human contributions
3. **Debugging** - Trace data issues to specific batches
4. **Monitoring** - Track recent activity and trends
5. **Auditing** - Verify batch ingestion completeness
6. **Reputation** - Foundation for user contribution tracking
7. **QA Workflow** - Prioritize manual review efforts
8. **Analytics** - Measure agent performance
9. **Compliance** - Full audit trails for legal requirements
10. **Verification** - Ensure migration completeness

All of these capabilities become available immediately upon running the production migration.
