# Duplicate Cleanup Report
**Date:** February 2, 2026
**Executor:** Claude Sonnet 4.5
**Total Merges:** 12 successful

---

## ✅ Tier 1: High-Confidence Q-ID Merges (11)
*PROV → Wikidata Q-ID consolidation*

| Figure | Source → Target | Relationships Transferred |
|--------|----------------|--------------------------|
| Agrippina the Elder | PROV:agrippina_elder → Q229413 | 2 |
| Agrippina the Younger | PROV:agrippina_younger → Q154732 | 1 |
| Camille Desmoulins | PROV:camille-desmoulins-* → Q191590 | 0 |
| Gaius Cassius Longinus | PROV:gaius_cassius → Q207370 | 4 |
| Livia Drusilla | PROV:livia_drusilla → Q469701 | 4 |
| Lucilla | PROV:lucilla_noble → lucilla (Q242466) | 1 |
| Tiberius | PROV:tiberius → Q1407 | 2 |
| Titus | PROV:titus_caesar → titus_emperor (Q1421) | 2 |
| Zenobia | PROV:zenobia_palmyra → zenobia (Q185673) | 1 |
| Lucius Cornelius Sulla | PROV:sulla → Q82954 | 3 |
| Herod the Great | PROV:herod_great → Q43915 | 1 |

**Total Tier 1:** 21 relationships consolidated

---

## ✅ Tier 2: Same-Figure PROV Merge (1)
*Consolidating duplicate PROV IDs for same person*

| Figure | Source → Target | Relationships Transferred |
|--------|----------------|--------------------------|
| Lucius Petronius Longus | PROV:lucius_petronius_longus → PROV:petronius_longus | 5 |

**Total Tier 2:** 5 relationships consolidated

---

## Summary Statistics

**Before Cleanup:**
- Detected duplicates: 50 pairs
- High-confidence candidates: 12 pairs
- Database state: ~795 figures, fragmented data

**After Cleanup:**
- Merges executed: 12
- Nodes soft-deleted: 12
- Relationships consolidated: 26
- Remaining duplicates: 38 pairs (generic roles, false positives, needs review)

**Database Impact:**
- ✅ Major Roman figures now use canonical Wikidata Q-IDs
- ✅ Portrayals consolidated under single authoritative nodes
- ✅ Audit trail preserved via MERGED_FROM relationships
- ✅ Soft-delete allows recovery if needed

---

## Remaining Work (Not Executed)

### Tier 3: Generic Roles (Skip)
Generic character names like "Magistrate", "Oracle Priestess", "Temple Admin" - likely different characters in different media contexts. **Decision: Keep separate.**

### Tier 4: False Positives (Should Dismiss)
Pairs to mark as NOT_DUPLICATE:
- Marcus Tullius Cicero vs Tiro (secretary, not the same person)
- Julius Caesar vs Lucius Caesar (uncle/nephew)
- Agrippina Elder vs Younger (mother/daughter)
- Leonidas freedman vs Leonidas I (different people)
- Gaius Gracchus vs Tiberius Gracchus (brothers)
- Drusus Elder vs Younger (father/son)
- Alfred the Great vs Herod the Great (different "Greats")

**Action needed:** Create NOT_DUPLICATE relationships to prevent re-detection.

### Tier 5: Ambiguous Q-IDs (Needs Research)
- Francis Bacon: Multiple Q-IDs (Q154340, Q37388, Q960315) - philosopher, painter, or politician?
- Titus: Multiple canonical IDs need verification

**Action needed:** Research Wikidata entries before merging.

---

## Verification Queries

```cypher
// Check merged nodes are properly deleted
MATCH (f:HistoricalFigure:Deleted)
WHERE f.deleted_reason CONTAINS "Tier"
RETURN count(f) as deleted_count
// Expected: 12

// Check consolidated portrayals
MATCH (f:HistoricalFigure)
WHERE f.canonical_id IN ['Q229413', 'Q154732', 'Q191590', 'Q207370', 'Q469701',
                          'lucilla', 'Q1407', 'titus_emperor', 'zenobia',
                          'Q82954', 'Q43915', 'PROV:petronius_longus']
OPTIONAL MATCH (f)-[r:APPEARS_IN]->()
RETURN f.name, f.canonical_id, count(r) as total_portrayals
ORDER BY total_portrayals DESC

// Check for orphaned relationships
MATCH (:HistoricalFigure:Deleted)-[r:APPEARS_IN]->()
RETURN count(r) as orphaned_relationships
// Expected: 0
```

---

## Success Criteria

- [x] All high-confidence Q-ID duplicates merged
- [x] Relationships successfully transferred (26 total)
- [x] No data loss (soft-delete used)
- [x] Audit trail created (MERGED_FROM relationships)
- [x] Zero orphaned relationships
- [x] Database integrity maintained

---

**Next Steps:**
1. Re-run duplicate detection to verify cleanup
2. Mark false positives as NOT_DUPLICATE
3. Research ambiguous Francis Bacon / Titus cases
4. Move to Phase B: Performance Optimization

**Execution Status:** ✅ COMPLETE
