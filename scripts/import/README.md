# Fictotum Batch Import Tools

This directory contains tools for importing large batches of historical figures and media works from structured data files.

## Tools Overview

### 1. `batch_import.py` - Main Import Tool
**Purpose**: Import historical figures, media works, and relationships from JSON files into Neo4j.

**Features**:
- JSON schema validation
- Duplicate detection (enhanced name similarity with phonetic matching)
- Wikidata Q-ID validation
- Dry-run mode for safe preview
- Batch transaction management
- Detailed error reporting
- Automatic CREATED_BY attribution

**Basic Usage**:
```bash
# Dry run (preview only)
python3 batch_import.py data/my_batch.json --dry-run

# Execute import
python3 batch_import.py data/my_batch.json --execute

# Import only figures
python3 batch_import.py data/figures.json --execute --figures-only

# Custom batch size
python3 batch_import.py data/batch.json --execute --batch-size 100
```

**Full Documentation**: See `/docs/batch-import-guide.md`

### 2. `validate_batch_json.py` - Schema Validator
**Purpose**: Validate JSON files against Fictotum batch import schema before importing.

**Usage**:
```bash
python3 validate_batch_json.py data/my_batch.json
```

**Output**:
- ✅ VALID: File passes all checks
- ❌ INVALID: Lists specific validation errors

**Validation Checks**:
- Required fields present
- Correct data types
- Valid Wikidata Q-ID formats
- Year range validations
- Enum value constraints
- Logical consistency (e.g., death_year >= birth_year)

### 3. `csv_to_batch_json.py` - CSV Converter
**Purpose**: Convert CSV files to Fictotum batch import JSON format.

**Usage**:
```bash
# Convert figures CSV
python3 csv_to_batch_json.py \
  data/figures.csv \
  data/batch.json \
  --type figures \
  --source "Wikipedia Export" \
  --curator "Research Team"

# Convert works CSV
python3 csv_to_batch_json.py \
  data/works.csv \
  data/batch.json \
  --type works \
  --source "IMDb Dataset" \
  --curator "Film Curator"
```

**CSV Templates**: See `/data/examples/figures_template.csv` and `/data/examples/works_template.csv`

## Quick Start

### Step 1: Prepare Your Data

**Option A: Use JSON Template**
```bash
# Copy an example template
cp data/examples/batch_full_import.json data/my_batch.json

# Edit with your data
vim data/my_batch.json
```

**Option B: Convert from CSV**
```bash
# Create CSV file with your data
# Use templates in data/examples/ as reference

# Convert to JSON
python3 scripts/import/csv_to_batch_json.py \
  data/my_data.csv \
  data/my_batch.json \
  --type figures \
  --source "My Dataset" \
  --curator "Your Name"
```

### Step 2: Validate

```bash
python3 scripts/import/validate_batch_json.py data/my_batch.json
```

Fix any validation errors before proceeding.

### Step 3: Preview Import (Dry Run)

```bash
python3 scripts/import/batch_import.py data/my_batch.json --dry-run
```

Review the output report (`batch_import_report.md`) for:
- Number of records to be imported
- Detected duplicates
- Invalid Q-IDs
- Warnings

### Step 4: Execute Import

```bash
python3 scripts/import/batch_import.py data/my_batch.json --execute
```

Confirm when prompted, then review the final report.

## JSON Schema

### Top-Level Structure

```json
{
  "metadata": {
    "source": "Dataset name",
    "curator": "Your name",
    "date": "2026-02-01",
    "description": "Optional description"
  },
  "figures": [ /* HistoricalFigure objects */ ],
  "works": [ /* MediaWork objects */ ],
  "relationships": [ /* Relationship objects */ ]
}
```

### HistoricalFigure Object

```json
{
  "name": "Napoleon Bonaparte",
  "wikidata_id": "Q517",
  "birth_year": 1769,
  "death_year": 1821,
  "title": "French Military Leader and Emperor",
  "era": "Napoleonic Era",
  "description": "French military and political leader"
}
```

