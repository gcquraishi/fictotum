# Fictotum Duplicate Detection System

**Implementation Date**: 2026-02-01
**Tickets**: CHR-30, CHR-31, CHR-32
**Status**: ✅ Complete

## Overview

The Duplicate Detection System provides automated identification and management of duplicate HistoricalFigure nodes in the Fictotum database. It uses enhanced similarity scoring combining lexical (Levenshtein) and phonetic (Double Metaphone) matching to catch spelling variations and pronunciation equivalents.

## Architecture

### Components

1. **API Endpoint**: `/api/audit/duplicates` (CHR-30)
2. **Admin Dashboard**: `/admin/duplicates` (CHR-31)
3. **Merge Operation**: `/api/audit/duplicates/merge` (CHR-32)
4. **Dismiss Operation**: `/api/audit/duplicates/dismiss`
5. **Supporting Endpoint**: `/api/figures/[id]/appearances`

## Similarity Scoring Algorithm

### Enhanced Name Similarity

The system uses a weighted combination of two complementary matching algorithms:

- **70% Lexical (Levenshtein Distance)**: Exact spelling similarity
- **30% Phonetic (Double Metaphone)**: Pronunciation similarity

```typescript
function enhancedNameSimilarity(name1: string, name2: string): {
  combined: number;
  lexical: number;
  phonetic: number;
}
```

### Confidence Levels

| Score Range | Confidence | Meaning |
|-------------|-----------|---------|
| ≥ 0.9 | High | Very likely duplicates |
| 0.7 - 0.89 | Medium | Possible duplicates |
| < 0.7 | Low | Unlikely duplicates |

### Additional Validation

- **Wikidata Q-ID Conflict Prevention**: Figures with different Q-IDs are NOT flagged as duplicates
- **Year Matching**: Birth/death year within ±5 years increases confidence
- **Soft-Deleted Exclusion**: Deleted nodes are automatically filtered out
- **Dismissed Pairs**: Previously dismissed pairs are excluded from results

## API Reference

### GET /api/audit/duplicates

Detect potential duplicate HistoricalFigure nodes.

**Query Parameters**:
- `threshold` (float, 0.0-1.0, default: 0.7): Minimum similarity score
- `limit` (int, max: 500, default: 50): Maximum results
- `min_confidence` (string, default: 'medium'): 'high', 'medium', or 'low'

**Response**:
```json
{
  "count": 15,
  "total_scanned": 520,
  "threshold": 0.7,
  "min_confidence": "medium",
  "duplicates": [
    {
      "figure1": {
        "canonical_id": "titus_emperor",
        "name": "Titus",
        "wikidata_id": "Q1421",
        "birth_year": 39,
        "death_year": 81,
        "era": "Roman Empire",
        "portrayals_count": 5
      },
      "figure2": {
        "canonical_id": "titus",
        "name": "Titus",
        "wikidata_id": "Q1418",
        "birth_year": 39,
        "death_year": 81,
        "era": "Roman Empire",
        "portrayals_count": 3
      },
      "similarity": {
        "combined": 1.0,
        "lexical": 1.0,
        "phonetic": 1.0,
        "confidence": "high"
      },
      "year_match": true
    }
  ]
}
```

### POST /api/audit/duplicates/merge

Merge two HistoricalFigure nodes into one.

**Request Body**:
```json
{
  "primary_id": "titus_emperor",
  "secondary_id": "titus",
  "dry_run": false
}
```

**Merge Process**:
1. ✅ Validate both nodes exist
2. ✅ Prevent merge if different Wikidata Q-IDs
3. ✅ Transfer all APPEARS_IN relationships
4. ✅ Transfer all INTERACTED_WITH relationships
5. ✅ Transfer all NEMESIS_OF relationships
6. ✅ Transfer all PORTRAYED_IN relationships
7. ✅ Merge properties (keep non-null, prefer primary)
8. ✅ Create MERGED_FROM audit trail
9. ✅ Create CREATED_BY relationship (merge-operation agent)
10. ✅ Soft-delete secondary node (add :Deleted label)

