# Flight Plan: Phase 4.1 - Bulk Data Ingestion
**Created:** 2026-02-02
**Status:** Planning
**Priority:** HIGH

## Vision
Enable efficient bulk import of historical figures and media works from curated data sources, leveraging our entity resolution, provenance tracking, and performance optimizations.

## Current State
- **Database:** 772 HistoricalFigures, ~708 MediaWorks, ~680 relationships
- **Provenance:** 100% coverage with CREATED_BY relationships
- **Performance:** Duplicate detection optimized (3,487x speedup)
- **Data Quality:** Wikidata Q-ID canonical identifiers, phonetic matching

## Goals
1. **Batch Import System** - Import JSON/CSV files with hundreds of figures/media at once
2. **Wikidata Sync** - Automated enrichment from Wikidata for canonical data
3. **Validation Pipeline** - Prevent duplicates, validate data quality before import
4. **Progress Tracking** - Monitor ingestion jobs, rollback on errors

## Session Breakdown

### Session 4.1.1: JSON Import Schema & Validation
**Scope:** Define import file format and validation logic

**Deliverables:**
- JSON schema for bulk figure import (`schemas/bulk-import-figure.json`)
- JSON schema for bulk media import (`schemas/bulk-import-media.json`)
- Validation utility (`scripts/ingestion/validate_import.py`)
- Example import files (`data/examples/`)

**Schema Structure:**
```json
{
  "figures": [
    {
      "name": "Marcus Aurelius",
      "wikidata_id": "Q1430",  // Optional, will fetch if missing
      "birth_year": 121,
      "death_year": 180,
      "era": "Ancient Rome",
      "title": "Roman Emperor",
      "occupation": "Philosopher"
    }
  ],
  "media_works": [
    {
      "title": "Gladiator",
      "wikidata_id": "Q174583",  // Optional
      "media_type": "Film",
      "release_year": 2000,
      "creator": "Ridley Scott",
      "portrayals": [
        {
          "figure_identifier": "Q1430",  // canonical_id or wikidata_id
          "actor_name": "Richard Harris",
          "character_name": "Marcus Aurelius",
          "is_protagonist": false,
          "sentiment": "heroic"
        }
      ]
    }
  ]
}
```

**Validation Rules:**
- Required fields: name (figures), title (media)
- Wikidata ID format: Must start with 'Q' followed by digits
- Year ranges: birth_year < death_year, release_year reasonable
- No duplicates within import file
- Cross-reference portrayals to figures in same file

**Files to Create:**
- `schemas/bulk-import-figure.json` - JSON Schema for figures
- `schemas/bulk-import-media.json` - JSON Schema for media
- `scripts/ingestion/validate_import.py` - Python validator
- `data/examples/ancient-rome.json` - Example import (10 figures, 5 media)
- `data/examples/french-revolution.json` - Example import (15 figures, 8 media)

**Testing:**
- Valid file passes validation
- Invalid files caught with clear error messages
- Wikidata ID format validation works
- Duplicate detection within file works

---

### Session 4.1.2: Wikidata Enrichment Pipeline
**Scope:** Auto-fetch missing data from Wikidata before import

**Deliverables:**
- Wikidata enrichment script (`scripts/ingestion/enrich_from_wikidata.py`)
- Batch Q-ID lookup endpoint (`/api/wikidata/batch-lookup`)
- Enrichment cache to avoid re-fetching

**Enrichment Logic:**
1. For each figure with wikidata_id, fetch from Wikidata:
   - birth_date, death_date (if missing)
   - occupation, title (if missing)
   - image URL (optional)
2. For each media work with wikidata_id:
   - release_year, creator (if missing)
   - genre, runtime (optional)
3. Cache enriched data (TTL: 30 days)

**API Endpoint:**
```typescript
POST /api/wikidata/batch-lookup
Body: { ids: ["Q1430", "Q174583", ...] }
Response: {
  "Q1430": {
    birth_date: "121-04-26",
    death_date: "180-03-17",
    occupation: "philosopher",
    ...
  },
  ...
}
```

**Files to Create:**
- `scripts/ingestion/enrich_from_wikidata.py` - Batch enrichment script
- `web-app/app/api/wikidata/batch-lookup/route.ts` - Batch endpoint
- `web-app/lib/wikidata-batch.ts` - Batch query utilities

**Testing:**
- Batch lookup fetches multiple Q-IDs efficiently
- Enrichment fills missing fields correctly
- Cached results used on subsequent runs
- Handles missing/invalid Q-IDs gracefully

---

### Session 4.1.3: Duplicate Prevention & Entity Resolution
**Scope:** Check for existing entities before creating new ones

**Deliverables:**
- Pre-import duplicate check script
- Entity resolution with phonetic matching
- Conflict resolution UI for ambiguous cases

**Resolution Strategy:**
1. **Exact Match (High Confidence)**
   - Same wikidata_id → Use existing node
   - Same canonical_id → Use existing node
2. **High Similarity (Medium Confidence)**
   - Enhanced name similarity ≥ 0.9 + year match → Flag for review
3. **Phonetic Match (Low Confidence)**
   - Phonetic similarity ≥ 0.85 + era match → Flag for review

**Pre-Import Check:**
```bash
python3 scripts/ingestion/check_duplicates.py data/ancient-rome.json
```

