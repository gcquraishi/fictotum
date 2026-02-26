# Fictotum Batch Import Guide (CHR-40)

## Overview

The batch import tool enables importing large datasets of historical figures, media works, and their relationships from structured JSON files. This accelerates content growth beyond manual entry and enables external data submissions.

## Features

- **JSON Schema Validation**: Validates structure before import
- **Duplicate Detection**: Uses enhanced name similarity (lexical + phonetic matching)
- **Wikidata Validation**: Verifies Q-IDs before import
- **Dry-Run Mode**: Preview imports without committing changes
- **Batch Processing**: Commits in configurable batch sizes
- **Error Handling**: Rollback on error with detailed logging
- **Progress Reporting**: Real-time feedback and final report generation
- **Agent Attribution**: Automatic CREATED_BY tracking

## Installation

The tool is located at `scripts/import/batch_import.py` and uses the standard Fictotum dependencies:

```bash
# Ensure dependencies are installed
pip install -r requirements.txt

# Key dependencies:
# - neo4j>=5.14.0
# - python-dotenv>=1.0.0
# - requests>=2.31.0
# - thefuzz>=0.20.0 (for similarity detection)
# - python-Levenshtein>=0.21.0
```

## JSON Schema Specification

### Top-Level Structure

```json
{
  "metadata": {
    "source": "Dataset name or source URL",
    "curator": "Name of person/organization curating data",
    "date": "YYYY-MM-DD",
    "description": "Optional description of this batch"
  },
  "figures": [ /* Array of HistoricalFigure objects */ ],
  "works": [ /* Array of MediaWork objects */ ],
  "relationships": [ /* Array of relationship objects */ ]
}
```

### HistoricalFigure Schema

**Required Fields:**
- `name` (string): Display name of the figure

**Identifier Fields (at least one required):**
- `canonical_id` (string): Unique identifier (will be auto-generated if not provided)
- `wikidata_id` (string): Wikidata Q-ID (e.g., "Q517" for Napoleon)

**Optional Fields:**
- `birth_year` (integer): Birth year (negative for BCE)
- `death_year` (integer): Death year (negative for BCE)
- `title` (string): Primary title or role
- `era` (string): Historical era
- `description` (string): Brief description

**Example:**
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

### MediaWork Schema

**Required Fields:**
- `title` (string): Title of the work

**Strongly Recommended:**
- `wikidata_id` (string): Wikidata Q-ID (REQUIRED per entity resolution protocol)

**Optional Fields:**
- `media_id` (string): Internal identifier (auto-generated if not provided)
- `media_type` (string): One of BOOK, FILM, TV_SERIES, GAME, PLAY, COMIC
- `release_year` (integer): Year of release/publication
- `creator` (string): Creator/director/author name
- `creator_wikidata_id` (string): Wikidata Q-ID of creator
- `publisher` (string): Publisher name (for books)
- `description` (string): Brief description
- `setting` (string): Historical setting

**Example:**
```json
{
  "title": "War and Peace",
  "wikidata_id": "Q161531",
  "media_type": "BOOK",
  "release_year": 1869,
  "creator": "Leo Tolstoy",
  "description": "Literary work by Leo Tolstoy",
  "setting": "Russia during Napoleonic Wars"
}
```

**CRITICAL:** MediaWork nodes MUST have a `wikidata_id`. If not provided in JSON, the tool will attempt to search Wikidata automatically. However, manual verification is strongly recommended.

### Relationship Schema

**Required Fields:**
- `from_id` (string): Source node identifier (canonical_id for figures, wikidata_id for works)
- `from_type` (string): Source node type (HistoricalFigure, MediaWork, or FictionalCharacter)
- `to_id` (string): Target node identifier
- `to_type` (string): Target node type
- `rel_type` (string): Relationship type

**Optional:**
- `properties` (object): Key-value pairs of relationship properties

**Supported Relationship Types:**
- `APPEARS_IN`: Figure appears in media work
- `PORTRAYED_IN`: Figure is portrayed in media work
- `INTERACTED_WITH`: Historical interaction between figures
- `BASED_ON`: Fictional character based on historical figure
- `FICTIONAL_PROXY`: Fictional character represents historical figure
- `CONTEMPORARY`: Figures lived at the same time

**Example:**
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
    "sentiment": "complex",
    "notes": "Napoleon is a major character throughout"
  }
}
```

## Usage

### Basic Commands

```bash
# Dry run (preview only - default mode)
python scripts/import/batch_import.py data/my_batch.json --dry-run

# Live import (modifies database)
python scripts/import/batch_import.py data/my_batch.json --execute

