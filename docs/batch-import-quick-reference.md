# Fictotum Batch Import - Quick Reference

## Installation

```bash
pip install -r requirements.txt
```

## Commands

### Validate JSON
```bash
python3 scripts/import/validate_batch_json.py data/batch.json
```

### Convert CSV to JSON
```bash
python3 scripts/import/csv_to_batch_json.py \
  input.csv output.json \
  --type figures \
  --source "Dataset Name" \
  --curator "Your Name"
```

### Import (Dry Run)
```bash
python3 scripts/import/batch_import.py data/batch.json --dry-run
```

### Import (Execute)
```bash
python3 scripts/import/batch_import.py data/batch.json --execute
```

## JSON Schema

### Minimal Figure
```json
{
  "metadata": {
    "source": "Wikipedia",
    "curator": "Your Name",
    "date": "2026-02-01"
  },
  "figures": [
    {
      "name": "Julius Caesar",
      "wikidata_id": "Q1048"
    }
  ]
}
```

### Minimal Work
```json
{
  "metadata": {
    "source": "IMDb",
    "curator": "Your Name",
    "date": "2026-02-01"
  },
  "works": [
    {
      "title": "Gladiator",
      "wikidata_id": "Q128518"
    }
  ]
}
```

### With Relationship
```json
{
  "metadata": { /* ... */ },
  "figures": [ /* ... */ ],
  "works": [ /* ... */ ],
  "relationships": [
    {
      "from_id": "Q1048",
      "from_type": "HistoricalFigure",
      "to_id": "Q128518",
      "to_type": "MediaWork",
      "rel_type": "APPEARS_IN"
    }
  ]
}
```

## Field Reference

### HistoricalFigure

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `name` | string | ✅ | "Julius Caesar" |
| `wikidata_id` | string | One of canonical_id/wikidata_id | "Q1048" |
| `canonical_id` | string | One of canonical_id/wikidata_id | "Q1048" |
| `birth_year` | integer | ❌ | -100 |
| `death_year` | integer | ❌ | -44 |
| `title` | string | ❌ | "Roman General" |
| `era` | string | ❌ | "Roman Republic" |
| `description` | string | ❌ | "Roman general..." |

### MediaWork

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `title` | string | ✅ | "Gladiator" |
| `wikidata_id` | string | ⚠️ Strongly Recommended | "Q128518" |
| `media_type` | string | ❌ | "FILM" |
| `release_year` | integer | ❌ | 2000 |
| `creator` | string | ❌ | "Ridley Scott" |
| `creator_wikidata_id` | string | ❌ | "Q56005" |
| `description` | string | ❌ | "Epic historical drama" |

### Relationship

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `from_id` | string | ✅ | "Q1048" |
| `from_type` | string | ✅ | "HistoricalFigure" |
| `to_id` | string | ✅ | "Q128518" |
| `to_type` | string | ✅ | "MediaWork" |
| `rel_type` | string | ✅ | "APPEARS_IN" |
| `properties` | object | ❌ | `{"role": "protagonist"}` |

## Valid Enums

### media_type
- `BOOK`
- `FILM`
- `TV_SERIES`
- `GAME`
- `PLAY`
- `COMIC`

### rel_type
- `APPEARS_IN` - Figure appears in work
- `PORTRAYED_IN` - Figure portrayed in work
- `INTERACTED_WITH` - Figures interacted
- `BASED_ON` - Character based on figure
- `FICTIONAL_PROXY` - Character represents figure
- `CONTEMPORARY` - Lived at same time

### sentiment (in relationship properties)
- `heroic`
- `villainous`
- `neutral`
- `complex`

## Command Options

### batch_import.py

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview without changes | True |
| `--execute` | Execute import | False |
| `--batch-size N` | Records per transaction | 50 |
| `--agent NAME` | Agent for CREATED_BY | "batch-importer" |
| `--figures-only` | Import only figures | False |
| `--works-only` | Import only works | False |
| `--skip-duplicate-check` | Skip duplicate detection | False |
| `--skip-wikidata-validation` | Skip Q-ID validation | False |
| `--report PATH` | Output report path | "batch_import_report.md" |

## Workflow

```
1. Prepare data     → CSV or JSON file
                      ↓
2. Convert (if CSV) → python3 csv_to_batch_json.py
                      ↓
3. Validate         → python3 validate_batch_json.py
                      ↓
4. Dry run          → python3 batch_import.py --dry-run
                      ↓
5. Review report    → cat batch_import_report.md
                      ↓
6. Execute          → python3 batch_import.py --execute
                      ↓
7. Verify           → Check Neo4j Browser
```

## Error Messages

### "metadata.date is required"
**Fix**: Add date in YYYY-MM-DD format
```json
"metadata": {
  "date": "2026-02-01"
}
```

### "wikidata_id invalid format"
**Fix**: Q-ID must be Q followed by digits
```json
"wikidata_id": "Q1048"  // ✅ Correct
"wikidata_id": "1048"   // ❌ Wrong
```

### "must provide either canonical_id or wikidata_id"
**Fix**: Add at least one identifier
```json
{
  "name": "Julius Caesar",
  "wikidata_id": "Q1048"  // Add this
}
```

### "MediaWork has no wikidata_id"
**Fix**: Add Wikidata Q-ID (REQUIRED for works)
```json
{
  "title": "Gladiator",
  "wikidata_id": "Q128518"  // Add this
}
```

## Tips

1. **Always use Wikidata Q-IDs**: Search at https://www.wikidata.org
2. **Validate before importing**: Use `validate_batch_json.py`
3. **Dry run first**: Always preview with `--dry-run`
4. **Check reports**: Review `batch_import_report.md`
5. **Split large imports**: ~1000 records per file
6. **Use descriptive agent names**: e.g., `wikipedia-roman-2026-02`

## Examples

See `/data/examples/`:
- `batch_figures_only.json`
- `batch_works_only.json`
- `batch_full_import.json`
- `figures_template.csv`
- `works_template.csv`

## Full Documentation

For comprehensive guide, see `/docs/batch-import-guide.md`
