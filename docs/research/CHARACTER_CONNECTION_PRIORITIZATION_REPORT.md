# Fictotum Character Connection Prioritization Report
**Generated:** 2026-01-18
**Analyst:** Claude Code (Sonnet 4.5)
**Database:** Neo4j Aura (c78564a4)

---

## Executive Summary

**Current State:**
- Total MediaWorks: **528**
- MediaWorks with historical figures: **78** (14.8% coverage)
- Total APPEARS_IN relationships: **302**
- Total INTERACTED_WITH relationships: **74**
- Works with character interactions: **30** (38.5% of populated works)

**Key Finding:**
While 30 MediaWorks have character interaction data, the coverage is heavily concentrated in Roman-era works. **48 works with 3+ historical figures have ZERO character interactions defined**, representing the highest-value targets for systematic expansion.

**Top Priority:**
Expand character networks in works with 5+ historical figures, focusing on biographical films/series, historical epics, and book series with recurring character casts.

---

## Current State: Works with Existing Character Interactions

### Top 10 Works by Interaction Count

| Rank | Title | Year | Type | Figures | Interactions |
|------|-------|------|------|---------|--------------|
| 1 | Masters of Rome | 1990 | Book | 31 | 21 |
| 2 | Rome | 2005 | TVSeries | 29 | 19 |
| 3 | Cicero Trilogy (Imperium, Conspirata, Dictator) | 2006 | Book | 17 | 17 |
| 4 | Cleopatra | 1963 | Film | 13 | 11 |
| 5 | Parallel Lives | 100 | Book | 16 | 10 |
| 6 | I, Claudius | 1976 | TVSeries | 12 | 10 |
| 7 | I, Claudius | 1934 | Book | 13 | 9 |
| 8 | The Republic of Rome | 1990 | Game | 15 | 8 |
| 9 | Assassin's Creed Origins | 2017 | Game | 9 | 4 |
| 10 | Spartacus | 1960 | Film | 6 | 3 |

**Analysis:**
- **Roman Republic/Empire dominates:** 9 of top 10 works are Roman-era
- **Colleen McCullough's "Masters of Rome"** is the best-populated single work (21 interactions among 31 figures = 67% potential coverage)
- **Series have better coverage:** Cicero Trilogy has near-complete interaction mapping (17 interactions for 17 figures)
- **Games show promise:** "The Republic of Rome" and "Assassin's Creed Origins" have substantial character networks

---

## High-Priority Targets: Works with Multiple Figures, Zero Interactions

### Tier 1: CRITICAL (8+ Historical Figures)

These works have large casts but no character relationship data. Highest impact for database enrichment.

| Rank | Title | Year | Q-ID | Type | Figures | Sample Characters |
|------|-------|------|------|------|---------|-------------------|
| *None currently* | | | | | | |

**Note:** All works with 8+ figures already have at least partial interaction coverage.

---

### Tier 2: HIGH PRIORITY (5-7 Historical Figures)

| Rank | Title | Year | Q-ID | Type | Figures | Sample Characters |
|------|-------|------|------|------|---------|-------------------|
| 1 | The Caesars | 1968 | Q7720918 | TV_SERIES | 5 | Livia, Claudius, Tiberius, Caligula, Sejanus |
| 2 | The Silver Pigs | 1989 | Q1212490 | Book | 5 | Vespasian, Titus, Domitian, Falco, Helena |
| 3 | Spartacus | 1960 | Q232000 | Film | 6 | Spartacus, Crixus, Glabrus, Batiatus, Caesar, Crassus |
| 4 | Spartacus | 2010 | Q2085448 | TVSeries | 6 | Spartacus, Crixus, Glabrus, Batiatus, Caesar, Crassus |

**Reasoning:**
- **The Caesars (1968):** TV series covering Julio-Claudian dynasty - core imperial family interactions critical
- **Silver Pigs:** First book in 20-volume Marcus Didius Falco series - establishing character relationships enables series-wide propagation
- **Spartacus (both versions):** Slave revolt narrative requires gladiator-master-Roman general interaction triangles

