# Sentiment Timeline - Developer Quick Start

## What Was Built

A professional sentiment timeline chart that shows how historical figure portrayals evolved over time, fully integrated into the Evidence Locker design system.

## Files Modified

### New Component
```
web-app/components/SentimentTrendChart.tsx (280 lines)
```

### Enhanced Components
```
web-app/components/ConflictRadar.tsx
web-app/components/MediaTimeline.tsx
```

### Integration Point
```
web-app/app/figure/[id]/page.tsx
```

### Styling
```
web-app/app/globals.css
```

## Quick Test

### 1. Start Dev Server
```bash
cd web-app
npm run dev
```

### 2. Visit Test Figure
```
http://localhost:3000/figure/HF_RM_001
```

This is Julius Caesar with 18 portrayals across 7 decades - perfect for seeing the timeline in action.

### 3. Also Test These
```
http://localhost:3000/figure/PROV:helena_justina    # 35 portrayals
http://localhost:3000/figure/marcus_didius_falco    # 19 portrayals
```

## Component API

### SentimentTrendChart

```typescript
import SentimentTrendChart from '@/components/SentimentTrendChart';

interface Props {
  portrayals: Portrayal[];  // Array of figure portrayals
}

// Usage
<SentimentTrendChart portrayals={figure.portrayals} />
```

### Portrayal Type
```typescript
interface Portrayal {
  media: {
    title: string;
    release_year: number | string;
  };
  sentiment: 'Heroic' | 'Villainous' | 'Complex';  // Legacy
  sentiment_tags?: string[];  // New format (preferred)
}
```

## Data Processing

### Grouping Logic
```typescript
// Portrayals grouped by decade
1963 → 1960s
1990 → 1990s
2005 → 2000s
```

### Sentiment Classification
```typescript
// Priority 1: sentiment_tags array
if (tags.includes('heroic')) → Heroic
if (tags.includes('villainous')) → Villainous
else → Complex

// Priority 2: sentiment field (fallback)
'Heroic' → Heroic
'Villainous' → Villainous
'Complex' → Complex
```

### Trend Detection
```typescript
const heroicChange = last - first;

if (heroicChange > 0.15)  → "More Heroic Over Time"
if (heroicChange < -0.15) → "Less Heroic Over Time"
else                      → "Stable Portrayal"
```

## Design Tokens

### Colors
```typescript
const SENTIMENT_COLORS = {
  heroic: '#22c55e',      // green-500
  villainous: '#ef4444',  // red-500
  complex: '#78716c',     // stone-500
};
```

### Typography
```css
font-family: ui-monospace, monospace;
font-weight: 900;  /* black for headers */
font-weight: 700;  /* bold for labels */
text-transform: uppercase;
letter-spacing: 0.15em;
```

### Spacing
```css
padding: 1.5rem;    /* section padding */
gap: 1rem;          /* element spacing */
border-width: 2px;  /* all borders */
```

## Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 767px) {
  height: 320px;
  font-size: 9px;
}

/* Tablet */
@media (min-width: 768px) {
  height: 384px;
  font-size: 10px;
}

/* Desktop */
@media (min-width: 1024px) {
  height: 384px;
  /* Full layout */
}
```

## Common Customizations

### Change Time Grouping
```typescript
// Currently: decade
const decade = Math.floor(year / 10) * 10;

// Change to 25-year periods
const period = Math.floor(year / 25) * 25;

// Change to century
const century = Math.floor(year / 100) * 100;
```

### Adjust Trend Threshold
```typescript
// Currently: 15% change
const TREND_THRESHOLD = 0.15;

// Make more sensitive (10%)
const TREND_THRESHOLD = 0.10;

