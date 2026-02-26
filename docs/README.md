# Fictotum Documentation

Welcome to the Fictotum documentation hub. This guide will help you navigate the available resources for contributing, developing, and understanding the platform.

## Documentation Structure

```
docs/
├── contributing/          # Contribution guidelines and policies
├── protocols/             # Technical protocols and workflows
├── guides/               # Step-by-step tutorials and how-tos
├── design/               # UX/UI design specifications
├── research/             # Historical research sessions
├── sprints/              # Sprint planning and reviews
└── roadmaps/             # Product roadmaps and feature plans
```

---

## Getting Started

### For Contributors

**New to Fictotum?** Start here:

1. **[Contributing Guidelines](/docs/contributing/CONTRIBUTING.md)** - Read this first
   - Data quality standards
   - MediaWork Ingestion Protocol
   - HistoricalFigure Entity Resolution Protocol
   - Code of Conduct
   - Common mistakes and how to avoid them

2. **[Data Ingestion Guide](/docs/guides/data-ingestion.md)** - Practical tutorial
   - Using the `/contribute` hub (step-by-step)
   - Wikidata Q-ID lookup best practices
   - Sentiment tag selection guidelines
   - Session note-taking templates
   - Example workflows from real ingestion sessions

3. **[Entity Resolution Protocol](/docs/protocols/entity-resolution.md)** - Technical deep-dive
   - Canonical ID strategy (Wikidata Q-IDs vs Provisional IDs)
   - Duplicate prevention workflow with Mermaid flowcharts
   - Phonetic matching algorithm (70% lexical + 30% phonetic)
   - Edge cases and solutions
   - Migration path for existing data

**Quick Reference**:
- Before adding any entity: Search Wikidata → Check database → Document sources
- MediaWorks: Q-ID required, verify media type, release year ≠ setting year
- HistoricalFigures: Use Q-ID as canonical_id when available, PROV: prefix otherwise
- Always cite your sources in session notes

---

## For Developers

### Technical Documentation

**Architecture & Systems**:
- **[Duplicate Detection System](/docs/duplicate-detection-system.md)** - Enhanced similarity scoring, merge operations, admin dashboard
- **[Provenance Query Examples](/docs/PROVENANCE_QUERY_EXAMPLES.md)** - CREATED_BY relationship queries and audit trails

**Design System**:
- **[Evidence Locker Design System](/docs/design/DESIGN_SYSTEM_EVIDENCE_LOCKER_LIGHT.md)** - Light mode design specifications
- **[Landing Page Design Brief](/docs/design/DESIGN_BRIEF_LANDING_PAGE.md)** - Home page UX and visual design

**Product Planning**:
- **[Q1 2026 Roadmap](/docs/roadmaps/q1-2026-roadmap.md)** - Quarterly feature plan and priorities
- **[Sprint Plans](/docs/sprints/)** - Bi-weekly sprint planning and reviews

---

## For Research Analysts

### Historical Research Resources

**Session Logs**:
- **[FICTOTUM_LOG.md](/FICTOTUM_LOG.md)** - Master research log with all ingestion sessions
  - WWII Historical Cluster (CHR-34) - 38 figures, 18 media works
  - Medieval Europe Cluster (CHR-35) - 50 figures, 25 media works
  - Roman Empire Cluster - 100+ figures, 20+ media works

**Research Examples**:
- **[Character Research](/docs/research/)** - Detailed character analysis from historical fiction
  - Falco series character research (Roman detective novels)
  - Connection prioritization reports

**Best Practices**:
1. Always verify entities via Wikidata Q-IDs
2. Check for duplicates using dual-key blocking
3. Document sources and research decisions
4. Apply nuanced sentiment tags (avoid binary good/evil)
5. Create dense relationship networks (INTERACTED_WITH, NEMESIS_OF)

---

## Core Protocols

### MediaWork Ingestion Protocol

**The 5-Step Process**:
1. **Search Wikidata** for Q-ID before creating any MediaWork
2. **Query Neo4j** via MCP: `MATCH (m:MediaWork {wikidata_id: $qid}) RETURN m`
3. **If exists** → Link new portrayals to existing node
4. **If not exists** → Create with `wikidata_id` property
5. **Aliases** only when scholarly source confirms alternate title

**Why Q-IDs are mandatory for MediaWorks**:
- Ensures global uniqueness across billions of Wikidata entities
- Enables external knowledge base alignment
- Reduces duplicate research burden
- Provides stable identifiers (Q-IDs never change)

