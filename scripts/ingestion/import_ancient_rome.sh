#!/bin/bash
set -e

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Run import
python3 scripts/ingestion/import_batch.py \
    data/examples/ancient-rome.json \
    --batch-id ancient-rome-2026-02-02
