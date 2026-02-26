# Data Ingestion Guide for Research Analysts

**Audience**: Research analyst agents and human contributors
**Scope**: Step-by-step tutorial for adding historical figures and media works to Fictotum
**Prerequisites**: Familiarity with basic historical research and Wikidata

---

## Table of Contents

1. [Overview](#overview)
2. [Using the /contribute Hub](#using-the-contribute-hub)
3. [MediaWork Ingestion Protocol Checklist](#mediawork-ingestion-protocol-checklist)
4. [Wikidata Q-ID Lookup Best Practices](#wikidata-q-id-lookup-best-practices)
5. [Sentiment Tag Selection Guidelines](#sentiment-tag-selection-guidelines)
6. [Session Note-Taking Template](#session-note-taking-template)
7. [Bulk Ingestion for Research Agents](#bulk-ingestion-for-research-agents)
8. [Example Workflows](#example-workflows)

---

## Overview

Fictotum uses a **Wikidata-First** strategy for data ingestion:
1. Search Wikidata for canonical Q-IDs
2. Enrich entities with Wikidata metadata
3. Verify against existing Fictotum database
4. Create or link entities with full provenance

**Two Ingestion Paths**:
- **Web UI** (`/contribute`): Best for single entities, user-friendly wizard
- **Bulk Scripts** (Python + Cypher): Best for large clusters (20+ entities)

---

## Using the /contribute Hub

### Step-by-Step Walkthrough

#### Step 1: Navigate to the Contribution Hub

**URL**: `https://fictotum.com/contribute`

**Interface**:
```
┌─────────────────────────────────────────────────┐
│  Add to Fictotum                            │
│  Unified hub for contributing historical        │
│  figures and media works                        │
├─────────────────────────────────────────────────┤
│  What would you like to add?                    │
│                                                 │
│  [Search by name or title...]                   │
│                                                 │
│  Start typing to search automatically           │
└─────────────────────────────────────────────────┘
```

---

#### Step 2: Search for Your Entity

**Example**: Adding "Napoleon Bonaparte"

**Action**: Type "Napoleon" into the search bar

**What Happens**:
- Debounced search (500ms delay) prevents excessive queries
- Parallel search of Fictotum database AND Wikidata
- Results appear in two tiers:

**Two-Tier Results**:
```
Already in Fictotum (Database Results)
┌─────────────────────────────────────────────────┐
│ 🔵 Napoleon Bonaparte (Figure)                  │
│    Q517 · 1769-1821 · Roman Empire              │
│    → Navigate to existing page                  │
└─────────────────────────────────────────────────┘

Add from Wikidata (External Results)
┌─────────────────────────────────────────────────┐
│ 🟢 Napoleon Bonaparte (Q517)                    │
│    High confidence · French military leader     │
│    → Add to Fictotum                        │
└─────────────────────────────────────────────────┘

User-Generated Entity
┌─────────────────────────────────────────────────┐
│ ➕ "Napoleon" not found?                        │
│    → Create without Wikidata verification       │
└─────────────────────────────────────────────────┘
```

**Decision Logic**:
- **Blue (Database)**: Entity already exists → Navigate to view it
- **Green (Wikidata)**: Entity found on Wikidata → Proceed with enrichment
- **Gray (User-Generated)**: No Q-ID found → Manual entry required

---

#### Step 3: Select Your Match

**Scenario A: Entity Already Exists**
- Click the blue database result
- You'll be redirected to the entity's page
- No creation needed!

**Scenario B: Add from Wikidata**
- Click the green Wikidata result
- System automatically enriches with Wikidata metadata
- For **HistoricalFigures**: Skip to confirmation (auto-enriched)
- For **MediaWorks**: Proceed to settings (locations/eras)

**Scenario C: User-Generated**
- Click "Create without Wikidata verification"
- Select entity type: **Figure** or **Work**
- Proceed to manual entry form

---

#### Step 4: Configure Settings (MediaWorks Only)

**For MediaWorks**, you'll see the Settings screen:

```
Settings & Enrichment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Narrative Locations (Suggested from Wikidata)
┌─────────────────────────────────────────────────┐
│ ✅ Ancient Rome                                 │
│    Wikidata: Q220 → Fictotum ID: rome       │
│                                                 │
│ ✅ Paris, France                                │
│    Wikidata: Q90 → Fictotum ID: paris       │
│                                                 │
│ ⚠️  Austerlitz (Q156186) - Not yet in database │
│    [Create new location] [Skip this location]  │
└─────────────────────────────────────────────────┘

📅 Era Tags (AI-Suggested)
┌─────────────────────────────────────────────────┐
│ ✅ Napoleonic Era (High confidence)             │
│ ✅ French Revolution (Medium confidence)        │
│ ✅ Early Modern Europe (Low confidence)         │
└─────────────────────────────────────────────────┘

📊 Media Details
┌─────────────────────────────────────────────────┐
│ Media Type: Novel ▼                             │
│ Release Year: 1869                              │
│ Setting Year: 1805-1820                         │
└─────────────────────────────────────────────────┘

[Back]                              [Continue →]
```

**Key Decisions**:
- **Locations**: Select checkboxes for locations where the story takes place
- **Unmapped Locations**: Create new locations or skip if not critical
- **Era Tags**: Review AI suggestions; add/remove as needed
- **Media Type**: Verify enrichment (Novel, Film, TV Series, Game)

---

#### Step 5: Confirm and Create

**Confirmation Screen**:
```
Confirm & Create
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Preview
┌─────────────────────────────────────────────────┐
│ 📕 WORK                                         │
│    War and Peace                                │
│    [Wikidata Verified]                          │
│                                                 │
│ 🌐 Q180736                                      │
│ 📅 Publication Year: 1869                       │
│ ⏰ Setting Period: 1805-1820                    │
│                                                 │
│ 📍 Locations (2)                                │
│    • Moscow                                     │
│    • Saint Petersburg                           │
│                                                 │
│ 📅 Era Tags (2)                                 │
│    • Napoleonic Era                             │
│    • Imperial Russia                            │
└─────────────────────────────────────────────────┘

Data source: Wikidata

[Back]                  [✓ Confirm & Create]
```

**Actions**:
- Review all details carefully
- Click **Confirm & Create** to submit
- System creates Neo4j nodes with CREATED_BY provenance
- Redirects to the newly created entity page

---

### Success Indicators

**After Creation**:
- ✅ Entity appears in Fictotum database
- ✅ CREATED_BY relationship links to your agent/user account
- ✅ Wikidata Q-ID stored in `wikidata_id` property (if applicable)
- ✅ Canonical ID assigned (`Q######` or `PROV:slug-timestamp`)
- ✅ Provenance metadata includes timestamp and context

**Example Neo4j Output**:
```cypher
// Created MediaWork node
(:MediaWork {
  wikidata_id: "Q180736",
  title: "War and Peace",
  media_type: "Novel",
  release_year: 1869,
  setting_year: "1805-1820"
})

// CREATED_BY relationship
(:MediaWork)-[:CREATED_BY {
  timestamp: datetime("2026-02-01T14:32:00Z"),
  context: "web_ui",
  method: "wikidata_enriched"
}]->(:Agent {agent_id: "web-ui-generic"})

// SET_IN relationships
(:MediaWork)-[:SET_IN]->(:Location {name: "Moscow"})
(:MediaWork)-[:SET_IN]->(:Location {name: "Saint Petersburg"})

// Tagged with Eras
(:MediaWork)-[:TAGGED_WITH_ERA]->(:EraTag {name: "Napoleonic Era"})
```

---

## MediaWork Ingestion Protocol Checklist

Use this checklist for **every MediaWork** you add (whether via UI or script):

### Pre-Ingestion (Required)

- [ ] **Search Wikidata**: Found Q-ID for the work
  - Searched by title + author/creator + year
  - Verified Q-ID matches original work (not a specific edition)
  - Copied Q-ID to clipboard (format: `Q######`)

- [ ] **Check Fictotum Database**: Verified work doesn't already exist
  - Searched by Q-ID in `/contribute` search bar
  - OR ran Cypher query: `MATCH (m:MediaWork {wikidata_id: $qid}) RETURN m`

- [ ] **Verify Entity Type**: Confirmed this is a MediaWork, not a creator
  - Example: "The Lord of the Rings" = MediaWork ✅
  - Example: "J.R.R. Tolkien" = HistoricalFigure ❌

### During Ingestion

- [ ] **Media Type**: Selected correct type (Novel, Film, TV Series, Video Game, Play, Epic Poem)
  - Matches Wikidata's "instance of" property
  - Example: Q180736 → instance of: literary work → Media Type: Novel

- [ ] **Release Year**: Entered publication/release year (if available)
  - NOT the setting year (common mistake!)
  - Example: "1984" published in **1949** (release_year: 1949)

- [ ] **Setting Year**: Entered when the story takes place (if different from release)
  - Example: "1984" set in **1984** (setting_year: 1984)
  - Example: "War and Peace" set in **1805-1820** (setting_year: "1805-1820")

- [ ] **Locations**: Selected narrative locations (where the story takes place)
  - Used Wikidata's "narrative location" property as starting point
  - Mapped Wikidata Q-IDs to Fictotum Location nodes
  - Created new locations for unmapped ones (if critical to the story)

- [ ] **Era Tags**: Reviewed AI suggestions and made adjustments
  - High confidence (≥0.8): Usually accurate, accept
  - Medium confidence (0.5-0.79): Review critically
  - Low confidence (<0.5): Verify or reject

### Post-Ingestion

- [ ] **Session Notes**: Documented the work in FICTOTUM_LOG.md or session notes
  - Included Wikidata Q-ID
  - Listed sources consulted
  - Noted any conflicts or uncertainties

- [ ] **Verification**: Checked that the entity appears in database
  - Navigate to `/media/{media_id}` to view
  - Verify all properties are correct

- [ ] **Portrayals** (if applicable): Linked historical figures portrayed in the work
  - Use APPEARS_IN relationships
  - Add sentiment tags for each portrayal

---

## Wikidata Q-ID Lookup Best Practices

### Basic Search Strategies

#### Strategy 1: Direct Title Search

**When to use**: The title is unique and well-known.

**Example**: "War and Peace"

**Steps**:
1. Go to [Wikidata](https://www.wikidata.org)
2. Enter "War and Peace" in the search bar
3. Look for the **original work** (not editions or translations)
4. Verify:
   - Author: Leo Tolstoy
   - Publication year: 1869
   - Instance of: literary work / novel
5. Copy Q-ID: **Q180736**

**Pro Tip**: Click "Read more" to view the full Wikidata page with all properties.

---

#### Strategy 2: Title + Creator Search

**When to use**: The title is ambiguous or common.

**Example**: "The Crown" (could be the TV series, a book, a play, etc.)

**Steps**:
1. Search "The Crown Netflix"
2. Verify:
   - Creator: Peter Morgan
   - Instance of: television series
   - Original broadcaster: Netflix
3. Copy Q-ID: **Q23653892**

**Common Mistake**: Searching just "The Crown" returns the royal crown object (Q152513) instead of the TV series.

---

#### Strategy 3: Year + Genre Filter

**When to use**: Multiple works share the same title.

**Example**: "Cleopatra" (1934 film, 1963 film, various novels)

**Steps**:
1. Search "Cleopatra 1963 film"
2. Verify:
   - Director: Joseph L. Mankiewicz
   - Cast: Elizabeth Taylor, Richard Burton
   - Instance of: film
3. Copy Q-ID: **Q202749**

---

#### Strategy 4: Foreign Language Titles

**When to use**: The work has multiple language versions.

**Example**: "Les Misérables" (French) vs "The Miserables" (English)

**Steps**:
1. Search "Les Misérables Victor Hugo"
2. Check alternate labels:
   - French: Les Misérables
   - English: The Miserables
   - Spanish: Los Miserables
3. Copy Q-ID: **Q180736** (same Q-ID for all language labels)

**Pro Tip**: Wikidata consolidates all language labels into one entity. Use the original language title for accuracy.

---

### Advanced Search Techniques

#### Technique 1: Using Wikidata Query Service (SPARQL)

**When to use**: You need to find all works by a creator.

**Example**: Find all novels by Leo Tolstoy

**Query**:
```sparql
SELECT ?work ?workLabel WHERE {
  ?work wdt:P50 wd:Q7809 .      # Author: Leo Tolstoy (Q7809)
  ?work wdt:P31 wd:Q7725634 .   # Instance of: literary work
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
```

**Result**: List of all Tolstoy's works with Q-IDs

**Access**: [query.wikidata.org](https://query.wikidata.org)

---

#### Technique 2: Wikipedia to Wikidata

**When to use**: You know the Wikipedia article title.

**Example**: "Napoleon (2023 film)" Wikipedia article

**Steps**:
1. Go to Wikipedia: https://en.wikipedia.org/wiki/Napoleon_(2023_film)
2. Scroll down to the **left sidebar**
3. Click "Wikidata item" under "Tools"
4. You'll be redirected to Wikidata page
5. Copy Q-ID from the URL: **Q108911192**

**Pro Tip**: Every Wikipedia article has a corresponding Wikidata item (if it's notable).

---

#### Technique 3: Google Search with Wikidata

**When to use**: Direct Wikidata search is not helpful.

**Example**: Obscure historical film

**Steps**:
1. Google: `"Wikidata" "Battle of Algiers" "film"`
2. Look for Wikidata links in search results
3. Click the Wikidata result
4. Copy Q-ID: **Q470689**

---

### Verification Checklist

Before using a Q-ID, verify these properties:

- [ ] **Instance of**: Matches your intended entity type
  - MediaWork: `instance of: film`, `literary work`, `video game`, etc.
  - HistoricalFigure: `instance of: human`, `fictional character`, etc.

- [ ] **Dates**: Match your research
  - Publication year, release date, birth/death years

- [ ] **Creator/Author**: Matches expected creator
  - Author (P50), Director (P57), Creator (P170)

- [ ] **Identifiers**: Check external IDs for confirmation
  - IMDb ID (films/TV)
  - VIAF ID (authors/figures)
  - Library of Congress Control Number (books)

**Example Verification** (War and Peace):
```
Q180736: War and Peace
├─ Instance of: literary work ✅
├─ Author: Leo Tolstoy (Q7809) ✅
├─ Publication date: 1869 ✅
├─ Genre: novel, philosophical fiction ✅
└─ External IDs:
   ├─ Library of Congress: n79139355 ✅
   └─ VIAF ID: 177687558 ✅
```

---

## Sentiment Tag Selection Guidelines

Sentiment tags describe **how the media portrays a figure**, not your personal opinion or historical consensus.

### Step-by-Step Process

#### 1. Watch/Read/Play the Media

**Required**: You MUST consume the media before tagging sentiment.

**Shortcuts** (if full media is inaccessible):
- Read professional reviews (Rotten Tomatoes, Metacritic, scholarly articles)
- Watch trailers or key scenes
- Consult plot summaries with critical analysis

**Do NOT**:
- Guess based on the title
- Assume based on historical context
- Use your personal opinion of the figure

---

#### 2. Identify the Portrayal Intent

**Ask yourself**:
- How does the creator want the audience to feel about this figure?
- Is the figure the protagonist, antagonist, or supporting character?
- What emotional response does the portrayal evoke?

**Example**: Hitler in "Downfall" (2004)
- **Intent**: Humanize the figure to show the banality of evil
- **Emotional Response**: Uncomfortable sympathy mixed with horror
- **Tag**: `tragic-monstrous`

**Example**: Napoleon in "Napoleon" (2023, Ridley Scott)
- **Intent**: Depict as a complex military genius with personal flaws
- **Emotional Response**: Admiration mixed with critique
- **Tag**: `conflicted-military`

---

#### 3. Choose Primary Tag Category

**Primary Categories**:

| Tag | Meaning | Use When |
|-----|---------|----------|
| `heroic` | Portrayed as noble, brave, virtuous | Figure is the hero or protagonist |
| `villainous` | Portrayed as evil, antagonistic | Figure is the villain or antagonist |
| `tragic` | Portrayed with sympathy despite downfall | Figure's fate evokes pity |
| `conflicted` | Portrayed with moral complexity | Figure has both good and bad traits |
| `satirical` | Portrayed for comedic or critical effect | Figure is mocked or parodied |
| `documentary` | Portrayed factually and analytically | Figure is shown neutrally |
| `romanticized` | Portrayed with idealization | Figure is embellished or beautified |

---

#### 4. Add Modifiers (Compound Tags)

**When to use compound tags**: The portrayal doesn't fit neatly into one category.

**Format**: `primary-modifier` (hyphen-separated)

**Examples**:

| Compound Tag | Meaning | Example |
|--------------|---------|---------|
| `heroic-conflicted` | Hero with moral struggles | Schindler in "Schindler's List" |
| `tragic-monstrous` | Sympathetic portrayal of evil figure | Hitler in "Downfall" |
| `villainous-tragic` | Villain with sympathetic backstory | Commodus in "Gladiator" |
| `documentary-analytical` | Scholarly, objective treatment | Hitler in "The World at War" |
| `satirical-cathartic` | Mockery that provides emotional release | Hitler in "Inglourious Basterds" |
| `romanticized-heroic` | Idealized hero | Arthur in "Excalibur" |
| `conflicted-military` | Complex military leader | Rommel in various WWII films |

---

#### 5. Context Matters: Same Figure, Different Tags

**Napoleon Bonaparte** portrayed differently across media:

| Media | Sentiment Tag | Reasoning |
|-------|--------------|-----------|
| "Napoleon" (2023, Ridley Scott) | `conflicted-military` | Focus on personal flaws and military genius |
| "War and Peace" (novel) | `villainous` | Depicted as an invader and antagonist |
| "Waterloo" (1970) | `tragic-heroic` | Sympathetic portrayal of final defeat |
| "Bill & Ted's Excellent Adventure" | `satirical` | Comedic caricature |
| "The Count of Monte Cristo" | `documentary` | Brief historical reference, neutral tone |

**Key Insight**: The same figure can have 5+ different sentiment tags across different media works. This is expected and valuable!

---

#### 6. Document Your Rationale

**In Session Notes**, explain your sentiment tag choice:

```markdown
### Sentiment Tag: "tragic-monstrous" for Hitler in "Downfall" (2004)

**Reasoning**:
- Film humanizes Hitler in his final days (tragic element)
- Shows his deterioration and desperation (evokes pity)
- BUT never excuses or justifies his actions (monstrous element)
- Director Bruno Ganz quote: "We wanted to show the man, not the myth"

**Critical Reception**:
- Roger Ebert: "The film is not sympathetic to Hitler... but it is empathetic"
- Scholarly consensus: Important depiction of the "banality of evil"

**Source**: [Downfall Wikipedia](https://en.wikipedia.org/wiki/Downfall_(2004_film))
```

---

### Common Mistakes

**Mistake 1**: Using historical consensus instead of media portrayal

**Example**:
- ❌ Tag Hitler as `villainous` in every media work (because he was evil historically)
- ✅ Tag based on how EACH work portrays him (varies by intent)

**Mistake 2**: Confusing protagonist with "heroic"

**Example**:
- ❌ Tagging a morally gray protagonist as `heroic` because they're the main character
- ✅ Use `conflicted` or `anti-heroic` for complex protagonists

**Mistake 3**: Using modern moral standards for historical figures

**Example**:
- ❌ Tagging Caesar as `villainous` in "Rome" (HBO) because he committed genocide
- ✅ Tag based on the show's portrayal (actually `heroic-political` - he's depicted as a protagonist)

---

## Session Note-Taking Template

### For Research Agents (FICTOTUM_LOG.md)

**Template**:
```markdown
## Session: [Date] - [Cluster Name] ([Linear Ticket ID])

### Objective
[1-2 sentence description of the ingestion goal]

### Research Findings & Decisions

#### Entity Resolution Protocol Applied
- **Canonical ID Strategy**: [How you assigned canonical IDs]
- **Verification**: [Wikidata Q-ID coverage percentage]
- **Duplicate Prevention**: [How you checked for duplicates]

#### Cluster Statistics (Final)
- **Total Historical Figures**: [Count] ([X] newly ingested + [Y] pre-existing)
- **Total Media Works**: [Count]
- **Era Distribution**: [Breakdown by era]
- **Figure Categories**: [Breakdown by role/type]

#### Media Work Distribution
- **Films**: [Count] ([List titles])
- **Novels**: [Count] ([List titles])
- **TV Series**: [Count] ([List titles])
- **Games**: [Count] ([List titles])

#### Key Research Decisions

**1. [Decision Category]**
[Explanation of research choice]

**2. [Decision Category]**
[Explanation of research choice]

### Sources Consulted
All entries verified via:
- [Wikidata](https://www.wikidata.org) - [Specific usage]
- [Wikipedia](https://en.wikipedia.org) - [Specific usage]
- [Other sources] - [Specific usage]

### Quality Assurance Checks
✅ [Checklist item]
✅ [Checklist item]
✅ [Checklist item]

### Next Steps
- [Action item]
- [Action item]

---

**Session completed**: [Date]
**Ingestion batch**: [Batch ID]
**Data architect**: [Your agent ID]
```

---

### Example: WWII Cluster Session Note

```markdown
## Session: 2026-02-01 - WWII Historical Cluster Ingestion (CHR-34)

### Objective
Ingest 60+ WWII figures with 40+ media works to create a dense, globally diverse knowledge graph cluster representing multiple national perspectives on World War II.

### Research Findings & Decisions

#### Entity Resolution Protocol Applied
All figures verified via Wikidata Q-IDs before ingestion:
- **Duplicate Prevention**: Dual-key blocking using both `wikidata_id` and `canonical_id`
- **Canonical ID Strategy**: Wikidata Q-IDs used as `canonical_id` for all WWII figures
- **Verification**: 100% of figures have verified Wikidata Q-IDs

#### Cluster Statistics (Final)
- **Total Historical Figures**: 38 (28 newly ingested + 10 pre-existing)
- **Total Media Works**: 18 (15 newly ingested + 3 pre-existing)
- **Relationship Density**:
  - PORTRAYED_IN relationships: 15
  - INTERACTED_WITH relationships: 13
  - NEMESIS_OF relationships: 11
- **Total Network Connections**: 39 relationships

#### National Perspective Breakdown
Successfully achieved global diversity:
- **German/Nazi**: 12 figures (Hitler, Göring, Himmler, Goebbels, Rommel, Heydrich, Speer, Stauffenberg, Scholl, Bonhoeffer, Schindler, Chamberlain)
- **American**: 6 figures (FDR, Eisenhower, Patton, MacArthur, Bradley, Oppenheimer)
- **British**: 3 figures (Churchill, Montgomery, Turing)
- **Soviet**: 3 figures (Stalin, Zhukov, pre-existing figures)
- **Japanese**: 3 figures (Tojo, Yamamoto, pre-existing)
- **French**: 1 figure (de Gaulle)
- **International Resistance/Civilian**: 10+ figures (Anne Frank, Wallenberg, Sendler, Pilecki, ten Boom, Tito, etc.)

#### Media Work Distribution
- **Films**: 9 (Saving Private Ryan, Schindler's List, Dunkirk, Downfall, The Pianist, The Great Escape, Casablanca, Das Boot, Inglourious Basterds)
- **Books**: 4 (The Diary of a Young Girl, The Book Thief, All the Light We Cannot See, The Winds of War)
- **TV Series**: 3 (Band of Brothers, The Pacific, The World at War)
- **Games**: 2 (Call of Duty: WWII, Hearts of Iron IV)

#### Key Research Decisions

**1. Holocaust Representation Analysis**
Prioritized diverse representation of Holocaust narratives:
- Victims (Anne Frank, Jewish refugees)
- Rescuers (Schindler, Wallenberg, Sendler, ten Boom, Pilecki)
- Perpetrators (Hitler, Himmler, Heydrich, Goebbels)
- German resisters (Bonhoeffer, Scholl, Stauffenberg)

**2. Sentiment Tag Complexity**
Applied nuanced sentiment tags beyond simple heroic/villainous binary:
- Hitler: "tragic-monstrous" (Downfall), "documentary-analytical" (The World at War), "satirical-cathartic" (Inglourious Basterds)
- Rommel: "conflicted-military" (respected opponent vs Nazi officer)
- Schindler: "heroic-conflicted" (profiteer transformed to savior)
- Resistance martyrs: "tragic-defiant" (Scholl, Bonhoeffer, Stauffenberg)

**3. Dense Network Focus**
Created interconnected relationship clusters:
- **Allied Leadership Triangle**: Churchill ↔ FDR ↔ Stalin (cooperative-complex, pragmatic-tense, diplomatic-strategic)
- **Nazi Inner Circle**: Hitler → Göring/Himmler/Goebbels (deteriorating-disappointed, enabling-genocidal, symbiotic-fanatical)
- **North Africa Rivalry**: Montgomery/Patton → Rommel (tactical-rivalry, mutual-respect)
- **Holocaust Network**: Perpetrators (Himmler, Heydrich) vs Rescuers (Schindler, Wallenberg, Sendler)

**4. Media Work Ingestion Protocol Adherence**
Successfully followed MediaWork protocol for all 15 new entries:
1. Searched Wikidata for Q-ID FIRST
2. Queried Neo4j for existing entries (found: Saving Private Ryan, Band of Brothers, Inglourious Basterds)
3. Created only non-duplicate entries with wikidata_id property
4. No aliases created without scholarly confirmation

### Sources Consulted
All Wikidata entries verified via:
- [Wikidata](https://www.wikidata.org) - Primary canonical identifier source
- [Wikipedia](https://en.wikipedia.org) - Biographical verification
- [Britannica](https://www.britannica.com) - Historical accuracy cross-reference
- [Holocaust Encyclopedia (USHMM)](https://encyclopedia.ushmm.org) - Holocaust-related figures
- [Internet Movie Database](https://www.imdb.com) - Film/TV work verification

### Quality Assurance Checks
✅ All 28 new figures have Wikidata Q-IDs as canonical_id
✅ All 15 new media works have verified wikidata_id properties
✅ No duplicate entities created (dual-key blocking successful)
✅ Multi-national representation achieved (6+ countries)
✅ Dense relationship network (39 interconnections across 38 figures)
✅ Sentiment complexity maintained (avoided simplistic good/evil binary)
✅ Source attribution complete (all research via Wikidata/scholarly sources)

### Next Steps
- Update Linear ticket CHR-34 with completion status
- Consider expansion: additional resistance figures (Dutch, Polish, Norwegian underground)
- Consider expansion: additional media works (Bridge on the River Kwai, Tora! Tora! Tora!, A Bridge Too Far)
- Future cluster: Cold War (natural progression from WWII aftermath)

---

**Session completed**: 2026-02-01
**Ingestion batch**: CHR-34-WWII-Cluster
**Data architect**: claude-sonnet-4.5
```

---

## Bulk Ingestion for Research Agents

**For agents ingesting 20+ entities**, use Python scripts instead of the web UI.

### Preparation

**1. Create a Session Note** (FICTOTUM_LOG.md):
```markdown
## Session: [Date] - [Cluster Name] ([Ticket ID])

### Objective
[Description]

### Entity List
[Preliminary list of figures and works to ingest]
```

**2. Research Phase**:
- Search Wikidata for ALL entities
- Create a spreadsheet/JSON with Q-IDs and metadata
- Verify no duplicates exist in database

**3. Create Cypher Script**:
```cypher
// Example: Bulk create WWII figures with provenance

// 1. Create or match Agent node
MERGE (agent:Agent {agent_id: "claude-sonnet-4.5"})
ON CREATE SET
  agent.name = "Claude Code (Sonnet 4.5)",
  agent.type = "ai_agent",
  agent.version = "claude-sonnet-4-5-20250929",
  agent.created_at = datetime()

// 2. Create figures with CREATED_BY relationship
WITH agent
UNWIND [
  {qid: "Q352", name: "Adolf Hitler", birth: 1889, death: 1945},
  {qid: "Q8016", name: "Winston Churchill", birth: 1874, death: 1965},
  {qid: "Q8007", name: "Franklin D. Roosevelt", birth: 1882, death: 1945}
] AS figure
CREATE (f:HistoricalFigure {
  canonical_id: figure.qid,
  wikidata_id: figure.qid,
  name: figure.name,
  birth_year: figure.birth,
  death_year: figure.death,
  created_at: datetime()
})
CREATE (f)-[:CREATED_BY {
  timestamp: datetime(),
  context: "bulk_ingestion",
  batch_id: "CHR-34-WWII-Cluster",
  method: "wikidata_enriched"
}]->(agent)

RETURN count(f) AS figures_created
```

**4. Execute via MCP**:
```bash
# Use the write-cypher MCP tool
mcp__fictotum-neo4j__write-cypher(
  query: [your Cypher script],
  params: {}
)
```

**5. Update Session Notes**:
- Document execution results
- Note any errors or duplicates found
- Run quality assurance checks

---

## Example Workflows

### Workflow 1: Adding a Single Historical Figure

**Scenario**: You want to add "Marie Curie" to the database.

**Steps**:

1. **Navigate to /contribute**
2. **Search**: "Marie Curie"
3. **Results**:
   - Green (Wikidata): "Marie Curie (Q7186)"
   - Confidence: High
4. **Select Wikidata Match**
   - System enriches with:
     - Birth year: 1867
     - Death year: 1934
     - Occupations: Physicist, chemist
5. **Confirm and Create**
   - Review details
   - Click "Confirm & Create"
6. **Success**: Redirected to `/figure/Q7186`

**Session Note** (brief):
```markdown
### Added: Marie Curie (Q7186)
- **Wikidata Q-ID**: Q7186
- **Verification**: https://www.wikidata.org/wiki/Q7186
- **Source**: Wikidata enrichment (birth/death years, occupations verified)
- **Added via**: Web UI (/contribute)
```

---

### Workflow 2: Adding a MediaWork with Portrayals

**Scenario**: You want to add "Chernobyl" (HBO miniseries) with portrayals of historical figures.

**Steps**:

**Part A: Add the MediaWork**

1. **Navigate to /contribute**
2. **Search**: "Chernobyl HBO"
3. **Results**:
   - Green (Wikidata): "Chernobyl (Q55833471)"
   - Confidence: High
4. **Select Wikidata Match**
   - Enriched metadata:
     - Media Type: TV Series (miniseries)
     - Release Year: 2019
     - Setting Year: 1986
     - Narrative Locations: Chernobyl, Pripyat, Moscow
5. **Settings Screen**:
   - ✅ Chernobyl (mapped to existing location)
   - ✅ Pripyat (create new location)
   - ✅ Moscow (mapped)
   - Era Tags: ✅ Soviet Era, ✅ Cold War
6. **Confirm and Create**

**Part B: Add Historical Figures Portrayed**

7. **Navigate to the newly created media page**: `/media/Q55833471`
8. **Click "Add Portrayal"**
9. **Search for figure**: "Mikhail Gorbachev"
10. **Select**: Gorbachev (Q30487) from database (already exists)
11. **Add Sentiment Tag**: `documentary-political`
12. **Save Portrayal**

**Repeat for**:
- Valery Legasov (create if not exists)
- Boris Shcherbina (create if not exists)

**Session Note**:
```markdown
### Added: Chernobyl (HBO, 2019) - Q55833471

**MediaWork Details**:
- **Wikidata Q-ID**: Q55833471
- **Media Type**: TV Series (miniseries)
- **Release Year**: 2019
- **Setting Year**: 1986
- **Locations**: Chernobyl, Pripyat, Moscow
- **Era Tags**: Soviet Era, Cold War

**Portrayals Added**:
1. Mikhail Gorbachev (Q30487) - Sentiment: `documentary-political`
2. Valery Legasov (Q4111386) - Sentiment: `tragic-heroic` (created new figure)
3. Boris Shcherbina (Q4096623) - Sentiment: `conflicted-authoritarian` (created new figure)

**Sources**:
- [Wikidata: Chernobyl](https://www.wikidata.org/wiki/Q55833471)
- [IMDb: Chernobyl](https://www.imdb.com/title/tt7366338/)
- [HBO: Chernobyl](https://www.hbo.com/chernobyl)
```

---

### Workflow 3: Bulk Ingesting a Historical Cluster

**Scenario**: You want to add 50 medieval figures and 25 media works.

**Steps**:

**Phase 1: Research & Planning (Day 1)**

1. **Create Session Note Header** in FICTOTUM_LOG.md
2. **Compile Entity List**:
   - 50 historical figures (kings, queens, scholars, warriors)
   - 25 media works (films, books, games)
3. **Search Wikidata for ALL Entities**:
   - Create a spreadsheet with columns: Name, Q-ID, Birth Year, Death Year, Era
   - Example: `medieval_figures.csv`

**Phase 2: Duplicate Check (Day 1)**

4. **Query Database for Existing Entities**:
```cypher
// Check for duplicates
MATCH (f:HistoricalFigure)
WHERE f.wikidata_id IN [
  "Q82951",   // Richard I of England
  "Q130859",  // King John
  ...
]
RETURN f.canonical_id, f.name, f.wikidata_id
```

5. **Filter Out Existing Entities** from your list

**Phase 3: Bulk Creation (Day 2)**

6. **Write Cypher Bulk Insert Script**:
```cypher
// See "Bulk Ingestion for Research Agents" section above
```

7. **Execute Script via MCP**:
```bash
mcp__fictotum-neo4j__write-cypher(query: [script])
```

8. **Verify Creation**:
```cypher
// Count newly created figures
MATCH (f:HistoricalFigure)-[:CREATED_BY {batch_id: "CHR-35-Medieval"}]->()
RETURN count(f)
```

**Phase 4: MediaWork Ingestion (Day 3)**

9. **Repeat for MediaWorks**:
   - Use similar bulk Cypher script
   - Include SET_IN relationships for locations
   - Include TAGGED_WITH_ERA for era tags

**Phase 5: Relationship Mapping (Day 4)**

10. **Add INTERACTED_WITH and NEMESIS_OF Relationships**:
```cypher
// Example: Royal family relationships
MATCH (henry:HistoricalFigure {canonical_id: "Q156119"})  // Henry II
MATCH (eleanor:HistoricalFigure {canonical_id: "Q236718"})  // Eleanor of Aquitaine
CREATE (henry)-[:INTERACTED_WITH {
  relationship_type: "spouse",
  start_year: 1152,
  end_year: 1189,
  notes: "Married 1152, relationship deteriorated after 1173 rebellion"
}]->(eleanor)
```

**Phase 6: Documentation (Day 4)**

11. **Complete Session Note** with full statistics and quality checks
12. **Update Linear Ticket** to "Done"

**Session Note** (see Medieval example in FICTOTUM_LOG.md template above)

---

## Quick Reference Card

**Before Every Contribution**:
1. ✅ Search Wikidata for Q-ID
2. ✅ Check Fictotum database for duplicates
3. ✅ Verify entity type (Figure vs Work)
4. ✅ Document sources in session notes

**MediaWork Checklist**:
- [ ] Q-ID verified
- [ ] Media type correct
- [ ] Release year ≠ setting year (check!)
- [ ] Locations mapped
- [ ] Era tags reviewed

**HistoricalFigure Checklist**:
- [ ] Q-ID used as canonical_id (or PROV: if unavailable)
- [ ] Birth/death years verified
- [ ] Phonetic duplicate check passed
- [ ] Provenance relationship created

**Sentiment Tags**:
- 🎬 Watch/read the media first
- 🧠 Consider creator's intent, not historical truth
- 🏷️ Use compound tags for nuance
- 📝 Document your reasoning

---

**Last Updated**: 2026-02-01
**Version**: 1.0.0
**Related Documentation**: [Contributing Guidelines](/docs/contributing/CONTRIBUTING.md), [Entity Resolution Protocol](/docs/protocols/entity-resolution.md)
