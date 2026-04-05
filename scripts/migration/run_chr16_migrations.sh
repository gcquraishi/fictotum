#!/bin/bash
# CHR-16 Migration Runner
# Executes all schema migrations for the Unified Data Ingestion Hub
#
# Usage:
#   ./run_chr16_migrations.sh          # Run all migrations
#   ./run_chr16_migrations.sh --dry-run   # Preview all migrations
#   ./run_chr16_migrations.sh --rollback  # Rollback all migrations (in reverse order)

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MODE="${1:-}"

echo "============================================================================="
echo "CHR-16 Unified Data Ingestion Hub - Schema Migration Runner"
echo "============================================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Migration scripts in recommended order
MIGRATIONS=(
    "add_wikidata_verified_flags.py"
    "add_location_historical_names.py"
    "migrate_era_to_tags.py"
    "create_flagged_location_schema.py"
    "create_flagged_era_schema.py"
)

if [ "$MODE" = "--rollback" ]; then
    echo -e "${YELLOW}ROLLBACK MODE${NC}"
    echo "Will execute rollback in REVERSE order"
    echo ""

    # Reverse order for rollback
    for (( idx=${#MIGRATIONS[@]}-1 ; idx>=0 ; idx-- )) ; do
        script="${MIGRATIONS[idx]}"
        echo "----------------------------------------"
        echo "Rolling back: $script"
        echo "----------------------------------------"
        python3 "$SCRIPT_DIR/$script" --rollback

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Rollback successful: $script${NC}"
        else
            echo -e "${RED}✗ Rollback failed: $script${NC}"
            exit 1
        fi
        echo ""
    done

elif [ "$MODE" = "--dry-run" ]; then
    echo -e "${YELLOW}DRY RUN MODE${NC}"
    echo "No changes will be made"
    echo ""

    for script in "${MIGRATIONS[@]}"; do
        echo "----------------------------------------"
        echo "Dry run: $script"
        echo "----------------------------------------"
        python3 "$SCRIPT_DIR/$script" --dry-run
        echo ""
    done

else
    echo -e "${GREEN}MIGRATION MODE${NC}"
    echo "Will execute all migrations in order"
    echo ""

    if [ "$MODE" != "--yes" ]; then
        read -p "Continue with migration? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo "Migration cancelled"
            exit 0
        fi
    fi

    echo ""

    for script in "${MIGRATIONS[@]}"; do
        echo "----------------------------------------"
        echo "Running: $script"
        echo "----------------------------------------"

        # Run with auto-confirm (assumes 'yes' input)
        echo "yes" | python3 "$SCRIPT_DIR/$script"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Migration successful: $script${NC}"
        else
            echo -e "${RED}✗ Migration failed: $script${NC}"
            echo ""
            echo "Migration stopped. To rollback, run:"
            echo "  ./run_chr16_migrations.sh --rollback"
            exit 1
        fi
        echo ""
    done
fi

echo "============================================================================="
echo -e "${GREEN}All operations completed successfully!${NC}"
echo "============================================================================="
echo ""

if [ "$MODE" = "" ]; then
    echo "Next steps:"
    echo "  1. Review migration output above for any warnings"
    echo "  2. Update Era nodes with placeholder dates (start_year=0)"
    echo "  3. Verify schema with: SHOW CONSTRAINTS and SHOW INDEXES"
    echo "  4. Test ingestion pipeline with new schema"
fi
