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
_Last updated: 2026-03-06_

Database has 2,621 entity nodes (1,150 figures + 1,471 works) with 100% provenance coverage (CREATED_BY relationships). Zero orphan figures. Discovery agent live on figure detail pages. Gemini extraction pipeline tested end-to-end. batch_import.py session bug fixed. Pre-beta at fictotum.com behind password gate. April roadmap: all 5 milestones complete. All 1,008 illustrations uploaded to Cloudflare R2. Search results show portrait thumbnails. All API write endpoints authenticated. Middleware hardened (Edge Runtime compatible). Neo4j driver tuned for serverless. Admin routes gated. Fictional/legendary figures visible with dedicated homepage section, historicity browse chips, search filter + badges.

### Recent Completions
- **Historical fiction protagonists batch (BIG-51)**: Ingested 23 fictional protagonists (Bernie Gunther, Brother Cadfael, Matthew Shardlake, Amelia Peabody, Richard Sharpe, Jack Aubrey, Francis Crawford of Lymond, John Blackthorne, etc.) + 22 new historical figures + 12 new works + 59 APPEARS_IN relationships. Fixed 21 failed relationships from ID mismatches (different Wikidata Q-IDs in DB vs batch). Total entities: 2,621 (1,150 figures + 1,471 works).
- **Security hardening**: Fixed SPARQL injection in Wikidata enrichment endpoint, added auth guards to all write APIs, HMAC cookie-based password gate, security headers (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy), deleted test-db route.
- **Edge Runtime middleware fix**: Rewrote middleware.ts from Node.js `createHmac` to Web Crypto API (`crypto.subtle`) for Edge Runtime compatibility. Fixed invalid route exports in site-access API.
- **R2 storage migration (BIG-51)**: Migrated file storage from Vercel Blob to Cloudflare R2. Added R2 domain to Next.js remotePatterns for portrait loading.
- **Fictional/Legendary content expansion**: Ingested 53 fictional and legendary figures (Greek heroes, Arthurian legends, Shakespeare characters, literary classics, Assassin's Creed protagonists, etc.) with 23 new works and 65 portrayals. Historicity breakdown now: 1,049 Historical, 42 Fictional, 27 Legendary.
- **Stale Vercel Blob URL fix**: 104 figures still had old Vercel Blob image URLs (returning 403) from before the R2 migration. Re-uploaded all 104 legacy `HF_*` images to R2 under canonical Q-ID names. Zero Vercel Blob URLs remain.
- **All 1,008 illustrations on Cloudflare R2 (portraits-and-fiction M1)**: Force re-uploaded all 1,008 illustrations from local files to Cloudflare R2 and updated Neo4j `image_url` properties. Previous Vercel Blob URLs were returning 403 after R2 migration. Zero failures.
- **Fictional & Legendary visibility (portraits-and-fiction M2)**: Homepage now has dedicated "Fictional & Legendary" section showing top portrayed fictional/legendary figures. Browse chips (Historical/Fictional/Legendary) on homepage link to search with historicity filter. Search page has historicity filter chips with colored borders matching figure type colors. Search result badges use colored bordered pills instead of plain text. Figure detail pages now always show historicity badge (was previously hidden for Historical). Search URL supports `?historicity=` param.
- **Character Profile Matrix (FIC-66)**: Sortable/filterable table on figure detail pages showing how different creators interpret the same historical figure. Columns: Work (title + year + type), Creator, Interpretation (sentiment badge + lead/conflict flags), Actor/Character. Sortable by year, sentiment, creator. Filterable by media type. Replaces the placeholder stub. Only shown for figures with 2+ portrayals.
- **Graph node spacing fix (FIC-23)**: Increased charge from -4000 to -6000, link distance from 250 to 350, collision radius from 90 to 110. Canvas height increased to 800px/75vh.
- **Illustrations in production (portraits-and-fiction M1)**: 818/1,008 illustrations uploaded to Cloudflare R2 and linked to Neo4j nodes (480 this session + 338 prior). Search results now show portrait thumbnails via new SearchThumbnail component. Fixed upload-and-link.ts blob options (`addRandomSuffix: false`, `allowOverwrite: true`). Added `image_url` to `searchFigures()` query. Fixed pre-existing suggest-eras TS error blocking Vercel builds. 190 remaining illustrations blocked by Cloudflare R2 free tier operation limit (2,000 ops/month).
- **Git hygiene triage**: Committed 416 previously untracked source files (web-app, scripts, docs, schemas, tests, .github). Comprehensive .gitignore added covering data files, session artifact markdown, IDE state (.claude/, .cursor/), and credentials (.mcp.json). Caught plaintext Neo4j password in .mcp.json that was not being gitignored.
- **April 2026 roadmap M2 — Unblock Gemini + Content Growth (FIC-113, FIC-35, FIC-88)**: New Gemini API key created, GCP billing enabled, model refs updated to gemini-2.5-flash across 4 files. Fixed batch_import.py session bug (CREATED_BY called outside closed session). Medieval Europe cluster ingested (76 figures via research-compiled batch plus Crusades 14, Wars of Roses 11, Renaissance 59, supplemental global figures). Total entities: 2,501 (1,065 figures + 1,436 works), zero orphans. Illustration batch: 50 figures generated (0 failures), transparent PNGs with background removal, manifest at 1,008 total images.
- **April 2026 roadmap M1 — Production Hardening**: All API write endpoints authenticated (FIC-150). Middleware hardened: timing-safe password comparison, segment-bounded path matching, open redirect prevention (FIC-151). Navbar hooks violation fixed, GraphExplorer 404 resolved, HomeGraphHero memory leaks plugged (FIC-152). Neo4j driver tuned for serverless: pool 10, 30s acquisition timeout, 15s connection timeout. Missing LIMIT clauses added to 4 unbounded queries (FIC-153).
- **April 2026 roadmap M3 — Global Portrayal Timeline (FIC-112)**: Canvas-based visualization at `/explore/portrayal-timeline`. Figure lifespan bars with media work dots overlaid by release year. Era and media type filters with URL sync. Fisk visual language. Hover tooltips and click-to-navigate.
- **April 2026 roadmap M4 — Creator Analytics Suite**: TemporalObsessionMap (FIC-75) shows which eras creators gravitate toward. SentimentSignature (FIC-77) shows portrayal tone distribution. CastRepertoryCompany (FIC-76) was already implemented. Analytics section hidden for creators with <3 works.
- **April 2026 roadmap M5 — Production Polish (FIC-154)**: Console.logs removed from production code (auth, cache, wikidata, forms). Admin routes gated behind auth via layout.tsx. Shared Neo4j driver used in health and analytics endpoints. FIC-148, FIC-149 tickets closed.
- **FIC-149 — Historicity normalization**: Canonical enum (`Historical`, `Fictional`, `Legendary`) with 100% coverage across 898 figures.
- **March 2026 roadmap M2 — Discovery Agent**: On-demand "Discover Connections" section on figure detail pages. Graph-only scoring (`lib/connection-scoring.ts`) with Claude Sonnet 4.6 narration. Performance guard skips shortestPath for figures with >12 portrayals. Tested on 7+ figures.
- **March 2026 roadmap M3 — Gemini Extraction Pipeline**: `scripts/extraction/extract-from-wikipedia.ts` built and tested. Wikipedia fetch → Gemini structured extraction → Wikidata entity resolution → batch-import JSON. Blocked on Gemini free tier quota (429 errors).
- **March 2026 roadmap M5 — Orphan Connection**: Zero orphans (was 175). Wikidata SPARQL discovery (`scripts/qa/connect-orphans.py`), era-based broad media connections, individual curation. Removed 4 misclassified nodes (3 actors, 1 author). Total entities: 2,197.
- **Dynamic page titles**: `generateMetadata` on figure detail (`Napoleon Bonaparte — Fictotum`), media detail (`Gladiator — Fictotum`), and search pages. Improves SEO and browser tab readability.
- **Custom 404 pages**: Root, figure (`/figure/[id]`), and media (`/media/[id]`) routes have styled not-found pages matching Fictotum visual identity with Home and Search Archive links. Replaced old dark-mode figure 404.
- **Search flow improvements**: Filter-only browsing works (search page shows results when era/type filter active without text query). Homepage era links now properly route to search with `tab=figures`. Enter key navigates to full search page from HomepageSearch and Navbar search. Search link added to desktop navbar. Homepage explore section expanded to 4 items (Graph, Timeline, Search, Pathfinder). SearchInput pre-fills from URL `q` param (no empty input when navigating to search results).
- **Cross-linking fixes**: WorkCard now links to `/media/[id]` detail page instead of graph explorer. PortrayalCard titles link to media detail pages. Media detail "View in Graph" uses `wikidata_id` when available (was always using `media_id`). Homepage departments section deduplicated (replaced duplicate Pathfinder with Timeline).
- **FIC-49**: Advanced search with Figures/Works tabs, era filter chips, media type filter chips, active filter indicator. `searchFigures` and `searchMedia` support optional filters. Increased search limit from 10 to 50.
- **FIC-73**: Portrayals grouped by sentiment on media detail page (Heroic, Complex, Villainous sections with colored headers and counts). Figure detail page gains sentiment distribution bar showing portrayal breakdown with dominant sentiment label.
- **FIC-128**: Graph physics tuning verified done — relaxed forces, node pinning on drag end already implemented.
- **FIC-123**: Graph entrypoint on figure/media detail pages verified done — "View in Graph" links already present.
- **FIC-139**: Series collapsing in graph — component works collapse into parent series node in `getGraphData` and `getNodeNeighbors`. Expanding a series node shows figures from all child works via PART_OF traversal. Removed obsolete seriesMetadata badge. Link deduplication prevents multiple edges from same figure to same series.
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
- Data enrichment and population via batch imports (supports figures, works, events, sources)
- Upload generated illustrations to cloud storage and link to Neo4j nodes (1,008 images ready)

### Known Issues
- **Neo4j Aura free tier auto-pause**: Pauses after 3 days inactivity — DNS returns NXDOMAIN. Must resume from Neo4j Aura console. Keep alive by visiting fictotum.com periodically.
- Stale `.next` webpack cache can cause HMR failures after edits to graph components — fix with `rm -rf .next` and restart dev server
- Google Safe Browsing may flag `/api/auth/signin` on new domains — false positive that resolves in days
- No automated CI/CD pipeline

## Roadmap
### Completed This Sprint
- ~~**M1**: Production Hardening~~ — FIC-150/151/152/153 all resolved
- ~~**M2**: Unblock Gemini + Content Growth~~ — 2,501 entities, 50 illustrations generated, GCP billing enabled
- ~~**M3**: Global Portrayal Timeline~~ — FIC-112, live at `/explore/portrayal-timeline`
- ~~**M4**: Creator Analytics Suite~~ — FIC-75/76/77, temporal obsession + sentiment signature + cast repertory
- ~~**M5**: Production Polish~~ — FIC-154, console.logs removed, admin gated, shared drivers

### Next (2-4 weeks)
- Upload + link illustrations to Neo4j nodes (upload-and-link.ts ready)
- Apply Neo4j constraints for HistoricalEvent and Source node types

### Future (Backlog)
- **FIC-132/133**: Location data population and filtering (timeline + map)
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
- **Vercel deploy**: Always deploy from the repo root (`/fictotum/`), never from `web-app/`. The Vercel project is linked at the root via `.vercel/project.json`. Deploying from `web-app/` creates a separate project.

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

## Session Close Protocol

Before ending a work session:
1. Update `## Current State` with what was accomplished
2. Bump `_Last updated_` date
3. Commit changes with a descriptive message
4. If blocked, document the blocker under Known Issues
