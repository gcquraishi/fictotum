# CHR-16 Unified Data Ingestion Hub - Schema Migrations

## Overview

This document describes the five schema migration scripts created for Work Package 1A of the CHR-16 Unified Data Ingestion Hub. These migrations establish the foundational database schema needed to support historical location names, multi-era tagging, data quality tracking, and admin review queues.

## Migration Scripts

### 1. add_location_historical_names.py (Task 1.1)

**Purpose:** Add support for historical place names (e.g., Constantinople vs Istanbul)

**Schema Changes:**
- Adds `modern_name: STRING` to Location nodes (for grouping historical variants)
- Adds `time_period: STRING` to Location nodes (format: "330-1453 CE")
- Creates example locations: Constantinople (Q16869), Byzantium (Q17151), Istanbul (Q406)

**Usage:**
```bash
# Preview changes
python3 scripts/migration/add_location_historical_names.py --dry-run

# Apply migration
python3 scripts/migration/add_location_historical_names.py

# Rollback (if needed)
python3 scripts/migration/add_location_historical_names.py --rollback
```

**Key Features:**
- Idempotent (can run multiple times safely)
- Creates/updates example historical locations
- Links historical variants via `modern_name` property
- Includes coordinate data for mapping

---

### 2. migrate_era_to_tags.py (Task 1.2)

**Purpose:** Migrate from single `era` property to multi-era tag relationships

**Schema Changes:**
- Creates `[:TAGGED_WITH]` relationships: MediaWork -[:TAGGED_WITH]-> Era
- Relationship properties:
  - `confidence: FLOAT` (0.0-1.0)
  - `source: STRING` ("wikidata" | "ai_inferred" | "user_added")
  - `added_by: STRING` (agent/user name)
  - `added_at: DATETIME` (timestamp)
- Creates Era nodes from existing era property values
- Preserves original `era` property during dual-write period

**Usage:**
```bash
# Preview changes
python3 scripts/migration/migrate_era_to_tags.py --dry-run

# Apply migration
python3 scripts/migration/migrate_era_to_tags.py

# Rollback (if needed)
python3 scripts/migration/migrate_era_to_tags.py --rollback
```

**Key Features:**
- Automatically creates Era nodes from legacy era strings
- Sets confidence=0.7 and source="ai_inferred" for migrated data
- Era nodes created with placeholder dates (0) need manual update
- Groups migrations by era for efficient processing

**Post-Migration:**
- Review Era nodes with `start_year=0` or `end_year=0`
- Update with accurate historical date ranges
- Add proper `era_type` classification if needed

---

### 3. add_wikidata_verified_flags.py (Task 1.3)

**Purpose:** Add data quality and provenance tracking to entities

**Schema Changes:**
- HistoricalFigure:
  - `wikidata_verified: BOOLEAN`
  - `data_source: STRING`
- MediaWork:
  - `wikidata_verified: BOOLEAN`
  - `data_source: STRING`
  - `setting_year: INT` (initialized to null)
  - `setting_year_end: INT` (initialized to null)

**Migration Logic:**
- Sets `wikidata_verified=true` where `wikidata_id` exists
- Sets `data_source="wikidata"` for verified entities
- Sets `data_source="user_input"` for unverified entities

**Usage:**
```bash
# Preview changes
python3 scripts/migration/add_wikidata_verified_flags.py --dry-run

# Apply migration
python3 scripts/migration/add_wikidata_verified_flags.py

# Rollback (if needed)
python3 scripts/migration/add_wikidata_verified_flags.py --rollback
```

**Key Features:**
- Provides quality metrics (% Wikidata verified)
- Enables filtering by data source
- Foundation for data quality dashboards
- Setting year fields ready for future population

---

### 4. create_flagged_location_schema.py (Task 1.8)

**Purpose:** Create admin review queue for duplicate location detection

