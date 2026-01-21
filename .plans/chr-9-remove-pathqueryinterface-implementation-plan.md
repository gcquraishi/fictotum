# Feature Implementation Plan: Remove "Find Historical Paths" from Landing Page

**Overall Progress:** `0%` (0/3 tasks complete)

**Linear Issue:** [CHR-9](https://linear.app/chronosgraph/issue/CHR-9/remove-find-historical-paths-section-from-landing-page)

---

## TL;DR
Remove the PathQueryInterface component ("Get me from X to Z by way of Y") from the landing page dashboard. This half-baked feature clutters the dashboard and distracts from the core GraphExplorer. The pathfinder functionality remains available at `/explore/pathfinder` for users who want it.

---

## Critical Decisions
- **Remove from landing page only**: PathQueryInterface component deleted, but `/api/pathfinder` endpoint and `/explore/pathfinder` page remain functional
- **Preserve pathfinder page**: The `/explore/pathfinder` page (marked REFACTOR in audit) is kept and remains accessible via Navbar
- **ConflictFeed untouched**: ConflictFeed component also uses `/api/pathfinder` but is not modified in this cleanup (separate refactor in CHR-11)
- **Focus on dashboard cleanup**: Landing page becomes graph-first without the confusing three-field query interface
- **API endpoint stays**: `/api/pathfinder` remains because it's used by `/explore/pathfinder` page and ConflictFeed component

---

## Implementation Tasks

### Phase 1: Remove PathQueryInterface from Landing Page

- [ ] 🟥 **Task 1.1: Remove PathQueryInterface component file**
  - [ ] 🟥 Delete `web-app/components/PathQueryInterface.tsx` (226 lines)
  - **Files**: `web-app/components/PathQueryInterface.tsx` (DELETE)
  - **Notes**: Component is only imported in `web-app/app/page.tsx` (dashboard); safe to delete

- [ ] 🟥 **Task 1.2: Update dashboard to remove PathQueryInterface**
  - [ ] 🟥 Remove PathQueryInterface import from `web-app/app/page.tsx`
  - [ ] 🟥 Remove PathQueryInterface JSX section (lines 42-51, the "Above Graph" section)
  - [ ] 🟥 Verify GraphExplorer remains as primary/only feature on dashboard
  - **Files**: `web-app/app/page.tsx` (EDIT)
  - **Dependencies**: Task 1.1 must complete first (remove import target)
  - **Notes**: Dashboard is already importing and using GraphExplorer; we're just removing the PathQueryInterface clutter above it

### Phase 2: Verify Related Features Still Work

- [ ] 🟥 **Task 2.1: Verify pathfinder page still works**
  - [ ] 🟥 Manually test `/explore/pathfinder` page loads correctly
  - [ ] 🟥 Test pathfinder query functionality (uses same `/api/pathfinder` endpoint)
  - [ ] 🟥 Verify Navbar "Analyze" dropdown still links to pathfinder page
  - **Files**: No code changes (verification only)
  - **Notes**: Pathfinder page at `/explore/pathfinder` uses the same API endpoint; ensure it's unaffected by component deletion

---

## Rollback Plan

**If things go wrong:**

1. **Restore PathQueryInterface component**:
   ```bash
   git checkout HEAD -- web-app/components/PathQueryInterface.tsx
   ```

2. **Restore dashboard imports and JSX**:
   ```bash
   git checkout HEAD -- web-app/app/page.tsx
   ```

3. **Verify dashboard renders correctly**:
   ```bash
   # Check localhost:3000 shows both PathQueryInterface and GraphExplorer
   ```

---

## Success Criteria

✅ `web-app/components/PathQueryInterface.tsx` deleted
✅ Dashboard (`web-app/app/page.tsx`) no longer imports PathQueryInterface
✅ Dashboard no longer renders PathQueryInterface JSX (lines 42-51 removed)
✅ Dashboard still shows GraphExplorer as primary feature
✅ `/explore/pathfinder` page still works correctly (uses `/api/pathfinder`)
✅ Navbar "Analyze" dropdown still has link to Pathfinder page
✅ `/api/pathfinder` endpoint remains functional (used by pathfinder page and ConflictFeed)
✅ No broken imports or missing component errors
✅ Dashboard is cleaner and more focused on graph exploration

---

## Out of Scope (For This Plan)

- **Pathfinder page removal**: `/explore/pathfinder` stays (marked REFACTOR, not REMOVE in CHR-7 audit)
- **API endpoint removal**: `/api/pathfinder` stays (used by pathfinder page and ConflictFeed)
- **Navbar updates**: Not removing Pathfinder link from "Analyze" dropdown (page still exists)
- **ConflictFeed refactor**: Component uses `/api/pathfinder` but is separate work (CHR-11)
- **Pathfinder UX improvements**: Not redesigning the `/explore/pathfinder` page (future work)
- **Alternative pathfinding UI**: Not building a replacement interface

---

## Technical Context

### What is PathQueryInterface?
A three-field search interface ("Get me from X to Z by way of Y") that allows users to find connection paths between historical figures by specifying:
1. **From**: Starting figure
2. **Via**: Intermediate figure
3. **To**: Destination figure

The component makes two `/api/pathfinder` calls (FROM→VIA and VIA→TO) and merges the results.

### Why Remove It from Landing Page?
1. **Clutters dashboard**: Distracts from the primary GraphExplorer feature
2. **Half-baked UX**: Three-field interface is confusing for new users
3. **Better home exists**: Same functionality available at `/explore/pathfinder` page
4. **Audit recommendation**: Marked REMOVE in codebase audit (CHR-7)
5. **User confirmed**: User explicitly requested removal (Linear CHR-9)

### What We're Removing
- **PathQueryInterface component**: `web-app/components/PathQueryInterface.tsx` (226 lines)
- **Dashboard integration**: PathQueryInterface JSX and import from `web-app/app/page.tsx`

### What We're Keeping
- **Pathfinder page**: `/explore/pathfinder` page remains functional (different UI, same API)
- **Pathfinder API**: `/api/pathfinder` endpoint stays (used by pathfinder page and ConflictFeed)
- **Navbar link**: "Analyze → Pathfinder" link stays in navbar
- **ConflictFeed**: Component also uses `/api/pathfinder` but is untouched (separate refactor)

### Component Usage Analysis
**Before removal:**
- `PathQueryInterface.tsx` imported by: `web-app/app/page.tsx` (landing page only)
- `/api/pathfinder` called by:
  1. `PathQueryInterface.tsx` (being removed)
  2. `/explore/pathfinder/page.tsx` (staying)
  3. `ConflictFeed.tsx` (staying, separate refactor in CHR-11)

**After removal:**
- `PathQueryInterface.tsx` deleted
- `/api/pathfinder` still called by:
  1. `/explore/pathfinder/page.tsx` ✅
  2. `ConflictFeed.tsx` ✅

---

## File Structure After Cleanup

```
web-app/
├── app/
│   ├── page.tsx  # EDITED (removed PathQueryInterface, graph-focused now)
│   └── explore/
│       └── pathfinder/
│           └── page.tsx  # UNCHANGED (still uses /api/pathfinder)
├── components/
│   ├── (PathQueryInterface.tsx DELETED)
│   ├── ConflictFeed.tsx  # UNCHANGED (uses /api/pathfinder, refactor in CHR-11)
│   └── GraphExplorer.tsx  # UNCHANGED (primary feature on dashboard)
└── app/api/
    └── pathfinder/
        └── route.ts  # UNCHANGED (used by pathfinder page and ConflictFeed)
```

---

## Testing Checklist

**Before starting:**
- [ ] Verify dashboard currently shows PathQueryInterface above GraphExplorer
- [ ] Confirm `/explore/pathfinder` page is accessible from Navbar
- [ ] Test `/api/pathfinder` endpoint works (via pathfinder page)

**After Phase 1 (remove from landing page):**
- [ ] Dashboard loads without errors
- [ ] Dashboard shows only GraphExplorer (no PathQueryInterface)
- [ ] No console errors about missing PathQueryInterface component
- [ ] No broken imports in `web-app/app/page.tsx`

**After Phase 2 (verify related features):**
- [ ] `/explore/pathfinder` page loads correctly
- [ ] Pathfinder page query functionality works (FROM → TO pathfinding)
- [ ] Navbar "Analyze" dropdown still has Pathfinder link
- [ ] `/api/pathfinder` endpoint responds correctly (test via pathfinder page)

**Final verification:**
- [ ] Dashboard is cleaner and more focused on graph
- [ ] PathQueryInterface component is deleted
- [ ] Pathfinder feature still accessible via dedicated page
- [ ] No broken functionality in pathfinder page or ConflictFeed
- [ ] `git status` shows clean deletion and edit

---

## Notes

- **Minimal scope**: Only removing from landing page; pathfinder functionality remains available at `/explore/pathfinder`
- **API stays**: `/api/pathfinder` endpoint is shared by multiple features, so it stays
- **Dashboard focus**: Landing page becomes graph-first, highlighting ChronosGraph's core strength
- **Future work**: Pathfinder page marked REFACTOR in audit (improve UX later, don't remove)
- **Audit context**: Part of CHR-7 cleanup roadmap to focus on well-built features
- **Clean separation**: PathQueryInterface removal doesn't affect pathfinder page or ConflictFeed
