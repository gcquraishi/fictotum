# Fictotum Design System

> **Aesthetic**: FSG Literary Minimalism — clean, archival, documentation-focused.
> Think museum catalog meets research dossier. Paper-like surfaces, precise typography,
> color used sparingly and always as semantic encoding.

---

## 1. Color Palette

### Core Brand Colors

Defined as CSS variables in `app/globals.css`:

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#FEFEFE` | Page background (off-white) |
| `--color-text` | `#1A1A1A` | Primary text (near-black) |
| `--color-accent` | `#8B2635` | Primary accent (deep burgundy) |
| `--color-gray` | `#666666` | Secondary text, labels |
| `--color-border` | `#E0E0E0` | Standard borders |
| `--color-border-bold` | `#1A1A1A` | Emphasized borders |
| `--color-section-bg` | `#F0F0F0` | Section header backgrounds |
| `--color-hero-bg` | `#F9F9F9` | Hero/feature section backgrounds |
| `--color-dept-bg` | `#FAFAFA` | Department/category backgrounds |

### Media Type Colors

Used for card bottom borders, badges, and type indicators. Defined in `lib/card-utils.ts`:

| Media Type | Hex | Swatch |
|---|---|---|
| Film | `#8B2635` | Deep burgundy |
| Book / Epic Poem / Book Series | `#6B4423` | Brown |
| TV Series / Miniseries / TV Movie | `#4A5D5E` | Slate gray |
| Video Game / Game Series | `#3E5641` | Olive green |
| Play / Musical | `#5D4E6D` | Purple |
| Documentary | `#4A6741` | Forest green |
| Manga / Graphic Novel / Comic | `#8B6914` | Golden brown |
| Default (unknown) | `#666666` | Gray |

### Sentiment Colors

Used for portrayal sentiment badges. Defined in `lib/card-utils.ts`:

| Sentiment | Hex | Meaning |
|---|---|---|
| Heroic | `#22c55e` | Positive/admirable portrayal |
| Villainous | `#ef4444` | Antagonist/negative portrayal |
| Complex | `#eab308` | Morally ambiguous portrayal |
| Neutral | `#6b7280` | Documentary/objective treatment |
| Tragic | `#8b5cf6` | Sympathetic/doomed portrayal |

### Figure Type Colors

| Type | Hex |
|---|---|
| Historical | `#2C2C2C` |
| Fictional | `#5D4E6D` |
| Disputed | `#8B6914` |

### Special Purpose Colors

| Purpose | Hex | Usage |
|---|---|---|
| Selection highlight | `#E8C8CC` | Active/selected state |
| Anachronism warning | `#ea580c` | Orange — timeline mismatch flags |
| Conflict flag | `var(--color-accent)` | Data quality warnings |

---

## 2. Typography

### Font Families

| Role | Family | Source | Weights |
|---|---|---|---|
| **Serif** (primary) | Crimson Pro | Google Fonts | 300, 400, 600 + italic |
| **Monospace** (secondary) | IBM Plex Mono | Google Fonts | 400, 500 |

Imported in `app/layout.tsx`:
```
Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400
IBM+Plex+Mono:wght@400;500
```

CSS variables: `--font-serif` and `--font-mono`.

### Typography Scale

**Serif (Crimson Pro)** — all headings, body copy, names, descriptions:

| Element | Size | Weight | Line Height | Notes |
|---|---|---|---|---|
| Page title (H1) | 48-56px | 300 | 1.1-1.15 | Light weight for elegance |
| Section heading | 18px | 300 | 1.3 | |
| Body text | 14-18px | 300-400 | 1.3-1.5 | |
| Figure name | 14-18px | 400 | — | Regular weight |
| Work title | 18px | 300 | — | Always italic |
| Small text | 10-14px | 400 | — | |

**Monospace (IBM Plex Mono)** — labels, metadata, navigation, controls:

| Element | Size | Weight | Transform | Tracking |
|---|---|---|---|---|
| Large label | 14px | 400 | uppercase | 1px |
| Standard label | 12px | 400 | uppercase | 1-2px |
| Small label | 10-11px | 400 | uppercase | 1-2px |
| Metadata value | 11px | 400 | none | — |
| Micro label | 10px | 500 | uppercase | 0.15em |

