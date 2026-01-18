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

## Session Log Management
- **Active Log:** `CHRONOS_LOG.md` contains the last 2 recent session entries for quick reference
- **Archive:** `CHRONOS_LOG.archive.md` preserves all historical sessions for auditing and context
- **Rotation Policy:** When CHRONOS_LOG.md grows beyond 3 entries, rotate the oldest entries to the archive
- **Purpose:** Keeps the active log lean and performant while preserving full project history

## Safety & Path Integrity
- **Permanent Storage Only:** Before creating or moving any files, verify the destination is a permanent project directory (Root, `/src`, etc.).
- **Cache Restriction:** NEVER write to or assume context from temporary or cache folders like `__pycache__`, `.venv`, or `dist`.