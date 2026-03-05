# Fictotum — Portraits & Fiction

## North Star
Fictotum looks and feels like a curated visual encyclopedia of how history becomes fiction — not a database with a graph UI.

## Milestones

### M1: Illustrations in Production — Blocked
- **Why it matters**: 1,008 AI-generated portraits sitting on disk are wasted. Uploading them transforms every figure page from a text record to a portrait gallery. This is the single highest-impact visual upgrade available.
- **Blocker**: Neo4j Aura free tier database is paused (DNS NXDOMAIN for c78564a4.databases.neo4j.io as of 2026-03-05). Must resume from Neo4j Aura console before uploads can link to nodes. 818/1,008 already uploaded in prior session. R2 upload works, Neo4j linking blocked.
- **Acceptance criteria**:
  - [x] Figure detail pages display illustration as hero image (already implemented)
  - [x] Browse/search results show illustration thumbnails where available (already implemented)
  - [x] Homepage features illustration examples (FigureCard grid uses image_url)
  - [x] Graceful fallback for figures without illustrations (placeholder behavior preserved)
  - [x] `upload-and-link.ts` script confirmed working end-to-end (818 uploaded previously)
  - [ ] All 1,008 illustrations uploaded to Cloudflare R2 with 1-year cache headers (818/1,008 done, 190 remaining — blocked on Neo4j)
  - [ ] Neo4j HistoricalFigure nodes linked to illustration URLs (190 remaining — blocked on Neo4j)
- **Key files**: `scripts/image-gen/upload-and-link.ts`, `web-app/app/figure/[id]/page.tsx`, `web-app/components/`, homepage components

### M2: Fictional Characters Get Their Due — In Progress
- **Why it matters**: The product is called Fictotum. The homepage features only historical figures. Fictional and legendary characters (stored as HistoricalFigure nodes with `historicity_status = 'Fictional' | 'Legendary'`) are invisible — no dedicated browse path, no homepage presence, no navigation entry point. This is a product identity gap.
- **Acceptance criteria**:
  - [x] Homepage surfaces fictional/legendary figures alongside historical ones — dedicated "Fictional & Legendary" section with FigureCard grid
  - [x] Navigation includes a path to browse by historicity (Historical / Fictional / Legendary) — Browse chips on homepage + filter chips on search page
  - [x] Search results visually distinguish historicity status (colored bordered badge using FIGURE_TYPE_COLORS)
  - [x] Figure detail pages display historicity status prominently (badge always shown, not just for non-Historical)
  - [ ] At least one curated "exhibit" or collection showcasing fictional/legendary figures — deferred to George (editorial decision, per sprint instructions)
  - [ ] Audit: confirm we have enough fictional/legendary figures in the DB — blocked on Neo4j (database paused)
- **Key files**: `web-app/app/page.tsx` (homepage), `web-app/app/search/page.tsx`, `web-app/app/figure/[id]/page.tsx`, `web-app/lib/db.ts`

### M3: The Collection Experience — Not Started
- **Why it matters**: Series pages exist and have good data (appearance matrix, character roster, stats). But are they *compelling*? Would someone share the Assassin's Creed page? This milestone is about making collections/series into destination pages that franchise fans want to explore and share.
- **Acceptance criteria**:
  - [ ] Series detail page visual redesign — illustrations integrated (where available), stronger visual hierarchy, the page should feel like a franchise retrospective
  - [ ] Franchise timeline: show the series' works on a mini-timeline with the historical figures they portray, making the temporal span of the franchise visible
  - [ ] Series page includes portrayal highlights — standout or surprising historical figure appearances surfaced (e.g., "Did you know Assassin's Creed features Leonardo da Vinci?")
  - [ ] Open Graph tags on series pages for social sharing (illustration + title + stats)
  - [ ] Series browse page (`/series`) enhanced with illustrations and richer cards
  - [ ] At least 3 well-populated series in the DB to showcase (e.g., Assassin's Creed, Civilization, Wolf Hall trilogy) — ingest data if needed
- **Key files**: `web-app/app/series/[seriesId]/page.tsx`, `web-app/app/series/page.tsx`, `web-app/lib/db.ts` (getSeriesMetadata)

## Deferred (explicitly not this roadmap)
- **Content density push to 5K entities** — the current 2,501 is credible. Focus on quality of experience over quantity of nodes.
- **Shareable discovery / permalinks (FIC-120)** — valuable but premature until the pages being shared look good
- **Location data + map (FIC-132/133)** — enriches but doesn't address the identity gap
- **User auth (FIC-103)** — no user base yet
- **Narrative timelines (FIC-119)** — good feature, but fictional character treatment comes first
- **Analytics tracking (FIC-44)** — should happen but isn't a milestone-level outcome

## Dependencies
- M1 is fully independent — images exist, script exists, just needs execution
- M2 benefits from M1 (illustrations make fictional figures look better on the homepage)
- M3 benefits from M1 and M2 (series pages need illustrations; fictional characters appear in series)

## Risks
- **Neo4j Aura free tier pausing** — database auto-pauses after 3 days of inactivity. Must be resumed manually from console. This blocks M1 upload completion and M2 DB audit.
- **Illustration quality variance** — some of the 1,008 images may not be hero-page quality. M1 should include a quick quality review pass.
- **Fictional character data gap** — if the DB has very few Fictional/Legendary figures, M2 requires a data ingestion sub-task before the UI work is meaningful. Audit first.
- **Editorial judgment in M2/M3** — "curated exhibits" and "portrayal highlights" require curatorial decisions, not just code. The sprint session should flag these as decision points for George rather than guessing.