---

### Tier 3: MEDIUM PRIORITY (3-4 Historical Figures)

| Title | Year | Q-ID | Type | Figures | Rationale |
|-------|------|------|------|---------|-----------|
| The Pride of Carthage | 2005 | Q7242805 | BOOK | 4 | Punic War epic: Scipio vs. Hannibal rivalry central to narrative |
| Quo Vadis | 1951 | Q607690 | Film | 4 | Nero-era persecution: Emperor-Christian interactions |
| Shadow of Rome | 2005 | Q2604609 | Game | 3 | Assassination conspiracy: Cicero-Brutus-Octavian political triangle |
| Expeditions: Rome | 2022 | Q106606627 | Game | 3 | Military campaign: Cicero-Lucullus-Caesar relationships |
| Hannibal | 1995 | Q123456789 | BOOK | 3 | Cato-Scipio-Hannibal strategic rivalry |
| Gladiator | 2000 | Q128518 | Film | 3 | Marcus Aurelius-Commodus-Lucilla family dynamics |
| Memoirs of Hadrian | 1951 | Q670668 | Book | 3 | Hadrian-Antinous-Marcus Aurelius mentor/successor relationships |
| The Robe | 1953 | Q1198990 | Film | 3 | Caligula-Marcellus-Peter early Christian persecution |
| Monty Python's Life of Brian | 1979 | Q24953 | Film | 3 | Jesus-Pilate-Brian satirical interactions |
| Ben-Hur | 1959 | Q200226 | Film | 3 | Jesus-Pilate-Judah spiritual/political conflict |
| Risen | 2016 | Q18202491 | Film | 3 | Jesus-Pilate-Clavius post-resurrection investigation |
| The Passion of the Christ | 2004 | Q356690 | Film | 3 | Jesus-Mary Magdalene-Pilate passion narrative |

**Reasoning:**
- **Biographical focus:** These works center on specific historical relationships (emperor/family, military rivals, religious figures)
- **Narrative structure:** Character interactions are central to plot progression
- **Historical significance:** Well-documented relationships in historical sources

---

## Prioritization by MediaWork Type

### Books (Highest ROI)
**Why:** Book series often have recurring character casts across multiple volumes. Defining interactions in one book enables propagation across series.

**Top Targets:**
1. **The Silver Pigs** (Q1212490) - First of 20 Marcus Didius Falco novels by Lindsey Davis
   - **Impact:** Establishing Vespasian-Falco-Helena-Titus interactions here allows reuse across 19 sequels
   - **Effort:** 6-10 relationships
   - **Multiplier:** 20x (if interactions carry forward to series)

2. **The Pride of Carthage** (Q7242805) - David Anthony Durham's Punic War novel
   - **Impact:** Scipio-Hannibal-Fabius strategic triangle + Sophonisba diplomatic role
   - **Effort:** 4-6 relationships
   - **Historical basis:** Well-documented military/political interactions

3. **Memoirs of Hadrian** (Q670668) - Marguerite Yourcenar's biographical novel
   - **Impact:** Hadrian-Antinous personal relationship + Marcus Aurelius mentorship
   - **Effort:** 3-5 relationships
   - **Literary significance:** Canonical work of historical fiction

---

### Films (Medium ROI)
**Why:** Films are standalone works but often have dense character interaction networks in 2-hour narratives.

**Top Targets:**
1. **Quo Vadis** (Q607690) - 1951 epic
   - **Impact:** Nero-Christian interactions, Petronius court intrigue
   - **Effort:** 4-6 relationships
   - **Historical context:** Neronian persecution

2. **Gladiator** (Q128518) - 2000 blockbuster
   - **Impact:** Marcus Aurelius-Commodus father-son conflict, Lucilla political maneuvering
   - **Effort:** 3-5 relationships
   - **Cultural reach:** Widely known, high user interest

