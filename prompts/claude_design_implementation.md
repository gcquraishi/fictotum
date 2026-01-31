# Task: Implement "Bureaucratic Dossier" Design System

**Objective:**
Reskin the current application to match the "Evidence Locker (Light)" aesthetic defined in `docs/design/DESIGN_SYSTEM_EVIDENCE_LOCKER_LIGHT.md`.

**Reference Implementation:**
- **Source Code:** `web-app/app/mockups/atmosphere-v2/evidence-locker-light/page.tsx`
- **Design System:** `docs/design/DESIGN_SYSTEM_EVIDENCE_LOCKER_LIGHT.md`

**Execution Steps:**

1.  **Global Theme Update (`globals.css` / `tailwind.config.js`):**
    - Set the default background color to `bg-stone-100`.
    - Set the default font stack to prefer Monospace for data/body and Sans for massive headers.
    - Define custom colors if necessary (e.g., `folder-manila: #f3e5ab`, `ink-black: #1c1917`).

2.  **Layout Refactor (`layout.tsx`):**
    - Implement the "Sidebar + Main Content" structure seen in the mockup.
    - The Sidebar should look like a "Filing Cabinet" (`bg-stone-200/50`, border-r).
    - The Main Content should look like a "Paper Sheet" or "Desk Surface".

3.  **Component Reskinning:**
    - **Search Bar:** Make it look like a labeled form field (Border-bottom focus, typewriter style).
    - **Cards (Search Results/Nodes):** Apply the "Dossier Card" styling (White bg, Stone-300 border, shadow-sm).
    - **Tags/Badges:** Convert rounded "pills" to rectangular "stamped" badges (`border border-stone-300`, uppercase, tracking-widest).
    - **Typography:** Enforce `uppercase tracking-widest` for all labels and metadata headers.

4.  **Icons:**
    - Ensure `lucide-react` is used consistently.
    - Icon color should generally be `text-stone-400` (passive) or `text-amber-600` (active/brand).

**Key "Vibe" Checks:**
- Does it feel like a physical file folder?
- Is the contrast high (Dark Ink on Light Paper)?
- Is the "Amber/Orange" accent used sparingly for "Stamps" and "Highlights"?

**Deliverable:**
The main application pages (Home, Search, Entity View) should visually match the `evidence-locker-light` mockup.