**Schema Changes:**
- Creates `FlaggedLocation` node type
- Properties:
  - `flag_id: STRING` (UUID, unique)
  - `candidate1_id: STRING` (location_id)
  - `candidate2_id: STRING` (location_id)
  - `similarity: FLOAT` (0.0-1.0 similarity score)
  - `q_id_match: BOOLEAN` (wikidata_ids match?)
  - `coord_match: BOOLEAN` (coordinates similar?)
  - `status: STRING` ("pending_review" | "merged" | "kept_separate")
  - `flagged_at: DATETIME`
  - `resolved_by: STRING`
  - `resolved_at: DATETIME`
- Creates uniqueness constraint on `flag_id`
- Creates index on `status` for efficient queries

**Usage:**
```bash
# Preview changes
python3 scripts/migration/create_flagged_location_schema.py --dry-run

# Apply migration
python3 scripts/migration/create_flagged_location_schema.py

# Rollback (if needed)
python3 scripts/migration/create_flagged_location_schema.py --rollback
```

**Key Features:**
- Creates example test node for validation
- Ready for ingestion pipeline integration
- Admin UI can query `status='pending_review'`
- Tracks resolution history

**Admin Queries:**
```cypher
// Get pending location flags
MATCH (fl:FlaggedLocation {status: 'pending_review'})
RETURN fl
ORDER BY fl.flagged_at DESC

// Resolve a flag as merged
MATCH (fl:FlaggedLocation {flag_id: $flag_id})
SET fl.status = 'merged',
    fl.resolved_by = $admin_name,
    fl.resolved_at = datetime()
```

---

### 5. create_flagged_era_schema.py (Task 1.9)

**Purpose:** Create admin review queue for era tag conflicts

**Schema Changes:**
- Creates `FlaggedEra` node type
- Properties:
  - `flag_id: STRING` (UUID, unique)
  - `work_id: STRING` (media_id)
  - `suggested_tags: [STRING]` (AI suggestions)
  - `user_selected_tags: [STRING]` (user overrides)
  - `override_type: STRING`
  - `confidence_delta: FLOAT` (confidence difference)
  - `status: STRING` ("pending_review" | "ai_accepted" | "user_accepted" | "custom_resolution")
  - `flagged_at: DATETIME`
  - `resolved_by: STRING`
  - `resolved_at: DATETIME`
- Override types:
  - `"removed_high_confidence"` - User removed AI's high-confidence tag
  - `"added_anachronistic"` - User added era that doesn't match work's setting
  - `"added_custom"` - User added non-standard era tag
- Creates constraints and indexes

**Usage:**
```bash
# Preview changes
python3 scripts/migration/create_flagged_era_schema.py --dry-run

# Apply migration
python3 scripts/migration/create_flagged_era_schema.py

# Rollback (if needed)
python3 scripts/migration/create_flagged_era_schema.py --rollback
```

**Key Features:**
- Creates 3 example nodes with different override types
- Prioritizes conflicts by confidence delta
- Tracks both AI and user selections for comparison
- Enables data quality feedback loop

**Admin Queries:**
```cypher
// Get high-priority era conflicts
MATCH (fe:FlaggedEra {status: 'pending_review'})
WHERE fe.confidence_delta > 0.7
RETURN fe
ORDER BY fe.confidence_delta DESC

// Get distribution of override types
MATCH (fe:FlaggedEra)
RETURN fe.override_type, count(*) as count
ORDER BY count DESC

// Resolve a flag
MATCH (fe:FlaggedEra {flag_id: $flag_id})
SET fe.status = 'user_accepted',
    fe.resolved_by = $admin_name,
    fe.resolved_at = datetime()
```

---

## Migration Order

**Recommended execution order:**

1. `add_wikidata_verified_flags.py` - Foundation for data quality
2. `add_location_historical_names.py` - Location schema enhancements
3. `migrate_era_to_tags.py` - Era relationship model
4. `create_flagged_location_schema.py` - Admin review infrastructure
5. `create_flagged_era_schema.py` - Admin review infrastructure

**Can be run independently:** Yes, all migrations are independent and can be run in any order.

