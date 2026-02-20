# Fictotum

## Identity
- **Domain**: chronosgraph on Vercel
- **Hosting**: Vercel (hobby)
- **Linear Team**: CHR
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
- **Web app**: Next.js frontend for graph exploration and visualization
- **Neo4j graph**: Core data model with `:HistoricalFigure`, `:MediaWork`, `:FictionalCharacter`, `:Agent` nodes
- **Relationships**: `PORTRAYED_IN`, `CREATED_BY`, and others linking entities
- **Scripts**: Python-based batch import, migration, and health check tooling in `scripts/`
- **Data**: JSON schemas and examples in `data/`

**Key directories:**
- `web-app/` — Next.js application
- `scripts/import/` — Batch import tools (`batch_import.py`, `csv_to_batch_json.py`)
- `scripts/migration/` — Schema migrations and backfills
- `scripts/qa/` — Health check and quality assurance
- `data/` — JSON schemas, examples, CSV templates

## Current State
_Last updated: 2026-02-20_

Database has 1,594 entity nodes with 100% provenance coverage (CREATED_BY relationships). Batch import infrastructure is complete. Wikidata-first canonical ID strategy is implemented. Pre-beta — web app graph exploration UX significantly improved with bloom-mode expansion, dual-click behavior, and label readability fixes.

### Recent Completions
- `:HistoricalEvent` and `:Source` node types: full schema (models, constraints, indexes in `schema.py`), JSON batch import schema, batch_import.py support (validation, dedup, import, reporting), TypeScript types
- Timeline view: canvas-based zoomable/pannable timeline at `/explore/timeline` with API route, era filtering, figure lifespan bars, event markers, click-to-navigate. Navbar updated with Timeline link.
- Competitive research: Historio (historio.app) analysis informed roadmap updates
- Graph Explorer UX overhaul: suppressed duplicate HTML tooltips, added label text halos, increased zoomToFit padding, always-on bloom-mode expansion
- Dual-click behavior: click node circle = expand/re-center, click label text = navigate to detail page
- Homepage graph hero (HomeGraphHero) ported with same label fixes and halo effects
- SearchInput onSelect callback: graph page search now populates graph inline instead of navigating away
- CHR-40: Batch import infrastructure (JSON validation, duplicate detection, dry-run mode)
- Provenance tracking: 100% CREATED_BY coverage across all entity nodes
- Database health monitoring script (`scripts/qa/neo4j_health_check.py`)
- Wikidata-first canonical ID strategy with provisional ID fallback
- Enhanced name similarity scoring (70% lexical + 30% phonetic)

### Active Work
- **Needs verification**: Apply new Neo4j constraints by running `schema.py` or batch importer against live DB
- Data enrichment and population via batch imports (now supports events + sources)
- Web app graph exploration and visualization improvements

### Known Issues
- Stale `.next` webpack cache can cause HMR failures after edits to graph components — fix with `rm -rf .next` and restart dev server
- No automated CI/CD pipeline

## Roadmap
### Immediate (This Sprint)
- Continue data population via batch imports
- Web app improvements for graph exploration
- `:HistoricalEvent` node type + schema design (canonical_id, wikidata_id, date/date_precision, start_date/end_date, location, era) with `PARTICIPATED_IN`, `DEPICTED_IN`, `LED_TO` relationships
- Source provenance: `:Source` node type to track where data came from (wikipedia_article, book, documentary) with `SOURCED_FROM` relationships

### Next (2-4 weeks)
- Illustration system (AI-generated via Gemini)
- Public-facing graph visualization
- Timeline view: zoomable chronological visualization complementing graph explorer (contemporaries lifespans + event markers), using vis-timeline or TimelineJS
- Gemini extraction pipeline: AI-powered structured data extraction from Wikipedia/source texts → entity resolution → batch-import JSON → human review via dry-run

### Future (Backlog)
- API for external consumers
- Advanced graph queries and analytics
- Dual-researcher pattern: two Gemini agents (high-precision + high-recall) with reconciliation step for data quality
- User collections / curated paths: saveable sets of connected nodes as shareable explorations
- Community contributions

## Conventions
- **Canonical IDs**: Wikidata Q-ID first (`Q517`), provisional fallback (`PROV:{slug}-{timestamp}`)
- **Duplicate prevention**: Dual-key blocking on `wikidata_id` AND `canonical_id`
- **Provenance**: Every node MUST have a `CREATED_BY` relationship to an `:Agent` node
- **Batch imports**: Always dry-run first, then execute with `--execute` flag
- **Safety**: Never touch files outside `/Documents/big-heavy/fictotum`

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
- **Thresholds**: High ≥0.9, Medium 0.7-0.89, Low <0.7

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

**Maintenance**: Agents should update `## Current State` at the end of significant work sessions. Bump the `_Last updated_` date.
