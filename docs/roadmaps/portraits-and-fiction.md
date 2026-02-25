# Fictotum — Portraits & Fiction

## North Star
Fictotum looks and feels like a curated visual encyclopedia of how history becomes fiction — not a database with a graph UI.

## Milestones

### M1: Illustrations in Production — Not Started
- **Why it matters**: 1,008 AI-generated portraits sitting on disk are wasted. Uploading them transforms every figure page from a text record to a portrait gallery. This is the single highest-impact visual upgrade available.
- **Acceptance criteria**:
  - [ ] All 1,008 illustrations uploaded to Vercel Blob (or equivalent CDN) with 1-year cache headers
  - [ ] Neo4j HistoricalFigure nodes linked to illustration URLs (property or relationship)
  - [ ] Figure detail pages display illustration as hero image
  - [ ] Browse/search results show illustration thumbnails where available
  - [ ] Homepage features illustration examples (gallery row, rotating portraits, or curated grid)
  - [ ] Graceful fallback for figures without illustrations (current placeholder behavior preserved)
  - [ ] `upload-and-link.ts` script confirmed working end-to-end
- **Linear tickets**: Create new ticket for upload pipeline; close FIC-88 if illustration guardrails are addressed
- **Key files**: `scripts/image-gen/upload-and-link.ts`, `web-app/app/figure/[id]/page.tsx`, `web-app/components/`, homepage components

### M2: Fictional Characters Get Their Due — Not Started
- **Why it matters**: The product is called Fictotum. The homepage features only historical figures. Fictional and legendary characters (stored as HistoricalFigure nodes with `historicity_status = 'Fictional' | 'Legendary'`) are invisible — no dedicated browse path, no homepage presence, no navigation entry point. This is a product identity gap.
- **Acceptance criteria**:
  - [ ] Homepage surfaces fictional/legendary figures alongside historical ones — either a dedicated section ("Fictional & Legendary") or mixed into existing sections with visual distinction
  - [ ] Navigation includes a path to browse by historicity (Historical / Fictional / Legendary) — could be tabs, filters, or a dedicated page
  - [ ] Search results visually distinguish historicity status (badge, icon, or color)
  - [ ] Figure detail pages display historicity status prominently (not buried in metadata)
  - [ ] At least one curated "exhibit" or collection showcasing fictional/legendary figures (e.g., "Legendary Figures Across Cultures" — King Arthur, Robin Hood, Mulan)
  - [ ] Audit: confirm we have enough fictional/legendary figures in the DB to make this meaningful. If not, identify and ingest a batch (10-20 key figures) as part of this milestone.
- **Linear tickets**: Create new ticket(s)
- **Key files**: `web-app/app/page.tsx` (homepage), `web-app/app/search/`, `web-app/lib/db.ts` (queries that filter by historicity), `web-app/lib/types.ts` (historicity_status type)

### M3: The Collection Experience — Not Started
- **Why it matters**: Series pages exist and have good data (appearance matrix, character roster, stats). But are they *compelling*? Would someone share the Assassin's Creed page? This milestone is about making collections/series into destination pages that franchise fans want to explore and share.
- **Acceptance criteria**:
  - [ ] Series detail page visual redesign — illustrations integrated (where available), stronger visual hierarchy, the page should feel like a franchise retrospective
  - [ ] Franchise timeline: show the series' works on a mini-timeline with the historical figures they portray, making the temporal span of the franchise visible
  - [ ] Series page includes portrayal highlights — standout or surprising historical figure appearances surfaced (e.g., "Did you know Assassin's Creed features Leonardo da Vinci?")
  - [ ] Open Graph tags on series pages for social sharing (illustration + title + stats)
  - [ ] Series browse page (`/series`) enhanced with illustrations and richer cards
  - [ ] At least 3 well-populated series in the DB to showcase (e.g., Assassin's Creed, Civilization, Wolf Hall trilogy) — ingest data if needed
- **Linear tickets**: Create new ticket(s)
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
- **Illustration quality variance** — some of the 1,008 images may not be hero-page quality. M1 should include a quick quality review pass.
- **Fictional character data gap** — if the DB has very few Fictional/Legendary figures, M2 requires a data ingestion sub-task before the UI work is meaningful. Audit first.
- **Editorial judgment in M2/M3** — "curated exhibits" and "portrayal highlights" require curatorial decisions, not just code. The sprint session should flag these as decision points for George rather than guessing.
