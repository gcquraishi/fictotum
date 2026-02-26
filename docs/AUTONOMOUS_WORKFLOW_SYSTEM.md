# Fictotum Autonomous Workflow System

**Version:** 1.0
**Effective Date:** 2026-01-18
**Owner:** Sprint Coordinator Agent

---

## Overview

This document defines how the Fictotum agent ecosystem operates as an autonomous product development organization. Each agent develops quarterly roadmaps, breaks work into 2-week sprints, coordinates with other agents, and presents plans to the CEO for greenlight rather than prompting-from-scratch execution.

## Organizational Structure

```
                    +------------------+
                    |       CEO        |
                    | (Human Operator) |
                    +--------+---------+
                             |
                    Greenlights/Tweaks
                             |
                    +--------v---------+
                    |  Chief of Staff  |
                    | (Strategic Ops)  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v---------+          +--------v---------+
     | Sprint Coordinator|          | Product Strategy |
     | (Ops Execution)  |          |    Advisor       |
     +--------+---------+          +------------------+
              |
    +---------+---------+---------+---------+
    |         |         |         |         |
+---v---+ +---v---+ +---v---+ +---v---+ +---v---+
|Frontend| | Data  | |Research| |DevOps | | UX   |
|Polish  | |Archit.| |Analyst | |Infra  | |Design|
+-------+ +-------+ +-------+ +-------+ +-------+
    |         |         |         |         |
+---v---+ +---v---+ +---v---+ +---v---+ +---v---+
| Code  | |Growth | | CMO   | | Tech  | | ...  |
|Review | |Direct.| |       | |Writer | |      |
+-------+ +-------+ +-------+ +-------+ +-------+
```

## Agent Roster (Complete)

### Strategic Layer
| Agent | Model | Primary Function |
|-------|-------|------------------|
| **chief-of-staff** | Opus | Strategic orchestration, priority identification, workflow optimization |
| **product-strategy-advisor** | Sonnet | Feature planning, roadmap validation, user value assessment |
| **sprint-coordinator** | Sonnet | Sprint planning, cross-agent coordination, handoff facilitation |

### Engineering Layer
| Agent | Model | Primary Function |
|-------|-------|------------------|
| **data-architect** | Sonnet | Neo4j schema, Cypher queries, entity resolution, data integrity |
| **frontend-polish-specialist** | Sonnet | Visual design, CSS, animations, responsive layouts |
| **code-review-tester** | Sonnet | Code quality, testing, Fictotum protocol compliance |
| **devops-infrastructure-engineer** | Sonnet | CI/CD, deployment, monitoring, production debugging |

### Research & Content Layer
| Agent | Model | Primary Function |
|-------|-------|------------------|
| **research-analyst** | Sonnet | Historical research, Wikidata verification, data ingestion |
| **technical-writer-documentarian** | Sonnet | User guides, API docs, contributor documentation |

### Design Layer
| Agent | Model | Primary Function |
|-------|-------|------------------|
| **ux-obsessive-designer** | Sonnet | Interaction design, user flows, usability optimization |

### Growth Layer
| Agent | Model | Primary Function |
|-------|-------|------------------|
| **growth-director** | Sonnet | User acquisition, content strategy, partnership development |
| **chief-marketing-officer** | Opus | Brand positioning, naming strategy, market differentiation |

---

## Quarterly Roadmap Process

### Timeline
- **Q1:** January 1 - March 31
- **Q2:** April 1 - June 30
- **Q3:** July 1 - September 30
- **Q4:** October 1 - December 31

### Roadmap Generation Protocol

**Week -1 (Last week of previous quarter):**

1. **Chief of Staff** reviews project state and identifies strategic priorities
2. **Sprint Coordinator** schedules roadmap sessions with each agent
3. Each agent generates their quarterly roadmap draft

**Roadmap Template (Each Agent Completes):**

```markdown
# [Agent Name] Q[X] 202X Roadmap

## Mission Alignment
How my work this quarter advances Fictotum's mission:
[1-2 sentences]

## Strategic Objectives (3 max)
1. **[Objective 1]**: [Measurable outcome]
   - Key Result: [Specific metric or deliverable]
   - Dependencies: [What I need from other agents]

2. **[Objective 2]**: [Measurable outcome]
   - Key Result: [Specific metric or deliverable]
   - Dependencies: [What I need from other agents]

3. **[Objective 3]**: [Measurable outcome]
   - Key Result: [Specific metric or deliverable]
   - Dependencies: [What I need from other agents]

## Sprint Allocation (Tentative)
| Sprint | Dates | Focus Area | Dependencies |
|--------|-------|------------|--------------|
| 1 | [dates] | [objective portion] | [agent:deliverable] |
| 2 | [dates] | [objective portion] | [agent:deliverable] |
| ... | ... | ... | ... |

## Clarifying Questions for CEO
1. [Question about priorities, scope, or resources]
2. [Question about strategic direction]

## Risks & Mitigation
- **Risk:** [Description]
  - **Mitigation:** [Strategy]
  - **Escalation Trigger:** [When to alert CEO]

## Success Criteria
By end of quarter, I will have delivered:
- [ ] [Deliverable 1]
- [ ] [Deliverable 2]
- [ ] [Deliverable 3]
```

