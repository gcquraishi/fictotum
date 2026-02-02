#!/bin/bash
# Tier 1 Duplicate Merges: PROV → Q-ID (High Confidence)
# Date: 2026-02-02

API_BASE="http://localhost:3000/api/audit/duplicates/merge"

echo "=== Tier 1 Duplicate Merge Execution ==="
echo ""

# Function to merge and report
merge_duplicate() {
  local name="$1"
  local source_id="$2"
  local target_id="$3"

  echo "Merging: $name"
  echo "  Source: $source_id → Target: $target_id"

  RESPONSE=$(curl -s -X POST "$API_BASE" \
    -H "Content-Type: application/json" \
    -d "{\"primary_id\":\"$target_id\",\"secondary_id\":\"$source_id\",\"dry_run\":false}")

  # Check if successful
  if echo "$RESPONSE" | grep -q '"success":true'; then
    TRANSFERRED=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('relationships_transferred', 0))" 2>/dev/null || echo "?")
    echo "  ✅ Success! Transferred $TRANSFERRED relationships"
  else
    echo "  ❌ Failed: $RESPONSE"
  fi
  echo ""
}

# Execute merges
merge_duplicate "Agrippina the Elder" "PROV:agrippina_elder" "Q229413"
merge_duplicate "Agrippina the Younger" "PROV:agrippina_younger" "Q154732"
merge_duplicate "Camille Desmoulins" "PROV:camille-desmoulins-1769140678336" "Q191590"
merge_duplicate "Gaius Cassius Longinus" "PROV:gaius_cassius" "Q207370"
merge_duplicate "Livia Drusilla" "PROV:livia_drusilla" "Q469701"
merge_duplicate "Lucilla" "PROV:lucilla_noble" "lucilla"
merge_duplicate "Tiberius" "PROV:tiberius" "Q1407"
merge_duplicate "Titus" "PROV:titus_caesar" "titus_emperor"
merge_duplicate "Zenobia" "PROV:zenobia_palmyra" "zenobia"
merge_duplicate "Lucius Cornelius Sulla" "PROV:sulla" "Q82954"
merge_duplicate "Herod the Great" "PROV:herod_great" "Q43915"

echo "=== Tier 1 Merges Complete ==="
