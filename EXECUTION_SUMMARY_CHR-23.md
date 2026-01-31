# CHR-23 Implementation Summary: Figure Page Polish

**Date**: January 29, 2026
**Status**: ✅ COMPLETE
**Role**: Ace Front-End Product Designer

---

## TL;DR
Polished the Figure Detail page by adding a direct "Explore Network" entry point and implementing a visual "Sentiment Over Time" scatter chart to reveal character evolution.

---

## Deliverables

### 1. "Explore Network" Entry Point
**Goal**: Connect the figure page to the deep exploration graph.
**Implementation**:
- Added a prominent blue button to the Figure Page header (inside hero card).
- Links to `/explore/graph?id={canonical_id}&type=figure`.
- Uses `Network` icon from `lucide-react`.

### 2. Sentiment Trend Chart
**Goal**: Visualize how a character's portrayal changes over time (e.g., from Villain to Hero).
**Implementation**:
- Created `SentimentTrendChart.tsx` using `recharts`.
- **Visualization**: ScatterChart with X-Axis (Year) and Y-Axis (Sentiment).
- **Sentiment Mapping**: Heroic (1), Complex (0), Villainous (-1).
- **UX Details**:
  - Deterministic jitter prevents dot overlap without re-render jumping.
  - Custom tooltips showing Media Title.
  - Responsive container adapting to mobile.
  - Color-coded points (Green/Yellow/Red).

### 3. Build Fixes
**Goal**: Ensure a stable foundation.
**Implementation**:
- Fixed TypeScript errors in `app/api/wikidata/enrich/route.ts` (duplicate key).
- Fixed `double-metaphone` import issue in `lib/wikidata.ts`.
- Updated `WizardStep` type mapping in `app/contribute/page.tsx`.
- Updated `ContributionSettings` interface to support `suggest` action.

---

## Files Modified
- `web-app/app/figure/[id]/page.tsx`: Added button and chart.
- `web-app/components/SentimentTrendChart.tsx`: New component.
- `web-app/types/contribute.ts`: Type fix.
- `web-app/app/contribute/page.tsx`: Type fix.
- `web-app/lib/wikidata.ts`: Import fix.
- `web-app/app/api/wikidata/enrich/route.ts`: Duplicate key fix.

---

## Visual UX Improvements
- **Discovery**: Users can now easily pivot from reading about a figure to exploring their network.
- **Insight**: The new chart reveals patterns (e.g., "This character was a villain in the 50s but is heroic now") that were hidden in the text list.
- **Stability**: Fixed build errors ensures reliability.

---

## Next Steps
- **User Testing**: Verify the sentiment chart makes sense to users.
- **Mobile Check**: Ensure the chart isn't too cramped on small screens (ResponsiveContainer should handle it).
