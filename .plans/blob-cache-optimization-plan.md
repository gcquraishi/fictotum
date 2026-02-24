# Feature Implementation Plan: Vercel Blob Cache Optimization

**Overall Progress:** `67%` (2/3 tasks complete)

---

## TL;DR
Add `cacheControlMaxAge` to all Vercel Blob `put()` calls so browsers and CDN edges cache images for 1 year instead of re-requesting them on every page load. This directly reduces "Blob Advanced Requests" (currently at 75% of quota) without migrating storage.

---

## Critical Decisions
- **Cache duration: 1 year (31536000s)**: These are AI-generated illustrations keyed by entity ID. When an image is regenerated, `addRandomSuffix: false` overwrites the blob at the same path — but the URL stays the same, so we also need `Cache-Control: must-revalidate` behavior. Vercel Blob handles this: overwriting a blob busts the CDN cache automatically.
- **No migration**: Vercel Blob stays as the storage layer. The `next/image` migration (FIC-96/97) already reduces read amplification via Next.js image optimization cache. Adding `cacheControlMaxAge` stacks on top of that.
- **Both upload paths get the fix**: The bulk upload script (`upload-and-link.ts`) and the admin API (`regenerate-image/route.ts`) both call `put()` and both need the parameter.

---

## Implementation Tasks

### Phase 1: Add Cache Headers

- [x] **Task 1.1: Update bulk upload script**
  - [x] Add `cacheControlMaxAge: 31536000` to the `put()` options in `uploadToBlob()`
  - **Files**: `scripts/image-gen/upload-and-link.ts` (line 96-100)

- [x] **Task 1.2: Update admin regenerate API**
  - [x] Add `cacheControlMaxAge: 31536000` to the `put()` options
  - **Files**: `web-app/app/api/admin/regenerate-image/route.ts` (line 221-226)

### Phase 2: Re-upload Existing Images

- [x] **Task 2.1: Add --force flag to upload script**
  - [x] Add `--force` CLI flag that re-uploads already-uploaded images
  - [x] Test with `--force --dry-run` — confirmed 1,008 images listed
  - [ ] Execute re-upload (`--force` without `--dry-run`) — pending deploy + run
  - **Files**: `scripts/image-gen/upload-and-link.ts`
  - **Dependencies**: Task 1.1 complete

### Phase 3: Verify

- [ ] **Task 3.1: Confirm cache headers on live images**
  - [ ] Deploy to Vercel
  - [ ] `curl -I <blob-image-url>` and confirm `Cache-Control: public, max-age=31536000`
  - [ ] Check Vercel Blob usage in dashboard after 48h — requests should drop significantly

---

## Rollback Plan

**If things go wrong:**
1. Remove `cacheControlMaxAge` from both `put()` calls
2. Re-upload images without the parameter (restores default cache behavior)
3. No data loss possible — images themselves are unchanged

---

## Success Criteria

✅ Both `put()` call sites include `cacheControlMaxAge: 31536000`
✅ `curl -I` on a blob image shows `Cache-Control: public, max-age=31536000`
✅ Vercel Blob Advanced Requests usage drops below 50% within 1-2 weeks

---

## Out of Scope (For This Plan)

- Migrating away from Vercel Blob to R2/S3 (separate decision if caching doesn't solve the quota issue)
- Image compression at upload time
- Blur placeholder generation
- Purging unused/orphaned blobs from the store
