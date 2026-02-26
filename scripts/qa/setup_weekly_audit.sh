#!/bin/bash
# Setup weekly disambiguation audits for Fictotum
# Run this script once to configure automatic weekly audits

PROJECT_ROOT="/Users/gcquraishi/Documents/big-heavy/fictotum"
AUDIT_SCRIPT="$PROJECT_ROOT/scripts/qa/run_disambiguation_audit.py"
LOG_DIR="$PROJECT_ROOT/logs/audits"
CRON_JOB="0 2 * * 1 cd $PROJECT_ROOT && python3 $AUDIT_SCRIPT >> $LOG_DIR/audit_$(date +\%Y\%m\%d_\%H\%M\%S).log 2>&1"

# Create audit logs directory
mkdir -p "$LOG_DIR"
echo "✅ Created audit logs directory: $LOG_DIR"

# Add cron job (macOS/Linux)
(crontab -l 2>/dev/null | grep -v "$AUDIT_SCRIPT"; echo "$CRON_JOB") | crontab -
echo "✅ Added cron job to run audits every Monday at 2:00 AM"
echo ""
echo "Cron schedule: 0 2 * * 1"
echo "  - 0: Minute (00)"
echo "  - 2: Hour (02:00 AM)"
echo "  - *: Day of month (any)"
echo "  - *: Month (any)"
echo "  - 1: Day of week (Monday)"
echo ""
echo "📋 To view scheduled audits:"
echo "   crontab -l | grep disambiguation"
echo ""
echo "📋 To remove weekly audits:"
echo "   crontab -e"
echo "   (and delete the disambiguation audit line)"
echo ""
echo "📊 Audit logs will be saved to: $LOG_DIR"
