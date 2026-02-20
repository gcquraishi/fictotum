# Feature Implementation Plan: Fix ImpressionisticTimeline Label Overlap

**Overall Progress:** `0%` (0/3 tasks complete)

---

## TL;DR
Media work ticks and labels in the graph explorer's mini-timeline pile on top of each other when multiple works share similar release years. Add vertical staggering so overlapping labels fan out into readable rows.

---

## Critical Decisions
- **Stagger labels vertically**: When ticks are too close in x-space, offset labels to alternating rows below the timeline so they don't overlap
- **Keep it in SVG**: The component already uses SVG; no need to switch to canvas
- **Compute layout in parent**: `ImpressionisticTimeline` computes y-offsets per item and passes them to `TimelineSmudge`, keeping the smudge component stateless

---

## Implementation Tasks

### Phase 1: Label Collision Detection & Stagger

- [ ] :red_square: **Task 1.1: Add overlap detection to ImpressionisticTimeline**
  - [ ] :red_square: After computing timeline data, sort items by x-position (startYear)
  - [ ] :red_square: Walk items left-to-right; when two labels would overlap in x (< ~8% apart), assign the second to the next vertical row (stagger level 0, 1, 2...)
  - [ ] :red_square: Pass `labelRow` (0-based stagger index) to each `TimelineSmudge`
  - **Files**: `web-app/components/graph/ImpressionisticTimeline.tsx`
  - **Notes**: Simple greedy approach — same first-fit logic we use in the main Timeline

- [ ] :red_square: **Task 1.2: Update TimelineSmudge to use staggered y-positions**
  - [ ] :red_square: Accept `labelRow` prop (default 0)
  - [ ] :red_square: Offset label `y` position: `85 + labelRow * 14` (14px per row)
  - [ ] :red_square: For media ticks, extend the tick line down to meet the staggered label
  - [ ] :red_square: For figure bars, offset the label text down similarly
  - **Files**: `web-app/components/graph/TimelineSmudge.tsx`

### Phase 2: Container Height & Polish

- [ ] :red_square: **Task 2.1: Grow timeline container to fit staggered labels**
  - [ ] :red_square: Compute max label row count in `ImpressionisticTimeline`
  - [ ] :red_square: Set container height dynamically: `120 + maxLabelRow * 14` px
  - [ ] :red_square: Ensure SVG viewBox or container overflow handles the extra rows
  - **Files**: `web-app/components/graph/ImpressionisticTimeline.tsx`

---

## Rollback Plan

1. `git checkout HEAD -- web-app/components/graph/ImpressionisticTimeline.tsx web-app/components/graph/TimelineSmudge.tsx`

---

## Success Criteria

- [ ] When viewing Henry VIII's graph (many Tudor-era works with similar release years), all labels are readable without overlap
- [ ] Labels fan out vertically when crowded, with connector lines to their ticks
- [ ] Non-crowded timelines (few items, spread out) look unchanged
- [ ] `npx tsc --noEmit` passes clean

---

## Out of Scope (For This Plan)

- Applying Fisk palette to ImpressionisticTimeline (separate ticket)
- Horizontal scrolling or zoom on the mini-timeline
- Tooltip-on-hover as alternative to always-visible labels