// Make less sensitive (25%)
const TREND_THRESHOLD = 0.25;
```

### Change Colors
```typescript
// Update SENTIMENT_COLORS constant
const SENTIMENT_COLORS = {
  heroic: '#10b981',      // green-600 (darker)
  villainous: '#dc2626',  // red-700 (darker)
  complex: '#6b7280',     // gray-500 (different neutral)
};
```

## Debugging

### Check Data Structure
```typescript
console.log('Portrayals:', portrayals);
console.log('Timeline Periods:', timelinePeriods);
console.log('Trend:', trend);
```

### Verify Grouping
```typescript
const grouped = groupByDecade(portrayals);
console.table(grouped);
```

### Test Empty State
```typescript
<SentimentTrendChart portrayals={[]} />
```

### Test Sparse Data
```typescript
<SentimentTrendChart portrayals={portrayals.slice(0, 2)} />
```

## Accessibility Testing

### Keyboard Navigation
1. Tab to chart
2. Arrow keys navigate bars
3. Enter/Space to show tooltip
4. Escape to dismiss

### Screen Reader
```bash
# macOS
VoiceOver: Cmd + F5

# Check announcements
"Sentiment Timeline Chart"
"Stacked bar chart showing sentiment distribution"
```

### Color Contrast
```bash
# Use browser DevTools
1. Inspect element
2. Check contrast ratio
3. Must be ≥ 4.5:1 for text
```

## Performance

### Bundle Size
```bash
# Check impact
npm run build
# Look for SentimentTrendChart in output
# Expected: ~8KB gzipped
```

### Runtime Performance
```javascript
// Chrome DevTools
1. Open Performance tab
2. Record page load
3. Check FPS during animation
4. Should maintain 60fps
```

## Common Issues

### Issue: Chart not rendering
**Solution:** Check if Recharts is installed
```bash
npm list recharts
# Should show recharts@3.6.0
```

### Issue: Tooltip not showing
**Solution:** Verify pointer events
```css
.recharts-tooltip-wrapper {
  pointer-events: auto !important;
}
```

### Issue: Mobile labels overlapping
**Solution:** Already handled with angled labels
```typescript
angle={-45}
textAnchor="end"
```

### Issue: Empty state not showing
**Solution:** Check portrayals array
```typescript
if (portrayals.length === 0) {
  // Empty state should render
}
```

## Testing Checklist

- [ ] Desktop (1440px): Full layout
- [ ] Tablet (768px): Responsive
- [ ] Mobile (375px): Compact
- [ ] Mobile (320px): Min width
- [ ] Hover tooltips work
- [ ] Trend badge accurate
- [ ] Empty state renders
- [ ] Sparse data (1-2) works
- [ ] Animation smooth
- [ ] Colors correct
- [ ] Typography matches
- [ ] WCAG AA contrast

## Integration Example

```typescript
// In figure/[id]/page.tsx
import SentimentTrendChart from '@/components/SentimentTrendChart';

export default async function FigurePage({ params }) {
  const figure = await getFigureById(params.id);

  return (
    <div>
      {/* Other sections */}

      {/* Sentiment Timeline - Full Width */}
      <div className="mb-8">
        <SentimentTrendChart portrayals={figure.portrayals} />
      </div>

      {/* Other sections */}
    </div>
  );
}
```

## Further Customization

### Add Click Handler
```typescript
const handleBarClick = (data: TimelinePeriod) => {
  console.log('Clicked decade:', data.displayLabel);
  // Filter Media Timeline to this decade
};

<Bar
  onClick={handleBarClick}
  cursor="pointer"
  // ... other props
/>
```

### Add Export Function
```typescript
import { toPng } from 'html-to-image';

const exportChart = async () => {
  const chartElement = document.getElementById('sentiment-chart');
  const dataUrl = await toPng(chartElement);
  // Download or share dataUrl
};
```

### Add Percentage Toggle
```typescript
const [showPercentage, setShowPercentage] = useState(false);

<Bar
  dataKey={showPercentage ? "heroicPct" : "heroic"}
  // ... other props
/>
```

## Resources

- **Recharts Docs:** https://recharts.org/
- **Evidence Locker Design:** See `globals.css`
- **Tailwind Colors:** https://tailwindcss.com/docs/colors
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

## Questions?

1. Check implementation docs: `PHASE_3.2.2_IMPLEMENTATION.md`
2. Check visual guide: `SENTIMENT_TIMELINE_VISUAL_GUIDE.md`
3. Check example rendering: `SENTIMENT_TIMELINE_EXAMPLE.txt`

---

**Last Updated:** 2026-02-02
**Component Version:** 1.0.0
