# Neo4j Health Check Automation

**Status**: ✅ CONFIGURED (Sprint 3 - February 2026)

## Overview

Automated weekly health monitoring for the Fictotum Neo4j database using GitHub Actions. Generates comprehensive health reports and commits them to the repository for historical tracking.

## Schedule

- **Frequency**: Every Monday at 00:00 UTC
- **Workflow File**: `.github/workflows/weekly-health-check.yml`
- **Reports Saved To**: `docs/reports/health-checks/YYYY-MM-DD_health_report.md`

## What Gets Checked

### 1. Connection Status
- Verifies Neo4j Aura connection
- Tests query execution
- Validates credentials

### 2. Node Counts
- Total nodes by label (HistoricalFigure, MediaWork, etc.)
- Tracks growth over time
- Detects unexpected drops

### 3. Relationship Counts
- Total relationships by type
- CREATED_BY provenance tracking
- Network density metrics

### 4. Orphaned Nodes
- Nodes with no relationships
- Should be minimal (< 5)
- User node expected to be orphaned

### 5. Provenance Coverage
- CREATED_BY relationship coverage percentage
- **Target**: 100% for all entity nodes
- Alerts if coverage drops below 100%

### 6. Index Health
- Checks all 34 database indexes
- Ensures all are ONLINE status
- Alerts if any index is degraded

## Alert Conditions

### Critical Errors (Workflow Fails)
- ❌ Database connection failure
- ❌ Any critical errors in report

### Warnings (Logged, Workflow Passes)
- ⚠️ Provenance coverage < 100%
- ⚠️ Orphaned nodes > 5
- ⚠️ Index not ONLINE

## GitHub Secrets Required

The workflow requires the following secrets to be configured in GitHub repository settings:

```
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
```

### Setting Up Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each of the three secrets above
4. Verify workflow has access to secrets

## Manual Triggering

You can manually trigger the health check workflow:

1. Go to **Actions** tab in GitHub
2. Select **Weekly Neo4j Health Check** workflow
3. Click **Run workflow** button
4. Select branch (usually `main`)
5. Click **Run workflow**

This is useful for:
- Testing the workflow after changes
- Running health checks on-demand
- Verifying after major database changes

## Local Testing

Before relying on the automated workflow, test locally:

```bash
# Install dependencies
pip install neo4j python-dotenv

# Create .env file with credentials
cat > .env << EOF
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
EOF

# Run health check
python3 scripts/qa/neo4j_health_check.py --report test_health_report.md

# Review output
cat test_health_report.md
```

## Report Format

Each health report includes:

### Node Counts Table
| Label | Count |
|-------|-------|
| HistoricalFigure | 795 |
| MediaWork | 708 |
| ... | ... |

### Relationship Counts Table
| Type | Count |
|------|-------|
| CREATED_BY | 1,594 |
| APPEARS_IN | 680 |
| ... | ... |

### Provenance Coverage Table
| Label | With CREATED_BY | Without CREATED_BY | Coverage |
|-------|-----------------|-------------------|----------|
| HistoricalFigure | 795 | 0 | ✅ 100.0% |
| MediaWork | 708 | 0 | ✅ 100.0% |

### Warnings Section (if any)
- List of detected issues
- Orphaned nodes
- Missing provenance

## Viewing Historical Reports

All health check reports are stored in version control:

```bash
# List all health reports
ls -lh docs/reports/health-checks/

# View a specific report
cat docs/reports/health-checks/2026-02-09_health_report.md

# Compare two reports to see growth
diff docs/reports/health-checks/2026-02-02_health_report.md \
     docs/reports/health-checks/2026-02-09_health_report.md
```

## Monitoring Growth Trends

To analyze database growth over time:

```bash
# Extract node counts from all reports
grep "TOTAL.*nodes" docs/reports/health-checks/*.md

# Extract provenance coverage
grep "100.0% coverage" docs/reports/health-checks/*.md

# Check for warnings over time
grep "⚠️" docs/reports/health-checks/*.md
```

## Troubleshooting

### Workflow Fails with "Connection Failed"

**Possible causes**:
- Neo4j Aura instance is down
- Credentials have changed or expired
- Network connectivity issues
- IP allowlist blocking GitHub Actions IPs

**Solutions**:
1. Check Neo4j Aura console for instance status
2. Verify secrets in GitHub settings are correct
3. Update Neo4j IP allowlist to allow GitHub Actions (0.0.0.0/0 for testing)
4. Check workflow logs for specific error message