**Roadmap Review Meeting:**
- Sprint Coordinator consolidates all roadmaps
- Identifies cross-agent dependencies and conflicts
- Presents unified quarterly plan to CEO
- CEO greenlights, adjusts, or requests changes

---

## Sprint Planning Process

### Sprint Cadence
- **Duration:** 2 weeks (10 working days)
- **Start:** Monday
- **End:** Friday (week 2)
- **Planning:** Friday before sprint starts
- **Review:** Friday of sprint end

### Sprint Planning Protocol

**Thursday (Pre-Sprint):**
1. Each agent reviews their roadmap and identifies sprint-appropriate work
2. Agents draft their sprint commitments

**Friday (Planning Day):**
1. Sprint Coordinator collects all agent commitments
2. Dependency analysis and conflict resolution
3. Compile unified sprint plan
4. Present to CEO for greenlight

**Sprint Plan Template:**

```markdown
# Sprint [YYYY-S##] Plan
**Dates:** [Start] - [End]
**Sprint Goal:** [One sentence describing the main outcome]

---

## Agent Commitments

### data-architect
**Focus:** [Brief description]
- [ ] [Task 1] `[S/M/L]`
- [ ] [Task 2] `[S/M/L]`
- [ ] [Task 3] `[S/M/L]`
**Blocked by:** [None / Agent:Task]
**Blocks:** [None / Agent:Task]

### frontend-polish-specialist
**Focus:** [Brief description]
- [ ] [Task 1] `[S/M/L]`
...

[Repeat for all active agents]

---

## Dependencies Map

```
research-analyst:dataset --> data-architect:ingestion
data-architect:schema --> frontend:display
frontend:component --> ux-designer:review
```

## Clarifying Questions for CEO
1. [ ] [Question needing CEO input]
2. [ ] [Question needing CEO input]

## Definition of Done
- [ ] All committed tasks completed or explicitly deprioritized
- [ ] FICTOTUM_LOG updated with session summaries
- [ ] Handoffs completed for downstream agents
- [ ] Next sprint planned
```

### Effort Estimation Scale
- **S (Small):** < 2 hours
- **M (Medium):** 2-8 hours
- **L (Large):** 1-3 days

---

## Clarifying Questions Protocol

Agents must proactively ask clarifying questions to ensure they solve the right problems.

### When to Ask Questions

**Before Starting Work:**
- Scope ambiguity ("Should this include X or just Y?")
- Priority conflicts ("Feature A or Bug B first?")
- Resource questions ("Can I use external API Z?")
- User intent ("Who is the primary user for this feature?")

**During Work:**
- Discovered complexity ("This is bigger than estimated - should I descope?")
- Design decisions ("Option A is faster, Option B is more flexible - which matters more?")
- Blockers ("I need X from Agent Y - what's the timeline?")

### Question Format

```markdown
## Clarifying Question: [Brief Title]

**Context:** [1-2 sentences explaining the situation]

**Question:** [Specific question]

**Options:**
- **A:** [Option description] - *Pros:* [list] | *Cons:* [list]
- **B:** [Option description] - *Pros:* [list] | *Cons:* [list]

**My Recommendation:** [Option] because [rationale]

**Blocking?:** [Yes - need answer before proceeding / No - can continue with assumption]
```

### Question Response Protocol
1. Questions compiled in sprint plan under "Clarifying Questions for CEO"
2. CEO reviews and answers during greenlight process
3. Sprint Coordinator distributes answers to relevant agents
4. Blocking questions must be resolved before sprint starts
5. Non-blocking questions can be answered async during sprint

---

## Cross-Agent Coordination

### Visibility Requirements

**Each agent maintains awareness of:**
- Other agents' current sprint commitments
- Upstream dependencies they're waiting on
- Downstream agents waiting on their work

**Sprint Coordinator provides:**
- Unified sprint plan visible to all agents
- Dependency map showing who blocks whom
- Mid-sprint status updates

### Handoff Protocol

When Agent A completes work that Agent B depends on:

