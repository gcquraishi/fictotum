# Fictotum

## Identity
- **Domain**: fictotum.com (+ www.fictotum.com, fictotum.vercel.app)
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
_Last updated: 2026-02-21_

Database has ~1,600 entity nodes with 100% provenance coverage (CREATED_BY relationships). Batch import infrastructure is complete. Wikidata-first canonical ID strategy is implemented. Pre-beta — unified Fisk-inspired visual language across Timeline, Graph Explorer, and Homepage. Timeline features row-packed single-viewport layout with zoom/pan. Linear team key is `FIC` (not CHR as in some older references). Site is live at fictotum.com behind a password gate (pre-beta access).

### Recent Completions
- **FIC-141/142**: Navbar search — expandable magnifying glass icon on right side, inline search input with grouped results dropdown (figures, works, series, creators, actors). Closes on Escape, click outside, or route change.
- **FIC-126**: Media type shapes in graph — rounded rects for films, diamonds for books/plays, squares for TV, hexagons for other. Figures remain circles. Legend updated. Fixed missing `media_type` propagation in 3 graph data functions.
- **Sentry filter**: `NEXT_NOT_FOUND` and `NEXT_REDIRECT` errors now filtered in `sentry.server.config.ts` — these are intentional Next.js control-flow, not bugs.
- **FIC-129**: Graph legend bottom padding prevents overlap with mini-timeline.
- **FIC-130**: Portrayal page work search now uses dedicated `/api/media/search` (limit 10) instead of universal search (limit 3).
- **FIC-135**: Created Shakespeare (Q692) and Christopher Marlowe (Q28975) as HistoricalFigure nodes. Added Shakespeare in Love portrayals (Fiennes, Everett, Dench). Fixed missing `media_id` on Shakespeare in Love.
- **FIC-136**: Year field truly optional in media create API — stores null instead of 0, uses timestamp fallback for ID generation. Fixed create work page response parsing bugs.
- **FIC-138**: Fixed import creator page — was making GET request to POST-only `/api/wikidata/enrich` endpoint.
- **FIC-143**: Removed non-functional sidebar filters from search page (checkboxes weren't wired to anything).
- **FIC-124**: Removed center node amber halo from GraphExplorer.
- **FIC-127**: Added `onEngineStop` zoomToFit callback for better initial graph framing.
- **FIC-107**: Deduplicated 65 MediaWork nodes across 64 groups with different Wikidata Q-IDs for same work.
- **FIC-140**: Series detail page now rolls up figures from child works via PART_OF traversal in `getMediaById()`. Fixed Wolf Hall Trilogy data: removed duplicate PART_OF rels (3 children appeared 6x), set creator to Hilary Mantel, removed fabricated `Q2657795-series` wikidata_id.
- **FIC-125**: Merged duplicate Wolf Hall TV Series nodes (Q17060328=HyperTransport Consortium, Q18154901=Agents of SHIELD episode) into single node with correct Q-ID Q17039455. Cardinal Wolsey relationship preserved.
- **FIC-137**: Renamed "Create a new work/figure" to "Add" on portrayal and work contribute pages.
- **FIC-146**: Removed confusing two-letter initials from MediaWork card thumbnails (WorkCard, PortrayalCard). Placeholders now show only the media type icon on a colored square.
- **FIC-145**: Merged two duplicate Passion of the Christ nodes (wrong Wikidata IDs: Q356690=French tripe dish, Q165467=Jimmy Page) into single node with correct Q-ID Q51668.
- **FIC-144**: Updated illustration `STYLE_PREAMBLE` in both `prompt-templates.ts` and admin regenerate-image API to require complete facial features (visible eyes, nose, mouth). Jesus (Q302) and Peter (Q33923) portraits need regeneration once Gemini quota resets.
- **FIC-131**: Timeline era filter already pushes browser history (verified, no fix needed).
- **FIC-134**: `/contribute/creator` 404 — no code generates these links (verified, no fix needed).
- **Password protection (FIC-147)**: Cookie-based password gate via Next.js middleware. `SITE_PASSWORD` env var controls access. 30-day httpOnly cookie. Styled password page at `/password` with Fictotum visual identity. Middleware exempts `/password`, `/api/site-access`, `/api/auth`, and static assets. Disabled when env var is unset (dev mode).
- **Domain setup (FIC-147)**: fictotum.com and www.fictotum.com pointed to Vercel. DNS: A record → 76.76.21.21, CNAME www → cname.vercel-dns.com (configured on Hover).
- **Graph chrome simplification (Option A)**: Breadcrumb moved above canvas (page-level, not overlay). Ghost toolbar (bottom-right, borderless buttons, persistent #666 gray, no hover effects). Legend moved below canvas as tiny dot row. Canvas border removed — cream background bleeds into page with faint dashed outline. Full-width layout (removed 1100px max-width). Canvas height increased to 70vh/700px.
- **Search bar removed from graph page**: SearchInput component removed entirely from `/explore/graph`. Graph renders directly without search chrome. Navbar search trigger also removed.
- **Sentry error monitoring**: @sentry/nextjs wired (client, server, edge). Error boundary, instrumentation hook, source map uploads. Sentry project: `fictotum` in `big-heavy` org.
- **Dense graph hover clarity (FIC-121)**: Node name label above action buttons, 1.3x scale-up with gold ring on hovered node, 0.3 opacity dimming of non-hovered nodes via `dimFactor` multiplier in `nodeCanvasObject`.
- **Fisk color unification (FIC-117)**: Shared `lib/colors.ts` module with `ERA_COLORS`, `getEraColor()`, and `GRAPH_PALETTE` constants. Era-based node coloring, cream backgrounds, warm translucent links across GraphExplorer, HomeGraphHero, and Timeline. Graph legend updated to match (FIC-122).
- **Timeline readability overhaul**: Row-packing algorithm (greedy first-fit) condenses figures into minimal lanes within a single viewport. Minimum 10px bar height with scroll overflow. White text with drop shadow on bars, overflow labels for short bars, alternating zebra-stripe lane shading. Inspired by Harold Fisk's Mississippi River meander maps.
- **Graph API temporal metadata**: `getGraphData()`, `getLandingGraphData()`, `getHighDegreeNetwork()` now populate `temporal.era` on figure nodes (was already in `getNodeNeighbors()`).
- **Mini-timeline overlap fix**: ImpressionisticTimeline labels no longer overlap in dense graphs — greedy row stagger with dashed connector lines, dynamic container height.
- **Wheel zoom fix**: Canvas wheel handler uses native `addEventListener` with `{ passive: false }` so `preventDefault()` works correctly.
- `:HistoricalEvent` and `:Source` node types: full schema, JSON batch import schema, batch_import.py support
- Timeline view: canvas-based zoomable/pannable timeline at `/explore/timeline`
- Graph Explorer UX overhaul: suppressed duplicate HTML tooltips, label text halos, always-on bloom-mode expansion
- Dual-click behavior: click node circle = expand/re-center, click label text = navigate to detail page
- Homepage graph hero (HomeGraphHero) ported with same label fixes and halo effects
- CHR-40: Batch import infrastructure (JSON validation, duplicate detection, dry-run mode)
- Provenance tracking: 100% CREATED_BY coverage across all entity nodes
- Wikidata-first canonical ID strategy with provisional ID fallback

### Active Work
- **FIC-148 (BLOCKING)**: Vercel deploy pipeline not reflecting latest commits on fictotum.com. Requires manual Vercel dashboard investigation — see Linear comment for debugging checklist. Do NOT run `vercel --prod` from repo root.
- **FIC-144 (pending regen)**: Prompt fix deployed. Regenerate Jesus (Q302) and Peter (Q33923) portraits via admin API once Gemini daily quota resets.
- **Needs verification**: Apply new Neo4j constraints by running `schema.py` or batch importer against live DB
- Data enrichment and population via batch imports (now supports events + sources)
- **FIC-120 → FIC-118**: Connection quality scoring (FIC-120) then discovery agent (FIC-118). See Linear tickets for full specs from 2026-02-20 exploration session. Key decisions:
  - On-demand per entity (not batch), surfaces "Discover Connections" section on figure detail pages
  - Pipeline: Cypher candidates → FIC-120 graph-only scoring → Sonnet 4.6 narration
  - Model: Claude Sonnet 4.6 (requires `ANTHROPIC_API_KEY` in `.env.local`)
  - No embeddings — graph-only signals (hop distance, cross-era surprise, sentiment divergence, property completeness)
  - FIC-119 (narrative timeline summaries) deferred as potential bloat

### Known Issues
- **FIC-148**: Vercel deploys not reflecting latest code. Do NOT use `vercel --prod` from repo root — must deploy from `web-app/` or rely on GitHub integration. See FIC-148 for full debugging steps.
- Stale `.next` webpack cache can cause HMR failures after edits to graph components — fix with `rm -rf .next` and restart dev server
- Google Safe Browsing may flag `/api/auth/signin` on new domains — false positive that resolves in days
- No automated CI/CD pipeline

## Roadmap
### Immediate (This Sprint)
- **FIC-148**: Fix Vercel deploy pipeline (BLOCKING — requires dashboard investigation)
- **FIC-144**: Regenerate Jesus + Peter portraits once Gemini quota resets (prompt fix done)
- **FIC-120**: Connection quality scoring — `lib/connection-scoring.ts` with graph-only signals (internal, not user-visible)
- **FIC-118**: Discovery agent — on-demand "Discover Connections" section on figure detail pages, Sonnet 4.6 powered
- Continue data population via batch imports
- Apply Neo4j constraints for HistoricalEvent and Source node types

### Next (2-4 weeks)
- **FIC-141/142**: Make navbar search functional / expandable magnifying glass icon
- **FIC-126**: Different shapes/icons for media types in graph
- **FIC-139**: Collapse series and component works into single graph node
- Illustration system (AI-generated via Gemini)
- Gemini extraction pipeline: AI-powered structured data extraction from Wikipedia/source texts → entity resolution → batch-import JSON → human review via dry-run

### Future (Backlog)
- **FIC-132/133**: Location data population and filtering (timeline + map)
- **FIC-143**: Search page sidebar filter improvements
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
