# ChronosGraph Data Quality Maintenance

This directory contains scripts for maintaining data quality and integrity.

## Regular Maintenance Tasks

### Weekly: Audit Wikidata Q-IDs

Run the audit script to find incorrect or missing Q-IDs:

```bash
# Audit all works (takes ~5-10 minutes for 100 works)
python3 scripts/qa/audit_wikidata_ids.py

# Or use the sample audit for quick checks
python3 scripts/qa/quick_audit_sample.py
```

Review the output for suspicious works and run the fix script.

### As Needed: Fix Bad Q-IDs

When the audit finds issues, run the fix script:

```bash
# Dry run first (shows what would be fixed)
python3 scripts/maintenance/fix_bad_qids.py --dry-run

# Fix missing/provisional Q-IDs
python3 scripts/maintenance/fix_bad_qids.py

# Validate and fix existing Q-IDs (more intensive)
python3 scripts/maintenance/fix_bad_qids.py --validate-existing --limit 50
```

The script will:
- Search Wikidata for correct Q-IDs
- Validate matches with fuzzy title matching
- Update the database automatically
- Log all changes

### Monitoring

Check logs for data quality warnings:

```bash
# Check server logs for validation warnings
grep "Q-ID validation" logs/next.log

# Check for provisional IDs being created
grep "PROV:" logs/ingestion.log
```

## Automated Data Quality in Production

### 1. Media Creation Flow (Web UI)

When users add works via `/contribute/media` or `/contribute/creator`:

**✅ Automatic Q-ID lookup happens:**
- User provides: title, creator, year, media type
- System searches Wikidata automatically
- Best match selected if confidence ≥ 70%
- Q-ID stored with work

**✅ Validation for user-provided Q-IDs:**
- If user provides Q-ID, it's validated
- Rejects provisional IDs (`PROV:...`)
- Rejects mismatched Q-IDs
- Shows helpful error messages

**Implementation:** `/web-app/app/api/media/create/route.ts`

### 2. Ingestion Scripts

**⚠️ Required for all new ingestion scripts:**

```python
from scripts.lib.wikidata_search import search_wikidata_for_work, validate_qid

# Before creating MediaWork node:
result = search_wikidata_for_work(
    title="War and Peace",
    creator="Leo Tolstoy",
    year=1869,
    media_type="BOOK"
)

if result and result['confidence'] == 'high':
    wikidata_id = result['qid']
else:
    # Manual review required
    raise ValueError(f"Could not find Q-ID for {title}")

# Validate before storing
validation = validate_qid(wikidata_id, title)
if not validation['valid']:
    raise ValueError(f"Invalid Q-ID: {validation['error']}")
```

**Never use:**
- Hardcoded Q-IDs without validation
- Provisional IDs (`PROV:BOOK:AUTHOR:TITLE`)
- Q-IDs from untrusted sources

### 3. Scheduled Audits (Recommended)

Add to crontab for weekly automated audits:

```bash
# Every Sunday at 2 AM
0 2 * * 0 cd /path/to/chronosgraph && python3 scripts/qa/audit_wikidata_ids.py > logs/audit_$(date +\%Y\%m\%d).log 2>&1
```

Email notification setup:

```bash
0 2 * * 0 cd /path/to/chronosgraph && python3 scripts/qa/audit_wikidata_ids.py 2>&1 | mail -s "ChronosGraph Weekly Audit" admin@chronosgraph.com
```

## Data Quality Metrics

Track these metrics:

- **Q-ID Coverage:** % of MediaWorks with valid wikidata_id
- **Validation Failures:** Count of works failing validation
- **Provisional IDs:** Count of works with PROV: identifiers
- **Auto-Fix Success Rate:** % of bad Q-IDs successfully corrected

Query for metrics:

```cypher
// Q-ID coverage
MATCH (m:MediaWork)
RETURN
  count(m) as total_works,
  count(m.wikidata_id) as with_qid,
  toFloat(count(m.wikidata_id)) / count(m) * 100 as coverage_pct

// Provisional IDs
MATCH (m:MediaWork)
WHERE m.wikidata_id STARTS WITH 'PROV:'
RETURN count(m) as provisional_count

// Works without Q-IDs
MATCH (m:MediaWork)
WHERE m.wikidata_id IS NULL
RETURN count(m) as missing_qid_count
```

## Troubleshooting

### "403 Forbidden" from Wikidata

Rate limiting issue. The scripts have built-in rate limiting (500ms between requests), but if you hit limits:

```python
# Increase delay in wikidata_search.py
_min_request_interval = 1000  # 1 second
```

### "No good match found"

The work may not exist in Wikidata. Options:
1. Create the Wikidata entry yourself
2. Store work without Q-ID (allowed for obscure works)
3. Use a related Q-ID (e.g., book series instead of individual book)

### Validation fails for correct Q-ID

Title mismatch between your database and Wikidata. Options:
1. Update your title to match Wikidata
2. Lower similarity threshold (not recommended)
3. Store both titles (your title + wikidata_label)

## Best Practices

1. **Always validate Q-IDs** before storing in database
2. **Never use provisional IDs** - they break deduplication
3. **Run audits regularly** - catch errors early
4. **Log all Q-ID changes** - audit trail for debugging
5. **Monitor fix script success rate** - low success = systematic issue
6. **Review low-confidence matches** - may need manual verification

## Files

- `fix_bad_qids.py` - Main fix script
- `../qa/audit_wikidata_ids.py` - Full audit (all works)
- `../qa/quick_audit_sample.py` - Quick sample audit
- `../lib/wikidata_search.py` - Reusable search/validation module
- `/web-app/lib/wikidata.ts` - TypeScript version for API routes