**Response**:
```json
{
  "success": true,
  "primary_id": "titus_emperor",
  "secondary_id": "titus",
  "relationships_transferred": 8,
  "properties_merged": [
    "wikidata_id",
    "birth_year",
    "death_year",
    "description",
    "era",
    "title"
  ],
  "dry_run": false,
  "timestamp": "2026-02-01T12:00:00.000Z"
}
```

### POST /api/audit/duplicates/dismiss

Mark a pair as "not a duplicate" to exclude from future scans.

**Request Body**:
```json
{
  "figure1_id": "titus_emperor",
  "figure2_id": "PROV:titus_caesar",
  "note": "Different historical figures - Emperor vs. Caesar title holder"
}
```

**Response**:
```json
{
  "success": true,
  "figure1": {
    "id": "titus_emperor",
    "name": "Titus"
  },
  "figure2": {
    "id": "PROV:titus_caesar",
    "name": "Titus"
  },
  "dismissed_by": "admin@fictotum.com",
  "note": "Different historical figures - Emperor vs. Caesar title holder"
}
```

## Admin Dashboard

### Location
`/admin/duplicates`

### Features

1. **Filtering Controls**
   - Similarity threshold slider (50% - 100%)
   - Minimum confidence dropdown (High/Medium/Low)

2. **Side-by-Side Comparison**
   - Figure name, ID, and Wikidata Q-ID
   - Birth/death years
   - Era tags
   - Portrayals count
   - Media appearances list

3. **Action Buttons**
   - **"Keep This"**: Select as primary and merge
   - **"Not a Duplicate"**: Dismiss with optional note

4. **Visual Design**
   - Evidence Locker design system
   - Amber/stone color palette
   - Confidence badges (red=high, yellow=medium, blue=low)
   - Similarity score breakdown display

## Database Schema Changes

### New Relationship: MERGED_FROM

```cypher
(primary:HistoricalFigure)-[:MERGED_FROM {
  timestamp: datetime,
  merged_id: string,
  merged_name: string,
  batch_id: string,
  performed_by: string
}]->(secondary:HistoricalFigure:Deleted)
```

### New Relationship: NOT_DUPLICATE

```cypher
(f1:HistoricalFigure)-[:NOT_DUPLICATE {
  dismissed_at: datetime,
  dismissed_by: string,
  note: string
}]->(f2:HistoricalFigure)
```

### New Agent Node

```cypher
(:Agent {
  agent_id: "merge-operation",
  name: "Fictotum Merge Operation",
  type: "system",
  created_at: datetime,
  metadata: '{"operation":"duplicate_merge"}'
})
```

## Safety Features

### Merge Operation Safeguards

1. **Wikidata Q-ID Conflict Prevention**
   - Blocks merge if both figures have different Q-IDs
   - Prevents accidental merge of distinct historical figures

2. **Transaction Atomicity**
   - All operations in a single Cypher transaction
   - Rollback on any error (all-or-nothing)

3. **Audit Trail**
   - MERGED_FROM relationship preserves merge history
   - CREATED_BY relationship tracks merge operation
   - Timestamps and user attribution on all actions

4. **Soft Delete**
   - Secondary node marked with :Deleted label
   - Original data preserved for rollback if needed
   - deleted_at, deleted_reason, deleted_by properties

5. **Dry Run Mode**
   - Test merge without making changes
   - Returns relationship counts and property changes

6. **Confirmation Required**
   - Admin dashboard requires explicit confirmation
   - Displays impact preview before merge

## Testing

### Current Database State (2026-02-01)

**Total Figures**: 520
**Known Duplicates**: 15+ pairs identified

**Example Duplicates**:
- Titus (3 nodes: titus_emperor, titus, PROV:titus_caesar)
- Domitian (2 nodes: domitian_emperor, domitian)
- Livia Drusilla (2 nodes: PROV:livia_drusilla, Q469701)
- Tiberius (2 nodes: PROV:tiberius, Q1407)
- Commodus (2 nodes: commodus, Q1434)

### Test Scenarios

#### Scenario 1: High Confidence Match
```bash
# Query: Titus duplicates
# Expected: 3 figures with 100% similarity
# One with Q1421, one with Q1418, one with no Q-ID
```

#### Scenario 2: Wikidata Conflict Prevention
```bash
# Query: Titus (Q1421) vs Titus (Q1418)
# Expected: Merge blocked due to different Q-IDs
```

