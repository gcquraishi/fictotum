# ChronosGraph Web App

A Next.js web application that visualizes how historical figures are portrayed differently across fiction and history.

## Features

- **Dashboard**: Search and browse historical figures
- **Profile Pages**: Detailed view of each figure with:
  - Conflict Radar: Visual sentiment distribution (Heroic, Villainous, Complex)
  - Media Timeline: Chronological list of media appearances
  - Graph Explorer: Interactive force-directed graph visualization
  - Quick stats and metadata

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (Dark Mode by default)
- **Database**: Neo4j (via neo4j-driver)
- **Icons**: Lucide React
- **Visualization**:
  - recharts (for pie charts)
  - react-force-graph-2d (for network graphs)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Access to a Neo4j database instance
- Neo4j database credentials

### Installation

1. **Navigate to the web-app directory**:
   ```bash
   cd web-app
   ```

2. **Install dependencies** (already done):
   ```bash
   npm install
   ```

3. **Configure environment variables**:

   Edit `.env.local` and add your Neo4j credentials:
   ```env
   NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
   NEO4J_USERNAME=neo4j
   NEO4J_PASSWORD=your_password_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
web-app/
├── app/                        # Next.js App Router
│   ├── figure/[id]/           # Dynamic figure profile pages
│   │   ├── page.tsx           # Profile page component
│   │   └── not-found.tsx      # 404 page for figures
│   ├── search/                # Search results page
│   │   └── page.tsx
│   ├── page.tsx               # Dashboard (home page)
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/                # React components
│   ├── ConflictRadar.tsx      # Sentiment distribution pie chart
│   ├── GraphExplorer.tsx      # Force-directed graph visualization
│   └── MediaTimeline.tsx      # Media appearances timeline
├── lib/                       # Utility functions and services
│   ├── neo4j.ts              # Neo4j driver connection
│   ├── db.ts                 # Database query functions
│   └── types.ts              # TypeScript type definitions
└── .env.local                # Environment variables (not in git)
```

## Database Schema

The application expects the following Neo4j schema:

### Nodes
- `:HistoricalFigure`
  - `canonical_id` (string, required)
  - `name` (string, required)
  - `is_fictional` (boolean, optional)
  - `era` (string, optional)

- `:MediaWork`
  - `title` (string, required)
  - `release_year` (number, required)
  - `wikidata_id` (string, optional)

### Relationships
- `(:HistoricalFigure)-[:APPEARS_IN {sentiment: "Heroic" | "Villainous" | "Complex"}]->(:MediaWork)`
- `(:HistoricalFigure)-[:INTERACTED_WITH]->(:HistoricalFigure)`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Key Features

### 1. Dashboard (`/`)
- Search bar for finding historical figures
- Grid of featured figures
- Direct navigation to figure profiles

### 2. Search (`/search?q=term`)
- Real-time search results
- Filtering by figure name
- Quick access to figure profiles

### 3. Figure Profile (`/figure/[id]`)
- **Header**: Figure name, era, and fictional badge
- **Conflict Radar**: Pie chart showing sentiment distribution
- **Quick Stats**: Total portrayals, canonical ID, date range
- **Media Timeline**: Chronological list of media appearances with sentiment tags
- **Graph Explorer**: Interactive force-directed graph showing the figure and connected media works

## Customization

### Colors
The app uses a consistent color scheme for sentiments:
- **Heroic**: Green (#22c55e)
- **Villainous**: Red (#ef4444)
- **Complex**: Yellow (#eab308)

### Dark Mode
Dark mode is enabled by default. To modify, edit `app/globals.css` and `app/layout.tsx`.

## Troubleshooting

### No figures showing up
1. Check your Neo4j credentials in `.env.local`
2. Verify your Neo4j instance is running
3. Ensure your database has `:HistoricalFigure` nodes

### Graph visualization not rendering
- The GraphExplorer component uses dynamic imports to avoid SSR issues
- Ensure `react-force-graph-2d` is properly installed
- Check browser console for errors

## Next Steps

- Add more visualization types
- Implement figure-to-figure relationship graphs
- Add filtering and sorting options
- Implement authentication for admin features
- Add caching for better performance

## License

Part of the ChronosGraph project.
