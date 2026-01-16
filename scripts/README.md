# ChronosGraph Scripts

Python scripts for managing the ChronosGraph Neo4j database.

## Directory Structure

```
scripts/
├── schema.py              # Neo4j schema definitions and constraints
├── ingestion/             # Data ingestion scripts
├── migration/             # Database migration scripts
└── research/              # Research and data gathering tools
```

## Ingestion Scripts

Scripts for importing historical data into Neo4j.

### `ingestion/ingest_unified_expansion.py`
Universal ingestion engine supporting both historical figures and fictional anchors.

**Usage:**
```bash
python scripts/ingestion/ingest_unified_expansion.py data/<filename>.json
```

**Example:**
```bash
python scripts/ingestion/ingest_unified_expansion.py data/expansion_seed.json
python scripts/ingestion/ingest_unified_expansion.py data/falco_expansion.json
```

### `ingestion/ingest_roman_pilot.py`
Initial pilot data loader for HBO Rome, Assassin's Creed Origins, and The Republic of Rome.

**Usage:**
```bash
python scripts/ingestion/ingest_roman_pilot.py
```

### `ingestion/ingest_fall_of_republic.py`
Comprehensive ingestion for Fall of the Roman Republic era figures.

**Usage:**
```bash
python scripts/ingestion/ingest_fall_of_republic.py
```

### `ingestion/ingest_bridge_to_empire.py`
Age of Augustus expansion including I, Claudius and Cleopatra.

**Usage:**
```bash
python scripts/ingestion/ingest_bridge_to_empire.py
```

### `ingestion/ingest_expansion_seed.py`
Loads expansion seed data.

**Usage:**
```bash
python scripts/ingestion/ingest_expansion_seed.py
```

### `ingestion/ingest_harvested.py`
Imports Wikidata-harvested works.

**Usage:**
```bash
python scripts/ingestion/ingest_harvested.py data/harvested_works.json
```

## Migration Scripts

Scripts for updating or migrating existing database data.

### `migration/migrate_wikidata_ids.py`
Adds Wikidata IDs to existing MediaWork nodes.

**Usage:**
```bash
python scripts/migration/migrate_wikidata_ids.py
```

### `migration/migrate_add_wikidata_ids.py`
Alternative Wikidata ID migration script.

**Usage:**
```bash
python scripts/migration/migrate_add_wikidata_ids.py
```

## Research Scripts

Tools for gathering and analyzing data.

### `research/harvest_wikidata.py`
Queries Wikidata for historical media works and exports to JSON.

**Usage:**
```bash
python scripts/research/harvest_wikidata.py
```

**Output:** `data/harvested_works.json`

### `research/deep_research.py`
AI-powered deep research tool using Google Gemini.

**Usage:**
```bash
python scripts/research/deep_research.py
```

## Environment Variables

All scripts require a `.env` file in the project root with:

```env
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
GEMINI_API_KEY=your_api_key  # For research scripts
```

## Schema

The `schema.py` file contains:
- `HistoricalFigure` dataclass
- `MediaWork` dataclass
- `Portrayal` dataclass
- `SCHEMA_CONSTRAINTS` - Neo4j constraint definitions
- Enums for `MediaType` and `Sentiment`

All ingestion scripts automatically import and use these definitions.