### Predefined CSS Classes

```css
.fsg-label        /* 12px mono, uppercase, 2px tracking, gray */
.fsg-label-sm     /* 10px mono, uppercase, 2px tracking, gray */
.fsg-section-header /* 12px mono, uppercase, 1px tracking, section-bg, 4px left border */
.fsg-year         /* 14px mono, accent color */
.fsg-meta-row     /* flex space-between, 11px mono, dotted border-bottom */
```

### Rules

1. **Serif for content** — names, titles, descriptions, body text
2. **Monospace for chrome** — labels, metadata, navigation, badges, section headers
3. **Work titles always italic** — Crimson Pro italic, weight 300
4. **Labels always uppercase** — with letter-spacing 1-2px
5. **Year values in accent color** — monospace, `#8B2635`

---

## 3. Spacing & Sizing

### Spacing Scale

| Token | Value | Usage |
|---|---|---|
| xs | 2-4px | Badge internal gaps, micro spacing |
| sm | 6-8px | Component padding, inline gaps |
| md | 12-16px | Card content padding, section gaps |
| lg | 20-24px | Card grid gaps, page horizontal padding |
| xl | 28-40px | Page sections, hero padding |
| 2xl | 48px+ | Major section separators |

### Common Dimensions

| Element | Dimension |
|---|---|
| Card grid gap | 20px |
| Card content padding | 16px |
| Page max-width (detail) | 820px |
| Page max-width (browse/home) | 1200px |
| Navbar padding | 24px 40px |
| Section gap (vertical) | 48px |
| Hero padding (vertical) | 80px |

### Image Dimensions

| Context | Size |
|---|---|
| FigureCard standard | 256px height |
| FigureCard compact | 187px height |
| Figure detail portrait | 180px x 240px |
| PortrayalCard thumbnail | 80px x 107px |

---

## 4. Components

### Card Components

All cards share this base structure:

```
┌──────────────────────────┐
│                          │
│      Image Area          │  Height: 256px (standard) / 187px (compact)
│                          │
├──[3px bottom border]─────┤  Color = media type or figure type
│  Content Area            │  Padding: 16px
│  Title (serif, 18px)     │
│  Metadata (mono, 10-11px)│
└──────────────────────────┘
```

- `border: 1px solid var(--color-border)`
- `background: var(--color-bg)`
- `overflow: hidden`
- Hover: `opacity: 0.9` with `transition-opacity`

**FigureCard** — historical figure card
- Bottom border color from `getFigureTypeColor()`
- Placeholder: initials on dark background
- Metadata: lifespan, era, portrayal count

**WorkCard** — media work card
- Bottom border color from `getMediaTypeColor()`
- Title always in italic serif
- Placeholder: media type icon + initials
- Metadata: release year, creator, media type

**PortrayalCard** — horizontal layout, different structure:
```
┌─────────┬───────────────────────────────┐
│ Thumb   │  Work Title (serif italic)    │
│ 80x107  │  Actor / Character (mono)     │
│         │  Sentiment badge              │
│         │  Flags (anachronism, conflict) │
└─────────┴───────────────────────────────┘
```

### Card Variants

| Variant | Image Height | Usage |
|---|---|---|
| `standard` | 256px | Grid layouts, browse pages |
| `compact` | 187px | Carousels, sidebars |

### Badges

**Sentiment Badge:**
- Border: 1px solid `[sentiment-color]`
- Background: `[sentiment-color]` at 10% opacity
- Font: 10px monospace, uppercase, 1px tracking
- Padding: 3px 8px

**StampBadge** (Tailwind component):
- Variants: default, verified, mythological, composite, count
- Height: fixed with `px-3 py-1`
- Font: 10px, font-black, uppercase, tracking 0.15em
- Border: 2px solid

**HistoricityBadge:**
- Historical: green
- Fictional: purple
- Disputed: yellow
- Font: 10px, font-black, uppercase

### Section Headers