### Report Shows Missing Provenance

**Expected behavior**: All entity nodes should have CREATED_BY relationships

**If provenance is missing**:
1. Review the report to identify which nodes are missing provenance
2. Run the backfill script:
   ```bash
   python3 scripts/migration/backfill_created_by_provenance.py --dry-run
   python3 scripts/migration/backfill_created_by_provenance.py
   ```
3. Verify APIs are creating CREATED_BY on new nodes
4. Check batch import script is setting CREATED_BY properly

### Orphaned Nodes Detected

**Some orphaned nodes are expected**:
- `User` node (1) - Expected, not connected to graph
- `Agent` nodes - May be orphaned if no entities created by them yet

**Unexpected orphaned nodes**:
- HistoricalFigure with no relationships - investigate why
- MediaWork with no portrayals - may be newly added
- FictionalCharacter with no appearances - data quality issue

**Resolution**:
1. Query the orphaned nodes:
   ```cypher
   MATCH (n:HistoricalFigure)
   WHERE NOT (n)--()
   RETURN n.name, n.canonical_id
   ```
2. Determine if they should have relationships
3. Add missing relationships or delete if invalid data

## Workflow Maintenance

### Updating the Schedule

Edit `.github/workflows/weekly-health-check.yml`:

```yaml
on:
  schedule:
    # Run every Monday at 00:00 UTC
    - cron: '0 0 * * 1'

    # To run daily instead:
    # - cron: '0 0 * * *'

    # To run twice per week (Monday and Thursday):
    # - cron: '0 0 * * 1,4'
```

### Adding Email Notifications

To get email notifications on failures:

1. Go to repository Settings → Notifications
2. Enable "Actions" notifications
3. Choose notification frequency
4. Add email address

Or use a GitHub Action for custom notifications:

```yaml
- name: Send notification
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Fictotum Health Check Failed
    body: Weekly health check detected issues. Review the workflow logs.
    to: admin@fictotum.com
```

## Cost Considerations

GitHub Actions usage:
- **Free tier**: 2,000 minutes/month for public repos
- **This workflow**: ~2-3 minutes per run
- **Weekly runs**: ~12 minutes/month
- **Cost**: FREE (well within limits)

Neo4j Aura:
- Health check performs read-only queries
- Minimal database load (< 1 second query time)
- No impact on Aura billing

## Security Best Practices

1. **Never commit credentials** - Always use GitHub Secrets
2. **Rotate credentials periodically** - Update secrets every 90 days
3. **Use read-only credentials if possible** - Health check only needs read access
4. **Review workflow logs** - Check for any exposed sensitive data
5. **Limit workflow permissions** - Use least-privilege principle

## Future Enhancements

Potential improvements for future sprints:

1. **Alerting Integration**
   - Slack webhook notifications on failures
   - Email alerts for critical issues
   - PagerDuty integration for on-call alerts

2. **Trend Analysis**
   - Automated growth charts
   - Performance degradation detection
   - Anomaly detection (sudden drops in nodes)

3. **Advanced Metrics**
   - Query performance benchmarks
   - Memory usage tracking
   - Cache hit rates

4. **Dashboard Integration**
   - Visualize health trends over time
   - Interactive charts for node growth
   - Real-time status page

5. **Predictive Monitoring**
   - Forecast database growth
   - Alert before hitting size limits
   - Capacity planning recommendations

---

## Quick Reference

### Commands

```bash
# Manual health check
python3 scripts/qa/neo4j_health_check.py --report health_report.md

# View latest report
cat docs/reports/health-checks/$(ls -t docs/reports/health-checks/ | head -1)

# Count total reports
ls docs/reports/health-checks/ | wc -l

# Check workflow status
gh workflow view "Weekly Neo4j Health Check"

# Trigger manual run
gh workflow run "Weekly Neo4j Health Check"
```

### Important Files

- **Workflow**: `.github/workflows/weekly-health-check.yml`
- **Script**: `scripts/qa/neo4j_health_check.py`
- **Reports**: `docs/reports/health-checks/YYYY-MM-DD_health_report.md`
- **Docs**: `docs/automation/HEALTH_CHECK_AUTOMATION.md` (this file)

### Support

For issues or questions:
1. Check workflow logs in GitHub Actions tab
2. Review this documentation
3. Check Neo4j Aura console for instance health
4. Contact repository maintainers

---

**Documentation Version**: 1.0
**Last Updated**: February 2, 2026
**Author**: Claude Code (Sonnet 4.5)
