# How ChronosGraph Prevents Duplicate Historical Figures

*A simple guide to our smart matching system*

---

## Why This Matters

Imagine searching for Napoleon and finding three separate entries for the same person—one called "Napoleon Bonaparte," another "Napoleon I of France," and a third just "Napoleon." Confusing, right? That's the duplicate problem every historical database faces.

ChronosGraph solves this by using smart technology to recognize when different names actually refer to the same person. This guide explains how it works—no technical background needed!

---

## The Problem: Why Duplicates Happen

Historical figures are tricky because:

- **Names change across languages**: "Julius Caesar" (English), "Giulio Cesare" (Italian), "Jules César" (French)
- **Spelling varies over time**: Medieval records might spell names differently than modern historians
- **People use nicknames**: "Napoleon Bonaparte" vs "The Little Corporal" vs "Napoleon I"
- **Titles get added or dropped**: "Emperor Titus" vs just "Titus"
- **Multiple people share the same name**: There were seven Egyptian queens named Cleopatra!

Without a system to catch these variations, we'd end up with dozens of duplicate entries cluttering your search results.

---

## Our Solution: The Two-Part Matching System

ChronosGraph uses a **two-layer matching system** that works like having both a spell-checker and a pronunciation guide:

### Layer 1: Spelling Match (70% weight)
This checks how similar two names look when written down. Think of it like autocorrect on your phone—it measures how many letters would need to change.

**Examples:**
- "Napoleon" vs "Napolean" → **Very similar** (one letter different)
- "Stephen" vs "Steven" → **Pretty similar** (two letters different)
- "Caesar" vs "Napoleon" → **Not similar** (completely different)

### Layer 2: Pronunciation Match (30% weight)
This checks how similar two names sound when spoken aloud. It's like those "sounds like" features in search engines.

**Examples:**
- "Smith" vs "Smyth" → **Same pronunciation** ✓
- "Steven" vs "Stephen" → **Same pronunciation** ✓
- "Caesar" vs "Cesar" → **Same pronunciation** ✓

### Combined Score
We blend both layers together (70% spelling + 30% pronunciation) to get a final similarity score:

| Score | What It Means | What Happens |
|-------|--------------|--------------|
| 90-100% | Almost certainly the same person | Flagged for review before adding |
| 70-89% | Possibly the same person | Warning shown to contributor |
| Below 70% | Probably different people | Entry allowed |

---

## The Secret Weapon: Wikidata IDs

Here's the really clever part: instead of relying only on names, ChronosGraph connects to **Wikidata**—think of it as the world's largest digital library catalog for historical figures.

### What is Wikidata?

Wikidata is like the ISBN system for books, but for *everything*. Every person, place, artwork, and concept gets a unique ID code called a **Q-ID**:

- Napoleon Bonaparte → **Q517**
- Julius Caesar → **Q1048**
- Cleopatra VII → **Q635**

These codes never change, even if spellings or preferred names do. It's like how you stay the same person even if you get a nickname or change your name.

### How ChronosGraph Uses Q-IDs

When someone adds a historical figure to ChronosGraph:

1. **First, we search Wikidata** to see if this person already has a Q-ID
2. **If we find a Q-ID**, we use it as the figure's permanent identifier
3. **If we don't find a Q-ID**, we create a temporary "provisional" ID (marked with "PROV:")

This means:
- ✅ **No duplicates**: If two people try to add "Napoleon Bonaparte" and "Napoleon I", both get linked to Q517
- ✅ **Future-proof**: Even if historians change their preferred spelling, the Q-ID stays the same
- ✅ **Connected data**: You can follow the same figure across Wikipedia, Wikidata, and ChronosGraph seamlessly

---

## Real-World Example: The Case of Emperor Titus

Let's walk through how this works with a real example from Roman history:

### The Situation
Someone tries to add "Titus" to ChronosGraph, but there are already two entries:
1. "Titus" (Wikidata Q1421 - Roman Emperor)
2. "Titus" (Wikidata Q1418 - Different historical figure)

### How Our System Handles It

**Step 1: Name Match**
- Spelling similarity: 100% (identical names)
- Pronunciation similarity: 100% (identical)
- Combined score: **100%** → Very high confidence match!

**Step 2: Q-ID Check**
- Hold on—they have *different* Q-IDs (Q1421 vs Q1418)
- This tells us they're actually **different people** who happen to share the same name

**Result:**
- ✅ Both entries stay separate (no duplicate!)
- ✅ System recognizes these are two different historical figures
- ✅ Users searching for "Titus" see both options with context to tell them apart

### Without Our System
Without Q-ID checking, a simple name-match system would flag these as duplicates and potentially merge two completely different people!

---

## What You See as a User

### When Browsing
You'll never see duplicate entries cluttering your search results. Every historical figure appears once, with all their media appearances consolidated under a single profile.

### When Contributing
If you try to add someone who might already exist, you'll see:

**High Confidence Match (90%+)**
> ⚠️ **Heads up!** We found "Napoleon Bonaparte" (Q517) already in our database. This looks like the same person you're trying to add. Would you like to add new information to the existing entry instead?

