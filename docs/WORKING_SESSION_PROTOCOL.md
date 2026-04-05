# Working Session Protocol for Fictotum Agents

## Philosophy: Real-Time Collaboration

This system is designed for a CEO who wants to work alongside their agents in real-time, not manage them asynchronously across days or weeks. Think "co-located startup team" not "remote sprint-based org."

---

## The Three-Tier Documentation System

### Tier 1: STATUS_BOARD.md (Real-Time State)
**Purpose:** What's happening RIGHT NOW
**Updated by:** Agents (continuously)
**Read by:** CEO (anytime they want, multiple times per day)
**Lifespan:** Current work only (completed work moves to handoff notes)

**Contains:**
- Currently Active work
- Ready for Review completions
- Proposed Next Steps awaiting approval
- Blockers
- Resource claims

### Tier 2: Session Handoff Notes (Routine Completions)
**Purpose:** Brief record of completed routine work
**Updated by:** Agents (after each session)
**Read by:** CEO + other agents (to understand what just shipped)
**Lifespan:** Lives in STATUS_BOARD.md, accumulates until rotated (~weekly)

**Format:**
```markdown
## [Agent] Session Complete: [Timestamp]
**Did:** [What was accomplished in 1-2 lines]
**Changed:** [Files/data modified]
**Next:** [What naturally follows this work]
**Questions:** [Any clarifications needed]
```

### Tier 3: FICTOTUM_LOG.md (Major Milestones)
**Purpose:** Historical record of SIGNIFICANT achievements and architectural decisions
**Updated by:** Agents (only for major milestones)
**Read by:** CEO + all agents (for historical context and learning)
**Lifespan:** Recent 2-3 entries in main log, older entries rotated to archive

**What qualifies as a milestone:**
- ✅ Major feature completions (e.g., "Implemented full Wikidata integration")
- ✅ Significant data ingestion (e.g., "Ingested complete Shakespeare filmography - 150+ works")
- ✅ Architectural decisions (e.g., "Migrated from local to canonical_id for all entities")
- ✅ Infrastructure changes (e.g., "Deployed CI/CD pipeline with automated testing")
- ✅ Major bug fixes (e.g., "Resolved memory leak affecting 10k+ node graphs")

**What does NOT qualify (use handoff notes instead):**
- ❌ Routine data ingestion (e.g., "Added 'Rome' HBO series - 30 characters")
- ❌ Small bug fixes (e.g., "Fixed typo in GraphExplorer loading state")
- ❌ Polish work (e.g., "Improved button hover states")
- ❌ Documentation updates (e.g., "Added API docs for pathfinder endpoint")

---

## Agent Workflow: Before, During, After

### Before Starting Work

**Step 1: Check STATUS_BOARD for conflicts**
```bash
# Read active claims and currently active work
```

**Step 2: Propose new work (if not already approved)**

Add to "Proposed Next Steps" section:
```markdown
| [your-agent-name] | [One-line description] | [Impact statement] | [Effort estimate] | ? |
```

**Step 3: Wait for CEO approval**

CEO will update the "CEO Decision" column with:
- "Go" / "Yes" / "✓" = Approved
- "Not now" / "Hold" = Rejected
- "Yes, but [adjustment]" = Approved with modification
- "Let's discuss" = Needs conversation

**Step 4: Claim resources (if needed)**

If your work will modify specific files, add to "Active Claims":
```markdown
| GraphExplorer.tsx | frontend-polish | 14:00 | ~15:00 |
```

**Step 5: Update "Currently Active"**
```markdown
| frontend-polish | Adding loading skeleton to GraphExplorer | 14:00 | ~45min | Coordinating with ux-designer |
```

### During Work

**For short sessions (<30 min):**
- No updates needed, just work

**For longer sessions (>30 min):**
- Update "Notes" column with progress every 30 minutes:
  ```markdown
  | research-analyst | Ingesting BBC Shakespeare | 14:00 | ~2hrs | 12/37 plays complete |
  ```

**If you hit a blocker:**
- Immediately add to "Blockers" section:
  ```markdown
  | research-analyst | Missing Wikidata Q-ID | Need CEO to clarify if we should use IMDb ID instead | 14:45 |
  ```

**If you need another agent's work:**
- Check their "Currently Active" status
- If they're not working on what you need, add to your proposal or ping CEO

### After Completing Work

**Step 1: Move to "Ready for Review"**
```markdown
| data-architect | Wikidata deduplication script | 15:30 | Merged 12 duplicate MediaWork nodes, script in /scripts/maintenance/ |
```

