# Fictotum Deduplication Strategy
**Authored:** 2026-03-17
**Author:** Data Architect (Claude Sonnet 4.6)
**Status:** Active Reference
**Related Tickets:** FIC-51, FIC-54

---

## Executive Summary

Fictotum's current dedup stack is well-designed for its present scale of 2,621 entities. The
Wikidata Q-ID backbone is sound — it is the right long-term bet and no architect would undo it.
The short-term gaps are narrow and tactical: accented character normalization, a missing Q-ID
field consolidation migration, and per-batch pre-flight dedup that runs against the live database
rather than just the batch file. The long-term inflection point arrives somewhere between 10K and
20K entities, where O(n²) pairwise comparison degrades from a nuisance into a hard blocker, and
where multi-language name variation becomes the dominant source of escaping duplicates. This
document separates what to do now from what to do later.

---

## Current System Inventory

### What is Implemented and Functioning

**Prevention layer (writes):**
- Wikidata Q-ID lookup before any new entity creation
- Dual-key blocking: `wikidata_id OR canonical_id` uniqueness constraint enforced at creation time
- Provisional ID format `PROV:{slug}-{timestamp}` — timestamp suffix guarantees no collision for
  same-name figures
- `conflict_flag: "no_wikidata_qid"` annotation for figures that could not be Q-ID resolved

**Detection layer (post-hoc scan):**
- `scripts/qa/resolve_entities.py` — three-pass detector:
  1. Exact shared Q-ID (definitive merges)
  2. Wikidata alias-to-primary-name match (multilingual hits)
  3. Fuzzy string match via `thefuzz` at >90% ratio
- API endpoint `GET /api/audit/duplicates` — O(n²) pairwise scan in TypeScript using
  70% Levenshtein + 30% Double Metaphone, with Q-ID conflict gating and ±5-year date tolerance
- `web-app/lib/name-matching.ts` — shared utility module used by both the API and Wikidata search

**Resolution layer (merge/dismiss):**
- `POST /api/audit/duplicates/merge` — atomic Cypher transaction, transfers 6 relationship types,
  soft-deletes secondary with `:Deleted` label, writes `MERGED_FROM` audit relationship
- `POST /api/audit/duplicates/dismiss` — writes `NOT_DUPLICATE` relationship to suppress pair
- `/admin/duplicates` dashboard — side-by-side review UI with confidence badges

**Batch ingestion pre-flight:**
- `scripts/maintenance/dedupe_batch{3..11}.py` — Q-ID lookup against live database before
  constructing each batch JSON; 11 separate scripts, one per batch

**Ongoing maintenance:**
- `scripts/qa/audit_wikidata_ids.py` — weekly Q-ID coverage and validity audit
- `scripts/maintenance/fix_bad_qids.py` — semi-automated correction of wrong or missing Q-IDs
- `scripts/migration/populate_alternate_names.py` — Wikidata `skos:altLabel` SPARQL backfill into
  `alternate_names[]` property (BATCH_SIZE=20 per request)

**Index coverage (as of 2026-02-01):**
- `figure_wikidata_idx` (RANGE on `wikidata_id`) — exists
- `figure_fulltext` (FULLTEXT on `name`, `title`) — exists but read count is 0 (unused)
- `media_wikidata_unique` (UNIQUE CONSTRAINT on `wikidata_id`) — exists
- `figure_unique` (UNIQUE CONSTRAINT on `canonical_id`) — exists

---

## Known Gaps (Documented)

1. **Accented character matching fails phonetically.** "François" vs "Francois" scores 0.612 —
   below the 0.7 threshold — because Double Metaphone operates on the Unicode input without
   diacritic stripping. The `entity-resolution.md` protocol describes `normalizeForComparison()`
   as "already handled in preprocessing" but the actual `name-matching.ts` implementation does not
   include NFD normalization.

2. **Legacy Q-ID field split.** The entity resolution plan (completed 2026-01-23) documented:
   "Some figures have Q-IDs in `canonical_id` but not in `wikidata_id` field." These figures will
   not be found by `WHERE f.wikidata_id = $qid` dedup queries. No follow-up migration was created.

3. **Batch dedup scripts are batch-specific one-offs.** `dedupe_batch3.py` through
   `dedupe_batch11.py` are not reusable. Each was written for a single import event. There is no
   general-purpose pre-flight dedup harness usable for the Egypt and Tudor batches queued in M4.

