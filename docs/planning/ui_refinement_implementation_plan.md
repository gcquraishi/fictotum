# Implementation Plan: Fictotum UI Refinement (FSG Literary Minimalism)

## Objective
Implement a high-fidelity visual overhaul of the Fictotum web application based on the "FSG Literary Minimalism" aesthetic. The goal is to transform the existing UI into a sophisticated, typography-driven interface that feels like a cross between a prestigious literary journal and a scholarly archive.

## Design System Specification (The FSG Foundation)

To maintain consistency across all future pages, strictly adhere to these design primitives.

### 1. Typography System
- **Primary Serif: Crimson Pro**
  - Use for narrative content, body text, and major headlines.
  - **Hero Titles:** 72-96px, weight 300, -2px letter-spacing.
  - **Section Titles:** 28-32px, weight 400.
  - **Body Text:** 18-20px, weight 400, line-height 1.8.
  - **Pull Quotes:** 24-28px, italic, burgundy accent color.
- **Secondary Monospace: IBM Plex Mono**
  - Use for labels, metadata, system status, and UI controls.
  - **Labels:** 10-12px, uppercase, 2px letter-spacing.
  - **Metadata:** 14-16px, regular case.
  - **Numerals:** Use for counts and years, often in larger serif weights (Crimson Pro) with monospace labels.

### 2. Color Palette
- **Background:** `#FEFEFE` (Off-white, prevents eye strain of pure white).
- **Primary Text:** `#1A1A1A` (Near-black, high contrast).
- **Accent Color:** `#8B2635` (Deep Burgundy). Use sparingly for:
  - Dates (Years in lists/timelines).
  - Primary CTAs.
  - Active tab indicators.
  - Significant data highlights.
- **Secondary Text:** `#666666` (Gray) for metadata and labels.
- **Borders/Rules:** 
  - `#E0E0E0` (Light gray) for thin 1px separators.
  - `#1A1A1A` (Black) for bold 2px structural rules.

### 3. Layout & Grid
- **Global Constraints:** 
  - Max-width: 1200px (Data-heavy/Viz) or 720px (Text-heavy).
  - Vertical Spacing: 60-100px between major sections.
- **Bilateral Symmetry:** Elements should be centered or perfectly mirrored.
- **The "Bibliography" Pattern:** 
  - A common two-column layout: Narrow left column (e.g., 100-150px) for dates/numbers, wide right column for content.
- **Rules & Dividers:** Use horizontal rules (HR) to define section starts. 2px rules for major sections, 1px rules for sub-sections.

### 4. UI Components
- **Buttons:** Rectangular (no rounded corners), IBM Plex Mono, uppercase.
  - **Primary:** Black background, white text.
  - **Outline:** Transparent background, 1px border, accent text.
- **Section Headers:** Dossier-style headers are light-gray boxes (`#F0F0F0`) with a bold 4px left-border and monospaced titles.
- **Metadata Grids:** 2-column grids with monospaced labels on the left and values (often serif) on the right, separated by dotted or thin solid lines.
- **Badges/Tags:** Small monospaced labels in uppercase, subtle 1px borders, no background fills (or very light gray).

### 5. Visual Principles
- **ZERO Decoration:** No gradients, no box-shadows, no rounded corners, no icons (unless essential for functional clarity).
- **Text as Visual:** Visual interest is generated through typographic scale, weight, and the rhythm of white space.
- **Idempotency:** Every page should feel like it could be printed on high-quality cream paper and bound in a literary journal.

## Key Pages to Implement

### 1. Landing Page (`landing_refined.html`)
- **Hero Graph (FUNCTIONAL REQUIREMENT):** 
  - **Must utilize a graph library** (D3.js, React Force Graph, or Cytoscape.js) to render a live, interactive network.
  - **Behavior:** Nodes must be draggable. Hovering over a node should highlight connections (edges) and increase opacity/size.
  - **Data Source:** Connect to the Neo4j backend to fetch real entity relationships.
  - **Visuals:** Match the FSG aesthetic (minimalist nodes, thin edges, cream/black/burgundy palette). See the D3 script in `landing_refined.html` for the expected interaction model.
- **Stats:** Three-column grid with large serif numerals (e.g., "847 Figures").
- **Lists:** Two-column section for "Top Portrayed Figures" and "Latest Additions."
- **Navigation:** Four large boxed buttons (Era, Medium, Sentiment, Network).
- **Footer Departments:** Boxed sections for "Contribute," "Methodology," "API Access," and "About."

### 2. Search & Archive Page (`search_results.html`)
- **Layout:** Search-first interface with a centered search bar and tabbed navigation (Figures/Works).
- **Sidebar:** Left-aligned filters for Era, Medium, and Sentiment using monospaced labels.
- **Results:** Bibliography-style listing with birth/death years in burgundy on the left and serif titles/bios on the right.

### 3. Figure Detail Page (`figure_refined.html`)
- **Split-Screen Layout:** 50/50 vertical split.
- **Left Pane (Visual):** A vertical timeline (oldest to newest, top to bottom) that transforms into an expanded network graph on interaction.
- **Right Pane (Content):** Dossier-style layout with structured headers (Biographical Summary, Documented Appearances), metadata grids, and select portrayal records.

## Technical Requirements
- Use **Tailwind CSS** (if available) or **Vanilla CSS Custom Properties** for the design system.
- Implement the graph visualization using **D3.js** or a similar SVG-based library, ensuring it integrates with the existing Neo4j backend.
- Ensure all transitions (especially the timeline-to-graph transformation) are smooth and performant.
- Adhere to the `schema.py` for all entity relationships and data fields.

## Reference Mockups
- View `mocks/round-2/landing_refined.html`
- View `mocks/round-2/search_results.html`
- View `mocks/round-2/figure_refined.html`

---
*Generated by Gemini CLI for implementation by Claude Code.*