**Step 2: Release claimed resources**
Remove your entry from "Active Claims"

**Step 3: Add session handoff note**
```markdown
## data-architect Session Complete: 2026-01-18 15:30
**Did:** Created deduplication script that merges MediaWork nodes with identical Wikidata Q-IDs
**Changed:**
- New script: scripts/maintenance/dedupe_wikidata.py
- Merged 12 duplicate nodes in Neo4j (verified via MCP query)
**Next:** Could extend script to handle HistoricalFigure deduplication using canonical_id
**Questions:** Should we run this as a scheduled maintenance task or on-demand only?
```

**Step 4: Propose follow-on work (if obvious)**

If there's a natural next step, add it to "Proposed Next Steps" immediately

---

## The Proposal Pattern (Detailed)

### Good Proposal Format

```markdown
| research-analyst | Ingest "Rome" HBO series (Q470911) character network | Adds 30+ characters from major historical drama, connects to existing Julius Caesar and Augustus nodes | ~45 minutes | ? |
```

**Components:**
1. **Agent name:** Who's proposing
2. **One-line description:** Clear, specific action
3. **Impact:** Why this matters (user value, data richness, technical improvement)
4. **Effort:** Rough time estimate (15min / 45min / 2hrs / 4hrs)
5. **CEO Decision:** Starts as "?" awaiting approval

### Optional: Include Alternative

For non-urgent proposals, suggest an alternative so CEO can redirect:

```markdown
| ux-designer | Redesign search results page for better scannability | Improves user ability to find relevant figures quickly | 2 hours | ? |

**Alternative:** Could instead add filters to existing search (1 hour, lower impact but faster ship)
```

### What Makes a Good Proposal

**Good:**
- "Ingest 'The Crown' series (Q23639) - adds modern royal history, 40+ characters" (specific, clear value)
- "Fix GraphExplorer crash when >5000 nodes loaded" (specific problem, clear need)
- "Add CSV export for MediaWork data" (specific feature, clear user value)

**Bad:**
- "Improve the database" (vague)
- "Work on frontend" (not specific)
- "Research historical accuracy" (no deliverable)

---

## CEO Interaction Patterns

### Pattern 1: Pull-Based (CEO Initiates)

CEO periodically checks STATUS_BOARD:
```
CEO opens STATUS_BOARD.md
Scans "Currently Active" - sees what's in flight
Scans "Ready for Review" - acknowledges completions
Scans "Proposed Next Steps" - approves/rejects quickly
```

**CEO response time: 1-2 minutes per check-in**

### Pattern 2: Push-Based (Agent Initiates)

Agent explicitly requests CEO attention:
```
Agent: "STATUS_BOARD updated - proposal ready for review: Ingest BBC Shakespeare Collection (37 plays, ~2 hours)"

CEO: "Go ahead, prioritize the histories first"
```

### Pattern 3: Continuous (CEO Actively Working)

CEO is in the conversation, agents stream naturally:
```
Agent: "Just completed Wikidata deduplication - merged 12 nodes. Proposing next: extend to HistoricalFigure deduplication?"

CEO: "Yes, but focus on canonical_id matching only, don't try to fuzzy-match names"

Agent: "Got it, starting now"
```

---

## Coordination Between Agents

### Self-Service via STATUS_BOARD

**Scenario: Frontend needs UX specs**

1. Frontend checks STATUS_BOARD:
   ```
   | ux-designer | Currently Active | Designing timeline interaction patterns | ...
   ```

2. Frontend waits for completion or proposes different work

3. When UX completes:
   ```
   ## ux-designer Session Complete: [time]
   **Did:** Designed timeline interaction patterns with wireframes
   **Changed:** docs/designs/timeline-v2.md
   **Next:** Frontend can implement from wireframes
   ```

4. Frontend claims implementation and begins

### Escalation to Chief-of-Staff

**When self-service coordination isn't enough:**

```
Agent: "Escalating to chief-of-staff: Frontend and UX both need GraphExplorer.tsx simultaneously. Frontend is adding features, UX is refactoring structure. Risk of merge conflict."

Chief-of-staff analyzes, proposes resolution:
"UX should complete refactor first (30 min), then Frontend adds features on new structure. Frontend: propose different work for next 30 min?"

CEO approves resolution.
```

---

## When to Use Each Documentation Layer