#### Scenario 3: Successful Merge
```bash
# Primary: titus_emperor (Q1421)
# Secondary: PROV:titus_caesar (no Q-ID)
# Expected: Relationships transferred, secondary soft-deleted
```

#### Scenario 4: Dismiss Non-Duplicate
```bash
# Pair: titus_emperor vs PROV:temple_admin
# Action: Dismiss with note
# Expected: NOT_DUPLICATE relationship created
```

## Performance Considerations

### Current Implementation (O(n²) Comparison)

- **Scan Time**: ~0.5s for 520 figures (134,680 comparisons)
- **Bottleneck**: In-memory pairwise comparison

### Future Optimization (If Needed)

1. **Blocking Strategy**: Group by first letter or phonetic key
2. **Incremental Detection**: Only check new/modified figures
3. **Database-Side Filtering**: Push similarity calculation to Cypher (GDS plugin)
4. **Caching**: Store similarity scores for frequently compared pairs

## Known Limitations

1. **Single-Language Support**: Currently English only
2. **No Automatic Resolution**: Requires manual admin review
3. **No Undo Operation**: Merges are permanent (soft-delete allows recovery)
4. **Linear Scan**: Performance degrades with large datasets (>10,000 figures)

## Future Enhancements

### Priority 1 (Immediate)
- [ ] Add merge preview in dashboard (show diff before commit)
- [ ] Implement bulk merge operation (merge multiple pairs at once)
- [ ] Add merge history view (audit log of all past merges)

### Priority 2 (Medium-term)
- [ ] Machine learning confidence scoring
- [ ] Automatic low-confidence merge suggestions
- [ ] Integration with Wikidata reconciliation service

### Priority 3 (Long-term)
- [ ] Multi-language phonetic matching
- [ ] Fuzzy date matching for ancient figures
- [ ] Crowd-sourced duplicate reporting

## Rollback Procedure

If a merge was performed incorrectly:

```cypher
// 1. Find the merge relationship
MATCH (primary:HistoricalFigure)-[merge:MERGED_FROM]->(secondary:HistoricalFigure:Deleted)
WHERE primary.canonical_id = 'PRIMARY_ID'

// 2. Restore secondary node
REMOVE secondary:Deleted
REMOVE secondary.deleted_at
REMOVE secondary.deleted_reason
REMOVE secondary.deleted_by

// 3. Manually review and re-assign relationships
// (This requires case-by-case analysis)

// 4. Delete the merge audit trail
DELETE merge
```

**⚠️ WARNING**: Rollback is NOT automated and requires manual intervention. Always use dry_run first!

## Monitoring & Metrics

### Key Metrics to Track

1. **Detection Rate**: New duplicates found per week
2. **Merge Rate**: Merges performed per week
3. **Dismiss Rate**: Pairs dismissed per week
4. **Precision**: % of detected duplicates that are true positives
5. **Recall**: % of actual duplicates detected by system

### Recommended Queries

```cypher
// Count total merges
MATCH ()-[r:MERGED_FROM]->()
RETURN count(r) AS total_merges

// Count dismissed pairs
MATCH ()-[r:NOT_DUPLICATE]->()
RETURN count(r) / 2 AS total_dismissed

// Find figures with multiple merge operations
MATCH (f:HistoricalFigure)-[r:MERGED_FROM]->()
WITH f, count(r) AS merge_count
WHERE merge_count > 1
RETURN f.canonical_id, f.name, merge_count
ORDER BY merge_count DESC
```

## Changelog

### v1.0.0 (2026-02-01)
- ✅ CHR-30: Initial duplicate detection API
- ✅ CHR-31: Admin dashboard with Evidence Locker design
- ✅ CHR-32: Merge operation with full audit trail
- ✅ Dismiss operation for non-duplicates
- ✅ Soft-delete safety mechanism
- ✅ Wikidata Q-ID conflict prevention

## Credits

**Implementation**: Claude Sonnet 4.5 (Fictotum Co-CEO)
**Design System**: Evidence Locker (amber/stone palette)
**Algorithm**: Enhanced Name Similarity (Levenshtein + Double Metaphone)
**Database**: Neo4j Aura (instance c78564a4)