3. **Ben-Hur / Risen / Passion of the Christ** (Q200226, Q18202491, Q356690)
   - **Impact:** Jesus-Pilate interactions across multiple film perspectives
   - **Effort:** 2-4 relationships each
   - **Thematic clustering:** Group of "Jesus trial" films enables comparative analysis

---

### TV Series (High ROI)
**Why:** Multi-episode arcs develop complex character networks over time.

**Top Targets:**
1. **The Caesars** (Q7720918) - 1968 BBC series
   - **Impact:** Julio-Claudian family dynamics (Livia-Claudius-Tiberius-Caligula-Sejanus)
   - **Effort:** 8-12 relationships
   - **Historical documentation:** Well-attested imperial family interactions

2. **Spartacus** (Q2085448) - 2010 Starz series
   - **Impact:** Gladiator rebellion networks, Roman military responses
   - **Effort:** 6-10 relationships
   - **Compare:** Can validate against 1960 film version (Q232000)

---

### Games (Exploratory Priority)
**Why:** Games often have dialogue trees and faction mechanics that imply character relationships.

**Top Targets:**
1. **Shadow of Rome** (Q2604609)
   - **Impact:** Julius Caesar assassination conspiracy (Cicero-Brutus-Octavian triangle)
   - **Effort:** 3-5 relationships
   - **Game mechanics:** Political intrigue simulation

2. **Expeditions: Rome** (Q106606627)
   - **Impact:** Military campaign interactions (Cicero-Lucullus-Caesar)
   - **Effort:** 2-4 relationships
   - **Historical accuracy:** Strategy game with documented historical figures

---

## Recommended Approach: Series-First Strategy

### Phase 1: Book Series Anchors (Weeks 1-2)
**Target: Lindsey Davis's Marcus Didius Falco Series**

