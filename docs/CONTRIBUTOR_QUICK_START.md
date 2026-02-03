# ChronosGraph Contributor Quick Start Guide

*Your step-by-step guide to adding historical figures and media works*

---

## Table of Contents

1. [Before You Start](#before-you-start)
2. [The Golden Rules](#the-golden-rules)
3. [Adding Your First Historical Figure](#adding-your-first-historical-figure)
4. [Adding Your First Media Work](#adding-your-first-media-work)
5. [Common Mistakes & How to Avoid Them](#common-mistakes--how-to-avoid-them)
6. [Wikidata Quick Reference](#wikidata-quick-reference)
7. [Sentiment Tags Explained](#sentiment-tags-explained)
8. [FAQ](#faq)

---

## Before You Start

### What You Need

✅ A ChronosGraph account (sign up at `/auth/signin`)
✅ Basic knowledge of the historical figure or media work you're adding
✅ 5-10 minutes of research time

### What You DON'T Need

❌ Technical skills or coding knowledge
❌ Database experience
❌ API access or special permissions

---

## The Golden Rules

Follow these three simple rules and you'll be a successful contributor:

### Rule #1: Wikidata First, Always

**Before creating anything**, search [Wikidata](https://www.wikidata.org) for a Q-ID.

- Historical Figure Example: "Napoleon Bonaparte" → **Q517**
- Media Work Example: "War and Peace" → **Q180736**

**Why?** Wikidata Q-IDs are like ISBN numbers for books—they're globally unique identifiers that prevent duplicates and connect ChronosGraph to the wider knowledge ecosystem.

**How long should I search?** Spend at least 2-3 minutes trying different name variations and spellings.

---

### Rule #2: Check Before You Create

**Always search ChronosGraph** before adding a new entity.

**Where to check:**
1. Go to `/contribute`
2. Type the name in the search box
3. If you see a **blue result** (already in database) → Navigate to it instead of creating
4. If you see a **green result** (found on Wikidata) → Proceed with adding
5. If you see neither → You might be adding something truly new!

**Why?** We want one profile per person, not scattered duplicates.

---

### Rule #3: Document Your Sources

If you create something without a Wikidata Q-ID, **always explain why** in your session notes.

**Template:**
```markdown
### Added: [Figure Name] (Provisional ID)

**Wikidata Search Attempts:**
- Searched "[Query 1]" → No results
- Searched "[Query 2]" → No relevant matches

**Why No Q-ID:**
[Brief explanation - e.g., "Local historical figure not yet in Wikidata"]

**Sources:**
- [Primary source URL]
- [Secondary source URL]
```

---

## Adding Your First Historical Figure

### Step-by-Step Walkthrough

#### Step 1: Research on Wikidata

**Go to:** https://www.wikidata.org

**Search for:** Your historical figure's name

**Example:** "Cleopatra"

**What you'll see:**
```
Search Results:
✓ Cleopatra (Q635) - Pharaoh of Egypt (-69 to -30)
✓ Cleopatra II (Q40834) - Ptolemaic queen (-185 to -116)
✓ Cleopatra I Syra (Q40831) - Ptolemaic queen (-204 to -176)
```

**Pick the right one!** Check:
- Birth and death years match your research
- Description matches your intended figure
- Occupation/role matches

**Copy the Q-ID:** Q635

---

#### Step 2: Navigate to Contribution Hub

**URL:** `/contribute`

**What you'll see:**
```
┌─────────────────────────────────────┐
│  Add to ChronosGraph                │
│                                     │
│  What would you like to add?        │
│                                     │
│  [Search by name or title...]       │
│                                     │
│  Start typing to search             │
└─────────────────────────────────────┘
```

---

#### Step 3: Search in ChronosGraph

**Type:** "Cleopatra"

**Results appear in tiers:**

**Tier 1: Already in Database** (Blue)
```
🔵 Cleopatra VII (Q635)
   69 BCE - 30 BCE · Ancient Egypt
   → View existing profile
```
**If you see this:** Click it to view the existing profile. **Don't create a duplicate!**

**Tier 2: Found on Wikidata** (Green)
```
🟢 Cleopatra (Q635)
   High confidence · Last pharaoh of Egypt
   → Add to ChronosGraph
```
**If you see this:** Click to proceed with adding this figure (see next step)

**Tier 3: Not Found** (Gray)
```
➕ "Cleopatra" not found?
   → Create without Wikidata
```
**If you see this:** Proceed with manual entry (more work required)

---

#### Step 4A: Adding from Wikidata (Recommended Path)

**You clicked the green Wikidata result. What happens next:**

The system automatically enriches the figure with:
- Name: Cleopatra
- Wikidata Q-ID: Q635
- Birth year: -69 (69 BCE)
- Death year: -30 (30 BCE)
- Occupation: Pharaoh
- Description: Last active pharaoh of Ptolemaic Egypt

**Your screen shows:**
```
┌─────────────────────────────────────────────┐
│  Confirm Historical Figure                  │
│                                             │
│  📝 Name: Cleopatra                         │
│  🌐 Wikidata Q-ID: Q635                     │
│  📅 Born: 69 BCE                            │
│  📅 Died: 30 BCE                            │
│  👑 Title: Pharaoh of Egypt                 │
│  📖 Era: Ancient Egypt                      │
│                                             │
│  [Edit if needed]                           │
│                                             │
│  [Back]           [✓ Confirm & Create]      │
└─────────────────────────────────────────────┘
```

**What to do:**
1. Review all fields for accuracy
2. Make minor edits if needed (but keep Q-ID!)
3. Click **Confirm & Create**

**Done!** 🎉 You just added your first historical figure.

---

#### Step 4B: Creating Without Wikidata (Advanced)

**You clicked "Create without Wikidata". This path requires more work.**

**Form appears:**
```
┌─────────────────────────────────────────────┐
│  Create Historical Figure (Manual Entry)    │
│                                             │
│  📝 Name: [Required]                        │
│     └─ Full name or common name            │
│                                             │
│  🌐 Wikidata Q-ID: [Strongly Recommended]   │
│     └─ Leave blank only if truly absent    │
│                                             │
│  📅 Birth Year: [Optional]                  │
│     └─ Use negative numbers for BCE        │
│                                             │
│  📅 Death Year: [Optional]                  │
│     └─ Use negative numbers for BCE        │
│                                             │
│  👑 Title/Role: [Optional]                  │
│     └─ e.g., "Roman Emperor", "Author"     │
│                                             │
│  📖 Era: [Optional]                         │
│     └─ e.g., "Roman Empire", "Victorian"   │
│                                             │
│  📄 Description: [Optional]                 │
│     └─ Brief 1-2 sentence summary          │
│                                             │
│  [Cancel]              [Create Figure]      │
└─────────────────────────────────────────────┘
```

**Required Actions:**
1. Fill in **Name** (absolutely required)
2. Try one more time to find a Q-ID (seriously!)
3. Add birth/death years if known
4. Add era tag to help categorization

**After creating:** Document in session notes WHY no Q-ID was found.

---

## Adding Your First Media Work

Media works (books, films, TV series, games) follow a similar process with one critical difference: **Wikidata Q-IDs are REQUIRED**.

### Why Q-IDs Are Mandatory for Media

Media works can have:
- Multiple editions (hardcover, paperback, ebook)
- Multiple translations (same book, different languages)
- Same title, different works ("The Crown" = TV series OR historical book OR royal object)

Without a Q-ID, we can't tell them apart!

---

### Step-by-Step Walkthrough

#### Step 1: Find the Q-ID on Wikidata

**Search:** "War and Peace novel"

**Verify you found the RIGHT one:**
```
War and Peace (Q180736)
├─ Instance of: literary work
├─ Author: Leo Tolstoy (Q7809)
├─ Publication date: 1869
└─ NOT: A film adaptation, NOT a specific edition
```

**Common mistake:** Picking a specific edition Q-ID instead of the work itself.

**Correct:**
- ✅ "War and Peace" (Q180736) - The literary work
- ❌ "War and Peace (2016 TV series)" (Q20084790) - This is an adaptation!

**Copy:** Q180736

---

#### Step 2: Navigate to `/contribute` and Search

**Type:** "War and Peace"

**If already exists (blue result):**
→ Click to view existing profile, then add portrayals to it

**If found on Wikidata (green result):**
→ Click to proceed (next step)

**If not found:**
→ Search Wikidata again! Media should almost always have Q-IDs.

---

#### Step 3: Wikidata Enrichment Screen

**The system fetches metadata from Wikidata:**

```
┌──────────────────────────────────────────────┐
│  Enriching from Wikidata...                  │
│                                              │
│  📕 Title: War and Peace                     │
│  🌐 Q-ID: Q180736                            │
│  📖 Type: Novel                              │
│  📅 Publication Year: 1869                   │
│  ✍️ Author: Leo Tolstoy                      │
│                                              │
│  📍 Suggested Locations (from Wikidata):     │
│     ✅ Moscow (Q649)                         │
│     ✅ Saint Petersburg (Q656)               │
│     ⚠️  Austerlitz (Q156186) - Not in DB    │
│         [Create] [Skip]                      │
│                                              │
│  📅 Suggested Era Tags:                      │
│     ✅ Napoleonic Era (High confidence)      │
│     ✅ Imperial Russia (High confidence)     │
│     ☐ 19th Century Europe (Low confidence)  │
│                                              │
│  [Back]                  [Continue →]        │
└──────────────────────────────────────────────┘
```

**What to do:**
1. **Locations**: Check boxes for where the story takes place
   - Skip locations that aren't critical to the narrative
   - Create new locations for major settings if needed
2. **Era Tags**: Review AI suggestions
   - High confidence (≥0.8): Usually accurate, accept
   - Low confidence (<0.5): Verify before accepting
3. **Media Type**: Verify it's correct (Novel, Film, TV Series, Game, Play)
4. Click **Continue**

---

#### Step 4: Confirm and Create

**Final confirmation screen:**

```
┌──────────────────────────────────────────────┐
│  Confirm Media Work                          │
│                                              │
│  📕 War and Peace                            │
│     [Wikidata Verified]                      │
│                                              │
│  🌐 Q180736                                  │
│  📖 Novel                                    │
│  📅 Published: 1869                          │
│  📍 Locations: Moscow, Saint Petersburg      │
│  📅 Eras: Napoleonic Era, Imperial Russia    │
│                                              │
│  Data source: Wikidata                       │
│                                              │
│  [Back]           [✓ Confirm & Create]       │
└──────────────────────────────────────────────┘
```

**Click Confirm & Create**

**Success!** The media work is now in ChronosGraph.

---

### Step 5: Add Portrayals (Optional but Valuable!)

**Now that the work exists, link the historical figures it portrays:**

**Navigate to the media page:** `/media/Q180736`

**Click:** "Add Portrayal"

**Search for a figure:** "Napoleon Bonaparte"

**Select:** Napoleon Bonaparte (Q517)

**Choose sentiment tag:** See [Sentiment Tags Explained](#sentiment-tags-explained)

**For War and Peace:**
- Napoleon → **"villainous"** (portrayed as invader/antagonist in the novel)

**Save!**

**Repeat for other figures portrayed in the work.**

---

## Common Mistakes & How to Avoid Them

### Mistake #1: Skipping Wikidata Search

**What happens:**
- You create a duplicate figure that already exists
- Or you create a provisional ID when a Q-ID exists
- Result: More cleanup work later!

**Solution:**
- Always spend 2-3 minutes searching Wikidata
- Try variations: "Napoleon", "Napoleon Bonaparte", "Napoleon I"
- Try translations if relevant

---

### Mistake #2: Picking the Wrong Wikidata Entity

**Scenario:** You search "Alexander the Great" and pick Q8409 (Alexander) instead of Q8409 (Alexander III of Macedon)

**How to avoid:**
- Read the description carefully
- Check birth/death years
- Verify occupation matches your research
- Click "Read more" to see full Wikidata page

---

### Mistake #3: Confusing Media Work with Adaptation

**Scenario:** You add "Pride and Prejudice (1995 BBC series)" Q3403630 instead of "Pride and Prejudice (novel)" Q170583

**How to avoid:**
- Look for "Instance of: literary work" or "Instance of: film" in Wikidata
- The WORK is the original creation (novel, play, etc.)
- The ADAPTATION is the specific TV series, film version, etc.
- Add the adaptation separately if it's a significant portrayal!

---

### Mistake #4: Using Wrong Sentiment Tags

**Scenario:** You tag Hitler as "villainous" in every media work because he was evil historically

**Why it's wrong:** Sentiment tags describe **HOW THE MEDIA PORTRAYS** the figure, not historical consensus.

**Correct approach:**
- "Downfall" (2004): **"tragic-monstrous"** (humanizes in final days but doesn't excuse)
- "The World at War" (1973): **"documentary-analytical"** (factual, neutral tone)
- "Inglourious Basterds" (2009): **"satirical-cathartic"** (mockery for catharsis)

**Key insight:** Same figure = different tags across different media!

---

### Mistake #5: Mixing Up Release Year and Setting Year

**Scenario:** You add "1984" (novel) with release_year: 1984

**What's wrong:** "1984" was published in **1949** but SET IN 1984

**Correct:**
- **Release Year:** 1949 (when published)
- **Setting Year:** 1984 (when story takes place)

**Another example:**
- "War and Peace" → Published 1869, Set in 1805-1820

---

### Mistake #6: Creating Figure When You Meant to Add Portrayal

**Scenario:** You search for "Napoleon in War and Peace" and create a new figure called "Napoleon (War and Peace)"

**What's wrong:** Napoleon already exists (Q517)! You're creating a duplicate.

**Correct approach:**
1. Add the media work "War and Peace" (Q180736)
2. Navigate to the work's page
3. Click "Add Portrayal"
4. Search for the EXISTING figure "Napoleon Bonaparte" (Q517)
5. Link them with APPEARS_IN relationship + sentiment tag

---

## Wikidata Quick Reference

### Basic Search Strategies

#### Strategy 1: Direct Name Search
**When:** Figure is famous and name is unique

```
Search: "Marie Curie"
Result: Q7186
Verify: Birth 1867, Death 1934, Physicist/Chemist
```

---

#### Strategy 2: Name + Era
**When:** Name is common

```
Search: "Alexander emperor"
Result: Q8409 (Alexander the Great)

Search: "Alexander Russia"
Result: Q15193 (Alexander I of Russia)
```

---

#### Strategy 3: Wikipedia → Wikidata
**When:** You know the Wikipedia article

1. Go to Wikipedia page
2. Left sidebar → "Wikidata item" (under "Tools")
3. Click to open Wikidata page
4. Copy Q-ID from URL

---

#### Strategy 4: Google Search
**When:** Wikidata search fails

```
Google: "Wikidata" + "Julius Caesar"
Click: Wikidata result (usually first)
Copy: Q1048
```

---

### Verifying the Right Q-ID

Before using a Q-ID, check these fields on Wikidata:

✅ **Instance of:** Should be "human" (Q5) or "fictional character"
✅ **Dates:** Birth/death years should match your research
✅ **Occupation:** Should align with what you know
✅ **External IDs:** Presence of IDs like VIAF, Library of Congress confirms legitimacy

**Red flags:**
🚩 "Instance of: Wikimedia disambiguation page" → Not a real entity!
🚩 Dates way off from your research → Wrong person
🚩 Description doesn't match at all → Double-check

---

## Sentiment Tags Explained

### What Are Sentiment Tags?

Sentiment tags describe **how a media work portrays a historical figure**, NOT:
- ❌ Your personal opinion
- ❌ Historical consensus
- ❌ The figure's actual character

### Why They Matter

Sentiment tags let us analyze:
- How historical figures are remembered differently across cultures
- How portrayals evolve over time
- Patterns in sympathetic vs critical portrayals

### Primary Tags

| Tag | Use When | Example |
|-----|----------|---------|
| **heroic** | Figure is the hero/protagonist | Schindler in "Schindler's List" |
| **villainous** | Figure is the villain/antagonist | Commodus in "Gladiator" |
| **tragic** | Figure's fate evokes pity/sympathy | Caesar in "Julius Caesar" (play) |
| **conflicted** | Figure has both good and bad traits | Patton in "Patton" (1970) |
| **satirical** | Figure is mocked or parodied | Napoleon in "Bill & Ted" |
| **documentary** | Neutral, factual portrayal | Churchill in "The World at War" |
| **romanticized** | Idealized, beautified | Arthur in "Excalibur" |

---

### Compound Tags

Use hyphens to combine tags when a portrayal doesn't fit neatly:

**Examples:**

| Compound Tag | Meaning | Example |
|--------------|---------|---------|
| `heroic-conflicted` | Hero with moral struggles | Schindler (profiteer turned savior) |
| `tragic-monstrous` | Sympathetic portrayal of evil figure | Hitler in "Downfall" (humanized) |
| `villainous-tragic` | Villain with sad backstory | Commodus in "Gladiator" |
| `conflicted-military` | Complex military leader | Rommel in various WWII films |
| `satirical-cathartic` | Mockery that provides emotional release | Hitler in "Inglourious Basterds" |

---

### How to Choose the Right Tag

**Step 1:** Watch/read/play the media work (or read professional reviews if inaccessible)

**Step 2:** Ask yourself:
- How does the creator want me to feel about this figure?
- Is the figure a protagonist, antagonist, or supporting character?
- What emotional response does the portrayal evoke?

**Step 3:** Choose primary category

**Step 4:** Add modifier if needed (e.g., "heroic" → "heroic-conflicted")

**Step 5:** Document your reasoning in session notes

---

### Example: Napoleon Across Different Media

Napoleon Bonaparte has different tags depending on the media:

| Media | Tag | Why |
|-------|-----|-----|
| "Napoleon" (2023 film) | `conflicted-military` | Shows military genius + personal flaws |
| "War and Peace" (novel) | `villainous` | Portrayed as invader/antagonist |
| "Waterloo" (1970 film) | `tragic-heroic` | Sympathetic final defeat |
| "Bill & Ted" (1989) | `satirical` | Comedic caricature |
| "The Count of Monte Cristo" | `documentary` | Brief historical reference |

**Key insight:** Same person, 5 different tags! This is expected and valuable.

---

## FAQ

### Q: Do I need to add EVERY figure portrayed in a media work?

**A:** No! Focus on:
- Main characters
- Figures with significant screen/page time
- Historically important figures

Skip:
- Background extras
- Brief mentions
- Unnamed historical crowd members

---

### Q: What if I find a duplicate AFTER I create it?

**A:** Contact an admin or create a note on the STATUS_BOARD.md. Admins have a duplicate detection dashboard and can merge entries safely.

---

### Q: Can I add fictional characters?

**A:** Yes! Use the `FictionalCharacter` entity type. But most contributors should focus on historical figures first.

---

### Q: What if Wikidata has the wrong birth year for my figure?

**A:** Use Wikidata's Q-ID but correct the year in ChronosGraph. Document the discrepancy in your session notes with a source.

---

### Q: How do I know if my contribution was successful?

**A:** After creating an entity:
1. You'll be redirected to the entity's page
2. The entity will have a unique ID (Q-ID or PROV:slug-timestamp)
3. You can search for it in ChronosGraph and it will appear
4. It will have a CREATED_BY relationship linking to your account

---

### Q: What if I made a mistake?

**A:** Contact an admin! Include:
- Entity name and ID
- What's wrong
- What it should be

Admins can edit or delete entries if needed.

---

### Q: Can I bulk import 50+ figures at once?

**A:** Yes! See the [Batch Import Guide](/docs/batch-import-guide.md) for advanced users. However, start with the web UI to learn the process first.

---

### Q: What are provisional IDs (PROV:)?

**A:** Provisional IDs are temporary identifiers created when no Wikidata Q-ID exists:
- Format: `PROV:slug-timestamp`
- Example: `PROV:john-smith-1738462847293`
- Used as a fallback only
- Should be flagged for future Q-ID lookup

---

### Q: How long does it take to add a figure or work?

**A:**
- **With Wikidata Q-ID:** 2-3 minutes (mostly automated)
- **Without Wikidata Q-ID:** 5-10 minutes (manual entry + research)
- **Adding portrayals:** 1-2 minutes each

---

### Q: What if the figure lived in multiple eras?

**A:** Pick the era they're MOST associated with. For example:
- "Marcus Aurelius" → "Roman Empire" (not "Ancient Philosophy" even though he was a philosopher)
- "Leonardo da Vinci" → "Renaissance" (covers his art, science, and engineering)

---

### Q: Can I edit an existing entity?

**A:** Currently, editing is limited. If you find an error:
1. Document it in session notes
2. Contact an admin
3. Future versions will have edit capabilities

---

## Next Steps

### You've Finished This Guide! Now What?

**Beginner Path:**
1. Add 3-5 historical figures you're familiar with
2. Add 1-2 media works about them
3. Create portrayals (link figures to works)
4. Review the [Entity Resolution Protocol](/docs/protocols/entity-resolution.md) (technical details)

**Intermediate Path:**
1. Add a cluster of related figures (e.g., 10 Roman emperors)
2. Add multiple media works about them
3. Create dense relationship networks
4. Explore the [Data Ingestion Guide](/docs/guides/data-ingestion.md) (full details)

**Advanced Path:**
1. Use the [Batch Import Tool](/docs/batch-import-guide.md) for 20+ entities
2. Document your workflow in session notes
3. Contribute to improving this guide!

---

## Resources

### Official Documentation
- [Entity Resolution Protocol](/docs/protocols/entity-resolution.md) - Technical details on canonical IDs
- [Data Ingestion Guide](/docs/guides/data-ingestion.md) - Comprehensive guide for researchers
- [Batch Import Guide](/docs/batch-import-guide.md) - For bulk data imports
- [How We Prevent Duplicates](/docs/HOW_WE_PREVENT_DUPLICATES.md) - User-friendly explanation

### External Resources
- [Wikidata](https://www.wikidata.org) - Primary source for Q-IDs
- [Wikidata Query Service](https://query.wikidata.org) - Advanced SPARQL queries
- [Wikipedia](https://en.wikipedia.org) - Quick biographical reference

### Getting Help
- **Questions?** Post in the contributor forum
- **Found a bug?** Create an issue on GitHub
- **Need guidance?** Reach out to the ChronosGraph team

---

**Last Updated:** February 2026
**Version:** 1.0.0
**For:** ChronosGraph Contributors

*Thank you for helping build the world's knowledge graph of historical portrayals!* 🎉
