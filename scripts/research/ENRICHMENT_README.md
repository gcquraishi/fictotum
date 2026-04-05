# Fictotum Enrichment Worker - Digital Kanban System

A resilient, autonomous AI enrichment pipeline for processing large backlogs of media works.

## Architecture

This system implements a "Digital Kanban" pattern with three file-based queues:

```
data/
├── 1_todo_harvest.json     # 📥 Works waiting to be enriched
├── 2_done_enriched.json    # ✅ Successfully enriched works
└── 3_failed_qa.json        # ❌ Works that failed (need manual review)
```

### Single-Piece Flow

The worker processes **one work at a time** in a continuous loop:
1. Find the next unprocessed work from `1_todo_harvest.json`
2. Enrich it using Gemini API (with exponential backoff retry)
3. Move to `2_done_enriched.json` on success
4. Move to `3_failed_qa.json` on permanent failure
5. Sleep 5 seconds (polite rate limiting)
6. Repeat until queue is empty

### Resilient API Calls

- **Retry Strategy**: Exponential backoff with jitter
- **Initial Wait**: 20 seconds
- **Progression**: ~20s → ~40s → ~80s → ~160s → ~300s
- **Max Attempts**: 5 retries before marking as failed
- **Trigger**: Only retries on rate limit (429) errors
- **Resumable**: Can safely stop and restart the worker at any time

## Prerequisites

```bash
pip install google-genai tenacity python-dotenv
```

Create a `.env` file in the project root:
```bash
GEMINI_API_KEY=your_api_key_here
```

## Usage

### Step 1: Initialize the Kanban Board

This merges your harvest files into the TODO queue:

```bash
cd /Users/gcquraishi/Documents/fictotum
python scripts/research/setup_kanban.py
```

Output:
```
🎯 Initializing Kanban Board for Fictotum Enrichment
✅ Loaded 42 works from century_harvest.json
✅ Loaded 38 works from davis_harvest.json
📊 Total unique works to process: 80
✅ Created: data/1_todo_harvest.json
✅ Created: data/2_done_enriched.json
✅ Created: data/3_failed_qa.json
```

### Step 2: Start the Enrichment Worker

```bash
python scripts/research/enrich_worker.py
```

Output:
```
🚀 Fictotum Enrichment Worker Started
📋 Kanban Board:
   TODO:   data/1_todo_harvest.json
   DONE:   data/2_done_enriched.json
   FAILED: data/3_failed_qa.json

[1] Processing: Cleopatra (Q4430)
   ✅ Success! Found 3 character(s). Added to DONE.
   ⏳ Waiting 5 seconds before next work...

[2] Processing: Spartacus (Q1249642)
   ✅ Success! Found 2 character(s). Added to DONE.
   ⏳ Waiting 5 seconds before next work...
```

### Step 3: Handle Interruptions

**The worker is fully resumable.** You can:
- Press `Ctrl+C` to stop it at any time
- Restart it later with the same command
- It will automatically skip works already in DONE or FAILED

### Step 4: Review Failed Works

Check `data/3_failed_qa.json` for works that need manual attention:

```bash
cat data/3_failed_qa.json | jq '.[] | {title, error}'
```

## Enrichment Schema

Input (from harvest):
```json
{
  "wikidata_id": "Q4430",
  "title": "Cleopatra",
  "release_year": 1963,
  "media_type": "film",
  "era_set_in": "1st century BC",
  "source": "century_harvest"
}
```

Output (enriched):
```json
{
  "wikidata_id": "Q4430",
  "title": "Cleopatra",
  "release_year": 1963,
  "media_type": "film",
  "era_set_in": "1st century BC",
  "source": "century_harvest",
  "historical_figures": [
    {
      "canonical_id": "cleopatra_vii",
      "name": "Cleopatra VII",
      "is_fictional": false
    },
    {
      "canonical_id": "julius_caesar",
      "name": "Julius Caesar",
      "is_fictional": false
    }
  ],
  "portrayals": [
    {
      "figure_id": "cleopatra_vii",
      "sentiment": "Complex",
      "role_description": "Queen of Egypt navigating Roman politics",
      "is_protagonist": false
    },
    {
      "figure_id": "julius_caesar",
      "sentiment": "Heroic",
      "role_description": "Roman general and Cleopatra's ally",
      "is_protagonist": false
    }
  ]
}
```

## Monitoring Progress

Check queue sizes:
```bash
echo "TODO: $(jq length data/1_todo_harvest.json)"
echo "DONE: $(jq length data/2_done_enriched.json)"
echo "FAILED: $(jq length data/3_failed_qa.json)"
```

Calculate completion percentage:
```bash
python -c "
import json
todo = len(json.load(open('data/1_todo_harvest.json')))
done = len(json.load(open('data/2_done_enriched.json')))
failed = len(json.load(open('data/3_failed_qa.json')))
total = todo + done + failed
print(f'Progress: {done}/{total} ({100*done//total}%)')
print(f'Failed: {failed}/{total} ({100*failed//total}%)')
"
```

## Co-CEO Tips

1. **Run in `screen` or `tmux`** for long sessions:
   ```bash
   screen -S enrichment
   python scripts/research/enrich_worker.py
   # Detach: Ctrl+A, then D
   # Reattach: screen -r enrichment
   ```

2. **Batch reset** (move everything back to TODO):
   ```bash
   # Backup first!
   cp data/2_done_enriched.json data/2_done_enriched.json.backup
   # Reset
   echo "[]" > data/2_done_enriched.json
   echo "[]" > data/3_failed_qa.json
   ```

3. **Rate limit strategy**: The 5-second delay between successful calls + exponential backoff on errors should keep you well within Gemini's free tier limits.

4. **Next steps**: After enrichment completes, use the ingestion engine to load into Neo4j:
   ```bash
   python scripts/ingestion/ingest.py --data data/2_done_enriched.json
   ```
