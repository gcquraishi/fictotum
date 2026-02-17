# Feature Implementation Plan: Navigation Simplification & Contribution Flow Redesign

**Overall Progress:** `0%` (0/12 tasks complete)

---

## TL;DR
Replace the homepage text hero with a live force-directed graph, streamline navigation to 4 items (Search, Graph, Contribute, Sign In), and split the monolithic 1,455-line contribution wizard into 3 focused flows: Add Portrayal (hero), Add Work, and Import Creator's Works.

---

## Critical Decisions
- **Homepage hero**: Live mini-graph (Option A) — random high-connectivity figure's neighborhood, 15-20 nodes, clickable to navigate. Replaces text-only hero.
- **Navigation**: Kill `/browse`, `/welcome`, `/explore/coverage` routes. Fold useful content into homepage/search. Rename "Network" to "Graph".
- **Contribution split**: 3 entry points instead of 1 wizard. "Add a Portrayal" is the hero action. All flows support inline creation of missing entities.
- **Creators stay**: Creator concept is important for MVP. "Add a Work" form includes creator field with autocomplete + inline figure creation.
- **No backend changes**: All existing API routes are reused as-is.

---

## Implementation Tasks

### Phase 1: Navigation Cleanup

- [ ] 🟥 **Task 1.1: Update Navbar**
  - [ ] 🟥 Rename "Network" link text to "Graph" (keep `/explore/graph` route)
  - [ ] 🟥 Remove any links to `/browse` or `/welcome`
  - [ ] 🟥 Final nav order: `Fictotum` | `Search...` | `Graph` | `Contribute` | `Sign In`
  - **Files**: `web-app/components/Navbar.tsx`

