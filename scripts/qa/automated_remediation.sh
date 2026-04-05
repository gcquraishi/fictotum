#!/bin/bash
# Automated disambiguation remediation triggered by weekly audits
# This script runs after weekly audits to automatically fix detected issues

PROJECT_ROOT="/Users/gcquraishi/Documents/big-heavy/fictotum"
MERGE_SCRIPT="$PROJECT_ROOT/scripts/qa/merge_duplicate_entities.py"
AUDIT_SCRIPT="$PROJECT_ROOT/scripts/qa/run_disambiguation_audit.py"
LOG_DIR="$PROJECT_ROOT/logs/audits"
REPORT_DIR="$PROJECT_ROOT/disambiguation_reports"

# Create reports directory
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
AUDIT_LOG="$LOG_DIR/audit_$TIMESTAMP.log"
MERGE_LOG="$LOG_DIR/merge_$TIMESTAMP.log"

echo "=========================================="
echo "🔍 Fictotum Weekly Disambiguation Audit & Remediation"
echo "Timestamp: $TIMESTAMP"
echo "=========================================="

# Step 1: Run disambiguation audit
echo ""
echo "Step 1: Running disambiguation audit..."
python3 "$AUDIT_SCRIPT" > "$AUDIT_LOG" 2>&1
AUDIT_EXIT=$?

if [ $AUDIT_EXIT -eq 0 ]; then
    echo "✅ Audit completed successfully"
    echo "   Log: $AUDIT_LOG"
else
    echo "❌ Audit failed with exit code $AUDIT_EXIT"
    echo "   Log: $AUDIT_LOG"
    exit 1
fi

# Step 2: Auto-merge confirmed duplicates (non-interactive)
echo ""
echo "Step 2: Auto-merging confirmed duplicates..."
echo "CONFIRM" | python3 "$MERGE_SCRIPT" --execute > "$MERGE_LOG" 2>&1
MERGE_EXIT=$?

if [ $MERGE_EXIT -eq 0 ]; then
    echo "✅ Merge completed successfully"
    echo "   Log: $MERGE_LOG"
else
    echo "❌ Merge had warnings (exit code $MERGE_EXIT)"
    echo "   Log: $MERGE_LOG"
fi

# Step 3: Summary report
echo ""
echo "=========================================="
echo "📊 Remediation Summary ($TIMESTAMP)"
echo "=========================================="
echo "Audit Log:     $AUDIT_LOG"
echo "Merge Log:     $MERGE_LOG"
echo "Reports Dir:   $REPORT_DIR"
echo ""
echo "✅ Weekly disambiguation maintenance complete"