---

## Testing Checklist

After running all migrations:

- [ ] All scripts completed without errors
- [ ] Constraints created successfully (check with `SHOW CONSTRAINTS`)
- [ ] Indexes created successfully (check with `SHOW INDEXES`)
- [ ] Example nodes created where applicable
- [ ] Rollback tested for each script
- [ ] No duplicate properties or nodes created
- [ ] Existing data preserved

---

## Neo4j Database Info

- **Instance:** Neo4j Aura c78564a4
- **Connection:** Uses `.env` file credentials
- **Required env vars:** `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`

---

## Common Issues & Solutions

### Issue: "Constraint already exists"
**Solution:** This is expected if migration was previously run. The scripts use `IF NOT EXISTS` clauses and are idempotent.

### Issue: "Era nodes have placeholder dates (0)"
**Solution:** This is expected behavior. After migration, manually update Era nodes:
```cypher
MATCH (e:Era {start_year: 0})
SET e.start_year = <actual_year>,
    e.end_year = <actual_year>,
    e.description = <actual_description>
```

### Issue: Migration fails mid-execution
**Solution:**
1. Check error logs for specific Cypher errors
2. Run with `--dry-run` first to preview changes
3. Use `--rollback` to revert partial migrations
4. Re-run migration (scripts are idempotent)

---

## Integration with Ingestion Pipeline

After migrations complete, the ingestion pipeline should:

1. **Location handling:**
   - Check for historical name variants using `modern_name`
   - Flag potential duplicates in `FlaggedLocation` queue

2. **Era tagging:**
   - Create `[:TAGGED_WITH]` relationships instead of setting `era` property
   - Include `confidence`, `source`, and `added_by` metadata
   - Flag user overrides in `FlaggedEra` queue

3. **Data quality:**
   - Set `wikidata_verified=true` when Q-ID verified
   - Track `data_source` for all entities
   - Populate `setting_year` fields from Wikidata

4. **Admin review:**
   - Create `FlaggedLocation` nodes when similarity > 0.75
   - Create `FlaggedEra` nodes when confidence_delta > 0.5
   - Provide admin UI for reviewing `status='pending_review'` items

---

## Files Created

All files located in `/Users/gcquraishi/Documents/big-heavy/fictotum/scripts/migration/`:

1. `add_location_historical_names.py` (executable)
2. `migrate_era_to_tags.py` (executable)
3. `add_wikidata_verified_flags.py` (executable)
4. `create_flagged_location_schema.py` (executable)
5. `create_flagged_era_schema.py` (executable)

**Total lines of code:** ~1,400 lines of production-ready migration code with comprehensive error handling, logging, and rollback support.

---

## Next Steps

After completing Work Package 1A:

1. **Manual data cleanup:**
   - Update Era nodes with placeholder dates
   - Review any migration warnings/errors

2. **Work Package 1B - API Endpoints:**
   - Create ingestion APIs that use new schema
   - Implement flagging logic in ingestion pipeline

3. **Work Package 1C - Admin UI:**
   - Build review queues for FlaggedLocation and FlaggedEra
   - Create resolution workflows

4. **Testing:**
   - Validate multi-era tagging in real workflows
   - Test historical location grouping
   - Verify data quality metrics

---

## Maintenance

**Monitoring queries:**

```cypher
// Check data quality distribution
MATCH (m:MediaWork)
RETURN m.data_source, count(*) as count

// Check pending reviews
MATCH (fl:FlaggedLocation {status: 'pending_review'})
RETURN count(fl) as pending_locations

MATCH (fe:FlaggedEra {status: 'pending_review'})
RETURN count(fe) as pending_eras

// Era nodes needing date updates
MATCH (e:Era)
WHERE e.start_year = 0 OR e.end_year = 0
RETURN count(e) as needs_dates
```

---

**Migration completed:** January 22, 2026
**Created by:** Claude Code (Sonnet 4.5)
**Work Package:** CHR-16 Task 1A - Schema Migrations
