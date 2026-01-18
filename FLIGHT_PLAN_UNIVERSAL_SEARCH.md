# ChronosGraph Gemini Flight Plan: Universal Search & Creator Ingestion

**OBJECTIVE:** Expand user interactions by implementing a "Universal Search" (Figures, Media, Series, Creators, Actors) and a "Creator-Based Ingestion" workflow.

## 1. ARCHITECTURE & STRATEGY

### A. Schema Expansion (Actors)
- **Goal:** Track which actors portray historical figures in media.
- **Implementation:** Add an optional `actor_name` property to the `Portrayal` model (on the `APPEARS_IN` relationship).

### B. Universal Search
- **Goal:** Single, unified entry point for finding content across the entire graph.
- **Searchable Entities:**
  - **Historical Figures** (e.g., "Julius Caesar")
  - **Media Works** (e.g., "Gladiator")
  - **Series** (e.g., "Rome" - *HBO Series*)
  - **Creators** (e.g., "Ridley Scott" - *Director*)
  - **Actors** (e.g., "Joaquin Phoenix" - *Actor*)
- **Endpoint:** `GET /api/search/universal?q=...`

### C. Creator-Based Ingestion
- **Goal:** Empower users to rapidly populate the graph by importing works based on a specific creator.
- **Endpoint:** `GET /api/wikidata/by-creator?name=...`

## 2. FLIGHT PLAN FOR CLAUDE CODE

**COMMANDS**:

1.  **Update Schema & API for Actor Support:**
    -   **Modify `scripts/schema.py`:** Add `actor_name: Optional[str]` to the `Portrayal` class.
    -   **Modify `web-app/app/api/contribution/appearance/route.ts`:**
        -   Extract `actorName` from the request body.
        -   Update the Cypher query to set `r.actor_name = $actorName` on `MERGE` (both `ON CREATE` and `ON MATCH`).
    -   **Modify `web-app/components/AddAppearanceForm.tsx`:**
        -   Add a text input field for "Actor Name" (optional).
        -   Pass `actorName` in the JSON body to the API.

2.  **Create the Universal Search API Endpoint:**
    -   Create `web-app/app/api/search/universal/route.ts`.
    -   Implement a Neo4j query that aggregates matches across 5 categories:
        ```cypher
        // 1. Historical Figures
        MATCH (f:HistoricalFigure) WHERE toLower(f.name) CONTAINS toLower($q) 
        RETURN {type: 'figure', id: f.canonical_id, label: f.name, meta: f.era, url: '/figure/' + f.canonical_id} as result
        LIMIT 3
        UNION
        // 2. Media Works (Non-Series)
        MATCH (m:MediaWork) 
        WHERE toLower(m.title) CONTAINS toLower($q) 
          AND NOT m.media_type IN ['BookSeries', 'FilmSeries', 'TVSeriesCollection', 'GameSeries', 'BoardGameSeries']
        RETURN {type: 'media', id: m.media_id, label: m.title, meta: m.media_type + ' (' + toString(m.release_year) + ')', url: '/media/' + m.media_id} as result
        LIMIT 3
        UNION
        // 3. Series
        MATCH (m:MediaWork) 
        WHERE toLower(m.title) CONTAINS toLower($q) 
          AND m.media_type IN ['BookSeries', 'FilmSeries', 'TVSeriesCollection', 'GameSeries', 'BoardGameSeries']
        RETURN {type: 'series', id: m.media_id, label: m.title, meta: m.media_type, url: '/media/' + m.media_id} as result
        LIMIT 3
        UNION
        // 4. Creators
        MATCH (m:MediaWork) WHERE toLower(m.creator) CONTAINS toLower($q) 
        RETURN {type: 'creator', id: m.creator, label: m.creator, meta: 'Creator', url: '/contribute/creator?name=' + m.creator} as result
        LIMIT 3
        UNION
        // 5. Actors
        MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
        WHERE toLower(r.actor_name) CONTAINS toLower($q)
        RETURN {type: 'actor', id: r.actor_name, label: r.actor_name, meta: 'Actor in ' + m.title, url: '/media/' + m.media_id} as result
        LIMIT 3
        ```

3.  **Create the Wikidata Creator Search API:**
    -   Create `web-app/app/api/wikidata/by-creator/route.ts`.
    -   Implement SPARQL query for works by creator (same as previous plan).

4.  **Create the "Add by Creator" Page:**
    -   Create `web-app/app/contribute/creator/page.tsx` (same as previous plan).

5.  **Update Universal Search Component:**
    -   Modify `web-app/components/SearchInput.tsx`.
    -   Fetch from `/api/search/universal`.
    -   Render results grouped by category (Figure, Media, Series, Creator, Actor).
    -   Ensure correct routing based on the `url` property in the response.

**MODIFICATIONS**:

-   **Update `CHRONOS_LOG.md`:** Append entry confirming the Actor schema update and Universal Search implementation.

**VERIFICATION**:

-   **Actor Data:** Add an appearance with an actor name (e.g., "Joaquin Phoenix" as "Commodus" in "Gladiator").
-   **Universal Search:**
    -   Search "Phoenix" -> Should find Actor "Joaquin Phoenix".
    -   Search "Gladiator" -> Should find Media "Gladiator".
    -   Search "Rome" -> Should find Series "Rome" (TVSeriesCollection) vs Media (if distinct).
    -   Search "Scott" -> Should find Creator "Ridley Scott".