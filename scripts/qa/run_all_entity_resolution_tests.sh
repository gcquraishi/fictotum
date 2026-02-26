#!/bin/bash
###############################################################################
# CHR-54: Entity Resolution Test Runner
#
# Runs both unit tests and integration tests for entity resolution system.
#
# Usage:
#   ./scripts/qa/run_all_entity_resolution_tests.sh
#   ./scripts/qa/run_all_entity_resolution_tests.sh --unit-only
#   ./scripts/qa/run_all_entity_resolution_tests.sh --integration-only
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "======================================================================"
echo "Fictotum Entity Resolution Test Suite (CHR-54)"
echo "======================================================================"
echo ""

# Parse arguments
RUN_UNIT=true
RUN_INTEGRATION=true

if [ "$1" == "--unit-only" ]; then
    RUN_INTEGRATION=false
    echo "Running unit tests only..."
elif [ "$1" == "--integration-only" ]; then
    RUN_UNIT=false
    echo "Running integration tests only..."
else
    echo "Running all tests (unit + integration)..."
fi

echo ""

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
    echo "======================================================================"
    echo "PHASE 1: Unit Tests"
    echo "======================================================================"
    echo ""

    cd "$PROJECT_ROOT"

    if python3 scripts/qa/test_entity_resolution.py; then
        echo -e "${GREEN}✓ Unit tests passed${NC}"
        UNIT_RESULT=0
    else
        echo -e "${RED}✗ Unit tests failed${NC}"
        UNIT_RESULT=1
    fi
    echo ""
fi

# Run integration tests
if [ "$RUN_INTEGRATION" = true ]; then
    echo "======================================================================"
    echo "PHASE 2: Integration Tests"
    echo "======================================================================"
    echo ""

    # Check for .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        echo -e "${RED}ERROR: .env file not found${NC}"
        echo "Integration tests require Neo4j credentials in .env"
        exit 1
    fi

    cd "$PROJECT_ROOT"

    if python3 scripts/qa/test_entity_resolution_integration.py; then
        echo -e "${GREEN}✓ Integration tests passed${NC}"
        INTEGRATION_RESULT=0
    else
        echo -e "${RED}✗ Integration tests failed${NC}"
        INTEGRATION_RESULT=1
    fi
    echo ""
fi

# Final summary
echo "======================================================================"
echo "TEST SUITE SUMMARY"
echo "======================================================================"

if [ "$RUN_UNIT" = true ] && [ "$RUN_INTEGRATION" = true ]; then
    if [ $UNIT_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ]; then
        echo -e "${GREEN}✓ All tests passed!${NC}"
        exit 0
    else
        if [ $UNIT_RESULT -ne 0 ]; then
            echo -e "${RED}✗ Unit tests failed${NC}"
        fi
        if [ $INTEGRATION_RESULT -ne 0 ]; then
            echo -e "${RED}✗ Integration tests failed${NC}"
        fi
        exit 1
    fi
elif [ "$RUN_UNIT" = true ]; then
    exit $UNIT_RESULT
elif [ "$RUN_INTEGRATION" = true ]; then
    exit $INTEGRATION_RESULT
fi
