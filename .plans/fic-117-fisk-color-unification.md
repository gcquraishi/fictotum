# Feature Implementation Plan: FIC-117 Unify Fisk Color Scheme Across Graph Views

**Overall Progress:** `0%` (0/7 tasks complete)

---

## TL;DR
Extract the Fisk-inspired color palette from `Timeline.tsx` into a shared module, pipe `era` data through the graph APIs, and apply era-based coloring to `GraphExplorer` and `HomeGraphHero` so all exploration views share a consistent warm, muted aesthetic.

---

## Critical Decisions
- **Shared module over duplication**: Extract `ERA_COLORS` + `getEraColor()` into `lib/colors.ts` so Timeline, GraphExplorer, and HomeGraphHero all import from one source
- **Era data in graph API**: `getGraphData()` and `getNodeNeighbors()` currently don't return `era` — we add it to the Cypher queries and `GraphNode.temporal` population
- **Media nodes keep orange tint**: Only figure nodes get era-based colors; media nodes get a warm muted stone tone to differentiate while staying on-palette
- **Background**: Graph canvas background changes from `#f9fafb` (cold gray) to `#FAF8F0` (Fisk cream)
- **Backward-compatible**: `getEraColor()` already handles missing era gracefully (returns fallback), so nodes without era data still render fine

---

## Implementation Tasks

### Phase 1: Shared Color Module

- [ ] :red_square: **Task 1.1: Extract color utilities into `lib/colors.ts`**
  - [ ] :red_square: Create `web-app/lib/colors.ts` with exported `ERA_COLORS` map and `getEraColor()` function
  - [ ] :red_square: Add exported `GRAPH_PALETTE` constants: `CREAM_BG`, `MEDIA_NODE_COLOR`, `LINK_COLOR`, `LINK_FEATURED_COLOR`, `LABEL_COLOR`
  - [ ] :red_square: Update `Timeline.tsx` to import from `lib/colors.ts` instead of defining locally
  - **Files**: `web-app/lib/colors.ts` (new), `web-app/components/Timeline.tsx`
  - **Notes**: Keep the hash-based fallback for unknown eras. Palette values: cream `#FAF8F0`, media node `#A0937D`, link `rgba(160,147,125,0.15)`, label `#4A4535`

### Phase 2: Graph API — Add Era Data

- [ ] :red_square: **Task 2.1: Add `era` to graph node construction in `db.ts`**
  - [ ] :red_square: In `getGraphData()`: read `f.era` from the HistoricalFigure node and populate `temporal.era` on GraphNode
  - [ ] :red_square: In `getNodeNeighbors()`: same for figure nodes returned from expand queries
  - [ ] :red_square: In `getGraphLandingData()`: same for landing page figures
  - **Files**: `web-app/lib/db.ts`
  - **Notes**: The Cypher already returns `f` — just need to read `.properties.era`. No schema changes needed.

### Phase 3: Apply Fisk Palette to GraphExplorer

- [ ] :red_square: **Task 3.1: Update GraphExplorer colors and background**
  - [ ] :red_square: Import `getEraColor`, `GRAPH_PALETTE` from `lib/colors.ts`
  - [ ] :red_square: Change `backgroundColor` from `#f9fafb` to `GRAPH_PALETTE.CREAM_BG`
  - [ ] :red_square: In `nodeCanvasObject`: use `getEraColor(node.temporal?.era)` for figure node fill instead of hardcoded `#3b82f6`
  - [ ] :red_square: Set figure node opacity to `0.8` (translucent Fisk style) for non-hovered/non-center nodes
  - [ ] :red_square: Change media node color from `#f97316` to `GRAPH_PALETTE.MEDIA_NODE_COLOR`
  - [ ] :red_square: Update link colors: default `rgba(160,147,125,0.15)`, featured `#B8860B`
  - [ ] :red_square: Update label text color from `#1f2937` to `GRAPH_PALETTE.LABEL_COLOR`
  - **Files**: `web-app/components/GraphExplorer.tsx`
  - **Notes**: Keep Bacon node special styling (red). Keep center node gold glow. The era coloring layers on top of existing size/glow logic — only the fill color changes.

### Phase 4: Apply Fisk Palette to HomeGraphHero

- [ ] :red_square: **Task 4.1: Update HomeGraphHero colors**
  - [ ] :red_square: Import `getEraColor`, `GRAPH_PALETTE` from `lib/colors.ts`
  - [ ] :red_square: Replace `FIGURE_COLOR` / `MEDIA_COLOR` constants with era-based logic
  - [ ] :red_square: Update `getNodeColor()` to use `getEraColor(node.temporal?.era)` for figures
  - [ ] :red_square: Update link color from `rgba(0,0,0,0.08)` to warm `rgba(160,147,125,0.12)`
  - **Files**: `web-app/components/HomeGraphHero.tsx`
  - **Notes**: HomeGraphHero uses `nodeColor` prop (not custom canvas painting for node fill), so this is a simpler change than GraphExplorer

### Phase 5: Verify & Polish

- [ ] :red_square: **Task 5.1: Visual QA across all views**
  - [ ] :red_square: Check `/explore/timeline` still renders correctly (no regression from extraction)
  - [ ] :red_square: Check `/explore/graph` — nodes colored by era, cream background, warm links
  - [ ] :red_square: Check homepage hero graph — consistent warm tones
  - [ ] :red_square: Check figure detail pages (they embed GraphExplorer) — same palette
  - [ ] :red_square: Zoom in/out on graph — labels readable against cream background

- [ ] :red_square: **Task 5.2: TypeScript build check**
  - [ ] :red_square: Run `npx tsc --noEmit` — no errors
  - [ ] :red_square: Run `npm run build` — clean production build

---

## Rollback Plan

**If things go wrong:**
1. `git checkout HEAD -- web-app/components/Timeline.tsx web-app/components/GraphExplorer.tsx web-app/components/HomeGraphHero.tsx web-app/lib/db.ts`
2. Delete `web-app/lib/colors.ts`
3. All changes are frontend + one db query field addition — no schema migrations to revert

---

## Success Criteria

- [ ] Timeline, GraphExplorer, and HomeGraphHero all import colors from `lib/colors.ts`
- [ ] Graph canvas backgrounds use cream `#FAF8F0` instead of cold gray
- [ ] Figure nodes in graph views are colored by era using the same palette as timeline bars
- [ ] Media nodes use a warm muted tone that complements the era palette
- [ ] Links use warm, translucent tones instead of cold gray/black
- [ ] `npx tsc --noEmit` and `npm run build` pass clean

---

## Out of Scope (For This Plan)

- ImpressionisticTimeline sub-component in GraphExplorer (separate styling concern)
- Dark mode variants of the Fisk palette
- Animated transitions between color states
- Era legend/key on graph views (good follow-up, but not this ticket)