**Read more**: [Contributing Guidelines - MediaWork Ingestion Protocol](/docs/contributing/CONTRIBUTING.md#mediawork-ingestion-protocol)

---

### HistoricalFigure Entity Resolution Protocol

**Canonical ID Strategy** (Wikidata-First):

**Priority 1: Wikidata Q-ID** (always preferred)
```cypher
(:HistoricalFigure {
  canonical_id: "Q517",      // Napoleon Bonaparte
  wikidata_id: "Q517",
  name: "Napoleon Bonaparte"
})
```

**Priority 2: Provisional ID** (only when Q-ID unavailable)
```cypher
(:HistoricalFigure {
  canonical_id: "PROV:john-smith-1738462847293",  // Timestamped to prevent collisions
  name: "John Smith"
})
```

**Duplicate Prevention**:
- Dual-key blocking: Check both `wikidata_id` AND `canonical_id`
- Phonetic + lexical matching: 70% Levenshtein + 30% Double Metaphone
- Confidence thresholds: ≥0.9 (high), 0.7-0.89 (medium), <0.7 (low)

**Read more**: [Entity Resolution Protocol](/docs/protocols/entity-resolution.md)

---

## Data Quality Standards

### Required for All Contributions

**Wikidata Verification**:
- MediaWorks: Q-ID mandatory before creation
- HistoricalFigures: Q-ID strongly preferred (use PROV: only when unavailable)
- Always search Wikidata first (spend 2-3 minutes minimum)

**Source Documentation**:
- Primary sources: Wikidata, Wikipedia, Britannica, specialized encyclopedias
- Record all sources in session notes with URLs and access dates
- Note conflicts between sources using `conflict_flag` properties

**Historical Accuracy**:
- Verify dates against multiple sources
- Use most common English transliteration (verify via Wikidata)
- Include formal titles only if historically documented
- Era tags must match historical consensus

**Provenance Tracking**:
- All entities automatically receive CREATED_BY relationships
- Tracks timestamp, context, method, and agent/user
- Enables full audit trail for data quality verification

**Read more**: [Contributing Guidelines - Data Quality Standards](/docs/contributing/CONTRIBUTING.md#data-quality-standards)

---

## Common Workflows

### Workflow 1: Adding a Single Historical Figure

1. Navigate to `/contribute`
2. Search for the figure's name
3. Select Wikidata match (green) or create user-generated (gray)
4. Review auto-enriched metadata
5. Confirm and create
6. Document in session notes

**Estimated time**: 5-10 minutes

**Read more**: [Data Ingestion Guide - Example Workflows](/docs/guides/data-ingestion.md#example-workflows)

---

### Workflow 2: Adding a MediaWork with Portrayals

1. Add the MediaWork (see Workflow 1)
2. Configure settings (locations, era tags, media type)
3. Navigate to the media page
4. Add portrayals via "Add Portrayal" button
5. Search for historical figures portrayed
6. Assign sentiment tags for each portrayal
7. Document in session notes

**Estimated time**: 15-30 minutes

**Read more**: [Data Ingestion Guide - Workflow 2](/docs/guides/data-ingestion.md#workflow-2-adding-a-mediawork-with-portrayals)

---

### Workflow 3: Bulk Ingesting a Historical Cluster

**For research agents ingesting 20+ entities**:

1. Create session note header in FICTOTUM_LOG.md
2. Research phase: Compile entity list with Wikidata Q-IDs
3. Duplicate check: Query database for existing entities
4. Write Cypher bulk insert script with provenance
5. Execute via MCP `write-cypher` tool
6. Verify creation and relationships
7. Complete session documentation

**Estimated time**: 2-4 days (for 50+ entities)

**Read more**: [Data Ingestion Guide - Bulk Ingestion](/docs/guides/data-ingestion.md#bulk-ingestion-for-research-agents)

---

## Sentiment Tag Guidelines

Sentiment tags describe **how the media portrays a figure**, not historical truth or personal opinion.

### Primary Categories

| Tag | Meaning | Example |
|-----|---------|---------|
| `heroic` | Portrayed as noble, brave, virtuous | Arthur in "Excalibur" |
| `villainous` | Portrayed as evil or antagonistic | Commodus in "Gladiator" |
| `tragic` | Portrayed with sympathy despite downfall | Caesar in "Rome" (HBO) |
| `conflicted` | Portrayed with moral complexity | Schindler in "Schindler's List" |
| `satirical` | Portrayed for comedic or critical effect | Hitler in "Inglourious Basterds" |
| `documentary` | Portrayed factually and analytically | Figures in "The World at War" |
| `romanticized` | Portrayed with idealization | Napoleon in various films |

### Compound Tags (use hyphens)

- `heroic-conflicted` - Hero with moral struggles
- `tragic-monstrous` - Sympathetic portrayal of evil figure (e.g., Hitler in "Downfall")
- `documentary-analytical` - Scholarly, objective treatment
- `conflicted-military` - Complex military leader (e.g., Rommel)

**Important**: The same figure can have different sentiment tags across different media works. This is expected and valuable!

**Read more**: [Data Ingestion Guide - Sentiment Tag Selection](/docs/guides/data-ingestion.md#sentiment-tag-selection-guidelines)

---

## Code of Conduct

Fictotum is a scholarly platform built on rigorous data quality and respectful collaboration.

### Core Principles

1. **Respectful Discourse** - Treat all historical figures, time periods, and cultures with scholarly respect
2. **No Historical Revisionism** - Do not create data to support ahistorical narratives
3. **Cite Your Sources** - Every entity should be traceable to verifiable sources
4. **Assume Good Faith** - If you find an error, assume it was an honest mistake
5. **Zero Tolerance for Bad Faith** - Vandalism, propaganda, or harassment will not be tolerated

**Read more**: [Contributing Guidelines - Code of Conduct](/docs/contributing/CONTRIBUTING.md#code-of-conduct)

---

## Conflict Resolution

When sources disagree:

1. **Birth/Death Year Discrepancies** - Use most commonly cited year, add `conflict_flag`
2. **Spelling Variations** - Use Wikidata's primary label, store alternates in `alternate_names`
3. **Relationship Disputes** - Use neutral relationship types, add `relationship_note` property
4. **Sentiment Disagreements** - Use compound tags, cite reviews/analyses

**Escalation**: If you cannot resolve a conflict, create a Linear ticket with the "data-quality" label.

**Read more**: [Contributing Guidelines - Handling Conflicting Sources](/docs/contributing/CONTRIBUTING.md#handling-conflicting-sources)

---

## Tools & Resources

### External Resources

- **[Wikidata](https://www.wikidata.org)** - Primary source for canonical Q-IDs
- **[Wikidata Query Service](https://query.wikidata.org)** - SPARQL queries for bulk research
- **[Wikipedia](https://en.wikipedia.org)** - Biographical and historical context
- **[Britannica](https://www.britannica.com)** - Scholarly verification
- **[IMDb](https://www.imdb.com)** - Film and TV verification

### Fictotum Tools

- **Contribution Hub**: `/contribute` - Web UI for adding entities
- **Duplicate Detection Dashboard**: `/admin/duplicates` - Review and merge duplicates
- **Provenance Audit API**: `/api/audit/node-provenance` - Query entity creation history
- **MCP Neo4j Tools**: `read-cypher`, `write-cypher` - Direct database access for agents

---

## Recent Updates

### January 2026 Enhancements

**Wikidata-First Canonical Identifiers** (Priority 1):
- Wikidata Q-IDs now used as `canonical_id` for HistoricalFigures
- Provisional IDs (PROV: prefix) only when Q-ID unavailable
- Migration script available: `scripts/migration/prefix_provisional_canonical_ids.py`

**Enhanced Phonetic Matching** (Priority 2):
- Weighted combination: 70% lexical (Levenshtein) + 30% phonetic (Double Metaphone)
- Confidence thresholds: High (≥0.9), Medium (0.7-0.89), Low (<0.7)
- Better handling of spelling variations and non-English names

**Provenance Tracking** (Phase 2.1):
- CREATED_BY relationships mandatory for all node creation
- Tracks timestamp, context, method, and agent/user
- Audit API for full creation history

**Duplicate Detection System** (CHR-30, CHR-31, CHR-32):
- Automated duplicate detection with enhanced similarity scoring
- Admin dashboard for review and merge operations
- Wikidata Q-ID conflict prevention

---

## FAQs

**Q: Do I need a Wikidata Q-ID for every entity?**
A: For MediaWorks, yes (mandatory). For HistoricalFigures, strongly preferred but provisional IDs allowed when Q-ID doesn't exist.

**Q: What if I can't find a Wikidata Q-ID?**
A: Spend 2-3 minutes searching with alternate spellings, then use a provisional ID with `PROV:` prefix and document why no Q-ID was found.

**Q: Can I create an entity without sources?**
A: No. All contributions must be backed by verifiable sources (Wikidata, Wikipedia, Britannica, or scholarly sources).

**Q: How do I know if an entity already exists?**
A: Use the `/contribute` search bar (checks database AND Wikidata) or run a Cypher query with the Q-ID.

**Q: What if two figures have the same name?**
A: Use the phonetic matching system to detect duplicates. If they're different people, ensure different Q-IDs or different birth/death years.

**Q: Can I edit someone else's contribution?**
A: Yes, but document your changes in session notes and ensure you have sources to support the edit.

---

## Support & Contact

**For Technical Issues**:
- Create a Linear ticket with the "bug" label

**For Data Quality Questions**:
- Create a Linear ticket with the "data-quality" label

**For General Questions**:
- Check existing documentation first
- Consult FICTOTUM_LOG.md for research examples
- Ask in the team channel (if applicable)

---

**Last Updated**: 2026-02-01
**Documentation Version**: 1.0.0
**Contributors**: Claude Sonnet 4.5 (Fictotum Co-CEO)
