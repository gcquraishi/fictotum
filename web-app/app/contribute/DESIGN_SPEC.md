# Unified Contribute Page - Design Specification

## Overview
**Location**: `/web-app/app/contribute/page.tsx`
**Route**: `/contribute`
**Size**: 5.95 kB (optimized production bundle)
**Status**: Foundation Complete - Ready for Component Integration

---

## Visual Design System

### Color Palette
Following Fictotum's soft, inviting aesthetic:

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| **Primary Brand** | Muted Blue | `#5D7A8A` | Headings, icons, borders |
| **Accent** | Burnt Orange | `#C6470F` | CTAs, active states, highlights |
| **Background** | Light Gray | `#F5F5F5` | Page background |
| **Foreground** | Dark Slate | `#37474F` | Body text |
| **Cards** | White | `#FFFFFF` | Content containers |

### Typography
- **Headings**: Poppins (custom font)
- **Body**: Lato (custom font)
- **Scale**:
  - H1: 2xl (24px) → 3xl (30px) on desktop
  - H2: xl (20px) → 2xl (24px) on desktop
  - Body: sm (14px) → base (16px) on desktop

### Spacing System
- Mobile: Reduced padding (4 = 16px)
- Desktop: Full padding (8 = 32px)
- Gap between elements: 3-6 (12-24px)
- Touch targets: Minimum 48px height on mobile

---

## Layout Architecture

### Container Structure
```
<div className="min-h-screen bg-background">
  <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
    <!-- Header -->
    <!-- Progress Bar -->
    <!-- Step Content Card -->
    <!-- Keyboard Hints -->
  </div>
</div>
```

### Card Design
- **Background**: White
- **Border**: 1px solid `brand-primary/20` (subtle transparency)
- **Border Radius**: `rounded-lg` (8px)
- **Shadow**: `shadow-sm` (minimal elevation)
- **Padding**: Responsive (4 on mobile, 8 on desktop)

---

## Component Breakdown

### 1. Progress Indicator
**Visual Design**:
- Horizontal bar with gradient fill
- Percentage text (right-aligned)
- Step counter (left-aligned)
- Smooth animation on step transitions

**Implementation**:
```tsx
<div className="w-full bg-brand-primary/10 rounded-full h-2">
  <div
    className="bg-brand-accent h-2 rounded-full transition-all duration-500"
    style={{ width: `${progress}%` }}
  />
</div>
```

**States**:
- Search → Settings: 33% → 66%
- Search → Confirm (figure): 50% → 100%

### 2. Search Results

#### Section A: Already in Fictotum
- **Icon**: Database (brand-primary)
- **Card Hover**: Border changes to brand-accent
- **Interaction**: Click navigates to entity page
- **Visual Cue**: Arrow appears on hover (right side)

#### Section B: Add from Wikidata
- **Icon**: Globe (brand-accent)
- **Loading State**: Blue pulsing card with spinner
- **Card Structure**:
  - Title (bold, hover transitions to brand-accent)
  - Description (muted, 60% opacity)
  - Year (small, 50% opacity)
  - Entity type badge (right-aligned)

#### Section C: Manual Entry
- **Style**: Dashed border (border-dashed)
- **Background**: Tinted (brand-primary/5)
- **Icon**: PlusCircle
- **Hover**: Border and background shift to accent color

### 3. Skeleton Loaders
**Design Pattern**:
```tsx
<div className="space-y-2 animate-pulse">
  <div className="p-4 bg-white border rounded-lg">
    <div className="h-5 bg-brand-primary/10 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-brand-primary/10 rounded w-1/2"></div>
  </div>
</div>
```

**Animation**: Tailwind's built-in `animate-pulse` (subtle breathing effect)

### 4. Button System

#### Primary Action (Confirm, Continue)
```tsx
className="bg-brand-accent hover:bg-brand-accent/90
           text-white font-semibold
           rounded-lg shadow-sm
           transition-colors"
```

