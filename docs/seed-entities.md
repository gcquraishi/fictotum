# Seed Entities Registry

This document maintains a registry of all critical entities used across the ChronosGraph application. These entities are considered "seed data" - foundational nodes that are referenced in code and must exist in the database.

## Purpose

- **Single Source of Truth**: Centralized documentation for all hardcoded entity references
- **Prevent Stale IDs**: Track where IDs are used to catch issues when data changes
- **Onboarding**: Help new developers understand which entities are critical to the app
- **Validation**: Reference for automated ID validation scripts

## How to Use

1. **When adding a new critical entity**:
   - Add entry to `CRITICAL_ENTITIES` in `web-app/lib/constants/entities.ts`
   - Document it below with usage context
   - Run validation: `npm run validate:entities`

2. **When removing an entity**:
   - Remove from code first
   - Remove from `CRITICAL_ENTITIES`
   - Update this document
   - Run validation to ensure no orphaned references

3. **When an entity's canonical_id changes**:
   - Update `CRITICAL_ENTITIES`
   - Update this document
   - Re-run validation

## Critical Entities

### Historical Figures

#### Henry VIII of England
- **Canonical ID**: `Q38358`
- **Wikidata**: [Q38358](https://www.wikidata.org/wiki/Q38358)
- **Type**: HistoricalFigure
- **Added**: 2026-02-02 (Sprint 2)
- **Added By**: Claude Code (Sonnet 4.5)
- **Usage**:
  - Landing page default starting node (`web-app/app/page.tsx`)
  - Universe mockup background graph (`web-app/app/mockups/universe/page.tsx`)
- **Rationale**:
  - Extremely well-known historical figure (immediately recognizable)
  - Rich and dramatic life story (six wives, English Reformation, etc.)
  - Extensive media portrayals (films, TV series, documentaries, books, plays)
  - Strong cultural recognition across demographics
  - Visually distinctive (iconic Tudor-era appearance)
- **Connected Media**: 12+ media works including:
  - Wolf Hall trilogy (Hilary Mantel)
  - The Tudors (TV series)
  - Multiple films and documentaries

---

### Media Works

#### Wolf Hall Trilogy (Series)
- **Canonical ID**: `Q2657795-series`
- **Type**: MediaWork (BookSeries)
- **Added**: 2026-02-02 (Sprint 2 - Series UX Implementation)
- **Added By**: Claude Code (Sonnet 4.5)
- **Usage**:
  - Series structure for demonstrating series badge UI feature
  - Connected via PART_OF relationships to individual books
- **Component Books**:
  1. **Wolf Hall** (2009) - Q2657795
  2. **Bring Up the Bodies** (2012) - Q3644822
  3. **The Mirror & the Light** (2020) - Q7751674
- **Notes**:
  - No official Wikidata Q-ID for the trilogy as a series
  - Uses provisional ID based on first book's Q-ID
  - Created to demonstrate series UI features (badges, compaction)

---

## Validation

Run the validation script to verify all critical entities exist in the database:

```bash
npm run validate:entities
```

This script:
1. Scans codebase for hardcoded canonical_id and wikidata_id references
2. Validates each ID against Neo4j database via API
3. Reports any invalid or missing entities
4. Exits with error code if validation fails (useful for CI/CD)

## Maintenance Schedule

- **Weekly**: Review this document for accuracy during sprint reviews
- **Before Deploy**: Run `npm run validate:entities` as pre-deployment check
- **After Data Migration**: Update IDs if canonical identifiers change
- **Quarterly**: Audit for unused entities that can be removed

## Related Files

- `web-app/lib/constants/entities.ts` - TypeScript constants registry
- `scripts/qa/validate_hardcoded_ids.ts` - Automated validation script
- `CLAUDE.md` - Entity resolution and canonical identifier protocols

---

**Last Updated**: 2026-02-02
**Maintained By**: ChronosGraph Development Team