# Import only figures
python scripts/import/batch_import.py data/figures.json --execute --figures-only

# Import only works
python scripts/import/batch_import.py data/works.json --execute --works-only
```

### Advanced Options

```bash
# Custom batch size (default: 50)
python scripts/import/batch_import.py data/batch.json --execute --batch-size 100

# Custom agent name for attribution
python scripts/import/batch_import.py data/batch.json --execute --agent "wikipedia-import-v1"

# Skip duplicate detection (faster but risky)
python scripts/import/batch_import.py data/batch.json --execute --skip-duplicate-check

# Skip Wikidata validation (not recommended)
python scripts/import/batch_import.py data/batch.json --execute --skip-wikidata-validation

# Custom report path
python scripts/import/batch_import.py data/batch.json --execute --report reports/my_report.md
```

### Command-Line Arguments

| Argument | Description | Default |
|----------|-------------|---------|
| `input_file` | Path to JSON file (required) | - |
| `--dry-run` | Preview without making changes | True |
| `--execute` | Execute import (disables dry-run) | False |
| `--batch-size N` | Records per transaction | 50 |
| `--agent NAME` | Agent name for CREATED_BY | "batch-importer" |
| `--figures-only` | Import only figures | False |
| `--works-only` | Import only works | False |
| `--skip-duplicate-check` | Skip duplicate detection | False |
| `--skip-wikidata-validation` | Skip Q-ID validation | False |
| `--report PATH` | Output report path | "batch_import_report.md" |

## Workflow

### 1. Data Preparation

Create a JSON file following the schema specification:

```bash
# Use example templates
cp data/examples/batch_full_import.json data/my_batch.json

# Edit with your data
vim data/my_batch.json
```

### 2. Validation (Dry Run)

Always run a dry-run first to preview the import:

```bash
python scripts/import/batch_import.py data/my_batch.json --dry-run
```

This will:
- Validate JSON schema
- Check for duplicates in database
- Validate Wikidata Q-IDs
- Generate preview report without making changes

Review the output and the generated report (`batch_import_report.md`).

### 3. Review Duplicates

If duplicates are detected, review them in the report:

```markdown
## Duplicate Figures Detected

### Napoleon Bonaparte

- **Match Type:** exact_qid
- **Confidence:** high
- **Existing Figure:** Napoleon Bonaparte (Q517)
```

**Actions:**
- If duplicate is confirmed: Remove from JSON or update existing record
- If false positive: Proceed with import (duplicate will be skipped)
- If ambiguous: Manually verify in database first

### 4. Execute Import

After reviewing the dry-run results:

```bash
python scripts/import/batch_import.py data/my_batch.json --execute
```

You'll be prompted to confirm:
```
⚠️  WARNING: This will modify the database!
Type 'CONFIRM' to proceed:
```

### 5. Review Results

Check the import report for summary:

```markdown
## Summary

- **Figures Created:** 45
- **Figures Skipped (Duplicate):** 5
- **Works Created:** 20
- **Works Skipped (Duplicate):** 2
- **Relationships Created:** 180
- **Errors:** 0
- **Warnings:** 3
```

## Duplicate Detection

The tool uses **enhanced name similarity** matching historical figures with existing database entries.

### Algorithm

**For HistoricalFigures:**
1. **Exact Q-ID Match**: If Wikidata Q-ID matches → duplicate
2. **Exact Canonical ID Match**: If canonical_id matches → duplicate
3. **Enhanced Name Similarity**:
   - Lexical matching (Levenshtein distance): 70% weight
   - Phonetic matching (token-sort): 30% weight
   - Threshold: 0.9 similarity score (90%)
4. **Year Validation**: Birth/death years within ±5 years

**For MediaWorks:**
1. **Exact Q-ID Match**: If Wikidata Q-ID matches → duplicate
2. **Title Similarity + Year**:
   - Title similarity: 0.85 threshold (85%)
   - Release year within ±2 years

### Confidence Levels

- **High Confidence**: Exact Q-ID match or 95%+ similarity
- **Medium Confidence**: 85-94% similarity or title match without year
- **Low Confidence**: Below 85% (not flagged as duplicate)

### Handling Duplicates

**Automatic Behavior:**
- Duplicates are **skipped** during import
- Existing records are **not updated**
- Duplicate count is tracked in statistics

**Manual Override:**
If you want to update existing records, use the Neo4j Cypher queries directly or modify the existing records before batch import.

## Wikidata Integration

### Q-ID Validation

The tool validates all Wikidata Q-IDs before import:

```python
# For each Q-ID:
1. Query Wikidata API to verify Q-ID exists
2. Compare Wikidata label with input name
3. Calculate similarity score
4. Flag if similarity < 75%
```

### Automatic Q-ID Search

If a MediaWork has no Q-ID, the tool automatically searches Wikidata:

```python
search_wikidata_for_work(
    title="War and Peace",
    creator="Leo Tolstoy",
    year=1869,
    media_type="BOOK"
)
# Returns: {'qid': 'Q161531', 'confidence': 'high'}
```

**Best Practice:** Always provide Q-IDs manually for highest accuracy. Automatic search is a fallback.

## Error Handling

### Validation Errors

If JSON schema validation fails:
```
❌ JSON schema validation failed:
   - figures[2].name is required
   - works[5].wikidata_id has invalid format: Q123ABC
   - relationships[10].rel_type must be one of: [APPEARS_IN, ...]
