# Feature Implementation Plan: Remove Hardcoded Three Bacons Graph

**Overall Progress:** `0%` (0/6 tasks complete)

**Linear Issue:** [CHR-8](https://linear.app/chronosgraph/issue/CHR-8/remove-hardcoded-three-bacons-graph)

---

## TL;DR
Remove all hardcoded "three bacons" (Kevin Bacon, Francis Bacon painter, Francis Bacon philosopher) graph data and related ingestion/verification scripts from the codebase. The dashboard currently falls back to this hardcoded data when database queries fail; we'll remove this fallback and trust live database queries exclusively.

---

## Critical Decisions
- **Remove fallback logic entirely**: Dashboard should rely solely on live Neo4j data, not hardcoded Bacon network
- **Keep ingested data in database**: The actual Kevin Bacon/Francis Bacon data already in Neo4j stays (it's valid historical data); we're only removing the hardcoded fallback files
- **Archive documentation**: Move Bacon-related research docs to an archive folder instead of deleting (preserve historical context)
- **No UI changes needed**: GraphExplorer component already handles empty/live data correctly
- **Scope**: Frontend hardcoded data, ingestion scripts, verification scripts, and related documentation

---

## Implementation Tasks

### Phase 1: Remove Hardcoded Frontend Data

- [ ] 🟥 **Task 1.1: Remove bacon-network-data.ts file**
  - [ ] 🟥 Delete `web-app/lib/bacon-network-data.ts` (424 lines of hardcoded graph data)
  - **Files**: `web-app/lib/bacon-network-data.ts` (DELETE)
  - **Notes**: This file contains 23 hardcoded nodes and 39 links for Kevin Bacon → Francis Bacon network

- [ ] 🟥 **Task 1.2: Update dashboard to remove fallback logic**
  - [ ] 🟥 Remove import of `getBaconNetworkData` from `web-app/app/page.tsx`
  - [ ] 🟥 Remove try/catch fallback logic (lines 15-23)
  - [ ] 🟥 Simplify to single `getHighDegreeNetwork(50)` call
  - [ ] 🟥 Add proper error handling that shows user-friendly message (not silent fallback)
  - **Files**: `web-app/app/page.tsx` (EDIT)
  - **Notes**: Dashboard currently falls back to `getBaconNetworkData()` if database query fails; remove this fallback
  - **Dependencies**: Task 1.1 must complete first (remove import target)

### Phase 2: Remove Ingestion and Verification Scripts

- [ ] 🟥 **Task 2.1: Archive bacon_connections.json data file**
  - [ ] 🟥 Move `data/bacon_connections.json` to `data/archive/` (don't delete, preserve for reference)
  - [ ] 🟥 Create `data/archive/` directory if it doesn't exist
  - **Files**: `data/bacon_connections.json` (MOVE to archive)
  - **Notes**: 282 lines of structured JSON with MediaWorks, HistoricalFigures, and interactions

- [ ] 🟥 **Task 2.2: Archive ingestion script**
  - [ ] 🟥 Move `scripts/ingestion/ingest_bacon_connections.py` to `scripts/archive/` (preserve for reference)
  - [ ] 🟥 Create `scripts/archive/` directory if it doesn't exist
  - **Files**: `scripts/ingestion/ingest_bacon_connections.py` (MOVE to archive)
  - **Notes**: 182 lines of ingestion logic; data already in database, script no longer needed

- [ ] 🟥 **Task 2.3: Archive verification script**
  - [ ] 🟥 Move `scripts/qa/verify_bacon_connections.py` to `scripts/archive/` (preserve for reference)
  - **Files**: `scripts/qa/verify_bacon_connections.py` (MOVE to archive)
  - **Notes**: 159 lines of verification queries; identified in Linear issue CHR-8

### Phase 3: Archive Documentation

- [ ] 🟥 **Task 3.1: Archive Bacon research documentation**
  - [ ] 🟥 Create `docs/archive/bacon-research/` directory
  - [ ] 🟥 Move the following files to archive:
    - `docs/README_BACON_RESEARCH.md`
    - `docs/BACON_RESEARCH_SUMMARY.md`
    - `docs/BACON_CONNECTIONS_SUMMARY.md`
    - `docs/BACON_NETWORK_DATABASE_IMPLEMENTATION.md`
    - `docs/BACON_CONNECTION_PATHS_VISUAL.md`
    - `docs/KEVIN_BACON_FRANCIS_BACON_SIX_DEGREES.md`
  - [ ] 🟥 Move `web-app/public/bacon-connection-graph.svg` to archive
  - **Files**: 7 documentation files (MOVE to archive)
  - **Notes**: Preserve historical research context, don't delete

---

## Rollback Plan

**If things go wrong:**

1. **Restore hardcoded fallback** (if dashboard breaks):
   ```bash
   git checkout HEAD -- web-app/lib/bacon-network-data.ts
   git checkout HEAD -- web-app/app/page.tsx
   ```

2. **Restore archived files** (if needed for reference):
   ```bash
   # Files are in archive directories, easy to restore
   mv data/archive/bacon_connections.json data/
   mv scripts/archive/ingest_bacon_connections.py scripts/ingestion/
   mv scripts/archive/verify_bacon_connections.py scripts/qa/
   ```

3. **Verify database has data**:
   ```bash
   # If dashboard shows empty graph, check Neo4j has actual data
   python scripts/qa/verify_bacon_connections.py  # from archive
   ```

---

## Success Criteria

✅ `web-app/lib/bacon-network-data.ts` deleted (hardcoded data removed)
✅ Dashboard (`web-app/app/page.tsx`) no longer imports or calls `getBaconNetworkData()`
✅ Dashboard relies solely on `getHighDegreeNetwork(50)` for live data
✅ Proper error handling shows user-friendly message if database query fails
✅ `data/bacon_connections.json` moved to `data/archive/`
✅ Ingestion and verification scripts moved to `scripts/archive/`
✅ Bacon research docs moved to `docs/archive/bacon-research/`
✅ Dashboard still renders correctly with live database data
✅ No broken imports or missing file errors
✅ Actual Kevin Bacon/Francis Bacon data remains in Neo4j database (not deleted)

---

## Out of Scope (For This Plan)

- **Database cleanup**: NOT removing Kevin Bacon or Francis Bacon data from Neo4j (that's valid historical data)
- **GraphExplorer changes**: Component already handles live data correctly, no changes needed
- **Error messaging UX**: Not redesigning error states, just removing silent fallback
- **Alternative fallback**: Not implementing any replacement fallback mechanism
- **Testing database queries**: Assuming `getHighDegreeNetwork()` works correctly (already in production)
- **Removing mentions in logs**: CHRONOS_LOG.md and CHRONOS_LOG.archive.md mentions are historical records, leave as-is
- **Removing audit plan mentions**: `.plans/codebase-audit-*.md` files reference this work, leave as-is (they're meta-documentation)

---

## Technical Context

### What is "Three Bacons"?
The "three bacons" refers to hardcoded graph data demonstrating connections between:
1. **Kevin Bacon** (Q3454165) - American actor, 1958-present
2. **Francis Bacon** (Q154340) - Painter, 1909-1992
3. **Francis Bacon** (Q37388) - Philosopher/statesman, 1561-1626

This was a proof-of-concept "Six Degrees" demonstration built during early YOLO vibecoding phase.

### What We're Removing
- **Hardcoded frontend data**: `bacon-network-data.ts` with 23 nodes, 39 links
- **Fallback mechanism**: Dashboard code that uses hardcoded data when DB fails
- **Ingestion pipeline**: Scripts that populated database with this specific dataset
- **Verification tooling**: QA script that validated bacon connections
- **Research documentation**: 7 markdown files explaining the research

### What We're Keeping
- **Live database data**: Actual Kevin Bacon/Francis Bacon nodes and relationships in Neo4j (valid data)
- **GraphExplorer component**: Already handles any graph data, including Bacon connections from live DB
- **Historical logs**: CHRONOS_LOG mentions are historical records (archive context)

### Why We're Removing This
1. **Fallback obscures problems**: Silent fallback to hardcoded data hides database issues
2. **Maintenance burden**: Hardcoded data gets stale, creates confusion about data source
3. **Focus on live data**: ChronosGraph should showcase real-time database queries, not static demos
4. **Cleanup goal**: Part of broader effort to remove half-baked features from early YOLO phase (CHR-7 audit)

---

## File Structure After Cleanup

```
data/
├── archive/
│   └── bacon_connections.json  # MOVED (preserved for reference)

scripts/
├── archive/
│   ├── ingest_bacon_connections.py  # MOVED (preserved for reference)
│   └── verify_bacon_connections.py  # MOVED (preserved for reference)
├── ingestion/
│   └── (other ingestion scripts remain)
└── qa/
    └── (other QA scripts remain)

docs/
├── archive/
│   └── bacon-research/
│       ├── README_BACON_RESEARCH.md  # MOVED
│       ├── BACON_RESEARCH_SUMMARY.md  # MOVED
│       ├── BACON_CONNECTIONS_SUMMARY.md  # MOVED
│       ├── BACON_NETWORK_DATABASE_IMPLEMENTATION.md  # MOVED
│       ├── BACON_CONNECTION_PATHS_VISUAL.md  # MOVED
│       ├── KEVIN_BACON_FRANCIS_BACON_SIX_DEGREES.md  # MOVED
│       └── bacon-connection-graph.svg  # MOVED
└── (other docs remain)

web-app/
├── app/
│   └── page.tsx  # EDITED (removed fallback logic)
├── lib/
│   └── (bacon-network-data.ts DELETED)
└── public/
    └── (bacon-connection-graph.svg MOVED to docs/archive)
```

---

## Testing Checklist

**Before starting:**
- [ ] Verify dashboard currently loads successfully
- [ ] Confirm `getHighDegreeNetwork(50)` returns data from Neo4j
- [ ] Note current behavior when database is unavailable

**After Phase 1 (remove hardcoded data):**
- [ ] Dashboard loads with live data from `getHighDegreeNetwork(50)`
- [ ] No console errors about missing `getBaconNetworkData`
- [ ] No broken imports in `web-app/app/page.tsx`

**After Phase 2 (archive scripts):**
- [ ] `data/archive/bacon_connections.json` exists
- [ ] `scripts/archive/ingest_bacon_connections.py` exists
- [ ] `scripts/archive/verify_bacon_connections.py` exists
- [ ] Original locations are empty (files moved, not copied)

**After Phase 3 (archive docs):**
- [ ] `docs/archive/bacon-research/` contains 6 markdown files + 1 SVG
- [ ] Original doc locations are empty (files moved, not copied)

**Final verification:**
- [ ] Dashboard loads successfully with live data
- [ ] No hardcoded Bacon data fallback exists in codebase
- [ ] All archived files are accessible for historical reference
- [ ] `git status` shows clean deletions and moves

---

## Notes

- **Preserve, don't destroy**: We're archiving (not deleting) scripts and docs to preserve institutional knowledge
- **Data stays in database**: The actual Kevin Bacon/Francis Bacon nodes in Neo4j are valid historical data and should remain
- **Silent fallback is bad**: Removing fallback logic will surface database issues earlier (better for debugging)
- **Audit context**: This work is part of CHR-7 codebase audit cleanup roadmap