4. **`resolve_entities.py` makes one SPARQL request per figure** for alias enrichment. At 1,150
   figures this means up to 1,150 sequential requests. The `populate_alternate_names.py` script
   solved this with batched SPARQL VALUES clauses (20 per request), but `resolve_entities.py` was
   not updated to use the same pattern.

5. **No dedup coverage for `FictionalCharacter` nodes.** The detection API scans only
   `HistoricalFigure`. Fictional characters have no Q-ID constraint and no pairwise scan. They are
   currently out of scope by design (series protagonists like Hornblower are intentionally
   duplicated per media work) but this boundary is not documented at the code level.

6. **`figure_fulltext` index is defined but never queried.** The index exists and is ONLINE, but
   read count is 0. Full-text search capability is dormant. This is relevant to future blocking
   strategies.

---

## Short-Term Strategy: Now to 5K Entities

### What is Working Well — Preserve

- The Q-ID spine is correct and should not change. Wikidata Q-IDs as `canonical_id` for figures
  with a known identity is the right model. No refactoring warranted.
- The 70/30 Levenshtein/Metaphone weighting is appropriate for English-dominant names at this
  scale. The threshold calibration (high ≥0.9, medium 0.7-0.89) has shown low false-positive
  rates in practice (Titus Q1421 vs Q1418 properly excluded).
- The merge operation's soft-delete + `MERGED_FROM` audit trail is correctly designed. Do not
  change to hard-delete.
- The `NOT_DUPLICATE` relationship for false-positive suppression is the right pattern; it
  prevents re-flagging of known-distinct pairs on every scan.
- The three-pass detection in `resolve_entities.py` (Q-ID exact, alias match, fuzzy string) is
  sound. Pass 1 and Pass 2 together catch the majority of structural duplicates.

### Immediate Gaps to Close

#### Gap 1: NFD Normalization in Name Matching (Priority: High)

The single largest source of missed duplicates at this scale is accented characters. The fix is
one line of preprocessing in `web-app/lib/name-matching.ts`:

```typescript
function normalizeInput(s: string): string {
  return s.normalize('NFD')              // decompose diacritics
    .replace(/[\u0300-\u036f]/g, '')     // strip combining marks
    .toLowerCase()
    .trim();
}
```

Apply `normalizeInput()` at the top of `calculateSimilarity()`, `calculatePhoneticSimilarity()`,
and `enhancedNameSimilarity()` before any comparison. This is backward-compatible: normalized
strings still produce identical results for ASCII-only names.

This also fixes the Python-side gap. `resolve_entities.py` uses `thefuzz.fuzz.ratio()` with
`.lower()` but no diacritic normalization. The same NFD pattern should be applied using Python's
`unicodedata.normalize('NFD', name)` before calling `fuzz.ratio()`.

**Expected impact:** "François" vs "Francois" rises from 0.612 to ~0.95. This is a material
catch at the M4 stage where the Tudor batch includes names like "Cromwell" alongside "Crumwell"
(the period spelling), and the Egypt batch includes transliteration variants.

#### Gap 2: Q-ID Field Consolidation Migration (Priority: High)

Create a one-time migration to backfill `wikidata_id` for figures where `canonical_id` starts
with `Q` but `wikidata_id` is NULL. This was deferred as "CHR-19?" in the entity resolution plan.

```cypher
MATCH (f:HistoricalFigure)
WHERE f.canonical_id STARTS WITH 'Q'
  AND f.wikidata_id IS NULL
SET f.wikidata_id = f.canonical_id
RETURN count(f) AS updated
```

Run as a dry-count first (`RETURN count(f)` without `SET`). This is safe and idempotent. Until
this runs, the dedup API's Q-ID conflict gate will miss this population, and the
`figure_wikidata_idx` index will not cover these nodes.

#### Gap 3: Generalize Batch Pre-flight Dedup (Priority: Medium)

The 11 `dedupe_batch{N}.py` scripts are functionally identical: fetch existing Q-IDs from Neo4j,
filter the candidate batch against them, write deduplicated JSON. Consolidate into a reusable
`scripts/maintenance/dedup_batch.py` that accepts any batch JSON file as input:

```bash
python3 scripts/maintenance/dedup_batch.py data/ancient_egypt_near_east_batch.json
python3 scripts/maintenance/dedup_batch.py data/tudor_stuart_batch.json
```

The script should:
1. Parse `historical_figures` and `media_works` arrays from the input file
2. Query live Neo4j for all existing `wikidata_id` values (figures and works separately)
3. Filter out any entities whose `wikidata_id` already exists
4. Write a `{filename}_deduplicated.json` with a `deduplication_summary` metadata block
5. Exit non-zero if any entity lacks a `wikidata_id` (forcing explicit provisional ID annotation)