Output:
```
Checking 10 figures, 5 media works...

EXACT MATCHES (will use existing):
✓ Marcus Aurelius (Q1430) → existing figure Q1430

HIGH CONFIDENCE DUPLICATES:
⚠️  Julius Caesar → 95% match with existing Q1048
    Action: [U]se existing, [C]reate new, [S]kip

POTENTIAL DUPLICATES:
ℹ️  Commodus → 87% phonetic match with existing PROV:commodus
    Action: [U]se existing, [C]reate new, [S]kip

CLEAR TO IMPORT:
✓ 7 new figures
✓ 5 new media works
```

**Files to Create:**
- `scripts/ingestion/check_duplicates.py` - Interactive duplicate checker
- `scripts/ingestion/resolve_entities.py` - Automated resolution script
- `data/.ingestion-cache/resolutions.json` - Saved resolution decisions

**Testing:**
- Exact matches detected correctly
- High similarity matches flagged
- Phonetic matches surfaced
- User decisions saved and applied

---

### Session 4.1.4: Batch Import Executor
**Scope:** Execute validated import with rollback on errors

**Deliverables:**
- Batch import script with transaction support
- Progress tracking and logging
- Rollback mechanism on failure
- Import history tracking

**Import Process:**
```bash
python3 scripts/ingestion/import_batch.py data/ancient-rome.json --dry-run
python3 scripts/ingestion/import_batch.py data/ancient-rome.json
```

**Transaction Logic:**
1. Begin Neo4j transaction
2. For each figure:
   - Check for duplicates (use cached resolutions)
   - Create or link to existing node
   - Set CREATED_BY relationship to batch import agent
3. For each media work:
   - Check for duplicates
   - Create or link to existing node
   - Create APPEARS_IN relationships
4. If any errors → rollback transaction
5. On success → commit transaction

**Progress Output:**
```
Starting import: ancient-rome.json
[1/10] Creating Marcus Aurelius (Q1430)... ✓
[2/10] Creating Commodus (using existing PROV:commodus)... ✓
[3/10] Creating Lucilla... ✓
...
[10/10] Complete

Creating media works...
[1/5] Creating Gladiator (Q174583)... ✓
  - Linked Marcus Aurelius → Richard Harris
  - Linked Commodus → Joaquin Phoenix
...
[5/5] Complete

✅ Import successful!
   - 7 new figures created
   - 3 existing figures linked
   - 5 new media works created
   - 23 new APPEARS_IN relationships
   - Duration: 4.2s
```

**Files to Create:**
- `scripts/ingestion/import_batch.py` - Main import executor
- `scripts/ingestion/agent_registry.py` - Batch import agent management
- `data/.ingestion-history/` - Import logs and history
- `scripts/ingestion/rollback_import.py` - Manual rollback utility

**Testing:**
- Successful import creates all entities
- Failed import rolls back cleanly
- Progress tracking accurate
- CREATED_BY relationships set correctly
- Import history logged

---

## Data Sources to Target

### Priority 1: Ancient Rome (Example Dataset)
- **Figures:** ~15 emperors, politicians, philosophers
- **Media:** Gladiator, Rome (TV), I Claudius, historical documentaries
- **Value:** Popular, well-documented, good Wikidata coverage

### Priority 2: French Revolution
- **Figures:** ~20 revolutionaries, monarchs, military leaders
- **Media:** Les Misérables, A Tale of Two Cities, Marie Antoinette (film)
- **Value:** Rich interconnections, dramatic portrayals

### Priority 3: American Founding Fathers
- **Figures:** ~15 founders, presidents, revolutionaries
- **Media:** Hamilton, 1776, John Adams (HBO), National Treasure
- **Value:** High public interest, extensive media portrayals

## Success Criteria
- ✅ Can import 50+ figures in single batch
- ✅ Duplicate detection prevents database pollution
- ✅ Wikidata enrichment auto-fills 80%+ of missing data
- ✅ Import completes in <10 seconds for 50 entities
- ✅ Full rollback on any error (no partial imports)
- ✅ 100% provenance tracking (CREATED_BY on all new nodes)

## Risks & Mitigations

### Risk: Import creates duplicates despite checks
**Mitigation:** Three-layer protection:
1. Pre-import duplicate check (interactive review)
2. Import-time entity resolution (use cached decisions)
3. Post-import duplicate scan (weekly audit)

### Risk: Wikidata API rate limiting
**Mitigation:**
- Batch requests (50 entities per API call)
- Cache enriched data (30-day TTL)
- Fallback to manual data if Wikidata unavailable

### Risk: Large imports timeout or fail
**Mitigation:**
- Transaction-based rollback (all-or-nothing)
- Progress checkpoints (resume from last successful entity)
- Import size limit (100 entities max per batch)

## Future Enhancements (Post-4.1)
- **Scheduled Wikidata Sync:** Nightly job to update existing entities
- **Multi-Source Import:** Support CSV, TSV, XML formats
- **Import API:** Web UI for uploading import files
- **Conflict Resolution UI:** Web interface for duplicate review
- **Import Queue:** Async processing for large imports

## Dependencies
- ✅ Provenance tracking (CREATED_BY) - Complete (Phase 2.1)
- ✅ Entity resolution (phonetic matching) - Complete (Phase 2.2)
- ✅ Performance optimization (caching) - Complete (Phase 4.3)
- ✅ Database health (indexes) - Complete (Phase 4.3)

## Next Steps
1. Create Session 4.1.1 implementation plan
2. Define JSON schemas for import files
3. Build validation utilities
4. Create example datasets (Ancient Rome, French Revolution)
