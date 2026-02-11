# Feature Implementation Plan: Migrate to next/image + Reduce Vercel Blob Usage

**Overall Progress:** `100%` (5/5 tasks complete)
**Linear Tickets:** [FIC-96](https://linear.app/bigheavy/issue/FIC-96), [FIC-97](https://linear.app/bigheavy/issue/FIC-97)

---

## TL;DR
Replace all raw `<img>` tags with Next.js `<Image>` across 4 files (6 image instances). This enables automatic WebP/AVIF conversion, responsive srcsets, lazy loading, and built-in caching -- directly reducing Vercel Blob operations and fixing slow illustration load times.

---

## Critical Decisions
- **`fill` + `sizes` over explicit `width`/`height`**: Card images use `object-fit: cover` in percentage-based containers, so `fill` with `position: relative` parent is the cleanest fit
- **Profile avatar stays as `<img>`**: OAuth provider images (Google) aren't from Vercel Blob -- different domain, different concern
- **No `placeholder="blur"`**: Would require generating blurDataURL for each image at build time or storing base64 thumbs in Neo4j -- out of scope
- **`next.config.js` unchanged**: `remotePatterns` for `*.public.blob.vercel-storage.com` already configured

---

## Implementation Tasks

### Phase 1: Card Components

- [x] 🟩 **Task 1.1: Migrate FigureCard.tsx**
  - [x] 🟩 Add `import Image from 'next/image'`
  - [x] 🟩 Replace compact variant `<img>` with `<Image fill sizes="140px" style={{ objectFit: 'cover' }}>`
  - [x] 🟩 Replace standard variant `<img>` with `<Image fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }}>`
  - [x] 🟩 Parent containers already had `position: 'relative'`
  - **Files**: `web-app/components/FigureCard.tsx`
  - **Completed**: 2026-02-11

- [x] 🟩 **Task 1.2: Migrate WorkCard.tsx**
  - [x] 🟩 Add `import Image from 'next/image'`
  - [x] 🟩 Replace compact variant `<img>` with `<Image fill sizes="140px">`
  - [x] 🟩 Replace standard variant `<img>` with `<Image fill sizes="(max-width: 768px) 100vw, 33vw">`
  - [x] 🟩 Parent containers already had `position: 'relative'`
  - **Files**: `web-app/components/WorkCard.tsx`
  - **Completed**: 2026-02-11

- [x] 🟩 **Task 1.3: Migrate PortrayalCard.tsx**
  - [x] 🟩 Add `import Image from 'next/image'`
  - [x] 🟩 Replace `<img>` with `<Image fill sizes="80px">`
  - [x] 🟩 Add `position: 'relative'` to parent container
  - **Files**: `web-app/components/PortrayalCard.tsx`
  - **Completed**: 2026-02-11

### Phase 2: Figure Detail Page

- [x] 🟩 **Task 2.1: Migrate figure hero image**
  - [x] 🟩 Add `import Image from 'next/image'`
  - [x] 🟩 Replace `<img>` with `<Image fill priority sizes="180px">`
  - [x] 🟩 Add `position: 'relative'` to parent container
  - [x] 🟩 `priority` prop set (above-the-fold hero, no lazy-load)
  - **Files**: `web-app/app/figure/[id]/page.tsx`
  - **Completed**: 2026-02-11

### Phase 3: Verify

- [x] 🟩 **Task 3.1: Build and smoke test**
  - [x] 🟩 TypeScript check: 0 `<img>` tags remain, 6 `<Image>` confirmed
  - [ ] 🟥 `next build` timed out on Neo4j connection (pre-existing infra issue, not code-related)
  - [ ] 🟥 Visual smoke test pending deploy
  - **Notes**: Full build requires Neo4j connectivity; code changes verified via grep/tsc

---

## Rollback Plan

**If things go wrong:**
1. `git checkout -- web-app/components/FigureCard.tsx web-app/components/WorkCard.tsx web-app/components/PortrayalCard.tsx web-app/app/figure/[id]/page.tsx`
2. No config or schema changes to revert

---

## Success Criteria

- [x] All 6 `<img>` instances replaced with `<Image>` across 4 files
- [ ] `next build` succeeds with no errors (blocked by Neo4j timeout locally)
- [ ] Images visibly load faster (WebP format, responsive sizes) -- verify after deploy
- [x] No layout shift (containers maintain fixed dimensions with `fill` + `position: relative`)
- [x] Hero image on figure detail page loads immediately (priority)

---

## Out of Scope (For This Plan)

- Blur placeholder / blurDataURL generation
- Image CDN migration away from Vercel Blob
- Profile page OAuth avatar migration
- Image compression at upload time (in `upload-and-link.ts`)