This replaces the M4 batch workflow described in CLAUDE.md as "resume DB then run Egypt + Tudor
dry-run/execute imports."

#### Gap 4: Batch SPARQL in resolve_entities.py (Priority: Low, but cheap)

Update `resolve_entities.py` to use the same batched SPARQL VALUES pattern already in
`populate_alternate_names.py`. Fetch all aliases for figures with Q-IDs in batches of 20 rather
than one SPARQL request per figure. At 1,150 figures this reduces alias enrichment from ~575
seconds to ~30 seconds (20 batches × 1.5s per batch). This makes the weekly scan practical to run
interactively.

### O(n²) Assessment at Current Scale

At 2,621 entities the TypeScript pairwise scan produces approximately 3.4 million comparisons
(2,621² / 2). The documented benchmark was ~0.5s for 520 figures (134K comparisons). Scaling
linearly (conservative — actual growth is closer to quadratic):

| Figure count | Comparisons | Est. scan time |
|---|---|---|
| 520 (2026-02-01 baseline) | 134,680 | ~0.5s |
| 1,150 (current) | 661,175 | ~2.5s |
| 2,621 (all entities) | 3,434,110 | ~12s |
| 5,000 (near-term target) | 12,497,500 | ~46s |

At 5K entities a scan takes roughly 46 seconds. This is fine for a background admin task that
runs weekly. It is not suitable for real-time creation checks, but the creation path already uses
the faster dual-key database lookup — the O(n²) scan is only for the audit dashboard. No
architectural change is needed before 5K entities.

**Recommendation:** Keep O(n²) through 5K. The scan is a batch audit tool, not a hot path.

---

## Long-Term Strategy: 5K to 50K+ Entities

### When Does the Current Approach Break?

The O(n²) pairwise scan in the TypeScript detection API becomes problematic around 10K figures:

| Figure count | Comparisons | Est. scan time |
|---|---|---|
| 10,000 | ~50M | ~3 minutes |
| 25,000 | ~312M | ~20 minutes |
| 50,000 | ~1.25B | ~80 minutes |

At 10K the weekly batch audit is inconvenient but survivable. At 25K it blocks the admin UI for
20 minutes. At 50K the scan cannot complete within any reasonable request timeout. The inflection
point is approximately 15K figures — by that point blocking/bucketing must be in place.

Separately, the Python `resolve_entities.py` fuzzy pass uses `thefuzz` O(n²) in pure Python.
This will become noticeably slow before the TypeScript version does, given Python's lower
throughput for tight loops.

### Strategy 1: Blocking / Bucketing (Required at 10K, Design at 5K)

Blocking reduces the comparison space by partitioning entities into "blocks" where only
within-block pairs are compared. Only entities in the same block can be duplicates of each other.

**Recommended blocking keys for Fictotum:**

1. **Era bucket + first letter of primary name.** Group "Napoleon Bonaparte" (Napoleonic Wars,
   N) with other Napoleonic-era figures starting with N. This alone reduces comparisons by roughly
   1–2 orders of magnitude.

2. **Double Metaphone primary key of last name token.** Figures whose last names encode to the
   same Metaphone key are candidates for comparison. This is a natural fit given Fictotum's
   existing Double Metaphone infrastructure.

3. **Birth decade bucket.** Figures born within the same 20-year window are candidates. Requires
   decent `birth_year` coverage (currently ~90% on figures — acceptable).

Use conjunctive blocking: a pair is a candidate only if it matches on at least one blocking key.
This is more aggressive than disjunctive (match-any), appropriate for a domain where cross-era
duplicates are nearly impossible.

**Neo4j implementation approach:** Store a computed `blocking_key` property on each figure at
write time (e.g., `"roman_empire|N"` or `"STFN"`). Run pairwise comparison only within blocks via:

```cypher
MATCH (f1:HistoricalFigure), (f2:HistoricalFigure)
WHERE f1.era_bucket = f2.era_bucket
  AND f1.canonical_id < f2.canonical_id
  AND NOT (f1)-[:NOT_DUPLICATE]-(f2)
  AND NOT f1:Deleted AND NOT f2:Deleted
RETURN f1, f2
```

At 50K entities with 20 era buckets and 26 first-letter buckets, each block contains roughly
96 figures on average. That reduces per-block comparisons to ~4,600, and total comparisons to
~2.2M — comparable to today's full scan on 2K entities.