| Situation | Use | Not |
|-----------|-----|-----|
| Starting work on approved task | STATUS_BOARD "Currently Active" | FICTOTUM_LOG |
| Completed routine data ingestion | Session handoff note | FICTOTUM_LOG |
| Completed major feature | Session handoff note + FICTOTUM_LOG | Just handoff |
| Proposing next step | STATUS_BOARD "Proposed Next Steps" | FICTOTUM_LOG |
| Hit a blocker | STATUS_BOARD "Blockers" | FICTOTUM_LOG |
| Architectural decision made | FICTOTUM_LOG | Just handoff |
| Want to know what's happening | STATUS_BOARD | Ask CEO |

---

## Example: Complete Agent Session Flow

### 1. Morning - Research Analyst Arrives

**Agent checks STATUS_BOARD:**
- frontend-polish is working on GraphExplorer
- No blockers
- No resource conflicts

**Agent proposes work:**
```markdown
| research-analyst | Ingest BBC Shakespeare Collection (37 TV adaptations, Q12345) | Major content expansion, connects to existing Shakespeare characters | 2-3 hours | ? |
```

### 2. CEO Approves (30 seconds later)

STATUS_BOARD updated:
```markdown
| research-analyst | ... | 2-3 hours | ✓ Go ahead, prioritize histories |
```

### 3. Agent Starts Work

Updates STATUS_BOARD:
```markdown
| research-analyst | Ingesting BBC Shakespeare - 37 plays | 09:15 | ~2hrs | Starting with histories as requested |
```

Claims resources:
```markdown
| scripts/ingestion/ | research-analyst | 09:15 | ~11:15 |
```

### 4. Mid-Session Update (10:00)

Updates progress:
```markdown
| research-analyst | Ingesting BBC Shakespeare - 37 plays | 09:15 | ~2hrs | 12/37 complete, all histories done |
```

### 5. Session Complete (11:30)

Moves to "Ready for Review":
```markdown
| research-analyst | BBC Shakespeare Collection ingestion | 11:30 | Ingested 37 TV adaptations, 150+ character portrayals, linked to existing Shakespeare figures |
```

Releases resources:
```markdown
(scripts/ingestion/ entry removed from Active Claims)
```

Adds handoff note:
```markdown
## research-analyst Session Complete: 2026-01-18 11:30
**Did:** Ingested complete BBC Shakespeare Collection (37 TV plays from 1978-2005)
**Changed:**
- scripts/ingestion/ingest_bbc_shakespeare.py
- Neo4j: 37 new MediaWork nodes, 150+ new Portrayal relationships
**Next:** Companion series "Shakespeare: The Animated Tales" could be added next (12 plays, ~1 hour)
**Questions:** Should we categorize these as 'educational' or 'entertainment' media type?
```

Proposes follow-on:
```markdown
| research-analyst | Ingest "Shakespeare: The Animated Tales" (Q67890) | Companion series to BBC collection, adds educational adaptations | ~1 hour | ? |
```

### 6. CEO Review (11:45)

Checks STATUS_BOARD:
```
CEO sees:
- research-analyst completed BBC Shakespeare (in Ready for Review)
- research-analyst proposed animated series next
- Question about media categorization

CEO responds:
"Great work on BBC. For categorization: use 'educational' if produced for schools, 'entertainment' otherwise. Approved for animated series - go ahead."
```

### 7. Agent Continues

Updates STATUS_BOARD and continues to next approved task.

---

## Summary: The Lightweight Philosophy

### What This System Optimizes For:
- ✅ CEO always knows what's happening (30-second STATUS_BOARD scan)
- ✅ Agents proactively propose next steps (not waiting to be told)
- ✅ CEO approves in seconds, not meetings
- ✅ No scheduling overhead (no sprint planning, no reviews, no retrospectives)
- ✅ Real-time visibility and coordination
- ✅ Historical preservation of major milestones (FICTOTUM_LOG)

### What This System Eliminates:
- ❌ Quarterly roadmaps
- ❌ Sprint cycles
- ❌ Planning templates
- ❌ Scheduled check-ins
- ❌ Heavy ceremony

### Core Metrics:
- **CEO time per check-in:** 1-2 minutes
- **CEO time per proposal approval:** 10-30 seconds
- **Agent overhead:** Minimal (STATUS_BOARD updates are <1 min each)
- **Coordination overhead:** Self-service via STATUS_BOARD

This is a **continuous collaboration system** designed for a CEO who wants to work alongside their agents in real-time, not manage them at a distance.