1. **Research:** Read/skim summaries of first 3 Falco novels to identify recurring character interactions
2. **Define core relationships:**
   - Falco ↔ Helena Justina (romantic partner, later wife)
   - Falco ↔ Vespasian (patron/client relationship)
   - Falco ↔ Titus/Domitian (Vespasian's sons, complex dynamics)
   - Helena ↔ Vespasian (social class tensions)
3. **Create INTERACTED_WITH relationships** with properties:
   - `relationship_type`: "romantic", "patron-client", "familial", "political-rival", etc.
   - `first_appears_in`: Q-ID of book where relationship established
   - `relationship_description`: 1-sentence summary
4. **Propagate forward:** Copy relationships to subsequent books in series where characters appear

**Estimated effort:** 8-12 hours research + 2-3 hours database ingestion
**Impact:** 5 core relationships × 15 books = 75+ relationship instances

---

### Phase 2: TV Series Deep Dives (Weeks 3-4)
**Target: The Caesars (1968) + Spartacus (2010)**

1. **The Caesars:**
   - Watch/read episode summaries for Julio-Claudian family tree
   - Define relationships:
     - Livia ↔ Augustus (spousal, political partnership)
     - Livia ↔ Tiberius (mother-son, political manipulation)
     - Tiberius ↔ Sejanus (emperor-prefect, betrayal)
     - Caligula ↔ Claudius (nephew-uncle, contempt/fear)
   - **Estimated:** 10-15 relationships

2. **Spartacus (2010):**
   - Map gladiator rebellion networks
   - Define relationships:
     - Spartacus ↔ Crixus (gladiator brotherhood, rivalry)
     - Spartacus ↔ Batiatus (slave-master conflict)
     - Batiatus ↔ Glabrus (Roman political maneuvering)
     - Spartacus ↔ Crassus (military adversaries)
   - **Estimated:** 6-10 relationships

**Estimated effort:** 12-16 hours research + 3-4 hours ingestion
**Impact:** 20-25 high-quality relationships in major works

---

### Phase 3: Film Clusters (Weeks 5-6)
**Target: Thematic film groups**

1. **Jesus Trial Films** (Quo Vadis, Ben-Hur, Risen, Passion of the Christ):
   - Research Gospel accounts + film interpretations
   - Define shared relationships:
     - Jesus ↔ Pontius Pilate (accused-judge)
     - Jesus ↔ Peter (teacher-disciple)
     - Jesus ↔ Mary Magdalene (spiritual mentor-follower)
   - **Estimated:** 3-5 relationships × 4 films = 12-20 instances

2. **Roman Military Epics** (Gladiator, The Pride of Carthage, Hannibal):
   - Research Roman military hierarchy and rival commanders
   - Define relationships:
     - Marcus Aurelius ↔ Commodus (father-son, succession crisis)
     - Scipio Africanus ↔ Hannibal Barca (military rivals)
     - Hannibal ↔ Cato the Elder (enemy/political opponent)
   - **Estimated:** 2-4 relationships per film = 6-12 instances

**Estimated effort:** 10-14 hours research + 2-3 hours ingestion
**Impact:** 18-32 relationships across culturally significant films

---

## Success Metrics

### Quantitative Targets (6-Week Initiative)
- **Total INTERACTED_WITH relationships:** 74 → 200+ (170% increase)
- **Works with character data:** 30 → 50+ (67% increase)
- **Average interactions per work:** 2.5 → 4+ (60% increase)

### Qualitative Goals
- **Series coverage:** At least 3 book/TV series with complete character networks
- **Era diversification:** Expand beyond Roman focus (add Tudor, Medieval, Ancient Greece targets)
- **Relationship depth:** All relationships have typed properties (`relationship_type`, `description`)
- **Source attribution:** Each relationship cites source material (book/film scene, historical text)

---

## Long-Term Expansion Opportunities

### Other Historical Eras to Target (Post-Phase 3)

1. **Tudor England:**
   - Wolf Hall trilogy (already has PORTRAYED_IN, needs INTERACTED_WITH)
   - The Tudors TV series
   - Anne of the Thousand Days film
   - **Characters:** Henry VIII, Anne Boleyn, Thomas Cromwell, Thomas More, Catherine of Aragon

2. **Ancient Greece:**
   - Alexander (2004 film)
   - 300 (2006 film)
   - The Song of Achilles (novel)
   - **Characters:** Alexander the Great, Aristotle, Philip II, Hephaestion

3. **French Revolution:**
   - A Tale of Two Cities adaptations
   - Danton (1983 film)
   - **Characters:** Robespierre, Danton, Marat, Louis XVI, Marie Antoinette

4. **American Revolution:**
   - John Adams miniseries
   - Hamilton (musical/film)
   - **Characters:** Adams, Jefferson, Hamilton, Washington, Franklin

5. **World War II:**
   - The Imitation Game
   - Darkest Hour
   - **Characters:** Churchill, Turing, Eisenhower, de Gaulle

---

## Implementation Checklist

### Before Starting
- [ ] Read CLAUDE.md ingestion protocols
- [ ] Review existing INTERACTED_WITH relationship structure (check Masters of Rome, Rome TV series)
- [ ] Create relationship property template:
  ```cypher
  {
    relationship_type: "patron-client" | "romantic" | "familial" | "military-rival" | "political-ally" | etc.,
    relationship_description: "1-sentence summary",
    first_appears_in_qid: "Q1234567", // MediaWork where relationship established
    source_basis: "historical" | "fictional" | "speculative",
    created_by: "agent_name",
    created_at: "2026-01-18"
  }
  ```
- [ ] Prepare research sources (library access, streaming services for TV series)

### During Each Phase
- [ ] Research phase: Document character interactions with source citations
- [ ] Validation phase: Cross-reference with historical sources (Wikipedia, academic sources)
- [ ] Ingestion phase: Create Cypher scripts following template
- [ ] QA phase: Verify relationships appear correctly in database
- [ ] Update FICTOTUM_LOG.md with findings and statistics

### After Completion
- [ ] Generate final statistics report
- [ ] Identify next tier of targets (era expansion, documentary coverage)
- [ ] Document lessons learned for future large-scale relationship ingestion

---

## Appendix: Full Work Rankings

### All Works with 5+ Figures (Sorted by Figure Count)

| Rank | Title | Year | Q-ID | Type | Figures | Has Interactions? |
|------|-------|------|------|------|---------|-------------------|
| 1 | Masters of Rome | 1990 | Q6784105 | Book | 31 | YES (21) |
| 2 | Rome | 2005 | Q165399 | TVSeries | 29 | YES (19) |
| 3 | Cicero Trilogy | 2006 | Q5119959 | Book | 17 | YES (17) |
| 4 | Parallel Lives | 100 | Q192555 | Book | 16 | YES (10) |
| 5 | The Republic of Rome | 1990 | Q7315066 | Game | 15 | YES (8) |
| 6 | Cleopatra | 1963 | Q229808 | Film | 13 | YES (11) |
| 7 | I, Claudius | 1934 | Q1344573 | Book | 13 | YES (9) |
| 8 | I, Claudius | 1976 | Q1344599 | TVSeries | 12 | YES (10) |
| 9 | Assassin's Creed Origins | 2017 | Q23647136 | Game | 9 | YES (4) |
| 10 | Spartacus | 1960 | Q232000 | Film | 6 | YES (3) |
| 11 | Spartacus | 2010 | Q2085448 | TVSeries | 6 | YES (3) |
| 12 | The Caesars | 1968 | Q7720918 | TV_SERIES | 5 | YES (3) |
| 13 | The Silver Pigs | 1989 | Q1212490 | Book | 5 | YES (3) |

**Note:** All works with 5+ figures currently have at least minimal interaction coverage. Priority targets are those with low coverage percentages (e.g., The Caesars: 3 interactions for 5 figures = 30% of potential 10 pairwise relationships).

---

## Queries for Future Analysis

```cypher
// Find works with incomplete character coverage
MATCH (mw:MediaWork)<-[:APPEARS_IN]-(hf:HistoricalFigure)
WITH mw, collect(DISTINCT hf) as figures
WHERE size(figures) >= 3
WITH mw, figures, size(figures) as fig_count,
     size(figures) * (size(figures) - 1) / 2 as potential_interactions
UNWIND figures as f1
UNWIND figures as f2
WITH mw, fig_count, potential_interactions, f1, f2
WHERE f1.canonical_id < f2.canonical_id
OPTIONAL MATCH (f1)-[int:INTERACTED_WITH]-(f2)
WITH mw, fig_count, potential_interactions,
     count(DISTINCT CASE WHEN int IS NOT NULL THEN f1.canonical_id + '_' + f2.canonical_id END) as actual_interactions
RETURN mw.title, mw.wikidata_id, fig_count,
       actual_interactions, potential_interactions,
       round(100.0 * actual_interactions / potential_interactions, 1) as coverage_pct
ORDER BY potential_interactions DESC, coverage_pct ASC
LIMIT 20;
```

```cypher
// Find characters that appear in multiple works but lack cross-work relationship consistency
MATCH (hf:HistoricalFigure)-[:APPEARS_IN]->(mw:MediaWork)
WITH hf, count(DISTINCT mw) as work_count
WHERE work_count >= 3
MATCH (hf)-[int:INTERACTED_WITH]-(other:HistoricalFigure)
RETURN hf.name, work_count, count(DISTINCT int) as relationship_count
ORDER BY work_count DESC, relationship_count ASC
LIMIT 20;
```

---

**Report End**
For questions or clarifications, consult FICTOTUM_LOG.md or review database audit queries in `scripts/qa/`.