```

Fix errors in JSON and retry.

### Import Errors

If import fails mid-batch:
- **Transaction rollback**: Changes in failed batch are rolled back
- **Previous batches**: Already-committed batches remain in database
- **Error logging**: All errors are logged in report

**Recovery:**
1. Review error in report
2. Fix source data
3. Re-run import (duplicates will be skipped automatically)

### Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `wikidata_id has invalid format` | Q-ID doesn't match Q\d+ pattern | Verify Q-ID from Wikidata |
| `MediaWork has no wikidata_id` | Missing required Q-ID | Add Q-ID or enable auto-search |
| `Failed to create relationship` | Referenced node doesn't exist | Import figures/works first |
| `Connection timeout` | Database unreachable | Check NEO4J_URI in .env |

## Performance Considerations

### Batch Size

- **Default**: 50 records per transaction
- **Small datasets** (<100 records): Use default
- **Large datasets** (1000+ records): Increase to 100-200
- **Very large** (10K+ records): Consider splitting into multiple files

```bash
# For large imports
python scripts/import/batch_import.py data/large.json --execute --batch-size 200
```

### Duplicate Detection

Duplicate detection queries the database for each record:
- **Small datasets**: No impact
- **Large datasets**: Can be slow (1-2 seconds per record)
- **Option**: Skip duplicate check for pre-validated data

```bash
# Skip duplicate detection (use with caution)
python scripts/import/batch_import.py data/validated.json --execute --skip-duplicate-check
```

### Wikidata Validation

Q-ID validation makes HTTP requests to Wikidata:
- **Rate limit**: 500ms between requests (automatic)
- **Timeout**: 10 seconds per request
- **Option**: Skip validation for pre-validated Q-IDs

```bash
# Skip Wikidata validation (not recommended)
python scripts/import/batch_import.py data/batch.json --execute --skip-wikidata-validation
```

## Best Practices

### 1. Always Use Wikidata Q-IDs

```json
// ✅ GOOD
{
  "name": "Napoleon Bonaparte",
  "wikidata_id": "Q517"
}

// ⚠️ AVOID
{
  "name": "Napoleon Bonaparte"
  // Missing Q-ID - will get provisional ID
}
```

### 2. Validate Q-IDs Externally First

Use Wikidata search before creating JSON:
- https://www.wikidata.org/wiki/Special:Search
- Or use the Fictotum web app's Wikidata search feature

### 3. Split Large Imports

For imports >1000 records, split into multiple files:

```bash
# Split by entity type
data/figures_batch1.json
data/figures_batch2.json
data/works_batch1.json
data/relationships_batch1.json

