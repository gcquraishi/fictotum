# Fictotum: Product Requirements Document
**Version:** 1.0
**Author:** George Quraishi, CEO
**Date:** February 11, 2026
**Status:** Living Document

---

## 1. Product Vision

**One-liner:** Fictotum is a knowledge graph that reveals how history becomes story -- tracking how real historical figures are portrayed, reinterpreted, and mythologized across fiction.

**The insight:** Every historical figure exists in two parallel realities. There's the person who lived, and there's the character that culture has constructed from them across centuries of books, films, TV shows, and games. Cleopatra has been an Elizabeth Taylor epic, a Monica Bellucci comedy, and an Assassin's Creed quest objective. Napoleon has been a Kubrick obsession, a Ridley Scott spectacle, and a Civilization antagonist. Each portrayal carries its own sentiment, its own political context, its own version of "who this person was."

No tool maps this. Wikipedia lists filmography. IMDb lists cast. Wikidata stores facts. But nobody connects the dots between the historical person and the constellation of stories told about them -- and nobody asks the interesting question: *how does the story change depending on who's telling it, and when?*

Fictotum does.

---

## 2. Problem Statement

### For historians and scholars
Historical figures accumulate cultural baggage. A researcher studying public perception of Julius Caesar has no centralized way to see every portrayal -- from Shakespeare's tragedy to HBO's *Rome* to mobile games -- in one place, with sentiment and characterization tracked.

### For media enthusiasts
Film and book lovers who notice patterns ("Why is Henry VIII always the villain?") have no tool to explore those patterns systematically. Letterboxd tracks what you watch. Goodreads tracks what you read. Nothing tracks the *historical figures* that connect works across media.

### For educators
Teachers building lessons around "How has X been portrayed?" must manually assemble examples. A structured, searchable archive of portrayals -- with accuracy notes and scholarly sources -- doesn't exist.

### For the curious
The person who falls down a Wikipedia rabbit hole from Cleopatra to Mark Antony to Augustus to Gladiator to the Flavian dynasty has no tool that mirrors and rewards that graph-shaped curiosity.

---

## 3. Target Users

| Segment | Description | Primary Use Case |
|---------|-------------|------------------|
| **History Buffs** | Enthusiasts who watch historical films, read historical fiction | Browse portrayals, discover new works |
| **Educators** | Teachers, professors using media to teach history | Find examples of how figures are portrayed |
| **Scholars** | Academic researchers studying cultural memory, reception history | Analyze sentiment patterns, track accuracy |
| **Media Enthusiasts** | Film/book/game fans who notice historical patterns | Explore connections, discover related works |
| **Data Enthusiasts** | People who love knowledge graphs, structured data | Explore the graph, contribute data |

**Primary persona (MVP):** The history buff who just finished watching a historical drama and wants to know "What else has this person appeared in, and how were they shown?"

---

## 4. What Has Been Built (Retroactive)

### 4.1 Core Data Model

The foundation is a Neo4j property graph with the following entity types:

