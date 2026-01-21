# Feature Implementation Plan: Codebase Audit & Feature Categorization

**Overall Progress:** `0%` (0/12 tasks complete)

**Linear Issue:** [CHR-7](https://linear.app/chronosgraph/issue/CHR-7/audit-codebase-to-identify-well-built-vs-half-baked-features)

---

## TL;DR
Systematically audit the entire ChronosGraph codebase to categorize features as production-ready (keep), half-baked (remove), or promising but unfinished (refactor). This audit will create a clear inventory to guide subsequent cleanup issues and enable more focused, iterative development.

---

## Critical Decisions
- **Audit Methodology**: Manual code review + functionality testing (not automated metrics)
- **Categorization Criteria**:
  - **Keep**: Complete, tested, integrated with auth/data flow, good UX
  - **Remove**: Broken, hardcoded, or minimal value
  - **Refactor**: Core value but needs UX/integration work
- **Documentation Format**: Markdown table with feature name, category, files, and notes
- **Scope**: All pages, components, and API routes in `web-app/`
- **Known Good Features**: Blooming graph explorer, back/reset navigation, authentication system
- **Known Bad Features**: Three bacons graph, "find historical paths" landing section

---

## Implementation Tasks

### Phase 1: Page-Level Audit

- [ ] 🟥 **Task 1.1: Audit Core User Pages**
  - [ ] 🟥 Review `/figure/[id]` - figure detail page with dossier, graph, timeline
  - [ ] 🟥 Review `/search` - universal search functionality
  - [ ] 🟥 Review `/profile` - user profile/auth integration
  - [ ] 🟥 Review `/settings` - user settings page
  - **Files**:
    - `web-app/app/figure/[id]/page.tsx`
    - `web-app/app/search/page.tsx`
    - `web-app/app/profile/page.tsx`
    - `web-app/app/settings/page.tsx`
  - **Notes**: These are high-traffic pages; assess completeness and UX quality

- [ ] 🟥 **Task 1.2: Audit Explore Section**
  - [ ] 🟥 Review `/explore/graph` - main blooming graph explorer (KNOWN GOOD)
  - [ ] 🟥 Review `/explore/pathfinder` - pathfinding feature
  - **Files**:
    - `web-app/app/explore/graph/page.tsx`
    - `web-app/app/explore/pathfinder/page.tsx`
  - **Notes**: Graph explorer is production-ready; pathfinder likely half-baked

- [ ] 🟥 **Task 1.3: Audit Contribution Pages**
  - [ ] 🟥 Review `/contribute/figure` - add historical figure
  - [ ] 🟥 Review `/contribute/media` - add media work
  - [ ] 🟥 Review `/contribute/appearance` - add appearance/portrayal
  - [ ] 🟥 Review `/contribute/creator` - add creator
  - **Files**:
    - `web-app/app/contribute/figure/page.tsx`
    - `web-app/app/contribute/media/page.tsx`
    - `web-app/app/contribute/appearance/page.tsx`
    - `web-app/app/contribute/creator/page.tsx`
  - **Notes**: User mentioned these need deliberate UX redesign (likely REFACTOR category)

- [ ] 🟥 **Task 1.4: Audit Browse/Discovery Pages**
  - [ ] 🟥 Review `/series` - media series browsing
  - [ ] 🟥 Review `/series/[seriesId]` - individual series detail
  - **Files**:
    - `web-app/app/series/page.tsx`
    - `web-app/app/series/[seriesId]/page.tsx`
  - **Notes**: Assess integration with graph explorer and search

### Phase 2: Component-Level Audit

- [ ] 🟥 **Task 2.1: Audit Navigation & Auth Components**
  - [ ] 🟥 Review `Navbar.tsx` - main navigation (KNOWN GOOD - has auth integration)
  - [ ] 🟥 Review `AuthButtons.tsx` - sign in/out buttons
  - [ ] 🟥 Review `AuthProvider.tsx` - NextAuth integration
  - **Files**:
    - `web-app/components/Navbar.tsx`
    - `web-app/components/AuthButtons.tsx`
    - `web-app/components/AuthProvider.tsx`
  - **Notes**: Authentication is production-ready per user

- [ ] 🟥 **Task 2.2: Audit Graph & Visualization Components**
  - [ ] 🟥 Review `GraphExplorer.tsx` - blooming graph (KNOWN GOOD)
  - [ ] 🟥 Review `FigureDossier.tsx` - figure detail cards
  - [ ] 🟥 Review `MediaTimeline.tsx` - timeline visualization
  - [ ] 🟥 Review `HistoricityBadge.tsx` - historicity indicators
  - **Files**:
    - `web-app/components/GraphExplorer.tsx`
    - `web-app/components/FigureDossier.tsx`
    - `web-app/components/MediaTimeline.tsx`
    - `web-app/components/HistoricityBadge.tsx`
  - **Notes**: Graph explorer and back/reset navigation are production-ready

- [ ] 🟥 **Task 2.3: Audit Conflict Resolution Components**
  - [ ] 🟥 Review `ConflictFeed.tsx` - conflict display feed
  - [ ] 🟥 Review `ConflictRadar.tsx` - conflict visualization
  - **Files**:
    - `web-app/components/ConflictFeed.tsx`
    - `web-app/components/ConflictRadar.tsx`
  - **Notes**: User mentioned these need deliberate UX redesign (likely REFACTOR category)

- [ ] 🟥 **Task 2.4: Audit Search & Input Components**
  - [ ] 🟥 Review `SearchInput.tsx` - generic search input
  - [ ] 🟥 Review `FigureSearchInput.tsx` - figure-specific search
  - [ ] 🟥 Review `PathQueryInterface.tsx` - historical path finder (KNOWN BAD - to remove)
  - **Files**:
    - `web-app/components/SearchInput.tsx`
    - `web-app/components/FigureSearchInput.tsx`
    - `web-app/components/PathQueryInterface.tsx`
  - **Notes**: PathQueryInterface is confirmed for removal

- [ ] 🟥 **Task 2.5: Audit Contribution Form Components**
  - [ ] 🟥 Review `AddAppearanceForm.tsx` - appearance submission form
  - **Files**: `web-app/components/AddAppearanceForm.tsx`
  - **Notes**: Part of contribution flow needing redesign

### Phase 3: API Route Audit

- [ ] 🟥 **Task 3.1: Audit Core API Routes**
  - [ ] 🟥 Review `/api/graph/[id]` - fetch graph node
  - [ ] 🟥 Review `/api/graph/expand/[id]` - expand graph neighborhood
  - [ ] 🟥 Review `/api/figures/search` - figure search
  - [ ] 🟥 Review `/api/search/universal` - universal search
  - [ ] 🟥 Review `/api/auth/[...nextauth]` - NextAuth routes (KNOWN GOOD)
  - **Files**:
    - `web-app/app/api/graph/[id]/route.ts`
    - `web-app/app/api/graph/expand/[id]/route.ts`
    - `web-app/app/api/figures/search/route.ts`
    - `web-app/app/api/search/universal/route.ts`
    - `web-app/app/api/auth/[...nextauth]/route.ts`
  - **Notes**: Graph and auth APIs likely production-ready

- [ ] 🟥 **Task 3.2: Audit Media Work API Routes**
  - [ ] 🟥 Review `/api/media/create` - create media work
  - [ ] 🟥 Review `/api/media/search` - search media works
  - [ ] 🟥 Review `/api/media/check-existing` - check for duplicates
  - [ ] 🟥 Review `/api/media/link-series` - link to series
  - [ ] 🟥 Review `/api/media/series/[id]` - series by ID
  - **Files**:
    - `web-app/app/api/media/create/route.ts`
    - `web-app/app/api/media/search/route.ts`
    - `web-app/app/api/media/check-existing/route.ts`
    - `web-app/app/api/media/link-series/route.ts`
    - `web-app/app/api/media/series/[id]/route.ts`
  - **Notes**: Assess MediaWork Ingestion Protocol compliance from CLAUDE.md

- [ ] 🟥 **Task 3.3: Audit Browse & Discovery API Routes**
  - [ ] 🟥 Review `/api/browse/locations-and-eras` - location/era browsing
  - [ ] 🟥 Review `/api/browse/locations` - locations list
  - [ ] 🟥 Review `/api/browse/location/[location_id]` - location detail
  - [ ] 🟥 Review `/api/browse/eras` - eras list
  - [ ] 🟥 Review `/api/browse/era/[era_id]` - era detail
  - [ ] 🟥 Review `/api/browse/search` - browse search
  - **Files**:
    - `web-app/app/api/browse/locations-and-eras/route.ts`
    - `web-app/app/api/browse/locations/route.ts`
    - `web-app/app/api/browse/location/[location_id]/route.ts`
    - `web-app/app/api/browse/eras/route.ts`
    - `web-app/app/api/browse/era/[era_id]/route.ts`
    - `web-app/app/api/browse/search/route.ts`
  - **Notes**: Assess if this browse UI exists and is functional

- [ ] 🟥 **Task 3.4: Audit Contribution & Integration API Routes**
  - [ ] 🟥 Review `/api/contribution/appearance` - submit appearance
  - [ ] 🟥 Review `/api/pathfinder` - pathfinding algorithm
  - [ ] 🟥 Review `/api/wikidata/by-creator` - Wikidata integration
  - [ ] 🟥 Review `/api/series/browse` - series browsing
  - [ ] 🟥 Review `/api/series/[seriesId]` - series by ID
  - **Files**:
    - `web-app/app/api/contribution/appearance/route.ts`
    - `web-app/app/api/pathfinder/route.ts`
    - `web-app/app/api/wikidata/by-creator/route.ts`
    - `web-app/app/api/series/browse/route.ts`
    - `web-app/app/api/series/[seriesId]/route.ts`
  - **Notes**: Pathfinder API likely half-baked; Wikidata integration critical for MediaWork protocol

### Phase 4: Documentation & Categorization

- [ ] 🟥 **Task 4.1: Compile Audit Results**
  - [ ] 🟥 Create feature inventory table with columns: Feature, Category (Keep/Remove/Refactor), Files, Notes
  - [ ] 🟥 Categorize all pages based on review findings
  - [ ] 🟥 Categorize all components based on review findings
  - [ ] 🟥 Categorize all API routes based on review findings
  - **Files**: `.plans/codebase-audit-results.md` (new)
  - **Notes**: Use KEEP/REMOVE/REFACTOR categories consistently

- [ ] 🟥 **Task 4.2: Create Cleanup Roadmap**
  - [ ] 🟥 List all features marked REMOVE with file paths
  - [ ] 🟥 List all features marked REFACTOR with specific UX/integration issues
  - [ ] 🟥 Identify dependencies between features (what can be removed safely)
  - [ ] 🟥 Propose cleanup sequence (remove, then refactor, then polish)
  - **Files**: `.plans/codebase-audit-results.md` (append)
  - **Notes**: This roadmap informs CHR-8, CHR-9, CHR-10, CHR-11

---

## Rollback Plan

**If audit reveals unexpected complexity:**
1. Document findings as-is without attempting fixes
2. Create additional Linear issues for newly discovered problems
3. Consult with user on prioritization before proceeding to cleanup

**This is a research task with no code changes, so rollback is not applicable.**

---

## Success Criteria

✅ Every page in `web-app/app/` has been reviewed and categorized
✅ Every component in `web-app/components/` has been reviewed and categorized
✅ Every API route in `web-app/app/api/` has been reviewed and categorized
✅ Audit results documented in `.plans/codebase-audit-results.md`
✅ Clear inventory of KEEP/REMOVE/REFACTOR features with file paths
✅ Cleanup roadmap created with sequenced next steps
✅ Known good features confirmed: blooming graph, back/reset navigation, authentication
✅ Known bad features confirmed: three bacons, pathfinder landing section
✅ Dependencies between features documented (safe removal order)

---

## Out of Scope (For This Audit)

- Actually removing or refactoring features (handled by CHR-8, CHR-9, CHR-10, CHR-11)
- Writing new code or fixing bugs discovered during audit
- Performance optimization or security review
- Backend Python scripts audit (focus is on `web-app/` only)
- Database schema review
- Testing or QA processes

---

## Deliverable Template

**File:** `.plans/codebase-audit-results.md`

```markdown
# ChronosGraph Codebase Audit Results
**Date:** [completion date]
**Linear Issue:** CHR-7

## Summary
[1-2 paragraph overview of findings]

## Feature Inventory

### Pages

| Feature | Category | Files | Notes |
|---------|----------|-------|-------|
| Blooming Graph Explorer | KEEP | `web-app/app/explore/graph/page.tsx` | Production-ready, good UX, core feature |
| Figure Detail Page | KEEP/REFACTOR | `web-app/app/figure/[id]/page.tsx` | Core feature but may need conflict UI refinement |
| ... | ... | ... | ... |

### Components

| Component | Category | Files | Notes |
|-----------|----------|-------|-------|
| GraphExplorer | KEEP | `web-app/components/GraphExplorer.tsx` | Production-ready blooming graph |
| PathQueryInterface | REMOVE | `web-app/components/PathQueryInterface.tsx` | Half-baked, slated for removal (CHR-9) |
| ... | ... | ... | ... |

### API Routes

| Endpoint | Category | Files | Notes |
|----------|----------|-------|-------|
| /api/auth/[...nextauth] | KEEP | `web-app/app/api/auth/[...nextauth]/route.ts` | Production-ready authentication |
| /api/pathfinder | REMOVE | `web-app/app/api/pathfinder/route.ts` | Supports removed PathQueryInterface |
| ... | ... | ... | ... |

## Cleanup Roadmap

### Phase 1: Remove Half-Baked Features (CHR-8, CHR-9)
1. Remove PathQueryInterface component and landing page integration
2. Remove /api/pathfinder route
3. Remove three bacons verification script
4. [Other features marked REMOVE]

### Phase 2: Refactor Promising Features (CHR-10, CHR-11)
1. Redesign content addition flows (contribute pages)
2. Redesign conflict display components
3. [Other features marked REFACTOR]

### Phase 3: Integration & Polish
1. Ensure navigation flows work with reduced feature set
2. Update landing page to highlight production-ready features
3. Remove dead links and unused components

## Dependencies

- PathQueryInterface removal is safe (no reverse dependencies found)
- Conflict components used by FigureDossier (refactor, don't remove)
- Contribution forms used by contribute pages (refactor together)

## Recommendations

[Specific recommendations based on findings]
```

---

## Notes

- This audit is purely investigative; no code changes will be made
- Focus on user-facing quality, not code quality metrics
- When in doubt, categorize as REFACTOR (preserve optionality)
- Document surprising findings or hidden complexity
- Flag any security issues discovered (create separate urgent issues)
