# Duplicate Merge Plan
**Date:** 2026-02-02
**Total Detected:** 50 pairs
**Strategy:** Merge high-confidence (100% similarity + Q-ID) first, review questionable pairs

---

## ✅ HIGH CONFIDENCE - AUTO-MERGE (Tier 1)
*100% similarity, one has Wikidata Q-ID, should merge PROV → Q-ID*

1. **Agrippina the Elder**: `PROV:agrippina_elder` → `Q229413` (2+1 portrayals)
2. **Agrippina the Younger**: `PROV:agrippina_younger` → `Q154732` (1+1 portrayals)
3. **Camille Desmoulins**: `PROV:camille-desmoulins-1769140678336` → `Q191590` (1+1 portrayals)
4. **Gaius Cassius Longinus**: `PROV:gaius_cassius` → `Q207370` (4+1 portrayals)
5. **Livia Drusilla**: `PROV:livia_drusilla` → `Q469701` (6+2 portrayals)
6. **Lucilla**: `PROV:lucilla_noble` → `lucilla` (Q242466) (1+1 portrayals)
7. **Tiberius**: `PROV:tiberius` → `Q1407` (4+2 portrayals)
8. **Titus**: `PROV:titus_caesar` → `titus_emperor` (Q1421) (2+1 portrayals)
9. **Zenobia**: `PROV:zenobia_palmyra` → `zenobia` (Q185673) (1+1 portrayals)
10. **Lucius Cornelius Sulla**: `PROV:sulla` → `Q82954` (3+1 portrayals)
11. **Herod the Great**: `PROV:herod_great` → `Q43915` (1+1 portrayals)

**Total:** 11 merges, ~28 portrayals consolidated

---

## 🟡 MEDIUM CONFIDENCE - AUTO-MERGE (Tier 2)
*100% similarity, both PROV, same character different IDs*

12. **Lucius Petronius Longus**: `PROV:lucius_petronius_longus` → `PROV:petronius_longus` (5+15 portrayals)

**Total:** 1 merge, 20 portrayals consolidated

---

## ⚠️ GENERIC ROLES - REVIEW NEEDED (Tier 3)
*100% similarity but generic roles - might be different characters in different contexts*

- Gang Leader (2 PROV IDs) - Could be same archetype or different characters
- Magistrate (2 PROV IDs) - Generic role, likely different characters
- Oracle Priestess (2 PROV IDs) - Generic role
- Prosecutor (2 PROV IDs) - Generic role
- Temple Admin (3 PROV IDs - triple overlap!) - Generic role
- Temple Priest (2 PROV IDs) - Generic role
- Witness (2 PROV IDs) - Generic role

**Decision:** SKIP for now - these are likely distinct characters with generic names. Would need episode-level context to merge.

---

## 🔴 FALSE POSITIVES - DO NOT MERGE (Tier 4)
*High similarity but different people*

- **Marcus Tullius Cicero vs Tiro** (0.900) - Tiro was Cicero's secretary, different person
- **Julius Caesar vs Lucius Caesar** (0.892) - Different people (uncle/nephew)
- **Agrippina Elder vs Agrippina Younger** (0.833) - Mother and daughter
- **Leonidas freedman vs Leonidas I of Sparta** (0.860) - Different people
- **Alfred the Great vs Herod the Great** (0.825) - Different people, just both "Great"
- **Cyrus the Great vs Herod the Great** (0.813) - Different people
- **Marcus Junius Brutus vs Marcus Drusus** (0.825) - Different people
- **Drusus Elder vs Drusus Younger** (0.806) - Father and son
- **Gaius Gracchus vs Tiberius Gracchus** (0.794) - Brothers

**Decision:** Mark as NOT_DUPLICATE to prevent re-detection.

---

## 🤔 AMBIGUOUS - NEEDS RESEARCH (Tier 5)
*Multiple Q-IDs for same name - might be disambiguation needed*

- **Francis Bacon** - Q154340 vs Q37388 vs Q960315 (philosopher vs painter vs politician?)
- **Titus** - Multiple IDs, need to verify which Titus

**Decision:** Research Wikidata to understand which person each Q-ID represents, then merge appropriately.

---

## Execution Plan

### Phase 1: Auto-merge Tier 1 (11 merges)
Run merge API for each high-confidence pair:
```bash
# Merge PROV → Q-ID for all Tier 1 duplicates
# Target: The one with Wikidata Q-ID
# Source: The PROV: prefixed one
```

### Phase 2: Auto-merge Tier 2 (1 merge)
Merge the Petronius duplicate (pick the one with more portrayals as target)

### Phase 3: Dismiss False Positives (Tier 4)
Use dismiss API to create NOT_DUPLICATE relationships

### Phase 4: Research & Resolve Ambiguous (Tier 5)
Investigate Francis Bacon and Titus Q-IDs before merging

---

## Expected Outcome

**Immediate (Tier 1+2):**
- 12 successful merges
- ~48 portrayals consolidated
- ~12 duplicate nodes soft-deleted
- Database cleaner, more canonical

**After Full Review (Tier 4):**
- ~15 pairs marked as NOT_DUPLICATE
- Prevents future false positive alerts
- Preserves distinct historical figures

**Remaining Work:**
- Generic roles: Keep separate (likely different characters)
- Ambiguous Q-IDs: Research then merge
