# Flight Plan: Duplicate Detection Dashboard (Phase 2.2)

**Created:** 2026-02-02
**Status:** Planning
**Priority:** MEDIUM (upgraded from LOW due to recent duplicate cleanup need)

---

## Context

During Phase 3 implementation, we discovered 10 duplicate HistoricalFigure pairs in the database (e.g., Napoleon as both HF_FR_001 and Q517). These were cleaned manually, but we need a systematic approach to:
1. Proactively detect potential duplicates
2. Surface them for human review
3. Provide merge tooling to consolidate safely

**Current Database State:**
- ~795 HistoricalFigures
- ~708 MediaWorks
- 100% provenance coverage (CREATED_BY relationships)
- Entity resolution protocol in place (Wikidata Q-IDs, phonetic matching)

---

## Goals

### Primary
Build a duplicate detection dashboard that identifies high-confidence duplicate pairs and enables safe merging.

### Success Criteria
- [ ] API endpoint returns potential duplicate pairs with similarity scores
- [ ] UI displays duplicate candidates with side-by-side comparison
- [ ] Merge operation transfers all relationships and deletes duplicate node
- [ ] Post-merge, navigation links update to surviving node

---

## Sessions Breakdown

### Session 2.2.1: Detection API Endpoint
**Estimated Effort:** 1.5 hours

**Scope:**
Create `/api/admin/duplicates/detect` endpoint that:
- Queries for HistoricalFigures with high name similarity
- Uses enhanced phonetic + lexical matching (same algorithm as entity resolution)
- Returns pairs with similarity scores, sorted by confidence
- Filters out already-merged pairs (no relationship overlap)

**Deliverables:**
- `web-app/app/api/admin/duplicates/detect/route.ts`
- Cypher query using name matching logic
- Response format:
  ```json
  {
    "duplicates": [
      {
        "figure1": { "canonical_id": "Q517", "name": "Napoleon Bonaparte", ... },
        "figure2": { "canonical_id": "HF_FR_001", "name": "Napoleon", ... },
        "similarity_score": 0.95,
        "confidence": "high",
        "relationship_overlap": 5
      }
    ],
    "total": 12
  }
  ```

**Technical Notes:**
- Reuse phonetic matching logic from `web-app/lib/wikidata.ts`
- Consider indexing name fields for performance
- Set threshold at 0.85+ similarity (tunable via query param)

---

### Session 2.2.2: Duplicate Review UI
**Estimated Effort:** 2 hours

**Scope:**
Build admin page at `/admin/duplicates` that:
- Fetches duplicate pairs from API
- Displays side-by-side comparison cards
- Shows metadata: canonical_id, Wikidata Q-ID, appearance count, created_by agent
- Color-codes confidence levels (green=high, yellow=medium)
- Allows filtering by confidence threshold

