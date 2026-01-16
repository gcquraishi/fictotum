# ChronosGraph

A knowledge graph visualizing how historical figures are portrayed differently across fiction and history.

## Project Overview

ChronosGraph uses Neo4j to map relationships between historical figures and their depictions in various media works (TV series, films, video games, books, etc.), tracking sentiment and characterization across different portrayals.

## Project Structure

```
chronosgraph/
├── web-app/               # Next.js web application
├── scripts/               # Python scripts for database management
│   ├── ingestion/         # Data ingestion scripts
│   ├── migration/         # Database migration scripts
│   ├── research/          # Research and data gathering tools
│   └── schema.py          # Neo4j schema definitions
├── data/                  # JSON expansion files
├── docs/                  # Documentation and reports
├── .env                   # Environment variables
├── requirements.txt       # Python dependencies
└── CLAUDE.md              # Project instructions for AI assistants
```

## Tech Stack

### Backend
- **Database**: Neo4j Aura
- **Python**: 3.x
- **Libraries**: neo4j-driver, python-dotenv, google-genai

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database Client**: neo4j-driver
- **Visualization**: recharts, react-force-graph-2d

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd chronosgraph
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
GEMINI_API_KEY=your_api_key
```

### 3. Install Dependencies

**Python:**
```bash
pip install -r requirements.txt
```

**Web App:**
```bash
cd web-app
npm install
```

### 4. Run the Web Application

```bash
cd web-app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Data Schema

### Nodes

**`:HistoricalFigure`**
- `canonical_id` (string, unique)
- `name` (string)
- `is_fictional` (boolean)
- `era` (string, optional)

**`:MediaWork`**
- `title` (string)
- `release_year` (integer)
- `wikidata_id` (string, unique, optional)

### Relationships

**`:APPEARS_IN`**
```cypher
(:HistoricalFigure)-[:APPEARS_IN {sentiment: "Heroic" | "Villainous" | "Complex"}]->(:MediaWork)
```

**`:INTERACTED_WITH`**
```cypher
(:HistoricalFigure)-[:INTERACTED_WITH]->(:HistoricalFigure)
```

## Usage

### Ingesting Data

To add new historical data, create a JSON expansion file in `data/` and run:

```bash
python scripts/ingestion/ingest_unified_expansion.py data/your_expansion.json
```

See `scripts/README.md` for detailed documentation on all available scripts.

### Data Format

Expansion JSON files should follow this format:

```json
{
  "historical_figures": [
    {
      "canonical_id": "marcus_aurelius",
      "name": "Marcus Aurelius",
      "is_fictional": false,
      "era": "161-180 CE"
    }
  ],
  "media_works": [
    {
      "title": "Gladiator",
      "release_year": 2000,
      "wikidata_id": "Q128518"
    }
  ],
  "portrayals": [
    {
      "figure_id": "marcus_aurelius",
      "media_title": "Gladiator",
      "sentiment": "Complex"
    }
  ]
}
```

## Features

### Web Application
- **Dashboard**: Search and browse historical figures
- **Profile Pages**: Detailed views with:
  - Sentiment distribution charts
  - Media appearance timeline
  - Interactive force-directed graph
- **Search**: Real-time figure search

### Database Management
- **Ingestion**: Multiple specialized ingestion scripts
- **Migration**: Tools for updating existing data
- **Research**: Wikidata harvesting and AI-powered research

## Entity Resolution

- **Historical Figures**: Use `canonical_id` for identity
- **Media Works**: Use Wikidata Q-IDs when available
- **Fictional Anchors**: Supported with `is_fictional: true` flag

## Contributing

See `CLAUDE.md` for development guidelines and AI assistant instructions.

## Documentation

- `scripts/README.md` - Script documentation
- `web-app/README.md` - Web application documentation
- `docs/` - Project reports and decisions

## License

Part of the ChronosGraph project.