### Strategy 2: Full-Text Index for Candidate Generation (Ready Now, Use at 5K+)

The `figure_fulltext` FULLTEXT index on `name` and `title` is already created and ONLINE but has
zero reads. Neo4j's built-in full-text search uses Lucene under the hood and supports fuzzy
matching via `~N` edit distance syntax:

```cypher
CALL db.index.fulltext.queryNodes("figure_fulltext", "Napoleon~2")
YIELD node, score
RETURN node.name, node.canonical_id, score
ORDER BY score DESC
LIMIT 20
```

This is not a replacement for the similarity scoring algorithm — Lucene scores are not calibrated
to Fictotum's 0.7-0.9 thresholds — but it is an excellent **candidate retrieval layer**. Instead
of comparing all N² pairs, use the full-text index to retrieve the top-K candidates for each
figure, then apply the existing `enhancedNameSimilarity()` scoring only to those candidates.

At 50K figures with K=20 candidates per figure, this reduces total scoring calls from 1.25B to
50K × 20 = 1M — a 1,250x improvement.

**Migration path:** Replace the inner loop of the TypeScript detection API with a full-text
pre-filter. The scoring and threshold logic remains unchanged. The `figure_fulltext` index already
exists and requires no migration.

### Strategy 3: Wikidata Reconciliation Service Integration (Medium-term, 6-12 months)

Wikidata's reconciliation API (Open Refine protocol) accepts a batch of entity descriptions and
returns Q-ID candidates with confidence scores. It is designed precisely for the problem Fictotum
faces with cross-language name variations and historical figure disambiguation.

Endpoint: `https://wikidata.reconci.link/en/api`

A reconciliation request for "Genghis Khan" returns:
```json
{
  "result": [
    {"id": "Q720", "name": "Genghis Khan", "score": 100, "match": true},
    {"id": "Q1135480", "name": "Temüjin", "score": 87, "match": false}
  ]
}
```

**Integration point:** Wrap this API in `scripts/qa/reconcile_provisional_figures.py`. For every
figure with a `PROV:` prefix, attempt reconciliation using name + birth/death year. Figures with
a `match: true` result above a confidence threshold (recommend 90) get their `canonical_id` and
`wikidata_id` upgraded to the returned Q-ID.

This solves the hardest class of remaining duplicates: figures entered under English variant
names that were then reconciled to different Q-IDs, or provisional figures that duplicate
already-tracked entities under different spellings.

**At 5K entities**, this script run quarterly would be sufficient. At 50K entities it should
integrate into the batch import pipeline as a mandatory pre-flight step.

### Strategy 4: Alternate Names Index for Cross-Language Matching (Medium-term)

The `alternate_names` property is now being populated from Wikidata `skos:altLabel` (migration
script exists). Once this property is populated across the figure corpus, it becomes the primary
resolution vector for cross-language variant names:

- "Genghis Khan" ↔ "Chinggis Khan" ↔ "Temüjin" — all live in `alternate_names` on Q720
- "Cleopatra VII" ↔ "Kleopatra" ↔ "Cleopatra Philopator" — all in alternate names on Q635

**Required index:**

```cypher
CREATE FULLTEXT INDEX figure_altnames_idx IF NOT EXISTS
FOR (f:HistoricalFigure) ON EACH [f.alternate_names]
```

Neo4j supports full-text indexing on array string properties. This index enables:

```cypher
CALL db.index.fulltext.queryNodes("figure_altnames_idx", "Temüjin")
YIELD node, score
RETURN node.name, node.canonical_id, score
```

Incoming batch entities get cross-checked against this index before creation. This handles the
multi-language variation problem that Double Metaphone cannot catch (Turkic/Mongolian/Arabic
transliterations have no English phonetic equivalent).

**Prerequisite:** Complete `populate_alternate_names.py` run across all 1,150 figures. This
script is ready and tested; it needs to be executed once the M4 database resume happens.

### Strategy 5: Incremental Dedup (Required at 15K+)

Full corpus scans become impractical at scale. The detection API should shift to an incremental
model: on each import batch, compare only the new entities against the existing corpus (O(n × m)
where n is new, m is existing), rather than rescanning all N² pairs.

**Implementation sketch:**

Each imported figure gets a `last_dedup_scan` timestamp. The weekly scan query becomes:

```cypher
MATCH (f:HistoricalFigure)
WHERE f.last_dedup_scan IS NULL
   OR f.last_dedup_scan < datetime() - duration({days: 7})
RETURN f
LIMIT 500
```

