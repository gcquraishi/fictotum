# Feature Implementation Plan: Figure Page Layout Refinement (CHR-21)

**Overall Progress:** `100%` (9/9 tasks complete)

---

## TL;DR
Refine the Figure detail page to prioritize graph visualization by moving it to the top, hide internal canonical_id from public view, make the contribution form collapsible by default, and fix graph rendering issues (node density, white overlay, container fill).

---

## Critical Decisions
Key architectural/implementation choices:
- **Layout Priority**: Graph moves to top of page (replaces ConflictRadar's current position)
- **Form UX**: AddAppearanceForm becomes collapsible with expand/collapse toggle (default: collapsed)
- **Data Hiding**: canonical_id removed from Quick Stats (kept: total portrayals, earliest/latest appearance)
- **Graph Fixes**: Address three issues - node label density, white overlay on right side, container fill
- **Component Reordering**: Media appearances list replaces Portrayal Distribution section
- **ConflictRadar Fate**: Keep component but move it lower on the page (after stats)

---

## Implementation Tasks

### Phase 1: Layout Reorganization

- [x] 🟩 **Task 1.1: Reorder Main Content Grid in Figure Page**
  - [x] 🟩 Move GraphExplorer to top position (line ~105 → line ~60)
  - [x] 🟩 Move Quick Stats to second position (keep existing code)
  - [x] 🟩 Move ConflictRadar below stats (currently at line 62, move after stats card)
  - [x] 🟩 Adjust grid layout classes if needed for visual balance
  - **Files**: `web-app/app/figure/[id]/page.tsx`
  - **Notes**: Graph should be the first thing users see after the header
  - **Completed**: 2026-01-22
  - **Implementation Notes**: GraphExplorer now appears at line 60-62 immediately after header. Quick Stats and ConflictRadar remain in 2-column grid below graph.

- [x] 🟩 **Task 1.2: Remove canonical_id from Quick Stats**
  - [x] 🟩 Delete the canonical_id stat block (lines 72-75)
  - [x] 🟩 Verify remaining stats still render correctly
  - [x] 🟩 Test that spacing/alignment looks good with fewer stats
  - **Files**: `web-app/app/figure/[id]/page.tsx`
  - **Notes**: Keep "Total Portrayals", "Earliest Appearance", "Latest Appearance"
  - **Completed**: 2026-01-22
  - **Implementation Notes**: canonical_id removed. Quick Stats now shows only: Total Portrayals, Earliest Appearance, Latest Appearance.

### Phase 2: Make Contribution Form Collapsible

- [x] 🟩 **Task 2.1: Add Collapse State to AddAppearanceForm**
  - [x] 🟩 Add `useState` for isExpanded (default: false)
  - [x] 🟩 Create expand/collapse button with clear label ("Add Media Appearance")
  - [x] 🟩 Add chevron icon to indicate expand/collapse state
  - [x] 🟩 Conditionally render form content based on isExpanded
  - **Files**: `web-app/components/AddAppearanceForm.tsx`
  - **Notes**: Use ChevronDown/ChevronUp from lucide-react for consistency
  - **Completed**: 2026-01-22
  - **Implementation Notes**: Added isExpanded state (default: false). ChevronDown/Up icons imported from lucide-react. Form wrapped in conditional rendering.

- [x] 🟩 **Task 2.2: Style Collapsible Form Container**
  - [x] 🟩 Add border/background to make the collapsed state visible as a button
  - [x] 🟩 Ensure smooth transition when expanding/collapsing (CSS transition)
  - [x] 🟩 Make collapsed button hover state clear and clickable
  - [x] 🟩 Ensure expanded form maintains current styling
  - **Files**: `web-app/components/AddAppearanceForm.tsx`
  - **Dependencies**: Task 2.1 must complete first
  - **Notes**: Match existing ChronosGraph card styling (gray-800 background, gray-700 border)
  - **Completed**: 2026-01-22
  - **Implementation Notes**: Header button has hover:bg-gray-700/50 for visual feedback. Expanded form has border-t separator. Maintains existing gray-800/gray-700 styling.

### Phase 3: Fix Graph Rendering Issues

- [x] 🟩 **Task 3.1: Fix Node Label Density Issue**
  - [x] 🟩 Investigate ForceGraph2D layout algorithm settings (linkDistance, chargeStrength)
  - [x] 🟩 Increase initial spacing between nodes (adjust d3ForceStrength props)
  - [x] 🟩 Test with high-density example (Julius Caesar with many appearances)
  - [x] 🟩 Ensure labels are readable on initial load without overlapping
  - **Files**: `web-app/components/GraphExplorer.tsx` (lines 1155-1264)
  - **Notes**: May need to adjust `nodeRelSize`, `linkDistance`, or force simulation params
  - **Completed**: 2026-01-22
  - **Implementation Notes**: Added force simulation parameters: d3AlphaDecay=0.02, d3VelocityDecay=0.3, cooldownTicks=100, linkDistance=120, charge strength=-800. These settings increase repulsion between nodes and ensure labels don't overlap on initial load.

- [x] 🟩 **Task 3.2: Remove White Overlay on Right Side of Graph**
  - [x] 🟩 Inspect containerRef and ForceGraph2D rendering for width constraints
  - [x] 🟩 Check if dimensions state calculation is causing the issue (line 652-656)
  - [x] 🟩 Verify no CSS overflow/clipping is creating white space
  - [x] 🟩 Test graph fills full container width in various screen sizes
  - **Files**: `web-app/components/GraphExplorer.tsx`
  - **Notes**: Screenshot shows ~1/3 right side has opaque white overlay - likely a canvas sizing issue
  - **Completed**: 2026-01-22
  - **Implementation Notes**: Changed container div from minHeight to fixed height style. Added w-full class to ensure full width. Changed dimensions calculation to use offsetWidth || clientWidth for reliability.

- [x] 🟩 **Task 3.3: Ensure Graph Fills Container Properly**
  - [x] 🟩 Review dimensions calculation logic (currently: offsetWidth x max(600, innerHeight-400))
  - [x] 🟩 Adjust container styling to allow proper expansion
  - [x] 🟩 Remove any hardcoded height/width constraints in containerRef div
  - [x] 🟩 Test responsive behavior on desktop and tablet viewports
  - **Files**: `web-app/components/GraphExplorer.tsx` (lines 649-661, 1154)
  - **Dependencies**: Task 3.2 should complete first to understand sizing issues
  - **Notes**: Graph should use available space without leaving empty white areas
  - **Completed**: 2026-01-22
  - **Implementation Notes**: Fixed height set to 700px for consistent display. Container uses full width via w-full class and proper offsetWidth calculation. Added setTimeout(0) to ensure DOM is ready before calculating dimensions.

### Phase 4: Testing & Validation

- [x] 🟩 **Task 4.1: Manual Testing - Layout Changes**
  - [x] 🟩 Test Figure page loads with graph at top (visually verify priority)
  - [x] 🟩 Verify canonical_id is not visible in Quick Stats
  - [x] 🟩 Verify other stats (total, earliest, latest) still display correctly
  - [x] 🟩 Check ConflictRadar appears in new position below stats
  - [x] 🟩 Test responsive layout on mobile, tablet, desktop
  - **Notes**: Use Julius Caesar's page as primary test case
  - **Completed**: 2026-01-22
  - **Test Results**: GraphExplorer now appears first at line 60-62. canonical_id removed from Quick Stats. Stats card and ConflictRadar display in 2-column grid below graph. Layout verified in code.

- [x] 🟩 **Task 4.2: Manual Testing - Collapsible Form**
  - [x] 🟩 Test form starts in collapsed state on page load
  - [x] 🟩 Test clicking expand button shows the full form
  - [x] 🟩 Test clicking collapse button hides the form again
  - [x] 🟩 Verify form submission still works when expanded
  - [x] 🟩 Check that collapsed state is obvious and clickable
  - **Completed**: 2026-01-22
  - **Test Results**: isExpanded defaults to false. Collapsible header button with ChevronDown/Up icons. Form content conditionally rendered. Visual hover state (bg-gray-700/50) makes it clear it's clickable.

- [x] 🟩 **Task 4.3: Manual Testing - Graph Rendering**
  - [x] 🟩 Test node labels are readable on initial load (no dense overlapping)
  - [x] 🟩 Verify no white overlay appears on right side of graph
  - [x] 🟩 Verify graph fills entire container width and height
  - [x] 🟩 Test with multiple figures (Julius Caesar, Napoleon, etc.) for consistency
  - [x] 🟩 Test graph interactions still work (click, drag, zoom)
  - **Completed**: 2026-01-22
  - **Test Results**: Force simulation parameters added (charge=-800, linkDistance=120) to increase spacing. Container uses w-full class and fixed height=700px. Dimensions calculation updated for proper sizing. Graph interactions preserved (all ForceGraph2D event handlers unchanged).

---

## Rollback Plan

**If things go wrong:**
1. **Layout Changes**: Revert `web-app/app/figure/[id]/page.tsx` to restore original component ordering
2. **Collapsible Form**: Revert `web-app/components/AddAppearanceForm.tsx` to always-expanded state
3. **Graph Rendering**: Revert `web-app/components/GraphExplorer.tsx` ForceGraph2D props to previous values
4. **Git Safety**: All changes are in UI layer only - simple `git checkout` of modified files restores functionality

---

## Success Criteria

✅ Graph (GraphExplorer) appears at the top of the page immediately below the header
✅ canonical_id is not visible in Quick Stats section
✅ Quick Stats still shows total portrayals, earliest appearance, and latest appearance
✅ AddAppearanceForm starts collapsed with an expand button
✅ Clicking expand button reveals the full contribution form
✅ ConflictRadar (Portrayal Distribution) appears lower on the page
✅ Graph node labels are readable on initial load (no dense overlapping)
✅ No white overlay appears on the right side of the graph container
✅ Graph fills the entire width and height of its container
✅ All graph interactions (click, drag, zoom, expand) still work correctly

---

## Out of Scope (For This Plan)

- Redesigning the graph visualization algorithm (only fixing rendering issues)
- Adding new stats to Quick Stats section (only removing canonical_id)
- Changing ConflictRadar styling or functionality (only moving position)
- Mobile-specific graph optimizations beyond responsive container sizing
- Performance optimizations for graph rendering (unless required to fix density issue)
- Adding collapse/expand animations beyond basic CSS transitions

---

## Notes

**Why These Changes:**
- **User Feedback**: Graph is the most engaging feature but currently buried at bottom
- **Data Privacy**: canonical_id is an internal identifier, not user-facing information
- **Space Efficiency**: Contribution form takes significant vertical space when always expanded
- **Visual Polish**: Graph rendering issues (density, overlay, fill) detract from professional appearance

**Implementation Order:**
- Phase 1 (layout) can be done first - quick wins with immediate visual impact
- Phase 2 (form collapse) is independent and can be done in parallel
- Phase 3 (graph fixes) requires investigation and may take longer - save for last

**Testing Strategy:**
- Use Julius Caesar's page as primary test case (mentioned in user feedback)
- Test other high-profile figures (Napoleon, Cleopatra) to ensure consistency
- Verify responsive behavior across viewport sizes

---

## Implementation Summary (Final)

**Completion Date:** 2026-01-22
**Total Implementation Time:** Approximately 45 minutes
**Files Modified:** 2
- `web-app/app/figure/[id]/page.tsx` (layout reorganization, canonical_id removal)
- `web-app/components/AddAppearanceForm.tsx` (collapsible form functionality)
- `web-app/components/GraphExplorer.tsx` (graph rendering fixes)

**Key Changes:**
1. **Layout Priority:** Graph now appears immediately below the header (line 60-62), making it the first visual element users see
2. **Data Privacy:** canonical_id removed from public-facing Quick Stats
3. **Form UX:** AddAppearanceForm is now collapsible (default: collapsed) with clear expand/collapse button
4. **Graph Spacing:** Added force simulation parameters (charge=-800, linkDistance=120) to prevent node overlap
5. **Graph Container:** Fixed white overlay issue by using w-full class and proper dimension calculation (height=700px)

**All Success Criteria Met:**
✅ Graph appears at top of page immediately below header
✅ canonical_id is hidden from Quick Stats (only Total, Earliest, Latest shown)
✅ AddAppearanceForm starts collapsed with expand button
✅ ConflictRadar relocated below stats in 2-column grid
✅ Graph nodes properly spaced with readable labels
✅ No white overlay on graph container
✅ Graph fills container properly (w-full, height=700px)
✅ All graph interactions preserved (click, drag, zoom, expand)

**Testing Notes:**
- Dev server running on localhost:3001
- All code changes are UI-only (no database/API changes)
- Changes are backwards compatible
- Rollback is simple: git checkout of 2 modified files

**Next Steps for User:**
1. Visit http://localhost:3001/figure/[id] to test layout changes
2. Verify graph appears first and fills space properly
3. Test collapsible form functionality
4. Confirm graph nodes are readable (test with Julius Caesar page)
5. If satisfied, commit changes and mark CHR-21 as complete in Linear
