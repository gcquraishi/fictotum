# ChronosGraph Product Roadmap
*Last updated: 2026-02-02*

---

## Quick Resume

**Starting a new session?** Use this prompt:

> Read PRODUCT_ROADMAP.md and pick up where we left off. What's the next session I should work on?

---

## Vision

ChronosGraph is a knowledge graph exploring how historical figures have been portrayed across media (film, TV, books, games). Users discover connections between figures, analyze portrayal sentiment, and contribute new data.

## Current State (February 2026)

**Core Features Complete:**
- Graph visualization with bloom exploration (expand/collapse nodes)
- Advanced navigation (breadcrumbs, forward/back, keyboard shortcuts)
- Figure detail pages with enhanced sentiment timeline
- MediaWork catalog with Wikidata integration
- Unified contribution hub (`/contribute`)
- Entity resolution with Wikidata Q-IDs and duplicate detection
- Provenance tracking with CREATED_BY relationships (100% coverage)
- Automated weekly health monitoring via GitHub Actions

**Database:** ~795 HistoricalFigures, ~708 MediaWorks, ~680 APPEARS_IN relationships

---

## Phase 1: Core UX Polish (Current)
*Goal: Make the existing features delightful before adding new ones*

### 1.1 Navbar Redesign ✅
**Priority:** HIGH | **Status:** Complete (2026-01-29) | **Flight Plan:** `docs/planning/FLIGHT_PLAN_NAVBAR_REDESIGN_OPTION2.md`

Replace ad-hoc navigation with a proper navbar supporting dropdowns and mobile responsiveness.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 1.1.1 | ✅ | Create `Navbar.tsx` component with logo and basic links | Working navbar in layout |
| 1.1.2 | ✅ | Add Contribute/Analyze dropdown menus | Dropdown navigation works |
| 1.1.3 | ✅ | Add auth-conditional Account menu | Login/logout integrated |
| 1.1.4 | ✅ | Mobile responsive hamburger menu | Works on all viewports |

**Note:** Contribute is a single link (not dropdown) due to unified contribution hub architecture at `/contribute`.

### 1.2 Universal Search ✅
**Priority:** HIGH | **Status:** Complete (2026-01-29) | **Flight Plan:** `docs/planning/FLIGHT_PLAN_UNIVERSAL_SEARCH.md`

Single search bar finding figures, media, creators, actors, series, locations, and eras.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 1.2.1 | ✅ | Create `/api/search/universal` endpoint | API returns mixed results (7 categories) |
| 1.2.2 | ✅ | Update `SearchInput.tsx` to use universal endpoint | Grouped search results UI |
| 1.2.3 | ✅ | Add actor search (schema update for `actor_name` on APPEARS_IN) | Actors searchable |
| 1.2.4 | ✅ | Wire search into navbar | Search accessible globally |

### 1.3 Landing Page Refinement ✅
**Priority:** MEDIUM | **Status:** Complete (2026-01-29) | **Flight Plan:** `docs/planning/LANDING_PAGE_REDESIGN.md`

The landing page now features path query with graph highlighting and autocomplete.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 1.3.1 | ✅ | Wire path query inputs to Neo4j pathfinding Cypher | Query returns paths |
| 1.3.2 | ✅ | Highlight discovered path in graph visualization | Path visually distinct |
| 1.3.3 | ✅ | Add autocomplete for figure names | Typeahead suggestions |

**Note:** Autocomplete was already implemented via FigureSearchInput component with `/api/figures/search` endpoint.

---

## Phase 2: Data Quality & Provenance
*Goal: Track who created what and maintain data integrity*

### 2.1 CREATED_BY Relationship ✅
**Priority:** MEDIUM | **Status:** Complete (2026-02-02) | **Flight Plan:** `docs/planning/FLIGHT_PLAN_CREATED_BY.md`

