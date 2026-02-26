# Contributing to Fictotum

Welcome to Fictotum! This guide will help you understand how to contribute high-quality historical data to our knowledge graph. Whether you're a research analyst agent or a human contributor, following these guidelines ensures data integrity and consistency across the platform.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Data Quality Standards](#data-quality-standards)
3. [MediaWork Ingestion Protocol](#mediawork-ingestion-protocol)
4. [HistoricalFigure Entity Resolution Protocol](#historicalfigure-entity-resolution-protocol)
5. [Common Mistakes and How to Avoid Them](#common-mistakes-and-how-to-avoid-them)
6. [Handling Conflicting Sources](#handling-conflicting-sources)
7. [Code of Conduct](#code-of-conduct)

---

## Quick Start

**Before you add any data**, always:

1. Search Wikidata first for canonical Q-IDs
2. Check Fictotum's existing database for duplicates
3. Document your sources in session notes
4. Follow the ingestion protocols below
5. Never commit changes without verification

**Access the Contribution Hub**: Navigate to `/contribute` in the web app to use the guided wizard for adding figures and media works.

---

## Data Quality Standards

### 1. Wikidata Q-IDs Are Required

Wikidata Q-IDs serve as canonical identifiers for all entities:

- **For MediaWorks**: Q-ID is **mandatory** before creating a node
- **For HistoricalFigures**: Q-ID is **strongly preferred** (use provisional ID only when unavailable)
- **Verification**: Always search [Wikidata](https://www.wikidata.org) before creating entities

**Example**:
```cypher
// CORRECT: MediaWork with Wikidata Q-ID
(:MediaWork {
  wikidata_id: "Q180736",  // War and Peace
  title: "War and Peace"
})

// INCORRECT: MediaWork without Q-ID verification
(:MediaWork {
  title: "War and Peace"  // Missing wikidata_id!
})
```

### 2. Source Verification

Every contribution must be backed by verifiable sources:

**Primary Sources** (in priority order):
1. Wikidata (canonical identifiers and structured data)
2. Wikipedia (biographical and historical context)
3. Britannica (scholarly verification)
4. Specialized encyclopedias (Holocaust Encyclopedia, Oxford DNB, etc.)
5. Academic journals and peer-reviewed sources

**Documentation**:
- Record all sources consulted in your session notes
- Include URLs and access dates
- Note conflicts between sources

**Example Session Note**:
```markdown
### Sources Consulted
- [Wikidata Q517](https://www.wikidata.org/wiki/Q517) - Napoleon Bonaparte
- [Wikipedia: Napoleon](https://en.wikipedia.org/wiki/Napoleon) - Biographical verification
- [Britannica: Napoleon](https://www.britannica.com/biography/Napoleon-I) - Historical accuracy
```

### 3. Historical Accuracy Standards

- **Dates**: Verify birth/death years against multiple sources
- **Spelling**: Use the most common English transliteration (verify via Wikidata)
- **Titles**: Include formal titles only if historically documented
- **Relationships**: Verify INTERACTED_WITH and NEMESIS_OF relationships with sources
- **Era Tags**: Use era labels that match historical consensus (e.g., "Roman Empire" not "Ancient Rome")

### 4. Sentiment Tag Guidelines

Sentiment tags describe how media portrays a figure, not your personal opinion.

**Valid Sentiment Tags**:
- `heroic` - Portrayed as noble, brave, virtuous
- `villainous` - Portrayed as evil or antagonistic
- `tragic` - Portrayed with sympathy despite downfall
- `conflicted` - Portrayed with moral complexity
- `satirical` - Portrayed for comedic or critical effect
- `documentary` - Portrayed in factual, analytical manner
- `romanticized` - Portrayed with idealization or embellishment

**Compound Tags** (use hyphens):
- `heroic-conflicted` - Hero with moral struggles
- `tragic-monstrous` - Sympathetic portrayal of evil figure
- `documentary-analytical` - Scholarly, objective treatment

**Examples**:
```cypher
// Hitler in "Downfall" (2004)
sentiment: "tragic-monstrous"  // Humanized but not excused

// Napoleon in "Ridley Scott's Napoleon" (2023)
sentiment: "conflicted-military"  // Complex military genius

// Schindler in "Schindler's List" (1993)
sentiment: "heroic-conflicted"  // Profiteer turned savior
```

### 5. Provenance Tracking

**All contributions are attributed via the CREATED_BY relationship**:

```cypher
(:HistoricalFigure)-[:CREATED_BY {
  timestamp: datetime(),
  context: "web_ui",  // or "bulk_ingestion", "api", "migration"
  method: "wikidata_enriched"  // or "user_generated"
}]->(:Agent {agent_id: "web-ui-generic"})
```

This is **automatically handled** by the contribution UI and ingestion scripts. Do not manually create CREATED_BY relationships unless you are writing migration scripts.

---

## MediaWork Ingestion Protocol

**Follow this checklist for every MediaWork you add**:

### Step 1: Search Wikidata
```
1. Go to https://www.wikidata.org
2. Search for the title + author/creator + year
3. Verify the Q-ID matches your intended work
4. Copy the Q-ID (format: Q######)
```

**Common Pitfall**: Multiple editions or adaptations may have different Q-IDs. Choose the **original work**, not a specific edition.

**Example**:
- ✅ Q180736 (War and Peace - original novel)
- ❌ Q123456 (War and Peace - 2007 edition)

### Step 2: Check Fictotum Database

**Via MCP (for agents)**:
```cypher
MATCH (m:MediaWork {wikidata_id: $qid})
RETURN m
```

**Via Contribute UI (for humans)**:
- Search the title in the `/contribute` search bar
- Existing works appear under "Already in Fictotum"

### Step 3: Create or Link

**If MediaWork exists**:
- Link new portrayals to the existing node
- Do NOT create a duplicate

**If MediaWork does NOT exist**:
- Create with `wikidata_id` property
- Include `title`, `media_type`, `release_year` (if available)

```cypher
CREATE (m:MediaWork {
  wikidata_id: "Q180736",
  title: "War and Peace",
  media_type: "Novel",
  release_year: 1869
})
```

### Step 4: Aliases (Optional)

**Only create aliases when**:
- A scholarly source confirms an alternate title
- The alternate title is widely recognized (e.g., foreign language title)

**Example**:
```cypher
// Original title in Russian
(:MediaWork {
  wikidata_id: "Q180736",
  title: "War and Peace",
  alternate_titles: ["Война и мир"]  // Russian title
})
```

**Do NOT create aliases for**:
- Misspellings
- Fan nicknames
- Unverified translations

### Step 5: Session Notes

Document your work:
```markdown
### MediaWork Ingestion: [Title]
- **Wikidata Q-ID**: Q######
- **Verification**: [Source URLs]
- **Release Year**: [Year]
- **Media Type**: [Novel/Film/Game/TV Series]
- **Setting Year**: [Year if different from release]
- **Conflicts Noted**: [Any discrepancies between sources]
```

---

## HistoricalFigure Entity Resolution Protocol

**Read the full technical documentation**: [Entity Resolution Workflow](/docs/protocols/entity-resolution.md)

### Quick Reference

#### 1. Canonical ID Strategy

**Priority 1: Wikidata Q-ID** (always preferred)
```cypher
(:HistoricalFigure {
  canonical_id: "Q517",  // Napoleon Bonaparte
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

#### 2. Duplicate Prevention

**Always check BOTH `wikidata_id` AND `canonical_id`** before creating:

```cypher
MATCH (f:HistoricalFigure)
WHERE f.wikidata_id = $qid OR f.canonical_id = $canonical_id
RETURN f
```

**Why**: This prevents duplicates via Q-ID match (if provided) or canonical_id match.

#### 3. Name Matching Algorithm

Fictotum uses **enhanced similarity scoring**:
- 70% lexical (Levenshtein distance)
- 30% phonetic (Double Metaphone)

**Confidence Thresholds**:
- ≥ 0.9 = High confidence (very likely duplicate)
- 0.7 - 0.89 = Medium confidence (possible duplicate)
- < 0.7 = Low confidence (unlikely duplicate)

**Use Cases**:
- Catches spelling variations: "Steven" vs "Stephen"
- Handles pronunciation equivalents: "Smyth" vs "Smith"
- Supports non-English names better than Soundex

**When creating figures**: If the name similarity score is high, investigate thoroughly before creating a new node. Use the `/admin/duplicates` dashboard to review potential duplicates.

---

## Common Mistakes and How to Avoid Them

### 1. Creating Duplicate MediaWorks

**Mistake**: Searching Fictotum but not Wikidata, leading to duplicate entries with different Q-IDs.

**Solution**:
- Always search Wikidata **first**
- Then search Fictotum with the Q-ID
- Never create a MediaWork without a `wikidata_id`

### 2. Using Wrong Entity Type

**Mistake**: Creating a MediaWork node for a person who is a creator (author, director).

**Solution**:
- **Creators are HistoricalFigures** (e.g., J.R.R. Tolkien = HistoricalFigure)
- **Their works are MediaWorks** (e.g., The Lord of the Rings = MediaWork)
- Use the CREATED relationship: `(figure:HistoricalFigure)-[:CREATED]->(work:MediaWork)`

### 3. Confusing Setting Year vs Release Year

**Mistake**: Setting a MediaWork's `setting_year` to its publication/release year.

**Solution**:
- **Release Year**: When the work was published or released (e.g., 1949 for "1984")
- **Setting Year**: When the story takes place (e.g., 1984 for "1984")
- These are often **different** for historical fiction!

**Example**:
```cypher
(:MediaWork {
  title: "1984",
  release_year: 1949,      // Published in 1949
  setting_year: 1984       // Story set in 1984
})
```

### 4. Incorrect Sentiment Tags

**Mistake**: Using sentiment tags based on your opinion rather than the media's portrayal.

**Solution**:
- Watch/read the media work before tagging
- Consider the creator's intent
- Use compound tags for nuance (e.g., `heroic-conflicted`)
- Consult reviews or scholarly analysis if unsure

### 5. Missing Provenance

**Mistake**: Creating nodes without CREATED_BY relationships.

**Solution**:
- Use the `/contribute` UI (handles provenance automatically)
- If writing scripts, include provenance in bulk operations (see CLAUDE.md)
- Run `scripts/migration/verify_created_by.py` to check for missing provenance

### 6. Overusing Provisional IDs

**Mistake**: Creating provisional IDs when a Wikidata Q-ID exists.

**Solution**:
- Spend 2-3 minutes searching Wikidata thoroughly
- Try alternate spellings, titles, or translations
- Only use `PROV:` prefix if genuinely no Q-ID exists
- Document why no Q-ID was found in session notes

---

## Handling Conflicting Sources

Historical sources often disagree. Here's how to handle conflicts:

### 1. Birth/Death Year Discrepancies

**Scenario**: Wikipedia says "1769", Britannica says "1769?", another source says "1768 or 1769".

**Solution**:
- Use the **most commonly cited year**
- Add a `conflict_flag` property to note the discrepancy
- Document the conflict in session notes

```cypher
(:HistoricalFigure {
  canonical_id: "Q517",
  name: "Napoleon Bonaparte",
  birth_year: 1769,
  conflict_flag: "birth_year_disputed",  // Flag for review
  conflict_notes: "Some sources cite 1768; Wikipedia/Britannica consensus is 1769"
})
```

### 2. Spelling Variations

**Scenario**: "Tsar Nicholas II" vs "Czar Nicholas II" vs "Nicholas II of Russia"

**Solution**:
- Use Wikidata's primary label (usually English Wikipedia's article title)
- Store alternate spellings in `alternate_names` property (not as separate nodes)

```cypher
(:HistoricalFigure {
  canonical_id: "Q40787",
  name: "Nicholas II of Russia",  // Wikidata primary label
  alternate_names: ["Tsar Nicholas II", "Czar Nicholas II"]
})
```

### 3. Relationship Disputes

**Scenario**: Did Napoleon and Talleyrand "betray" each other, or was it political maneuvering?

**Solution**:
- Use neutral relationship types when possible
- INTERACTED_WITH is safer than NEMESIS_OF if the relationship is complex
- Add a `relationship_note` property to explain context

```cypher
(:HistoricalFigure {canonical_id: "Q517"})-[:INTERACTED_WITH {
  relationship_note: "Complex political relationship; Talleyrand served Napoleon but eventually facilitated his downfall"
}]->(:HistoricalFigure {canonical_id: "Q44440"})
```

### 4. Sentiment Portrayal Disagreements

**Scenario**: Critics disagree on whether a film portrays a figure heroically or satirically.

**Solution**:
- Use compound tags: `heroic-satirical`
- Cite specific reviews/analyses in session notes
- When in doubt, use `conflicted` or `documentary` (more neutral)

### 5. Escalation Process

If you encounter a conflict you cannot resolve:

1. **Flag the entity**: Add a `conflict_flag` property
2. **Document thoroughly**: Write detailed session notes with all conflicting sources
3. **Notify a reviewer**: (For agents) Create a Linear ticket with the "data-quality" label
4. **Do NOT guess**: If you're uncertain, mark it for review rather than making a definitive call

---

## Code of Conduct

Fictotum is a scholarly platform built on rigorous data quality and respectful collaboration. All contributors must adhere to these principles:

### 1. Respectful Discourse

- Treat all historical figures, time periods, and cultures with scholarly respect
- Disagree with interpretations, not people
- Assume good faith in other contributors' work
- Avoid inflammatory or judgmental language in documentation

**Example**:
- ✅ "Sources disagree on the motivations for this decision"
- ❌ "This figure was clearly evil"

### 2. No Historical Revisionism

- Do not create data to support ahistorical narratives
- Do not omit well-documented facts to favor a particular viewpoint
- Do not create fictional "what if" scenarios as factual data
- If a portrayal is revisionist (e.g., historical fiction), tag it as `romanticized` or `fictionalized`

**Example**:
- ✅ Adding "The Man in the High Castle" as MediaWork with `alternate_history` tag
- ❌ Adding fictional WWII outcomes as historical facts

### 3. Cite Your Sources

- Every entity you create should be traceable to verifiable sources
- Include URLs and access dates in session notes
- When Wikidata is your source, cite it explicitly
- Never fabricate sources or citations

**Example Session Note**:
```markdown
### Sources
- [Wikidata Q517](https://www.wikidata.org/wiki/Q517) - Accessed 2026-02-01
- [Wikipedia: Napoleon](https://en.wikipedia.org/wiki/Napoleon) - Accessed 2026-02-01
- [Britannica: Napoleon I](https://www.britannica.com/biography/Napoleon-I) - Accessed 2026-02-01
```

### 4. Assume Good Faith

- If you find an error in someone else's work, assume it was an honest mistake
- Propose corrections with evidence, not accusations
- Thank contributors who identify errors in your work
- Collaboration over competition

### 5. Conflict Resolution Process

If you disagree with another contributor:

1. **Review the sources**: Check the session notes and cited sources
2. **Consult additional sources**: Bring new evidence to the discussion
3. **Propose a compromise**: Use `conflict_flag` properties or compound sentiment tags
4. **Escalate if necessary**: Create a Linear ticket with both viewpoints documented
5. **Accept the outcome**: Once a decision is made by a reviewer, respect it

**Example Escalation**:
```markdown
## Conflict: Sentiment Tag for Figure X in MediaWork Y

**Contributor A's position**: Tag should be "heroic" based on [Source 1]
**Contributor B's position**: Tag should be "conflicted" based on [Source 2]

**Proposed resolution**: Use compound tag "heroic-conflicted" and document both interpretations in notes

**Reviewer decision**: [To be filled by reviewer]
```

### 6. Zero Tolerance for Bad Faith

The following behaviors will result in immediate revocation of contribution privileges:

- Deliberately creating false data
- Vandalism or deletion of accurate data
- Harassment of other contributors
- Using the platform for propaganda or political agendas
- Ignoring multiple correction requests without justification

---

## Getting Help

- **Documentation**: See `/docs/guides/data-ingestion.md` for step-by-step tutorials
- **Technical Issues**: Create a Linear ticket with the "bug" label
- **Data Quality Questions**: Create a Linear ticket with the "data-quality" label
- **Entity Resolution**: Read `/docs/protocols/entity-resolution.md` for detailed technical specs

---

## Credits

Fictotum is built collaboratively by:
- AI research agents (Claude Sonnet 4.5 and Opus 4.5)
- Human contributors and researchers
- Open data from Wikidata and Wikipedia
- Academic and scholarly sources

Every contribution is tracked and attributed via provenance metadata. Thank you for helping build a comprehensive, accurate, and respectful historical knowledge graph.

---

**Last Updated**: 2026-02-01
**Version**: 1.0.0
