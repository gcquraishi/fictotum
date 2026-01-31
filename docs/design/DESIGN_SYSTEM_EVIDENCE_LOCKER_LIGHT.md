# Design System: Bureaucratic Dossier (Evidence Locker Light)

**Core Philosophy:**
The interface should feel like opening a clean, organized, high-clearance case file. It is "Data Noir" in the daylight. It balances the tactility of paper documents (manila folders, stamped ink, typewritten text) with the utility of a modern digital dashboard.

---

## 1. Color Palette

### Base (Paper & Backgrounds)
*   **Background (Desk/App):** `bg-stone-100` (#f5f5f4) - The surface the files sit on.
*   **Surface (Dossier/Card):** `bg-white` (#ffffff) or `bg-[#F9F9F7]` (Off-white paper).
*   **Sidebar (Cabinet):** `bg-stone-200/50` (#e7e5e4 with opacity).
*   **Folder Accent:** `bg-[#f3e5ab]` (Manila Yellow) - Use for active states or "physical" folder tabs.

### Ink (Typography & Borders)
*   **Primary Text:** `text-stone-900` (#1c1917) - Deepest charcoal, almost black ink.
*   **Secondary Text:** `text-stone-600` (#57534e) - Aged ink or pencil.
*   **Muted Text:** `text-stone-400` (#a8a29e) - Watermarks or timestamps.
*   **Borders:** `border-stone-300` (#d6d3d1) - Standard dividers.

### Accents (Stamps & Highlights)
*   **Primary Brand/Action:** `amber-600` (#d97706) - "Top Secret" stamp ink.
*   **Highlight/Selection:** `selection:bg-amber-200 selection:text-amber-900` - Highlighter pen.
*   **Status Indicators:**
    *   **Success/Verified:** `text-green-700 bg-green-50 border-green-200`
    *   **Alert/Warning:** `text-amber-700 bg-amber-50 border-amber-200`
    *   **Error/Deleted:** `text-red-700 bg-red-50 border-red-200`

---

## 2. Typography

### Font Family
*   **Primary:** `font-mono` (Monospace). This is crucial. It sells the "Typewriter/Terminal" aesthetic.
    *   *Usage:* Body text, data tables, metadata labels.
*   **Headings:** `font-sans` (System Sans). Use sparingly for massive headers to ensure readability, or stick to Mono for a stricter look.
    *   *Recommendation:* Use `font-bold uppercase tracking-tighter` for headings to simulate stamped titles.

### Hierarchy
*   **Page Title:** `text-6xl font-bold uppercase tracking-tighter text-stone-900`
*   **Section Header:** `text-xs font-black text-stone-500 uppercase tracking-widest flex items-center gap-2`
*   **Label/Meta:** `text-[10px] font-bold uppercase tracking-widest text-stone-400`
*   **Body:** `text-sm font-mono text-stone-700 leading-relaxed`

---

## 3. Component Anatomy

### Cards (The "Document")
*   **Border:** `border border-stone-300` (Thin, crisp line).
*   **Shadow:** `shadow-sm` or `shadow-md` (Subtle lift, like a stack of papers).
*   **Hover:** `hover:border-amber-600` (Focus state looks like selecting a file).

### Navigation (The "Sidebar")
*   **Item:** `border-r-2 border-transparent text-right pr-4 py-2`
*   **Active:** `border-amber-600 text-amber-800 bg-white font-black` (The tab is "pulled out").

### Buttons & Tags
*   **Primary Button:** `bg-stone-900 text-white hover:bg-amber-700 font-bold uppercase tracking-widest text-xs px-4 py-2`
*   **Tag/Badge:** `px-2 py-1 border border-stone-300 text-[10px] font-bold uppercase`

---

## 4. Textures & "Soul" (The Atmosphere)

1.  **Pattern:** Use a very subtle noise or dot grid pattern on the background (`bg-stone-100`) to give it texture.
    *   *CSS:* `background-image: radial-gradient(#d1d5db 0.5px, transparent 0.5px); background-size: 24px 24px; opacity: 0.4;`
2.  **Stamps:** Use boxed text with borders to simulate rubber stamps (e.g., "CONFIDENTIAL", "VERIFIED").
3.  **Paper:** The main content area should look like a sheet of paper on a desk—lighter than the background, with a subtle drop shadow.

---

## 5. Example Tailwind Classes

**The "Dossier Card":**
```jsx
<div className="bg-white border border-stone-300 p-6 shadow-sm hover:border-amber-600 transition-all relative">
  <div className="absolute top-0 right-0 p-2 opacity-10">
    <Icon className="w-12 h-12 text-stone-900" />
  </div>
  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">
    <Icon className="w-4 h-4 text-amber-600 inline mr-2" /> Header
  </h3>
  <div className="text-stone-700 font-mono text-sm leading-relaxed">
    Content goes here...
  </div>
</div>
```
