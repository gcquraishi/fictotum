# Feature Implementation Plan: Figure Page Polish (CHR-23)

**Overall Progress:** `100%` (5/5 tasks complete)

---

## TL;DR
Polish the Figure Detail page by adding a direct link to the full Graph Explorer and enhancing the Media Timeline with a visual sentiment trend chart using Recharts.

---

## Critical Decisions
- **Graph Entry Point**: Added "Explore Network" button in the header section, inside the main hero card.
- **Sentiment Visualization**: Used `recharts` ScatterChart to visualize sentiment over time.
  - Y-Axis: Sentiment (Heroic=1, Complex=0, Villainous=-1)
  - X-Axis: Release Year
  - Tooltip: Shows media title on hover
  - **Deterministic Jitter**: Used title hash to create stable jitter for overlapping points.
- **Component Structure**: Created new `SentimentTrendChart` component and placed it full-width below the stats grid.

---

## Implementation Tasks

### Phase 1: Navigation & Entry Points

- [x] 🟩 **Task 1.1: Add "Explore in Graph" Button**
  - [x] 🟩 Add button to `figure/[id]/page.tsx` header
  - [x] 🟩 Link to `/explore/graph?id={canonical_id}&type=figure`
  - [x] 🟩 Styled as prominent secondary action (blue)
  - **Files**: `web-app/app/figure/[id]/page.tsx`
  - **Notes**: Used `Network` icon from lucide-react.

### Phase 2: Sentiment Visualization

- [x] 🟩 **Task 2.1: Create SentimentTrendChart Component**
  - [x] 🟩 Created new component using `recharts`
  - [x] 🟩 Mapped sentiments to numerical values (Heroic=1, Complex=0, Villainous=-1)
  - [x] 🟩 Handled multiple data points for same year (deterministic jitter)
  - [x] 🟩 Custom tick labels (Heroic, Complex, Villainous)
  - **Files**: `web-app/components/SentimentTrendChart.tsx` (new)

- [x] 🟩 **Task 2.2: Integrate Chart into Figure Page**
  - [x] 🟩 Added `SentimentTrendChart` to `figure/[id]/page.tsx`
  - [x] 🟩 Ensured responsive sizing (width 100%)
  - [x] 🟩 Added "Sentiment Over Time" section header
  - **Files**: `web-app/app/figure/[id]/page.tsx`

### Phase 3: Visual Polish

- [x] 🟩 **Task 3.1: Typography & Spacing Review**
  - [x] 🟩 Ensured consistent font usage (headers vs body)
  - [x] 🟩 Mobile responsiveness checked (ResponsiveContainer)
  - [x] 🟩 Added empty state check (if < 2 data points)
  - **Files**: `web-app/app/figure/[id]/page.tsx`

---

## Rollback Plan

**If things go wrong:**
1. Remove `SentimentTrendChart` import and usage from `page.tsx`.
2. Delete `web-app/components/SentimentTrendChart.tsx`.
3. Revert `web-app/app/figure/[id]/page.tsx` to remove the "Explore Network" button.

---

## Success Criteria

✅ "Explore Network" button appears and correctly links to explorer with figure pre-selected.
✅ Sentiment Trend Chart displays correct data points over time.
✅ Tooltips on chart show correct media titles.
✅ Page looks good on mobile (chart scales).