Track which agent/user created each node for audit trail.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 2.1.1 | ✅ | Add Agent node type and CREATED_BY relationship to schema | Schema updated |
| 2.1.2 | ✅ | Run migration to tag existing nodes (backfilled 299 relationships) | 100% provenance coverage |
| 2.1.3 | ✅ | Update contribution APIs to set CREATED_BY on new nodes | New data tracked |
| 2.1.4 | ✅ | Weekly health check automation via GitHub Actions | Automated monitoring |

### 2.2 Duplicate Detection Dashboard ✅
**Priority:** LOW | **Status:** Complete (2026-02-01, refactored 2026-02-02)

Surface potential duplicate figures for manual review.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 2.2.1 | ✅ | Create API endpoint finding high-similarity figure pairs | `/api/audit/duplicates` with phonetic matching |
| 2.2.2 | ✅ | Build review UI listing potential duplicates | `/admin/duplicates` with filters |
| 2.2.3 | ✅ | Add merge + dismiss actions to consolidate duplicates | `/api/audit/duplicates/merge` with audit trail |

**Note:** Refactored Feb 2 to use shared `name-matching.ts` utility for consistency.

---

## Phase 3: Graph Exploration Enhancements ✅
*Goal: Make deep graph exploration more intuitive*

### 3.1 Bloom Phase 3 (Polish) ✅
**Priority:** LOW | **Status:** Complete (2026-02-02)

Additional navigation conveniences.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 3.1.1 | ✅ | Add breadcrumb trail showing exploration path | Visual path history with truncation |
| 3.1.2 | ✅ | Add forward navigation (if back was used) | Can navigate forward through history |
| 3.1.3 | ✅ | Keyboard shortcuts (←/B, →/F, R, Esc, ?/H) | Power user controls with help modal |

### 3.2 Figure Detail Page Polish ✅
**Priority:** LOW | **Status:** Complete (2026-02-02)

Enhance individual figure pages.

| Session | Status | Scope | Deliverable |
|---------|--------|-------|-------------|
| 3.2.1 | ✅ | Add "Explore in Graph" button with smooth scroll | Entry point from figure with visual feedback |
| 3.2.2 | ✅ | Enhanced sentiment timeline with decade grouping | Temporal visualization + trend detection |

---

## Phase 4: Scale & Community (Future)
*Goal: Support growth beyond single-user contribution*

### 4.1 Bulk Data Ingestion
- Batch import from curated JSON files
- Scheduled Wikidata sync for canonical records

### 4.2 Multi-User Contributions
- Edit history tracking
- Attribution on contributions
- Review queue for community edits

### 4.3 Performance at Scale (10k+ entities)
- Vector semantic search
- Query caching
- Database indexing audit

---

## How to Use This Roadmap

### Starting a Session
1. Pick a session from Phase 1 (highest priority) or whatever feels right
2. Create an implementation plan in `.plans/` if the session is complex
3. Update STATUS_BOARD.md with what you're working on
4. Work for ~1 hour on the scoped deliverable

### After a Session
1. Commit your changes with a descriptive message
2. Update this roadmap if priorities shifted
3. Add a handoff note to STATUS_BOARD.md

### Creating New Work
- For bugs/quick fixes: Just do them
- For features taking >1 hour: Add to this roadmap first
- For exploratory work: Start with a flight plan in `docs/planning/`

---

## Quick Reference

| What | Where |
|------|-------|
| Active implementation plans | `.plans/` |
| Completed plans | `.plans/archive/` |
| Feature concepts | `docs/planning/` |
| Session coordination | `docs/STATUS_BOARD.md` |
| Feature changelog | `CHANGELOG.md` |
| Development guidelines | `CLAUDE.md` |

---

## Session Suggestions by Time Available

**30 minutes:** Fix a bug, improve error handling, add a test

**1 hour:** Complete one roadmap session (e.g., 1.1.1, 1.2.1)

**2+ hours:** Complete a full feature subsection (e.g., all of 1.1)