**Medium Confidence Match (70-89%)**
> ℹ️ **Possible duplicate detected.** We found "Steven Johnson" in the database. This might be the same person as "Stephen Johnson" you're adding. Take a look and confirm they're different people before proceeding.

**Low Confidence (Below 70%)**
No warning—you're good to go!

---

## The Technical Magic (Optional Read)

*For the curious minds who want to know more*

### Double Metaphone Algorithm
Our pronunciation matching uses something called "Double Metaphone," which is like a super-smart phonetic translator. It converts names into phonetic codes that represent how they sound, not how they're spelled.

For example:
- "Stephen" → Phonetic code: **STFN**
- "Steven" → Phonetic code: **STFN**
- Match found! ✓

### Levenshtein Distance
Our spelling checker uses "Levenshtein distance," which counts the minimum number of single-letter changes needed to transform one name into another.

For example, "Napoleon" → "Napolean":
- Delete one "a" = **1 change**
- High similarity score! ✓

### Why Both Matter
Using both methods together catches the widest range of variations:
- Spelling catches typos and minor variations
- Pronunciation catches legitimate alternate spellings
- Combined, they're much more accurate than either alone

---

## Behind the Scenes: Quality Control

### Automatic Duplicate Detection
Every week, our system automatically scans the entire database looking for potential duplicates that might have slipped through. These get flagged for admin review.

### Manual Review Dashboard
Our administrators have a special dashboard where they can:
- Review flagged duplicate pairs side-by-side
- See similarity scores and Q-ID information
- Merge confirmed duplicates (safely consolidating all their data)
- Dismiss false alarms (marking pairs as "not duplicates")

### Audit Trail
Every merge operation is recorded permanently:
- When it happened
- Who approved it
- Which entries were combined
- What data was transferred

If we ever make a mistake, we can trace it back and fix it.

---

## What Makes This System Smart

### 1. Context-Aware
The system doesn't just look at names—it also checks:
- **Birth and death years**: Cleopatra VII (69-30 BCE) vs Cleopatra II (185-116 BCE)
- **Era tags**: "Roman Empire" vs "Ancient Egypt"
- **Wikidata Q-IDs**: The ultimate tiebreaker

### 2. Language-Friendly
The system handles:
- ✅ Accented characters (José = Jose)
- ✅ Different alphabets (transliterations)
- ✅ Titles and honorifics (strips "Emperor", "King", "Dr", etc.)

### 3. Safe Defaults
When in doubt, the system errs on the side of caution:
- **High confidence match?** → Human review required
- **Different Q-IDs?** → Treated as different people (no merge)
- **Uncertain?** → Allow the entry, flag for later review

---

## Fun Facts

### The Database Today
- **1,599 historical entities** tracked
- **100% provenance coverage** (we know who added every entry)
- **2,821 relationships** mapped between figures and media
- **34 database indexes** keeping searches lightning-fast

### The Biggest Challenge
Names with **many spelling variations** across languages—think "Genghis Khan" (also: Chinggis Khan, Jenghiz Khan, Temüjin, etc.). Our phonetic matching helps, but these still require extra care.

### The Coolest Feature
Our system can detect duplicates even when one entry uses a full formal name ("Gaius Julius Caesar") and another uses a shortened version ("Julius Caesar")—as long as they share the same Q-ID!

---

## Why This Matters for History

Clean, deduplicated data means:

✅ **Accurate research**: No confusion about which media portrayed which figure
✅ **Better connections**: See true patterns in how historical figures relate
✅ **Trustworthy source**: ChronosGraph becomes a reliable reference
✅ **Easier exploration**: Find what you're looking for, not 10 duplicates

When you're exploring how Napoleon has been portrayed across 200+ years of media, you want every portrayal linked to the same Napoleon—not scattered across multiple entries.

---

## Questions?

**Q: What if Wikidata doesn't have a Q-ID for my historical figure?**
A: No problem! We create a provisional ID (marked "PROV:") and document that we searched. These figures are flagged for periodic re-checking as Wikidata grows.

**Q: What if I disagree with a merge?**
A: Contact us! Every merge has an audit trail, and we can review the decision. Our goal is accuracy, not speed.

**Q: How often do you scan for duplicates?**
A: Our automated system runs weekly health checks. Plus, every new contribution is checked in real-time before being added.

**Q: Can I see the technical details?**
A: Absolutely! Check out our [Entity Resolution Protocol](/docs/protocols/entity-resolution.md) for the full technical specification.

---

## The Bottom Line

ChronosGraph uses a combination of **smart name matching**, **global identifiers** (Wikidata Q-IDs), and **human review** to keep the database clean and accurate. You get a better experience browsing, searching, and exploring historical connections—without the frustration of duplicate entries.

Think of it as having a really good librarian who makes sure every book is in the right place, with the right label, connected to all the right related topics. That's what our duplicate prevention system does for historical figures!

---

*Last updated: February 2026*
*Questions or feedback? Contact us at the ChronosGraph team.*
