# Fictotum Gemini Flight Plan: Navigation Bar Redesign (Option 2)

**OBJECTIVE:** Implement a modern, clean, and user-friendly top navigation bar based on Option 2 (Slightly More Descriptive), aligning with the new friendly, accessible, and modern design goals.

## 1. ARCHITECTURE & STRATEGY

### A. Navigation Style
-   **Type:** Top-aligned, horizontal navigation bar.
-   **Design Principles:** Friendly, accessible, modern, clean, responsive.
-   **Styling:** Based on "Option 1: Soft & Inviting" palette (Primary Blue `#4FC3F7`, Secondary Light Gray `#F5F5F5`, Accent Coral Pink `#FF8A65`, Text Deep Charcoal `#37474F`) and typefaces (Montserrat for headings, Lato for body).

### B. Key Navigation Items
-   **Fictotum Logo/Name:** Links to the Dashboard/Home.
-   **Search:** A dedicated button/link triggering the universal search functionality.
-   **Contribute:** A dropdown menu for various data addition workflows.
-   **Analyze:** A dropdown menu for analytical tools.
-   **Account:** (Conditional) User-specific actions like Profile, Settings, Logout.

## 2. FLIGHT PLAN FOR CLAUDE CODE

**COMMANDS**:

1.  **Create/Modify Navigation Component:**
    *   **File:** `web-app/components/Navbar.tsx` (Create if it doesn't exist, otherwise modify).
    *   **Integration:** Import and render this component within `web-app/app/layout.tsx`.
    *   **Structure:** Use Tailwind CSS for layout and responsiveness. Implement a sticky navbar at the top.

2.  **Implement Navigation Items:**
    -   **Logo/App Name:**
        *   Display "Fictotum".
        *   Link to the root `/` path.
    -   **Search:**
        *   A button or link labeled "Search".
        *   On click, trigger the universal search functionality (e.g., open modal or navigate to `/search`). This should integrate with the `/api/search/universal` endpoint.
    -   **Contribute:**
        *   A button labeled "Contribute".
        *   On click, display a dropdown menu with items:
            *   "Add Media Work" (`/contribute/media`)
            *   "Add Figure" (`/contribute/figure`)
            *   "Add Appearance" (`/contribute/appearance`)
            *   "Add by Creator" (`/contribute/creator`)
    -   **Analyze:**
        *   A button labeled "Analyze".
        *   On click, display a dropdown menu with items:
            *   "Pathfinder" (`/explore/pathfinder`)
            *   "Graph Explorer" (`/explore/graph`)
    -   **Account:**
        *   **Conditional Rendering:** Display only if authenticated (using `useSession` hook from `next-auth`).
        *   A button labeled "Account" or displaying the user's avatar.
        *   On click, display a dropdown menu with items:
            *   "Profile"
            *   "Settings"
            *   "Logout" (triggers `signOut` function).

3.  **Styling:**
    -   Apply styles using Tailwind CSS, adhering to the "Soft & Inviting" palette:
        *   Primary: `#4FC3F7` (Soft Sky Blue)
        *   Secondary: `#F5F5F5` (Light Warm Gray)
        *   Accent: `#FF8A65` (Coral Pink)
        *   Text: `#37474F` (Deep Charcoal)
    -   Use Montserrat for headings/buttons and Lato for body text within the nav bar where appropriate for consistency.
    -   Ensure interactive elements have clear hover and active states using the accent color.
    -   Implement responsiveness: on smaller screens, collapse nav items into a hamburger menu.

**MODIFICATIONS**:

-   **Update `FICTOTUM_LOG.md`:** Append a structured entry logging the implementation of the new navigation bar based on Option 2, detailing the changes made.

**VERIFICATION**:

-   **Navigation Functionality:** Test all links and dropdown items to ensure they route correctly.
-   **Responsiveness:** Verify the navigation adapts correctly across desktop, tablet, and mobile screen sizes, including the hamburger menu behavior.
-   **Styling Consistency:** Confirm colors, fonts, spacing, and overall look align with the "Soft & Inviting" aesthetic and modern, clean principles.
-   **Authentication State:** Ensure the "Account" section appears/disappears correctly based on user login status.
-   **Accessibility:** Conduct basic checks for keyboard navigability, focus states, and color contrast ratios within the navbar.
-   **Search Integration:** Confirm the "Search" button correctly initiates the universal search flow.
-   **Dropdown Menus:** Verify all sub-items in "Contribute" and "Analyze" dropdowns are present and functional.