```css
.fsg-section-header {
  font-family: var(--font-mono);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: var(--color-section-bg);
  padding: 8px;
  border-left: 4px solid var(--color-border-bold);
  display: flex;
  justify-content: space-between;
}
```

### DossierCard (Tailwind)

White card with border and shadow. Variants:
- **default**: `border shadow-sm`
- **highlighted**: `border-t-4 border-t-amber-500 shadow-xl`
- **manila**: (folder-tab style)

### Flags & Alerts

| Type | Left Border | Background |
|---|---|---|
| Anachronism | 3px `#ea580c` | `rgba(234, 88, 12, 0.05)` |
| Conflict | 3px `var(--color-accent)` | `rgba(139, 38, 53, 0.05)` |

Pattern: Icon (AlertTriangle, 14px) + label (10px monospace).

---

## 5. Layout

### Page Structure

```
<body>
  <Navbar />          ← sticky, z-50, white bg, border-bottom
  <main>              ← content area
    {page content}
  </main>
</body>
```

### Grid Layouts

| Context | Columns | Gap |
|---|---|---|
| Homepage cards | 4 | 20px |
| Browse sections | 2 | 20px |
| Responsive (mobile) | 1-2 | 16px |

### Page Templates

**Detail page** (figure, work):
- Max width: 820px, centered
- Hero: image left + content right
- Sections below with `.fsg-section-header` dividers

**Browse/Home page:**
- Max width: 1200px
- Hero section: 80px padding, centered
- Card grids: 4-column
- Stats bar: 3-column divider

**Search page:**
- Two-column layout: sidebar (280px) + content
- Large search input (32px font, 2px border)

### Navbar

- Position: `sticky top-0 z-50`
- Background: white
- Padding: 24px 40px
- Left: Logo ("Fictotum" — 14px mono, uppercase, 1px tracking)
- Center: Search (desktop only)
- Right: Nav links (mono, 12px, uppercase)
- Mobile: Hamburger toggle with dropdown overlay

---

## 6. Responsive Design

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| sm | 640px | — |
| md | 768px | Show desktop nav, expand grids |
| lg | 1024px | 3-4 column grids |
| xl | 1280px | Max-width containers |
| 2xl | 1536px | — |

### Responsive Patterns

- **Navigation**: `hidden md:flex` for desktop links; hamburger on mobile
- **Search**: `hidden md:block` for persistent search; toggle on mobile
- **Card grids**: 1 col (mobile) → 2 col (md) → 3-4 col (lg)
- **Page padding**: 24px (mobile) → 40px (desktop)
- **Image sizes**: `sizes="(max-width: 768px) 100vw, 33vw"`

---

## 7. Images

### Configuration

In `next.config.js`:
- Cache TTL: 30 days (2592000 seconds)
- Allowed domains: `*.public.blob.vercel-storage.com`, `commons.wikimedia.org`, `upload.wikimedia.org`

### Rendering

- Always use Next.js `<Image>` component
- `fill` prop with `object-fit: cover`
- `sizes` attribute for responsive optimization
- `priority` on above-fold images

### URL Validation

`isValidImageUrl()` in `lib/card-utils.ts`:
- Accepts: Vercel Blob URLs, `/images/...` paths, `data:image/...` URIs, HTTPS URLs
- Rejects: HTTP, null, undefined, empty string

### Placeholders

When no image available:
- Background: type-appropriate color (media type or figure type)
- Content: initials (first + last) in serif, white, 40-60% opacity
- WorkCards add media type icon above initials

---

## 8. Interaction & Animation

### Hover States

| Element | Effect | Duration |
|---|---|---|
| Cards | `opacity: 0.9` | 200ms |
| Text links | `opacity: 0.7` | 200ms |
| Buttons | `background-color` change | 200ms |
| Borders | `border-color` change | 200ms |

### Transitions

Default: `transition-property: color, background-color, border-color, opacity`
Timing: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out), 200ms.

### Loading States

Spinner: Lucide `Loader2` icon with `animate-spin`.

### No page transitions — uses Next.js default navigation.

---

## 9. CSS Architecture

### Approach

Mixed strategy, converging toward Tailwind:

