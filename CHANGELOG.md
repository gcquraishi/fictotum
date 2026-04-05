# Changelog

All notable changes to Fictotum will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **CHR-26/27/28/29: Phase 2.1 - CREATED_BY Provenance Tracking** - Comprehensive data provenance system
  - Enhanced Agent node schema with full metadata (agent_id, type, version, created_at, metadata)
  - CREATED_BY relationships for all entity nodes (timestamp, context, batch_id, method)
  - Migration script to backfill 907 existing nodes (`scripts/migration/backfill_created_by_provenance.py`)
  - Dry-run mode for safe migration preview
  - Updated contribution APIs to set CREATED_BY on new nodes
  - Audit query endpoint (`/api/audit/node-provenance`) for provenance tracking
  - Statistics endpoint for aggregated provenance metrics
  - Full documentation in `/docs/AGENT_SCHEMA_DESIGN.md`
  - CLAUDE.md updated with mandatory CREATED_BY protocols
- **CHR-16: Unified Data Ingestion Hub** - Single `/contribute` entry point replacing 4 fragmented pages
  - Two-tier search (Fictotum DB + Wikidata) prevents duplicate creation
  - Silent auto-enrichment populates 70%+ metadata fields from Wikidata
  - AI-powered era tag suggestions (Gemini suggests 3-5 contextual tags)
  - Creator bulk import feature (add 10+ films with one click)
  - Data quality tracking with `wikidata_verified` flags
  - Mobile responsive design (320px-1920px viewports)
  - WCAG AAA accessibility support
- **CHR-13: Sentiment Tag System** - Hybrid tag system with 12 suggested tags + custom input
  - Multi-tag support for nuanced portrayal characterization
  - Fuzzy matching with space-optimized Levenshtein algorithm
  - Tag normalization (lowercase, whitespace handling)
- **CHR-12: Historical Location Names** - Contextual display of historical location names
  - "Constantinople/Istanbul" contextual rendering based on time period
  - Location picker with historical name awareness
- **CHR-10: Content Addition UX Redesign** - Progressive disclosure and improved contribution flows
  - Collapsible sections for optional fields (reduced cognitive load)
  - Real-time duplicate detection for Historical Figures
  - Inline help tooltips explaining Wikidata Q-IDs
  - Loading states and success/error feedback throughout
  - Creator bulk import with progress indicators
- **CHR-8/CHR-9: Landing Page Cleanup** - Removed obsolete components
  - Removed Three Bacons hardcoded graph
  - Removed PathQueryInterface UI element

### Changed
- **Entity Resolution Protocol** - Enhanced with phonetic name matching
  - Weighted combination of lexical (Levenshtein 70%) + phonetic (Double Metaphone 30%)
  - Provisional canonical IDs now use `PROV:` prefix format
  - Dual-key blocking checks both `wikidata_id` and `canonical_id`
- **MediaWork Ingestion Protocol** - Now documented inline in API routes
  - Step-by-step protocol compliance comments in `/api/media/create`
- **Authentication** - NextAuth configuration extracted to separate module
  - Fixed Route export validation errors
  - Neo4j driver configured as webpack external

### Fixed
- **CHR-13: Critical form reset bug** - Fixed `setSentiment` reference to non-existent function
- **CHR-16: Production-ready improvements** - Removed console.log statements from production code
- **CHR-12: Type safety** - Replaced unsafe type assertions with proper runtime checks
- **CHR-12: Performance** - 93% memory reduction in Levenshtein algorithm (O(min(m,n)) space)
- **CHR-10: Missing API route** - Created `/api/figures/create` route (figure contributions were completely broken)
- **CHR-10: Error handling** - Enhanced API error responses with structured logging

### Security
- **Input validation** - All API routes validate array elements are strings (prevents DoS vectors)
- **Parameterized queries** - All Neo4j queries use parameterized syntax (no injection risk)
- **Authentication checks** - All write endpoints properly gated with NextAuth

## [0.1.0] - Initial Development

### Added
- Neo4j Aura database integration (instance: c78564a4)
- Historical Figure entity nodes with canonical identifiers
- MediaWork nodes with Wikidata Q-ID resolution
- Appearance relationship tracking (figure → media portrayal)
- Basic search functionality
- Contribution workflows for figures, media, creators, appearances
- NextAuth authentication with GitHub provider
- Wikidata integration for entity enrichment

---

**Note:** For detailed implementation notes, see git history or Linear tickets (CHR-XX).