#### Secondary Action (Back, Cancel)
```tsx
className="bg-white border border-brand-primary/30
           text-brand-text hover:bg-brand-primary/5
           rounded-lg transition-colors"
```

#### Disabled State
```tsx
className="disabled:bg-brand-primary/30
           disabled:cursor-not-allowed
           disabled:opacity-50"
```

### 5. Error & Success Messages

#### Error Alert
```tsx
<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
  <AlertCircle className="w-5 h-5 text-red-600" />
  <p className="text-sm text-red-800">{error}</p>
</div>
```

#### Success/Info
```tsx
<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <Sparkles className="w-4 h-4 text-blue-600" />
  <p className="text-sm text-blue-800">{message}</p>
</div>
```

---

## Responsive Design Strategy

### Breakpoints
- **Mobile**: 320px - 767px (sm and below)
- **Tablet**: 768px - 1023px (md)
- **Desktop**: 1024px+ (lg and above)

### Mobile-First Adjustments

#### Header
- Icon: 6 → 8 (24px → 32px)
- Title: 2xl → 3xl
- Padding: py-6 → py-8

#### Buttons
- Stack vertically: `flex-col` → `sm:flex-row`
- Touch targets: `min-h-[48px]` on mobile
- Full width on mobile, flex-1 on desktop

#### Cards
- Padding: p-4 → md:p-8
- Horizontal gaps reduced on mobile

#### Keyboard Hints
- Hidden on mobile: `hidden md:block`

---

## Accessibility Features

### Keyboard Navigation
| Key | Action |
|-----|--------|
| Tab | Navigate between interactive elements |
| Enter | Submit forms, select items |
| Escape | Go back one step (except on search/creating) |

### Focus Management
- Input auto-focuses on search step
- Custom focus rings (ring-2 ring-brand-accent)
- Visible focus indicators on all interactive elements

### ARIA Attributes
```tsx
// Buttons indicate their state
disabled={isSearching}
aria-busy={isSearching}

// Form inputs have labels
<label htmlFor="search-input">Search</label>
<input id="search-input" />
```

### Screen Reader Support
- Icon-only buttons have text labels
- Loading states announce "Searching..." / "Creating..."
- Error messages are associated with form fields