- [ ] 🟥 **Task 1.2: Remove Dead Routes**
  - [ ] 🟥 Delete `/web-app/app/welcome/page.tsx`
  - [ ] 🟥 Delete `/web-app/app/browse/page.tsx` (keep `/browse/eras` and `/browse/locations` sub-routes if they exist — they're linked from era tags)
  - [ ] 🟥 Delete `/web-app/app/explore/coverage/page.tsx`
  - [ ] 🟥 Remove "See how it works" link to `/welcome` from homepage
  - [ ] 🟥 Remove "Coverage Map" from homepage explore navigation grid
  - [ ] 🟥 Remove "Browse by Era" and "Browse by Location" from homepage explore navigation grid (era tags section stays — it links to `/search?era=`)
  - **Files**: `web-app/app/welcome/`, `web-app/app/browse/page.tsx`, `web-app/app/explore/coverage/`, `web-app/app/page.tsx`
  - **Notes**: Check for any other pages linking to deleted routes. Era tags on homepage already link to `/search?era=` which is correct.

### Phase 2: Homepage Graph Hero

- [ ] 🟥 **Task 2.1: Create Homepage Graph Component**
  - [ ] 🟥 Create `HomeGraphHero` client component that wraps `GraphExplorer` for homepage use
  - [ ] 🟥 On mount, fetch a random high-connectivity figure via new server action or inline API call (`/api/graph/[id]`)
  - [ ] 🟥 Pick from top-12 most-connected figures (data already fetched by homepage query), select randomly on each page load
  - [ ] 🟥 Render GraphExplorer with `shouldExpandCenter=true` in a constrained container (~500px height)
  - [ ] 🟥 Override node click to navigate to `/figure/[id]` or `/media/[id]` instead of expanding
  - [ ] 🟥 Add subtle text overlay: figure name + "Explore the connections" or similar
  - **Files**: `web-app/components/HomeGraphHero.tsx` (new), `web-app/app/page.tsx`
  - **Notes**: GraphExplorer already handles SSR with client-side mount check. Reuse its responsive dimensions logic but constrain height. The component must be `'use client'` but the homepage can remain server-rendered with the graph as a client island.

- [ ] 🟥 **Task 2.2: Rebuild Homepage Layout**
  - [ ] 🟥 Replace text hero section with `HomeGraphHero` component
  - [ ] 🟥 Move `HomepageSearch` below the graph hero (prominent, full-width)
  - [ ] 🟥 Keep stats bar as-is
  - [ ] 🟥 Keep "Most Portrayed Figures" grid
  - [ ] 🟥 Keep era tags section (links to `/search?era=`)
  - [ ] 🟥 Keep "Popular Works" grid
  - [ ] 🟥 Replace 4-column explore navigation with 2-column: "Graph" + "Pathfinder" (remove Browse by Era, Browse by Location, Coverage Map)
  - [ ] 🟥 Update departments section: "Contribute" + "Pathfinder" stays as-is
  - **Files**: `web-app/app/page.tsx`
  - **Dependencies**: Task 2.1 must complete first

### Phase 3: Contribution Flow — Add Portrayal

- [ ] 🟥 **Task 3.1: Create Contribute Landing Page**
  - [ ] 🟥 Replace monolithic wizard with a landing page showing 3 action cards:
    - "Add a Portrayal" (hero, large) — "Log a historical figure's appearance in a media work"
    - "Add a Work" (secondary) — "Add a new film, book, TV series, or other media work"
    - "Import Creator's Works" (tertiary) — "Bulk import works by a creator from Wikidata"
  - [ ] 🟥 Each card links to its sub-route: `/contribute/portrayal`, `/contribute/work`, `/contribute/import`
  - [ ] 🟥 Style consistent with FSG Literary Minimalism design system
  - **Files**: `web-app/app/contribute/page.tsx` (rewrite)
  - **Notes**: The old wizard code will be preserved in git history. Components like `TwoTierSearchResults`, `WikidataMatchCard`, `SettingsConfirmation` are reused.

- [ ] 🟥 **Task 3.2: Build "Add a Portrayal" Flow**
  - [ ] 🟥 Create `/contribute/portrayal/page.tsx` with 3-step flow:
    - **Step 1: Select Work** — Search autocomplete against DB + Wikidata. Show existing works first. "Can't find it?" inline creation panel (title, type, year — calls `/api/media/create`).
    - **Step 2: Select Figure** — Search autocomplete against DB + Wikidata. "Not in our database?" inline creation panel (name, dates, historicity — calls `/api/figures/create`).
    - **Step 3: Describe Portrayal** — Sentiment tags (reuse existing tag picker), optional role description, optional actor name, optional isProtagonist toggle. Calls `/api/contribution/appearance`.
  - [ ] 🟥 Each step shows selected entity as a compact card before proceeding
  - [ ] 🟥 Back button on each step to revise
  - [ ] 🟥 Success state: "Portrayal added!" with links to figure page and work page
  - [ ] 🟥 Reuse existing search debounce pattern and Wikidata enrichment from old wizard
  - **Files**: `web-app/app/contribute/portrayal/page.tsx` (new)
  - **Notes**: This is the hero flow. Keep it lean — 3 steps max. Inline creation panels are collapsible (hidden by default, shown on "Can't find it?" click). Reuse `TwoTierSearchResults` component for search display.

- [ ] 🟥 **Task 3.3: Build Inline Entity Creation Panels**
  - [ ] 🟥 Create `InlineWorkCreator` component — compact form (title, media type dropdown, year, optional creator field). Calls `/api/media/create`, returns created work for selection.
  - [ ] 🟥 Create `InlineFigureCreator` component — compact form (name, birth year, death year, historicity radio). Calls `/api/figures/create`, returns created figure for selection.
  - [ ] 🟥 Both auto-search Wikidata on name input (reuse `WikidataMatchCard` for quick-select from Wikidata)
  - [ ] 🟥 Both show success inline ("Created! Now selected.") without page navigation
  - **Files**: `web-app/components/InlineWorkCreator.tsx` (new), `web-app/components/InlineFigureCreator.tsx` (new)
  - **Dependencies**: Used by Tasks 3.2 and 3.4

### Phase 4: Contribution Flow — Add Work & Import

- [ ] 🟥 **Task 4.1: Build "Add a Work" Flow**
  - [ ] 🟥 Create `/contribute/work/page.tsx` — single-page form:
    - Title (required)
    - Media type dropdown (required) — Film, Book, TV Series, Documentary, Play, Musical, Comic, Video Game, Podcast
    - Release year (optional)
    - Creator field — autocomplete against HistoricalFigures in DB + Wikidata. If selected, auto-creates CREATED relationship. "Not in database?" triggers `InlineFigureCreator`.
    - Wikidata auto-enrichment: on title+year blur, search Wikidata for Q-ID match. Show "Wikidata match found" badge if matched.
  - [ ] 🟥 Submit calls `/api/media/create`
  - [ ] 🟥 Success state: "Work added!" with link to work page + option to "Add a portrayal to this work" (pre-fills Step 1 of portrayal flow)
  - **Files**: `web-app/app/contribute/work/page.tsx` (new)
  - **Dependencies**: Task 3.3 for InlineFigureCreator

- [ ] 🟥 **Task 4.2: Build "Import Creator's Works" Flow**
  - [ ] 🟥 Create `/contribute/import/page.tsx` — wraps existing `CreatorWorksView` component
  - [ ] 🟥 Add search step: search for a creator by name (Wikidata search)
  - [ ] 🟥 On creator selection, render `CreatorWorksView` component (already handles bulk import, progress tracking, creator-as-figure checkbox)
  - [ ] 🟥 Success state: summary of imported works with links
  - **Files**: `web-app/app/contribute/import/page.tsx` (new), `web-app/components/CreatorWorksView.tsx` (minor props adjustment if needed)
  - **Notes**: CreatorWorksView already handles the heavy lifting. This is mostly a wrapper page.

### Phase 5: Cleanup & Polish

- [ ] 🟥 **Task 5.1: Update Cross-Links**
  - [ ] 🟥 Search results "Not in our database?" links → `/contribute/portrayal` or `/contribute/work`
  - [ ] 🟥 Figure detail page "Add a portrayal" → `/contribute/portrayal?figure={id}`
  - [ ] 🟥 Work detail page "Add a portrayal" → `/contribute/portrayal?work={id}`
  - [ ] 🟥 Homepage departments section: update Contribute card description
  - **Files**: `web-app/app/search/page.tsx`, `web-app/app/figure/[id]/page.tsx`, `web-app/app/media/[id]/page.tsx`, `web-app/app/page.tsx`
  - **Notes**: The portrayal flow should accept `?work=` and `?figure=` query params to pre-fill Step 1 or Step 2.

- [ ] 🟥 **Task 5.2: Remove Old Wizard Code**
  - [ ] 🟥 Delete old wizard-specific code from `contribute/page.tsx` (now replaced by landing page)
  - [ ] 🟥 Clean up `web-app/types/contribute.ts` — remove `WizardStep`, `WizardState` types if no longer used. Keep shared types like `SearchResult`, `WikidataMatch`, `CreatorWork`.
  - [ ] 🟥 Verify no imports reference deleted code
  - **Files**: `web-app/app/contribute/page.tsx`, `web-app/types/contribute.ts`
  - **Dependencies**: All Phase 3 and 4 tasks complete

- [ ] 🟥 **Task 5.3: Smoke Test All Flows**
  - [ ] 🟥 Homepage loads with graph hero, graph is interactive, nodes clickable
  - [ ] 🟥 Navbar links all work (Graph, Contribute, Search, Sign In)
  - [ ] 🟥 `/contribute` shows 3 action cards
  - [ ] 🟥 Add Portrayal: search work → search figure → add sentiment → success
  - [ ] 🟥 Add Portrayal with inline creation: create new work → create new figure → add portrayal
  - [ ] 🟥 Add Work: fill form → submit → success with "add portrayal" link
  - [ ] 🟥 Import Creator's Works: search creator → select works → bulk import → success
  - [ ] 🟥 Deep links work: `/contribute/portrayal?work=X` pre-fills work
  - [ ] 🟥 No broken links to deleted routes (`/browse`, `/welcome`, `/explore/coverage`)

---

## Rollback Plan

**If things go wrong:**
1. `git revert` the commits — all changes are frontend-only, no DB schema changes
2. Old wizard code preserved in git history — restore `contribute/page.tsx` from prior commit
3. Deleted routes (`/welcome`, `/browse`, `/explore/coverage`) restorable from git history
4. No API changes needed — backend is unchanged throughout

---

## Success Criteria

- Homepage renders a live, interactive force-directed graph on first load
- Graph nodes are clickable and navigate to entity detail pages
- Navbar has exactly 4 items: Search, Graph, Contribute, Sign In
- No links to `/browse`, `/welcome`, or `/explore/coverage` exist anywhere
- "Add a Portrayal" flow completes in 3 steps (work → figure → sentiment)
- Inline entity creation works without page navigation (create work/figure mid-flow)
- "Add a Work" form includes creator field with autocomplete + inline figure creation
- "Import Creator's Works" reuses existing `CreatorWorksView` bulk importer
- All existing API routes unchanged — zero backend modifications

---

## Out of Scope (For This Plan)

- **Location/era configuration for works**: The old wizard's `SettingsConfirmation` step (locations, eras, unmapped locations) is deferred. Works can be enriched later.
- **Mobile-responsive graph hero**: Graph may not render well on small screens. Acceptable for MVP — can add responsive fallback later.
- **Pathfinder page changes**: `/explore/pathfinder` stays as-is, no modifications.
- **Search page redesign**: `/search` stays as-is. Era/location filters remain.
- **Figure detail page redesign**: Out of scope — separate task (#4 from punch list).
- **Auth-gated contributions**: No login requirement for contributions in MVP.
- **Sentiment tag redesign**: Reuse existing tag picker component as-is.
