# Landing Page Design Directions
*Five distinct concepts for the ChronosGraph entry point*

## Direction 1: The "Pathfinder" (Utility-First)
**Core Concept:** Immediately solve the user's primary question: "How are X and Y connected?"
**Visual Metaphor:** A transit map or flight planner.

*   **Hero Section:** Minimalist. A large, centralized "A to B" query interface (LandingPathQuery) dominates the screen.
*   **Background:** Subtle, abstract network lines connecting faintly in the background, non-interactive.
*   **Interaction:** User types "Napoleon" and "Julius Caesar". The background *becomes* the graph, revealing the path instantly.
*   **Pros:** High utility, clear value proposition, instant gratification.
*   **Cons:** Less exploratory; assumes user knows who they want to connect.

## Direction 2: The "Living Universe" (Immersive)
**Core Concept:** Immersion in the data. The graph is alive and breathing.
**Visual Metaphor:** A constellation or galaxy.

*   **Hero Section:** No traditional header. The entire viewport is the 3D Force Graph (GraphExplorer).
*   **Content:** It starts auto-rotating slowly around a central cluster (e.g., The Tudors).
*   **Overlay:** A floating search bar (glassmorphism) sits at the bottom center.
*   **Interaction:** Clicking any node zooms the camera. Scrolling "dives" deeper into the era.
*   **Pros:** Visually stunning, "wow" factor, encourages serendipitous discovery.
*   **Cons:** High cognitive load, might feel overwhelming or "tech demo-y," performance heavy.

## Direction 3: The "Curated Exhibit" (Editorial)
**Core Concept:** Guide the user through history like a museum curator.
**Visual Metaphor:** A digital magazine or museum exhibition.

*   **Hero Section:** A featured "Connection of the Day" (e.g., "How Wolf Hall connects to Rome"). High-quality background image from the media work.
*   **Layout:**
    *   **Top:** Editorial hook ("Did you know Henry VIII is 3 steps from Napoleon?").
    *   **Middle:** Three "Featured Entry Points" cards (The Tudors, Roman Empire, French Revolution).
    *   **Bottom:** The "Explore" button which opens the graph in a modal or new page.
*   **Pros:** Approachable, educational, good for non-technical users.
*   **Cons:** Buries the core graph tech, requires constant content curation.

## Direction 4: The "Time Machine" (Chronological)
**Core Concept:** History happens in order. Start from a time, not a person.
**Visual Metaphor:** A horizontal timeline slider.

*   **Hero Section:** A full-width timeline slider spanning 500 BC to 2000 AD.
*   **Interaction:** Dragging the slider changes the background graph to show clusters from that era.
*   **Primary Action:** "Jump to 1789" (French Revolution).
*   **Secondary:** "Search Figure".
*   **Pros:** Intuitive for history buffs, provides context (Era-based).
*   **Cons:** Hard to show cross-era connections (which is ChronosGraph's superpower).

## Direction 5: The "Detective Board" (Investigative)
**Core Concept:** You are the researcher. Here are your tools.
**Visual Metaphor:** A clean, grid-based dashboard.

*   **Layout:** Split screen or Bento Box grid.
    *   **Box 1 (Large):** "Recent Discoveries" (Live feed of new connections found by users).
    *   **Box 2:** "Quick Path" (The A-to-B search).
    *   **Box 3:** "Trending Figures" (Who is being researched right now?).
    *   **Box 4:** "Contribute" (Call to action).
*   **Pros:** Feels active/social, exposes breadth of features, modular.
*   **Cons:** Can look cluttered/busy, lacks a singular focus.

---

## Recommendation
**Direction 1 (Pathfinder)** combined with **Direction 2 (Living Universe)**.

*   **Why:** ChronosGraph's unique value is the *connection*. The A-to-B search is the strongest hook.
*   **Execution:** Keep the "Pathfinder" input front and center (Direction 1), but instead of a white background, layer it over a muted, slow-moving "Living Universe" graph (Direction 2) that acts as a dynamic wallpaper until engaged.