**Required**: `name`
**Identifier** (at least one): `canonical_id` OR `wikidata_id`
**Optional**: `birth_year`, `death_year`, `title`, `era`, `description`, `historicity_status`

### MediaWork Object

```json
{
  "title": "War and Peace",
  "wikidata_id": "Q161531",
  "media_type": "BOOK",
  "release_year": 1869,
  "creator": "Leo Tolstoy",
  "description": "Literary work by Leo Tolstoy"
}
```

**Required**: `title`
**Strongly Recommended**: `wikidata_id` (REQUIRED per entity resolution protocol)
**Optional**: `media_type`, `release_year`, `creator`, `creator_wikidata_id`, `publisher`, `description`, `setting`

### Relationship Object

```json
{
  "from_id": "Q517",
  "from_type": "HistoricalFigure",
  "to_id": "Q161531",
  "to_type": "MediaWork",
  "rel_type": "APPEARS_IN",
  "properties": {
    "role": "protagonist",
    "is_protagonist": true,
    "sentiment": "complex"
  }
}
```

**Required**: `from_id`, `from_type`, `to_id`, `to_type`, `rel_type`
**Optional**: `properties` (object with relationship-specific data)

**Valid Relationship Types**:
- `APPEARS_IN` - Figure appears in media work
- `PORTRAYED_IN` - Figure is portrayed in media work
- `INTERACTED_WITH` - Historical interaction
- `BASED_ON` - Fictional character based on figure
- `FICTIONAL_PROXY` - Fictional representation
- `CONTEMPORARY` - Lived at same time

## Example Files

All examples are located in `/data/examples/`:

### JSON Examples
- `batch_figures_only.json` - Import only historical figures
- `batch_works_only.json` - Import only media works
- `batch_full_import.json` - Full import with figures, works, and relationships

### CSV Templates
- `figures_template.csv` - Template for figures CSV
- `works_template.csv` - Template for works CSV

### JSON Schema
- `/data/batch_import_schema.json` - Official JSON schema definition

## Duplicate Detection

The batch import tool automatically detects duplicates using:

### For HistoricalFigures:
1. **Exact Q-ID match** - If Wikidata Q-ID matches existing figure
2. **Exact canonical_id match** - If canonical_id matches existing figure
3. **Enhanced name similarity**:
   - 70% lexical matching (Levenshtein distance)
   - 30% phonetic matching (token-sort)
   - Threshold: 90% similarity
   - Year validation: birth/death within ±5 years

### For MediaWorks:
1. **Exact Q-ID match** - If Wikidata Q-ID matches existing work
2. **Title + Year match**:
   - Title similarity: 85% threshold
   - Release year within ±2 years

**Duplicate Behavior**: Duplicates are automatically **skipped** during import. The import report lists all detected duplicates with confidence levels.

## Wikidata Integration

### Q-ID Validation

All Wikidata Q-IDs are validated before import:
- Verifies Q-ID exists in Wikidata
- Compares Wikidata label with input name
- Flags mismatches (< 75% similarity)

### Automatic Q-ID Search

For MediaWork entries without Q-IDs, the tool can automatically search Wikidata:
```bash
# Enable automatic Q-ID search (default behavior)
python3 scripts/import/batch_import.py data/batch.json --execute
```

The tool uses title, creator, year, and media type to find the best match.

**Best Practice**: Always provide Q-IDs manually for highest accuracy.

## Performance Tuning

### Batch Size

Default: 50 records per transaction

```bash
# For large datasets (1000+ records)
python3 batch_import.py data/large.json --execute --batch-size 200

# For very large datasets (10K+ records)
# Split into multiple files and import sequentially
```

### Skip Options (Use with Caution)

```bash
# Skip duplicate detection (faster, but risky)
--skip-duplicate-check

# Skip Wikidata validation (not recommended)
--skip-wikidata-validation
```