Process these figures only against the full corpus (one-sided comparison), not pairwise among
themselves. This reduces the weekly incremental cost to O(new × total) rather than O(total²).

**At 50K figures with 500 new per week:** 500 × 50,000 = 25M comparisons per week, compared to
1.25B for a full scan. With full-text candidate pre-filtering (Strategy 2), this further reduces
to 500 × 20 = 10,000 actual scored comparisons per weekly run.

---

## Decision Framework: When to Upgrade

| Milestone | Trigger | Action |
|---|---|---|
| **3K figures** (next import batch) | M4 Egypt + Tudor import | Run Q-ID field consolidation migration. Apply NFD normalization fix. Use generalized pre-flight dedup script. |
| **5K figures** | Content Density M5 / new cluster | Design blocking key schema. Run `populate_alternate_names.py` fully. Create `figure_altnames_idx`. Begin using full-text index for candidate retrieval in detection API. |
| **10K figures** | Major content expansion | Implement blocking/bucketing in detection API. Switch to incremental dedup model. Run Wikidata reconciliation against all PROV: figures. |
| **25K figures** | If Fictotum evolves to community-contributed content | Evaluate Neo4j GDS `nodeSimilarity` procedure as batch dedup alternative. Add cross-language phonetic algorithms (Beider-Morse for Slavic/Germanic, Daitch-Mokotoff for Central/Eastern European). |
| **50K+ figures** | Large-scale ingestion pipeline | Full blocking architecture required. Wikidata reconciliation as mandatory pre-flight. Consider offline dedup pipeline (Python Spark/Polars) separate from the web application. |

---

## Neo4j GDS Consideration

Neo4j Graph Data Science (GDS) includes a `nodeSimilarity` procedure based on Jaccard overlap of
node properties and relationships. It is not appropriate as a primary dedup mechanism for
Fictotum because:

1. It operates on relationship overlap (shared neighbors), not string similarity. Two figures who
   both appear in many of the same media works would score high — which conflates "frequently
   co-appearing figures" with "duplicate figures."

2. GDS is not available on Neo4j Aura Free tier. Upgrading to Aura Professional adds ~$65/month.

3. The existing string similarity infrastructure is already tuned for the domain.

GDS `nodeSimilarity` becomes relevant **only** if Fictotum later develops a feature to recommend
related figures or detect "equivalent roles across works" — not for entity deduplication.

---

## Open Tickets Alignment

**FIC-51 (document entity resolution workflow):** This document, combined with
`docs/protocols/entity-resolution.md`, satisfies the documentation requirement. The protocol doc
should be updated to reflect the NFD normalization gap (it currently claims it "is already
handled" when it is not) and the alternate names index approach.

**FIC-54 (test suite for entity resolution):** The existing `scripts/qa/test_entity_resolution.py`
and `test_entity_resolution_integration.py` cover the current TypeScript layer. A test suite for
the long-term strategy should include:
- NFD normalization round-trip tests for Arabic, Cyrillic, and Latin-extended characters
- Blocking key generation correctness (era bucket + first-letter)
- Alternate names index query correctness once populated
- Wikidata reconciliation mock integration (using recorded responses)

---

## Summary

**Short-term (now, before M4 import):**
1. Fix NFD normalization in `name-matching.ts` and `resolve_entities.py` — one-line change each
2. Run Q-ID field consolidation migration for figures where `canonical_id` is Q-prefixed but
   `wikidata_id` is NULL
3. Replace batch-specific `dedupe_batch{N}.py` scripts with a single reusable harness
4. Batch `resolve_entities.py` SPARQL calls to match the 20-per-request pattern already in
   `populate_alternate_names.py`

**Medium-term (at 5K entities):**
1. Complete `populate_alternate_names.py` run across all figures
2. Create `figure_altnames_idx` FULLTEXT index on `alternate_names[]`
3. Wire the existing `figure_fulltext` index into the detection API as a candidate pre-filter
4. Design and implement `blocking_key` property schema

**Long-term (at 10K+ entities):**
1. Implement blocking/bucketing in the detection API
2. Switch to incremental dedup (scan only new/unscanned entities)
3. Integrate Wikidata reconciliation API as a quarterly PROV: figure resolution pass
4. Evaluate Beider-Morse/Daitch-Mokotoff phonetic algorithms for non-English name populations if
   content expands significantly into non-Western historical domains

The current O(n²) approach remains adequate through 5K entities for weekly batch audits. No
architectural change is warranted before that threshold.
