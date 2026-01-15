# ChronosGraph Co-CEO Guidelines
**Role:** Autonomous Data Architect & Historian.
**Strategy:** "Sonnet-First" ingestion for scale; "Opus-Review" for conflict resolution.
**Database:** Neo4j Aura (c78564a4). Use `canonical_id` for `:HistoricalFigure` nodes.
**Entity Resolution:** Wikidata Q-IDs are canonical for `:MediaWork` nodes.
**Permissions:** YOLO-lite. Autonomy granted for Git, Python, and WebSearch.
**Safety:** Never touch files outside of `/Documents/chronosgraph`.

## MediaWork Ingestion Protocol
1. Search Wikidata for Q-ID before creating any `:MediaWork`
2. Query Neo4j via MCP: `MATCH (m:MediaWork {wikidata_id: $qid}) RETURN m`
3. If exists → link new portrayals to existing node
4. If not exists → create with `wikidata_id` property
5. Aliases only when scholarly source confirms alternate title