## Error Handling

### Validation Errors

If schema validation fails, the tool provides specific error messages:
```
❌ JSON schema validation failed:
   • figures[2].name is required
   • works[5].wikidata_id invalid format: 'Q123ABC'
   • relationships[10].rel_type must be one of: [APPEARS_IN, ...]
```

Fix errors in JSON and retry.

### Import Errors

If import fails mid-batch:
- Failed batch is rolled back
- Previous successful batches remain in database
- All errors are logged in the report
- Re-run with same file (duplicates will be skipped)

### Common Issues

| Error | Solution |
|-------|----------|
| `NEO4J_URI not set` | Create `.env` file with Neo4j credentials |
| `wikidata_id invalid format` | Ensure Q-ID matches `Q\d+` pattern |
| `MediaWork has no wikidata_id` | Add Q-ID or enable auto-search |
| `Failed to create relationship` | Import figures/works before relationships |
| `Connection timeout` | Check Neo4j connection in `.env` |

## Best Practices

1. **Always use Wikidata Q-IDs** for figures and works
2. **Validate externally first** using https://www.wikidata.org
3. **Split large imports** into batches of ~1000 records
4. **Use descriptive agent names** (e.g., `wikipedia-roman-republic-2026-02`)
5. **Always dry-run first** before executing
6. **Review reports** carefully for duplicates and warnings
7. **Backup database** before very large imports

## Workflow Example

```bash
# 1. Prepare data (CSV or JSON)
vim data/my_batch.csv

# 2. Convert to JSON (if using CSV)
python3 scripts/import/csv_to_batch_json.py \
  data/my_batch.csv \
  data/my_batch.json \
  --type figures \
  --source "Wikipedia" \
  --curator "Research Team"

# 3. Validate schema
python3 scripts/import/validate_batch_json.py data/my_batch.json

# 4. Dry run
python3 scripts/import/batch_import.py data/my_batch.json --dry-run

# 5. Review report
cat batch_import_report.md

# 6. Execute import
python3 scripts/import/batch_import.py data/my_batch.json --execute

# 7. Verify in database
# Use Neo4j Browser or web app to verify
```

## Advanced Usage

### Custom Agent Name

```bash
python3 batch_import.py data/batch.json --execute \
  --agent "wikipedia-roman-republic-2026-02"
```

### Import Only Specific Entity Types

```bash
# Figures only
python3 batch_import.py data/batch.json --execute --figures-only

# Works only
python3 batch_import.py data/batch.json --execute --works-only
```

### Custom Report Path

```bash
python3 batch_import.py data/batch.json --execute \
  --report reports/import_2026_02_01.md
```

## Troubleshooting

### Issue: Import is slow

**Cause**: Duplicate detection queries database for each record

**Solutions**:
- Increase batch size: `--batch-size 200`
- Skip duplicate check (if pre-validated): `--skip-duplicate-check`
- Split into smaller files

### Issue: Wikidata validation timeout

**Cause**: Wikidata API is slow or rate-limited

**Solutions**:
- Wait and retry
- Skip validation (if pre-validated): `--skip-wikidata-validation`
- Reduce batch size

### Issue: Out of memory

**Cause**: Very large JSON file

**Solutions**:
- Split into multiple smaller files
- Reduce batch size
- Increase system memory

## Support

For issues or questions:
1. Check `/docs/batch-import-guide.md` for detailed documentation
2. Review example files in `/data/examples/`
3. Check existing ingestion scripts in `/scripts/ingestion/` for patterns
4. Report issues in the repository

## Related Documentation

- **Full Guide**: `/docs/batch-import-guide.md` - Comprehensive documentation
- **JSON Schema**: `/data/batch_import_schema.json` - Official schema definition
- **Project Schema**: `/scripts/schema.py` - Fictotum data model
- **Entity Resolution**: `/CLAUDE.md` - Entity resolution protocols