| Node Type | Count | Purpose |
|-----------|-------|---------|
| **HistoricalFigure** | 958 | Real people from history, identified by Wikidata Q-IDs or provisional canonical IDs |
| **MediaWork** | 1,215 | Films, books, TV series, video games, and other media |
| **FictionalCharacter** | 101 | Fictional characters from historical fiction (e.g., Falco from Lindsey Davis novels) |
| **Series** | 10 | Multi-work containers (e.g., the Falco book series, Assassin's Creed) |
| **Agent** | 6 | Provenance tracking -- who created each piece of data |

Key relationships:
- **APPEARS_IN** (1,372): A figure appearing in a media work, with sentiment, role, actor, and characterization metadata
- **INTERACTED_WITH** (319): Historical/fictional connections between figures
- **PART_OF** (312): Works belonging to series
- **CREATED_BY** (2,309): Full provenance chain from every entity to the agent that created it

**Total:** 2,301 nodes, 4,535 relationships.

### 4.2 Entity Resolution System

A multi-layered system prevents duplicate entries:

1. **Wikidata-First Canonical IDs:** 76% of figures and 94% of works are linked to Wikidata Q-IDs, providing globally unique identifiers
2. **Provisional IDs:** Figures without Wikidata entries get timestamped provisional IDs (`PROV:slug-timestamp`)
3. **Enhanced Name Matching:** 70% Levenshtein (lexical) + 30% Double Metaphone (phonetic) scoring catches spelling variations ("Steven" vs. "Stephen") before they become duplicates
4. **Dual-Key Blocking:** Both `wikidata_id` and `canonical_id` are checked before any node creation

### 4.3 Web Application

A Next.js 14 application (TypeScript, Tailwind CSS v4) deployed on Vercel with 50+ API endpoints:

**Shipped pages:**
- **Homepage** (`/`): Browse-first discovery with search, featured figures, era/medium browsing, coverage gaps
- **Figure Detail** (`/figure/[id]`): Single-column dossier with AI portrait, portrayal cards with sentiment tags, connected figures, reputation timeline, conflict radar
- **Search** (`/search`): Universal search across 7 categories (figures, works, series, creators, actors, locations, eras)
- **Browse** (`/browse`): Era and location discovery interface
- **Series** (`/series`): Series exploration with character casting matrices
- **Graph Explorer** (`/explore`): Interactive force-directed graph with bloom expansion, pathfinding, navigation history
- **Contribute** (`/contribute`): Unified data contribution hub
- **Welcome** (`/welcome`): Show-don't-tell onboarding using Julius Caesar as showcase figure
- **Creator Pages** (`/creator/[name]`): Author/director repertory views
- **Media Detail** (`/media/[id]`): Media work pages
- **Admin** (`/admin`): Cache stats, health checks, image regeneration

**Key components (49+):**
- Entity cards (`FigureCard`, `WorkCard`, `PortrayalCard`) with AI-generated illustrations via `next/image`
- Visualization suite: conflict radar, sentiment trends, reputation timeline, temporal coverage charts, cultural impact scores
- Graph explorer with bloom expansion, camera control, depth tracking, collapse, and back navigation
- Contribution forms with Wikidata validation and duplicate detection

### 4.4 AI Illustration Pipeline

Every historical figure gets a unique, AI-generated illustration:

- **Model:** Google Gemini (gemini-2.5-flash-image)
- **Style:** Halftone pop-art stickers with transparent PNG backgrounds
- **Palette:** Non-realistic, deterministic color assignment per figure (no two adjacent figures share a palette)
- **Storage:** Vercel Blob (`*.public.blob.vercel-storage.com`)
- **Tooling:** TypeScript pipeline (`scripts/image-gen/`) with adaptive rate control, parallel workers, and admin regeneration endpoint
- **Optimization:** Migrated to `next/image` for lazy loading, responsive sizing, and format optimization

### 4.5 Data Ingestion Infrastructure

**Batch Import System** (`scripts/import/batch_import.py`):
- JSON schema validation with detailed error reporting
- Duplicate detection using enhanced name similarity
- Wikidata Q-ID validation via API
- Automatic CREATED_BY agent attribution
- Dry-run mode for safe preview, transaction rollback on error
- CSV-to-JSON converter for spreadsheet-based contributions

**40+ expansion datasets** covering:
- Ancient Rome (Roman Republic, Empire, late antiquity)
- Biblical/Gospel era
- Medieval Europe
- Global MVP seed (cross-cultural baseline)
- Lindsey Davis Falco mystery series (20 books)
- Wolf Hall trilogy
- WWII figures

**Research tools** (`scripts/research/`):
- Wikidata harvesting for media works and figures
- AI-powered deep research via Google Gemini
- Automatic Q-ID resolution for unlinked entities

### 4.6 Quality Infrastructure

- **Provenance:** 100% CREATED_BY coverage (2,309 relationships tracking who created what, when, and how)
- **Health Monitoring:** `scripts/qa/neo4j_health_check.py` for weekly database health reports
- **Performance:** LRU caching (66x average speedup), 35 database indexes (all ONLINE), duplicate detection optimized from 44s to 13ms (3,487x improvement)
- **Duplicate Management:** 12 successful merges with full MERGED_FROM audit trail, soft-delete pattern for reversibility
- **35 indexes** across all major query patterns, all healthy and populated

### 4.7 Design System

"FSG Literary Minimalism" -- an editorial, archival aesthetic:
- **Typography:** Crimson Pro (serif headings), monospace accents
- **Palette:** Wine-red (#8B2635), cream, warm neutrals, muted media-type colors
- **Patterns:** Stamp badges, dossier cards, section headers with scholarly feel
- **Sentiment colors:** Mapped to portrayal tone (heroic, villainous, complex, neutral)
- **Dark mode:** Class-based toggle support

---

## 5. Current State Assessment

### What's Working Well
- **Data foundation is strong:** 958 figures, 1,215 works, 1,372 portrayals with sentiment tagging
- **Entity resolution is robust:** Wikidata-first strategy with phonetic fallback catches duplicates reliably
- **Performance is excellent:** All critical APIs under 500ms, cached queries under 20ms
- **Visual identity is distinctive:** AI-generated pop-art stickers give the product a memorable, non-generic look
- **Provenance is complete:** 100% audit trail on every node in the database

### Known Data Quality Issues
1. **Media type inconsistency:** "Film" vs "film" vs "FILM", "Book" vs "novel" vs "literary work" -- needs normalization migration
2. **Sentiment inconsistency:** "Complex" vs "complex", "Heroic" vs "heroic" -- plus 119 null sentiment values (9%)
3. **Legacy canonical IDs:** 116 figures (12%) still use non-prefixed slug IDs instead of Q-IDs or PROV: format
4. **Era/Location nodes:** Schema prepared but 0 nodes created -- these structured taxonomies aren't yet active

### Technical Debt
- Some components still use inline styles alongside Tailwind
- FigureDossier.tsx deleted but some references may linger
- 5 unlabeled orphaned nodes in the database
- No automated test suite for the web application (unit or integration)
- No CI/CD pipeline beyond Vercel's default

---

## 6. Product Principles

These aren't aspirational -- they describe the decisions already made and should continue to guide the product:

1. **Browse before commit.** No signup wall. Every feature is accessible without an account. Letterboxd's model: fall in love with browsing, then optionally sign up to track and contribute.

2. **The graph is the product, but it's not the UI.** The force-directed graph explorer is powerful but secondary. The primary experience is cards, lists, and pages -- the graph is a "go deeper" tool for power users.

3. **Sentiment is the unique angle.** IMDb has cast lists. Wikipedia has filmographies. Fictotum's differentiator is *how* a figure was portrayed -- heroic, villainous, complex -- and how that changes across time and media.

4. **Data provenance is non-negotiable.** Every node must be attributable to its creator. This is infrastructure for trust, not a feature users see directly.

5. **Wikidata as canonical truth.** External identifiers ground the data in reality. When Wikidata has a Q-ID, that's the ID. Provisional IDs are temporary.

6. **AI-assisted, human-curated.** AI generates illustrations and accelerates research. Humans verify, curate, and make editorial decisions. The product never presents AI-generated content as historical fact.

---

## 7. Forward-Looking Requirements

### 7.1 Phase: Data Quality Hardening (Near-term, Q1 2026)

**Objective:** Clean up known inconsistencies before public beta.

| Requirement | Priority | Status |
|-------------|----------|--------|
| Normalize `media_type` values to canonical set (Film, Book, TV Series, Video Game, Documentary, Play, Musical, Podcast, Comic) | P0 | Not started |
| Normalize sentiment values to controlled vocabulary with consistent casing | P0 | Not started |
| Backfill 119 null sentiment APPEARS_IN relationships | P1 | Not started |
| Migrate remaining 116 legacy canonical IDs to Q-ID or PROV: format | P1 | Script exists, needs execution |
| Activate Era and Location node types with structured taxonomy | P2 | Schema ready |

### 7.2 Phase: Media Work Detail Pages (Near-term)

**Objective:** Give media works their own detail pages (currently they link to the graph explorer).

| Requirement | Priority |
|-------------|----------|
| `/media/[id]` detail page with work metadata, cast of historical figures, sentiment breakdown | P0 |
| "Who's in this?" section showing all historical figures that APPEARS_IN this work | P0 |
| Historical accuracy section surfacing `historical_inaccuracies` property | P1 |
| Related works (same series, same era, shared figures) | P1 |
| Scholarly sources and citations | P2 |

### 7.3 Phase: User Accounts & Collections (Mid-term)

**Objective:** Let users track what they've watched/read and build personal collections.

| Requirement | Priority |
|-------------|----------|
| User authentication (NextAuth with OAuth providers) | P0 |
| "Watched/Read" tracking on MediaWork pages | P0 |
| Personal lists/collections (e.g., "Best Napoleon Films") | P1 |
| User profile page showing activity and lists | P1 |
| User-submitted portrayals with review queue | P2 |
| Reputation/trust system for prolific contributors | P2 |

### 7.4 Phase: Comparative Analysis Tools (Mid-term)

**Objective:** Enable the "How has portrayal changed?" analysis that makes Fictotum unique.

| Requirement | Priority |
|-------------|----------|
| Side-by-side comparison: pick 2-3 portrayals of the same figure and compare sentiment, accuracy, and characterization | P0 |
| "Portrayal evolution" timeline: how sentiment shifts across decades of media | P0 |
| "Most contested" figures: who has the widest sentiment spread? | P1 |
| "Historical accuracy spectrum" visualization: pure dramatization vs. scholarly reconstruction | P1 |
| Export/share analysis as image or link | P2 |

### 7.5 Phase: Content Growth Engine (Ongoing)

**Objective:** Scale from ~1,000 figures to 5,000+ with sustainable workflows.

| Requirement | Priority |
|-------------|----------|
| Automated Wikidata sync: detect new media works about tracked figures | P1 |
| Community contribution pipeline with validation and review | P1 |
| Coverage gap targeting: systematically fill underrepresented eras and regions | P1 |
| Partnership integrations (academic databases, film archives) | P2 |
| API for third-party data contributions | P2 |

### 7.6 Phase: Public API (Longer-term)

**Objective:** Make Fictotum's data available as a public resource.

| Requirement | Priority |
|-------------|----------|
| RESTful public API with rate limiting and API keys | P1 |
| GraphQL endpoint for flexible querying | P2 |
| Embeddable widgets ("Portrayals of X" cards for blogs/articles) | P2 |
| Data exports (JSON, CSV) for researchers | P1 |
| SPARQL endpoint for Wikidata interoperability | P3 |

---

## 8. Success Metrics

### Launch Metrics (Beta)
| Metric | Target | Current |
|--------|--------|---------|
| Historical figures in database | 1,000 | 958 |
| Media works in database | 1,500 | 1,215 |
| Portrayals with sentiment | 2,000 | 1,253 (119 null) |
| Wikidata coverage (figures) | 80% | 76% |
| Wikidata coverage (works) | 95% | 94% |
| API response time (p95) | <500ms | <500ms |
| Provenance coverage | 100% | 100% |

### Growth Metrics (Post-Beta)
| Metric | Target | Timeframe |
|--------|--------|-----------|
| Monthly active users | 1,000 | 3 months post-launch |
| Community-contributed portrayals | 500 | 6 months post-launch |
| Historical figures | 5,000 | 12 months post-launch |
| Unique eras/regions represented | 20+ | 6 months post-launch |
| Average session duration | >3 min | Ongoing |
| Pages per session | >4 | Ongoing |

### Quality Metrics (Ongoing)
| Metric | Target |
|--------|--------|
| Duplicate rate (new entries creating duplicates) | <1% |
| Sentiment coverage (portrayals with sentiment tags) | >95% |
| Wikidata linkage rate (all entities) | >85% |
| Orphaned nodes (entities with no relationships) | 0 |

---

## 9. Competitive Landscape

| Product | What It Does | Fictotum's Differentiation |
|---------|-------------|---------------------------|
| **IMDb** | Cast lists, ratings, reviews | IMDb doesn't connect the historical person across works or track sentiment |
| **Wikipedia** | Encyclopedic articles with filmographies | No structured data, no sentiment analysis, no graph exploration |
| **Wikidata** | Structured facts and identifiers | Raw data, no UX, no editorial curation, no sentiment |
| **Letterboxd** | Social film tracking and reviews | Film-only, no historical figure lens, no cross-media connections |
| **Goodreads** | Book tracking and reviews | Books-only, no historical figure lens |
| **HistoryExtra / History.com** | Articles about history in media | Editorial content, not a structured database |

**Fictotum's moat:** The intersection of *structured historical data* + *cross-media portrayal tracking* + *sentiment analysis* + *graph-based exploration*. No existing product sits at this intersection.

---

## 10. Technical Architecture Summary

```
                    +------------------+
                    |   Vercel (CDN)   |
                    +--------+---------+
                             |
                    +--------+---------+
                    |  Next.js 14 App  |
                    |  (App Router)    |
                    |  TypeScript      |
                    |  Tailwind v4     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------+---+  +------+------+  +----+-------+
     | Neo4j Aura |  | Vercel Blob |  | Google     |
     | (Graph DB) |  | (Images)    |  | Gemini API |
     +------------+  +-------------+  +------------+
              |
     +--------+--------+
     | Wikidata API     |
     | (Entity resolve) |
     +------------------+
```

**Key dependencies:**
- **Neo4j Aura** (c78564a4): Managed graph database, single instance
- **Vercel**: Hosting, serverless functions, blob storage for illustrations
- **Google Gemini**: AI illustration generation
- **Wikidata API**: Entity resolution and enrichment
- **NextAuth**: Authentication (beta, not yet user-facing)

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Neo4j Aura single instance** -- no redundancy | Medium | High | Regular health checks, consider read replicas for beta |
| **AI illustration quality** -- some figures get poor illustrations | Medium | Medium | Admin regeneration endpoint exists; manual review process |
| **Data accuracy** -- AI-assisted ingestion may introduce errors | Medium | High | Human review for all bulk imports; provenance tracking enables rollback |
| **Scope creep** -- too many features before beta launch | High | Medium | PRD defines clear phases; launch with data quality, not feature count |
| **Content bias** -- overrepresentation of Western/European history | High | Medium | Coverage gap detection built in; systematic expansion to underrepresented regions |
| **Legal** -- AI-generated images of historical figures | Low | Medium | Non-photorealistic style (pop-art stickers) reduces likeness concerns; no living persons |

---

## 12. Open Questions

1. **Revenue model:** Is Fictotum a free public resource, a freemium product, or a tool for academic institutions? This affects every product decision downstream.

2. **Community governance:** When user contributions scale, who adjudicates disputes about sentiment tags or historical accuracy? What's the editorial model?

3. **Content scope boundaries:** Should Fictotum include mythological figures (Zeus, Thor) who appear in both ancient texts and modern media? What about semi-historical figures (King Arthur, Robin Hood)?

4. **Mobile experience:** Is a responsive web app sufficient, or does the graph exploration warrant a native mobile app?

5. **Internationalization:** Historical figure names vary by language. Should Fictotum support multilingual names and descriptions?

---

## 13. Development Timeline

### Completed (January - February 2026)
- Core data model and entity resolution
- Web application with 15+ pages and 50+ API endpoints
- AI illustration pipeline with 958+ figure illustrations
- Browse-first homepage, figure dossier, graph explorer
- Batch import infrastructure
- Performance optimization (3,487x caching improvement)
- 100% provenance coverage
- Design system (FSG Literary Minimalism)
- Show-don't-tell onboarding

### In Progress (February 2026)
- `next/image` migration for optimized illustration loading
- Data quality hardening (media type and sentiment normalization)

### Next Up (Q1 2026 Remaining)
- Media work detail pages
- Remaining canonical ID migration
- Automated test suite
- Beta launch preparation

### Future (Q2 2026+)
- User accounts and collections
- Comparative analysis tools
- Content growth to 5,000+ figures
- Public API
- Community contribution scaling

---

*This document reflects the state of Fictotum as of February 11, 2026. It will be updated as the product evolves.*