**Deliverables:**
- `web-app/app/admin/duplicates/page.tsx`
- `web-app/components/DuplicatePairCard.tsx`
- Evidence Locker styling (stone/amber palette)
- Loading and error states

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Duplicate Detection Dashboard                           │
│ ─────────────────────────────────────────────────────── │
│ Filter: [ All | High Confidence | Medium Confidence ]  │
│                                                         │
│ ┌──────────────────┐  ┌──────────────────┐            │
│ │ Napoleon         │  │ Napoleon Bonaparte│  95% Match │
│ │ HF_FR_001        │  │ Q517              │            │
│ │ 3 appearances    │  │ 12 appearances    │            │
│ │ Created: claude  │  │ Created: wikidata │            │
│ └──────────────────┘  └──────────────────┘            │
│                   [ Merge → ] [ Not a Duplicate ]      │
│ ─────────────────────────────────────────────────────── │
│ ... more pairs ...                                      │
└─────────────────────────────────────────────────────────┘
```

**Navigation:**
- Add link in navbar under "Admin" dropdown (if exists) or contribute area
- Restrict to authenticated users (or add basic auth flag)

---

### Session 2.2.3: Merge Operation
**Estimated Effort:** 2 hours

**Scope:**
Implement merge functionality that:
- Accepts source and target canonical_ids
- Transfers all relationships from source to target
- Preserves relationship properties (actor_name, role, sentiment, etc.)
- Deletes source node after successful transfer
- Returns confirmation with merge summary

**Deliverables:**
- `web-app/app/api/admin/duplicates/merge/route.ts` (POST endpoint)
- Cypher query for safe relationship transfer:
  ```cypher
  MATCH (source:HistoricalFigure {canonical_id: $sourceId})
  MATCH (target:HistoricalFigure {canonical_id: $targetId})

  // Transfer APPEARS_IN relationships
  MATCH (source)-[r:APPEARS_IN]->(m:MediaWork)
  WHERE NOT EXISTS((target)-[:APPEARS_IN]->(m))
  MERGE (target)-[r2:APPEARS_IN]->(m)
  ON CREATE SET r2 = properties(r)

  WITH source, target, count(r) as transferred

  // Transfer CREATED_BY (if exists)
  OPTIONAL MATCH (source)-[cb:CREATED_BY]->(agent)
  MERGE (target)-[:WAS_MERGED_FROM {
    merged_at: datetime(),
    original_canonical_id: source.canonical_id,
    transferred_relationships: transferred
  }]->(source)

  // Delete source node
  DETACH DELETE source

  RETURN transferred, target
  ```

**Safety Features:**
- Dry-run mode (return what WOULD be merged without executing)
- Prevent merging if target doesn't exist
- Prevent merging if both have same canonical_id
- Log merge actions for audit trail

**UI Integration:**
- "Merge" button triggers confirmation modal
- Shows merge preview (relationships to transfer)
- Executes merge on confirmation
- Removes pair from duplicate list on success
- Shows success toast with merge summary

---

## Technical Considerations

### Performance
- **Index Creation:** Add index on `HistoricalFigure.name` for faster similarity queries
- **Caching:** Cache duplicate detection results for 1 hour (refresh manually)
- **Pagination:** If >50 duplicate pairs, implement pagination

### Data Integrity
- **Relationship Deduplication:** Only transfer relationships that don't already exist
- **Provenance Preservation:** Maintain CREATED_BY on target node
- **Audit Trail:** Create WAS_MERGED_FROM relationship for historical record

### Error Handling
- **Merge Conflicts:** Handle case where both nodes have relationships to same MediaWork
- **Concurrent Merges:** Prevent race conditions with transaction isolation
- **Rollback:** Ensure atomic operations (all-or-nothing merge)

---

## Testing Strategy

### Manual Testing
1. Create test duplicate pair in dev database
2. Verify detection API returns the pair
3. Verify UI displays pair correctly
4. Execute merge and verify:
   - All relationships transferred
   - Source node deleted
   - Navigation links work
   - No orphaned relationships

### Automated Testing (Future)
- Unit tests for similarity scoring
- Integration tests for merge operation
- E2E test for full duplicate workflow

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Merge operation deletes wrong node | HIGH | Require explicit user selection of target node |
| False positives (non-duplicates flagged) | MEDIUM | Set conservative threshold (0.85+), allow "Not a Duplicate" action |
| Performance degradation on large dataset | MEDIUM | Add name index, implement pagination |
| Concurrent merge conflicts | LOW | Use Neo4j transaction isolation |

---

## Future Enhancements (Post-Phase 2.2)

1. **Automated Merge Suggestions**
   - Auto-merge 0.98+ similarity pairs with user notification
   - Weekly digest of detected duplicates

2. **Duplicate Prevention**
   - Real-time duplicate check during figure creation
   - Warning in contribution UI if similar figure exists

3. **Batch Operations**
   - Select multiple pairs and merge all
   - Export duplicate list to CSV for review

4. **Machine Learning**
   - Train classifier on confirmed duplicate/non-duplicate pairs
   - Improve similarity scoring over time

---

## Dependencies

**Required:**
- Phase 2.1 complete (CREATED_BY provenance) ✅
- Enhanced name similarity function (already exists in `lib/wikidata.ts`) ✅
- Neo4j MCP server for Cypher execution ✅

**Optional:**
- Admin authentication (can defer to future sprint)
- Automated testing infrastructure (can defer)

---

## Success Metrics

**Must Achieve:**
- [ ] Detect all high-confidence duplicates (0.85+ similarity)
- [ ] Successfully merge at least 1 duplicate pair end-to-end
- [ ] Zero data loss during merge operations

**Stretch Goals:**
- [ ] Process all remaining duplicates in database
- [ ] Add "Not a Duplicate" flag to prevent re-detection
- [ ] Build audit log showing merge history

---

## Next Steps

1. **Session 2.2.1:** Build detection API endpoint
2. **Session 2.2.2:** Build review UI
3. **Session 2.2.3:** Implement merge operation
4. **Verification:** Test on existing database, clean remaining duplicates
5. **Documentation:** Update CLAUDE.md with duplicate detection protocol

---

**Ready to Start:** Yes
**Estimated Total Time:** 5-6 hours
**Confidence Level:** High (clear requirements, existing patterns to follow)