# Import sequentially
for file in data/*.json; do
    python scripts/import/batch_import.py "$file" --execute
done
```

### 4. Use Descriptive Agent Names

```bash
# ✅ GOOD - Descriptive agent names
--agent "wikipedia-roman-republic-2026-02"
--agent "imdb-historical-films-batch-5"

# ❌ AVOID - Generic names
--agent "batch1"
--agent "import"
```

### 5. Always Dry-Run First

```bash
# Step 1: Dry run
python scripts/import/batch_import.py data/batch.json --dry-run

# Step 2: Review report
cat batch_import_report.md

# Step 3: Execute if all looks good
python scripts/import/batch_import.py data/batch.json --execute
```

### 6. Backup Before Large Imports

```bash
# Create Neo4j backup before large imports
# (Method depends on your Neo4j deployment)
```

## Example Workflows

### Workflow 1: Import Figures Only

```bash
# 1. Prepare figures JSON
cat > data/new_figures.json << 'EOF'
{
  "metadata": {
    "source": "Wikipedia",
    "curator": "Research Team",
    "date": "2026-02-01"
  },
  "figures": [
    {
      "name": "Marcus Aurelius",
      "wikidata_id": "Q1430",
      "birth_year": 121,
      "death_year": 180,
      "title": "Roman Emperor"
    }
  ]
}
EOF

# 2. Dry run
python scripts/import/batch_import.py data/new_figures.json --dry-run

# 3. Execute
python scripts/import/batch_import.py data/new_figures.json --execute --figures-only
```

### Workflow 2: Import Works with Auto Q-ID Search

```bash
# 1. Prepare works JSON (without Q-IDs)
cat > data/new_works.json << 'EOF'
{
  "metadata": {
    "source": "IMDb",
    "curator": "Film Team",
    "date": "2026-02-01"
  },
  "works": [
    {
      "title": "Gladiator",
      "media_type": "FILM",
      "release_year": 2000,
      "creator": "Ridley Scott"
    }
  ]
}
EOF

# 2. Dry run (will search Wikidata)
python scripts/import/batch_import.py data/new_works.json --dry-run

# 3. Review found Q-IDs in report

# 4. Execute
python scripts/import/batch_import.py data/new_works.json --execute
```

### Workflow 3: Full Graph Import

```bash
# 1. Use full import template
cp data/examples/batch_full_import.json data/my_import.json

# 2. Edit with your data
vim data/my_import.json

# 3. Dry run
python scripts/import/batch_import.py data/my_import.json --dry-run

# 4. Review report
cat batch_import_report.md

# 5. Execute
python scripts/import/batch_import.py data/my_import.json --execute

# 6. Verify in Neo4j
# Use Neo4j Browser or web app to verify data
```

## Troubleshooting

### Issue: "NEO4J_URI not set"

**Solution:**
```bash
# Create .env file in project root
cat > .env << 'EOF'
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
EOF
```

### Issue: "SSL certificate verification failed"

**Solution:** The tool automatically converts `neo4j+s://` to `neo4j+ssc://` for SSL handling. If issues persist, check your Neo4j Aura connection settings.

### Issue: "Duplicate detected but I want to update"

**Solution:** Remove the duplicate entry from your JSON, then manually update the existing record using Cypher:

```cypher
MATCH (f:HistoricalFigure {canonical_id: "Q517"})
SET f.title = "New Title",
    f.updated_at = datetime()
```

### Issue: "Wikidata validation timeout"

**Solution:** Reduce batch size or increase timeout:
```python
# Edit scripts/lib/wikidata_search.py
# Change timeout parameter from 10 to 30 seconds
```

## Schema Reference

### Node Labels

- `HistoricalFigure`: Historical person
- `MediaWork`: Book, film, TV series, game, etc.
- `FictionalCharacter`: Fictional character (advanced use)
- `Agent`: Data curator/creator

### Relationship Types

- `APPEARS_IN`: Figure appears in media work
- `PORTRAYED_IN`: Figure is portrayed in media work (biographical)
- `INTERACTED_WITH`: Historical interaction between figures
- `BASED_ON`: Fictional character based on historical figure
- `FICTIONAL_PROXY`: Fictional character represents figure
- `CONTEMPORARY`: Figures lived at same time
- `CREATED_BY`: Entity created by agent

### Standard Properties

**HistoricalFigure:**
- `canonical_id` (unique): Primary identifier
- `wikidata_id`: Wikidata Q-ID
- `name`: Display name
- `birth_year`, `death_year`: Integer years
- `title`: Primary title/role
- `era`: Historical era
- `description`: Brief description
- `ingestion_batch`: Batch ID
- `ingestion_source`: Source name
- `created_by`: Agent name
- `created_at`: Timestamp

**MediaWork:**
- `wikidata_id` (unique): Wikidata Q-ID (REQUIRED)
- `media_id` (unique): Internal identifier
- `title`: Work title
- `media_type`: BOOK, FILM, TV_SERIES, etc.
- `release_year`: Integer year
- `creator`: Creator name
- `creator_wikidata_id`: Creator's Q-ID
- `publisher`: Publisher name
- `description`: Brief description
- `setting`: Historical setting
- `ingestion_batch`: Batch ID
- `ingestion_source`: Source name
- `created_by`: Agent name
- `created_at`: Timestamp

## Support

For issues or questions:
1. Check this guide first
2. Review example files in `data/examples/`
3. Check existing imports in `scripts/ingestion/` for patterns
4. Create an issue in the repository

## Changelog

### v1.0.0 (2026-02-01)
- Initial release
- JSON schema validation
- Duplicate detection with enhanced similarity
- Wikidata Q-ID validation
- Batch transaction management
- Dry-run mode
- Comprehensive error handling
- Progress reporting
- Agent attribution