| Layer | Method | When to Use |
|---|---|---|
| Design tokens | CSS variables in `:root` | Colors, fonts, spacing |
| Utility classes | Tailwind CSS 4.0 | Layout, responsive, state |
| Custom classes | `.fsg-*` in globals.css | Recurring patterns |
| Inline styles | React `style={{}}` | Dynamic values from JS |

### Rules

1. **Use CSS variables** for any value shared across components
2. **Use Tailwind** for layout, responsive, and standard utilities
3. **Use `.fsg-*` classes** for patterns that repeat more than 3 times
4. **Use inline styles** when the value comes from a JS function (e.g., `getMediaTypeColor()`)
5. **Never use CSS modules** — not part of this codebase
6. **New components should prefer Tailwind** over inline styles

### File Organization

```
app/globals.css          ← @import "tailwindcss", CSS variables, .fsg-* classes
lib/card-utils.ts        ← Color maps, formatting functions, type icons
components/ui/           ← Reusable Tailwind-based UI primitives
components/              ← Feature components (mix of inline + Tailwind)
```

---

## 10. Naming Conventions

### Components

| Pattern | Example | Usage |
|---|---|---|
| `[Entity]Card` | FigureCard, WorkCard | Entity display cards |
| `[Entity]Badge` | HistoricityBadge | Status indicators |
| `[Feature]Picker` | ThemePicker, LocationPicker | Selection UI |
| `[Section]Header` | SectionHeader | Section dividers |

### CSS Classes

- Prefix: `.fsg-` (Fictotum Style Guide)
- Pattern: `.fsg-[element]` or `.fsg-[element]-[variant]`
- Examples: `.fsg-label`, `.fsg-label-sm`, `.fsg-section-header`, `.fsg-year`, `.fsg-meta-row`

### Color Functions

| Function | Returns |
|---|---|
| `getMediaTypeColor(type)` | Hex color for media type |
| `getSentimentColor(sentiment)` | Hex color for sentiment |
| `getFigureTypeColor(type)` | Hex color for figure type |
| `getPlaceholderStyle(kind, name, mediaType?)` | `{ backgroundColor, textColor, initials }` |

### Format Functions

| Function | Returns |
|---|---|
| `formatYear(year)` | `"1066 CE"` or `"44 BCE"` or `"Unknown"` |
| `formatLifespan(birth, death)` | `"100 CE - 44 BCE"` |
| `formatMediaType(type)` | Type string or `"Media"` |

---

## 11. Do / Don't

### Do

- Use `Crimson Pro` for all content text, `IBM Plex Mono` for all UI chrome
- Color-encode entity types via `card-utils.ts` functions
- Keep card layouts consistent (same heights, padding, border treatment)
- Use `.fsg-section-header` pattern for content section dividers
- Use `var(--color-*)` tokens for colors that appear in more than one place
- Show years with accent color in monospace
- Use Next.js `<Image>` for all images
- Provide placeholder initials when no image exists

### Don't

- Don't use raw hex colors in components — use CSS variables or `card-utils.ts`
- Don't mix serif and monospace within the same text role (labels are always mono, content is always serif)
- Don't add decorative elements or emojis — the aesthetic is restrained and archival
- Don't use rounded corners on cards — edges are square/sharp
- Don't use box shadows larger than `shadow-sm` on standard cards (reserve `shadow-xl` for highlighted/featured)
- Don't use animation beyond simple opacity/color transitions
- Don't create CSS modules — use Tailwind or inline styles
- Don't use `<img>` tags — always use `next/image`

---

## 12. Dark Mode

**Not implemented.** The design is light-only, built around a paper/archival aesthetic.

All colors use CSS variables, so dark mode can be added later via `:root[data-theme="dark"]` overrides.

---

## Quick Reference

```
Fonts:     Crimson Pro (serif, content) + IBM Plex Mono (labels, chrome)
Bg:        #FEFEFE
Text:      #1A1A1A
Accent:    #8B2635
Border:    #E0E0E0
Card gap:  20px
Card pad:  16px
Img height: 256px (standard), 187px (compact)
Max width: 820px (detail), 1200px (browse)
Hover:     opacity transition, 200ms
```