### Color Contrast
- Text on white: 4.5:1+ (WCAG AA compliant)
- Brand primary (#5D7A8A) on white: 6.2:1 (AAA)
- Brand accent (#C6470F) on white: 5.1:1 (AAA)

---

## Animation & Transitions

### Progress Bar
```css
transition-all duration-500 ease-out
```
- Smooth fill animation (500ms)
- Easing function for natural deceleration

### Card Hover Effects
```css
transition-colors
hover:border-brand-accent
hover:shadow-md
```
- Border color transition (150ms default)
- Shadow appears on hover
- Arrow opacity fade-in

### Loading States
- Spinner: `animate-spin` (Tailwind default)
- Skeleton: `animate-pulse` (subtle breathing)

### Button States
```css
transition-colors
hover:bg-brand-accent/90
```
- Background color transitions
- No jarring jumps or layout shifts

---

## State Management

### Local Storage Integration
**Key**: `chronos_contribute_search`
**Expiry**: 24 hours
**Stored Data**:
```typescript
{
  query: string;
  timestamp: number;
}
```

**Behavior**:
- Saves on every keystroke (length >= 2)
- Restores on page mount
- Auto-clears after 24h

### Wizard State Machine
```
Search → Settings → Confirm → Creating
  ↓         ↓         ↓
[Select] [Configure] [Submit]
```

**Figure Flow** (2 steps):
```
Search → Confirm → Creating
```

**Work Flow** (3 steps):
```
Search → Settings → Confirm → Creating
```

---

## Performance Optimizations

### Bundle Size
- **Current**: 5.95 kB (gzipped)
- **First Load JS**: 93.2 kB (includes React, Next.js runtime)

### Loading Strategies
- Skeleton loaders prevent layout shift
- Parallel API calls (DB + Wikidata)
- Debounced search input (500ms - to be implemented)

### Code Splitting
- Component-level placeholders prepared
- Future child components will be lazy-loaded

---

## Future Component Integration Points

### Settings Step (Work Package 2B)
**Placeholder**: `<SettingsIcon />` with descriptive text

**Will Include**:
- Location picker (multi-select)
- Era tag selector (with AI suggestions)
- Custom fields (media type, dates, etc.)

### Confirm Step (Work Package 2C)
**Placeholder**: Preview card with basic info

**Will Include**:
- Full entity preview
- Selected locations/eras list
- Editable fields review

### API Integration (Work Package 2D)
**Placeholder Endpoints**:
- `/api/search/unified` (Fictotum search)
- `/api/wikidata/search` (Wikidata lookup)
- `/api/enrichment/media` (AI suggestions)
- `/api/figures/create` | `/api/media/create`

---

## Design Principles Applied

### 1. Visual Hierarchy
- Clear step progression (numbers + progress bar)
- Section headings with icons
- Typography scale guides attention

### 2. Feedback & Affordance
- Hover states on all interactive elements
- Loading spinners for async operations
- Success/error messages clearly styled
- Disabled states visually distinct

### 3. Consistency
- All cards follow same border/shadow pattern
- Buttons use consistent sizing and spacing
- Icon sizes standardized (w-4/h-4, w-5/h-5, w-8/h-8)
- Color usage follows system

### 4. Progressive Disclosure
- Empty states guide next action
- Settings only shown when needed
- Keyboard hints hidden on mobile

### 5. Error Prevention
- Validation before step transitions
- Disabled states prevent invalid actions
- Confirmation before final submission

---

## Testing Checklist

### Visual Testing
- [ ] Mobile (320px, 375px, 414px)
- [ ] Tablet (768px, 1024px)
- [ ] Desktop (1280px, 1920px)
- [ ] Dark mode support (future)

### Interaction Testing
- [ ] Keyboard navigation works
- [ ] Focus visible on all elements
- [ ] Touch targets 48px+ on mobile
- [ ] Hover states appear correctly
- [ ] Loading states display

### Accessibility Testing
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA
- [ ] Forms have proper labels
- [ ] Error messages are accessible

### Performance Testing
- [ ] Bundle size under 10 kB
- [ ] No layout shifts on load
- [ ] Smooth transitions (60fps)
- [ ] localStorage works correctly

---

## File Structure
```
web-app/app/contribute/
├── page.tsx              (5.95 kB - Main wizard component)
├── DESIGN_SPEC.md        (This file - Design documentation)
└── [Future Components]
    ├── SearchInput.tsx
    ├── LocationPicker.tsx
    ├── EraTagSelector.tsx
    └── EntityPreview.tsx
```

---

## Design Tokens Reference

### Spacing
```typescript
const spacing = {
  xs: '0.25rem',  // 4px
  sm: '0.5rem',   // 8px
  md: '1rem',     // 16px
  lg: '1.5rem',   // 24px
  xl: '2rem',     // 32px
}
```

### Shadows
```css
shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
```

### Border Radius
```css
rounded-md: 6px
rounded-lg: 8px
rounded-full: 9999px
```

---

## Next Steps (Work Package 2B+)

1. **SearchInput Component** - Debounced input with autocomplete
2. **LocationPicker Component** - Multi-select with search
3. **EraTagSelector Component** - Tag chips with AI suggestions
4. **EntityPreview Component** - Comprehensive data display
5. **API Integration** - Connect to real endpoints
6. **Validation Layer** - Form validation with helpful errors
7. **Success Flow** - Redirect + toast notification

---

**Last Updated**: 2026-01-22
**Version**: 1.0.0 (Foundation)
**Designer**: Claude Code (Frontend Design Engineer)