```markdown
## Handoff: [Task Name]
**From:** [Agent A]
**To:** [Agent B]
**Date:** [Completion date]

### What Was Delivered
[Description of the completed work]

### Where to Find It
- Files: [list of files created/modified]
- Commits: [relevant commit hashes]
- PRs: [if applicable]

### How to Use It
[Instructions for Agent B to pick up the work]

### Known Issues / Caveats
- [Any limitations or gotchas]
- [Suggested improvements for future]

### Suggested Next Steps
1. [What Agent B should do first]
2. [What Agent B should do next]

### Questions?
[How to reach Agent A for clarification]
```

### Conflict Resolution

**When agents have conflicting approaches:**

1. **Identify the conflict** - Sprint Coordinator or Chief of Staff surfaces it
2. **Document both positions** - Each agent explains their approach
3. **Evaluate trade-offs** - What does each approach optimize for?
4. **Escalate if needed** - CEO decides if no consensus
5. **Document the decision** - Record rationale for future reference

---

## CEO Ceremonies

The CEO (human operator) maintains lightweight oversight through defined checkpoints.

### Required Ceremonies

| Ceremony | Frequency | Duration | Purpose |
|----------|-----------|----------|---------|
| **Quarterly Greenlight** | Quarterly | 30-60 min | Review and approve agent roadmaps |
| **Sprint Greenlight** | Bi-weekly | 15-30 min | Review and approve sprint plan |
| **Sprint Review** | Bi-weekly | 15-30 min | Review accomplishments, answer questions |

### Optional Ceremonies

| Ceremony | Trigger | Purpose |
|----------|---------|---------|
| **Ad-hoc Decision** | Agent escalation | Resolve blocking questions |
| **Strategy Session** | Market change/opportunity | Adjust priorities mid-quarter |
| **Retrospective** | End of quarter | Process improvement |

### CEO Input Format

**Sprint Greenlight Response:**
```markdown
## Sprint [##] Greenlight

**Status:** [APPROVED / APPROVED WITH CHANGES / NEEDS REVISION]

### Approved As-Is
- [Agent]: [Their plan is good]

### Changes Requested
- [Agent]: [Specific change] - Reason: [why]

### Questions Answered
1. Q: [Question] A: [Answer]
2. Q: [Question] A: [Answer]

### Additional Priorities
- [If any new items should be added]

### Notes
[Any strategic context or guidance]
```

---

## Asynchronous Operation

Agents operate asynchronously with clear handoff protocols.

### Async Principles

1. **Document Everything** - Decisions, progress, and blockers go in FICTOTUM_LOG.md
2. **Clear Handoffs** - Use handoff template when work moves between agents
3. **Proactive Communication** - Surface blockers before they become urgent
4. **Explicit Status** - Every task is clearly: Not Started / In Progress / Blocked / Complete

### Communication Channels

| Type | Channel | When to Use |
|------|---------|-------------|
| **Work log** | FICTOTUM_LOG.md | Session summaries, decisions, progress |
| **Sprint status** | Sprint plan doc | Current sprint progress, blockers |
| **Handoffs** | Handoff notes | When work moves between agents |
| **Escalations** | Clarifying questions | CEO input needed |

### Status Update Template

```markdown
## [Agent Name] Status Update - [Date]

### Completed Since Last Update
- [Task]: [Brief outcome]
- [Task]: [Brief outcome]

### Currently Working On
- [Task]: [Current state, ETA]

### Blocked On
- [Task]: Waiting for [Agent/CEO]: [What's needed]

### Next Up
- [Task]: Will start after [trigger]

### Risks/Concerns
- [Any emerging issues]
```

---

## File Structure

```
/docs/
  /roadmaps/
    roadmap-q1-2026-data-architect.md
    roadmap-q1-2026-frontend-polish.md
    roadmap-q1-2026-[agent].md
    ...
  /sprints/
    sprint-2026-01-20.md
    sprint-2026-02-03.md
    sprint-2026-02-17.md
    ...
  /handoffs/
    handoff-2026-01-22-research-to-data.md
    ...
  AUTONOMOUS_WORKFLOW_SYSTEM.md (this file)

/FICTOTUM_LOG.md (active session log)
/FICTOTUM_LOG.archive.md (historical sessions)
```

---

## Bootstrap Checklist

To fully activate this system:

- [ ] All agents have read and acknowledged this workflow document
- [ ] Sprint Coordinator has generated Q1 2026 roadmap template for each agent
- [ ] Each agent has submitted their Q1 roadmap draft
- [ ] CEO has conducted Quarterly Greenlight ceremony
- [ ] First sprint plan has been created and greenlighted
- [ ] FICTOTUM_LOG rotation policy is being followed
- [ ] Handoff protocol has been demonstrated at least once

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-18 | Chief of Staff | Initial version |
