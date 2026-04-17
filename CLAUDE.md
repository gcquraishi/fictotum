# Fictotum

## Identity
- **Domain**: fictotum.com (+ www.fictotum.com, fictotum.vercel.app)
- **Hosting**: Vercel (hobby)
- **Ticket Prefix**: FIC
- **Root Config**: See ../CLAUDE.md for shared infrastructure

## Overview
Historical figures and media works knowledge graph. A Next.js web app backed by Neo4j Aura for exploring relationships between historical figures, their fictional portrayals, and the media works that depict them. Research-grade entity resolution using Wikidata Q-IDs as canonical identifiers.

## Tech Stack
- **Framework**: Next.js (App Router), React, TypeScript
- **Database**: Neo4j Aura (Database ID: c78564a4)
- **AI**: Google Gemini (research and data enrichment)
- **Entity Resolution**: Wikidata Q-IDs (canonical), Double Metaphone (phonetic matching)
- **Ingestion**: Python batch import scripts with JSON schema validation

## Architecture
- `web-app/` — Next.js frontend (App Router) for graph exploration, search, collections, analytics
- `scripts/` — Python tooling: `import/` (batch import), `migration/`, `qa/` (health checks, Q-ID audit), `maintenance/` (dedup), `extraction/` (Gemini pipeline)
- `data/` — JSON schemas, batch files, CSV templates
- **Neo4j graph model**: `:HistoricalFigure`, `:MediaWork`, `:FictionalCharacter`, `:Agent`, `:User`, `:Collection`, `:HistoricalEvent`, `:Source` nodes
- **Key relationships**: `PORTRAYED_IN`, `CREATED_BY`, `APPEARS_IN`, `PART_OF`, `OWNS`, `CONTAINS`

## Current State
_Last updated: 2026-04-17_

3,132 entity nodes (1,317 figures + 1,683 works + 101 characters + 10 agents + 10 series). Zero duplicate entities. All 1,008 illustrations on Cloudflare R2. Site publicly accessible at fictotum.com; staging at staging.fictotum.com.

Auth.js v5 (Google + GitHub) with graceful degradation when OAuth env vars absent. Users stored as :User nodes. Collections fully implemented. Admin routes locked to `ADMIN_EMAILS` env var. Series pages redesigned as franchise retrospective destination pages. NFD diacritic normalization active (TypeScript + Python). Q-ID audit infrastructure with batch validation and auto-fix. Pre-flight Q-ID validation in `batch_import.py` with `--strict-qids` block option. Sentry error monitoring wired (client, server, edge).

### Recent Completions
- Landing page graph UI polish: legend matches actual Fisk palette + FIC-126 shapes, search section isolated from graph z-index, control buttons labeled with text + keyboard shortcut tooltips
- Verified graph UI fixes (FIC-157) via Puppeteer — all 5 acceptance criteria pass

### Active Work
- No active sprints or roadmap milestones — all Open & Social milestones complete
- Next step: run `/roadmap` to plan next phase (backlog: location data, narrative timelines, connection scoring)
- 132 entities need manual Q-ID review (alternative names like Tamerlane/Timur, or no Wikidata match). Report: `docs/reports/qid-audit-2026-03-22.json`

### Known Issues
- **Neo4j Aura free tier auto-pause**: Pauses after 3 days inactivity — DNS returns NXDOMAIN. Must resume from console.neo4j.io. Keep alive by visiting fictotum.com periodically.
- Stale `.next` webpack cache can cause HMR failures after graph component edits — fix with `rm -rf .next`
- Google Safe Browsing may flag `/api/auth/signin` on new domains — false positive, resolves in days
- No automated CI/CD pipeline

## Roadmap
### Completed: Open & Social (`docs/roadmaps/open-and-social.md`)
- **M1: Open the Gates** — Public launch, OG tags, Vercel Analytics
- **M2: User Identity + Collections** — OAuth login, contribution tracking, collections
- **M3: The Collection Experience** — Series pages as franchise retrospective destinations
- **M4: Content Density Push** — 3,000+ entities, alternate names, regional batches, Q-ID mass fix

### Backlog
- **FIC-132/133**: Location data and map filtering
- **FIC-119**: Narrative timeline summaries
- **FIC-120**: Connection quality scoring
- API for external consumers
- Dual-researcher pattern for data quality

## Conventions
- **Canonical IDs**: Wikidata Q-ID first (`Q517`), provisional fallback (`PROV:{slug}-{timestamp}`)
- **Duplicate prevention**: Dual-key blocking on `wikidata_id` AND `canonical_id`
- **Provenance**: Every node MUST have a `CREATED_BY` relationship to an `:Agent` node
- **Batch imports**: Always dry-run first, then execute with `--execute` flag
- **Safety**: Never touch files outside `/Documents/big-heavy/fictotum`
- **Vercel deploy**: Always deploy from the repo root (`/fictotum/`), never from `web-app/`. The Vercel project is linked at the root via `.vercel/project.json`.

## Protocols

### MediaWork Ingestion Protocol
1. Search Wikidata for Q-ID before creating any `:MediaWork`
2. Query Neo4j: `MATCH (m:MediaWork {wikidata_id: $qid}) RETURN m`
3. If exists → link new portrayals to existing node
4. If not exists → create with `wikidata_id` property
5. Aliases only when scholarly source confirms alternate title

### HistoricalFigure Entity Resolution
- **Priority 1**: Wikidata Q-ID as `canonical_id` (e.g., `Q517` for Napoleon)
- **Priority 2**: Provisional ID (`PROV:{slug}-{timestamp}`) when Q-ID unavailable
- **Similarity scoring**: Weighted 70% lexical (Levenshtein) + 30% phonetic (Double Metaphone)
- **Thresholds**: High >=0.9, Medium 0.7-0.89, Low <0.7

### CREATED_BY Provenance (Mandatory)
```cypher
(entity)-[:CREATED_BY {
  timestamp: DATETIME,
  context: "bulk_ingestion" | "web_ui" | "api" | "migration",
  batch_id: STRING,
  method: "wikidata_enriched" | "user_generated" | "manual"
}]->(agent:Agent)
```

### Batch Import Usage
```bash
python3 scripts/import/validate_batch_json.py data/batch.json
python3 scripts/import/batch_import.py data/batch.json --dry-run
python3 scripts/import/batch_import.py data/batch.json --execute
```

## Session Close Protocol

Run /close before ending any panel session.
