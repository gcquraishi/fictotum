# Fictotum Q1 2026 Roadmap
**Quarter:** January - March 2026
**Strategic Theme:** Foundation & Launch Readiness

---

## Quarter Overview

**Mission:** Transform Fictotum from a prototype into a production-ready platform with quality data, polished UX, and sustainable contribution workflows.

**Key Results:**
1. Ship polished user experience with cohesive design system
2. Establish data provenance and quality infrastructure
3. Grow knowledge graph to 500+ historical figures with rich interconnections
4. Document all protocols for multi-user contribution future
5. Prepare for public beta launch (late Q1 or early Q2)

---

## Sprint Breakdown (6 Sprints, 2 Weeks Each)

### ✅ Sprint 1: Core UX Polish (Jan 18 - Jan 31) - COMPLETE
**Status:** 100% Delivered
**Theme:** Make the existing features delightful

**Accomplishments:**
- Navbar redesign with dropdowns and mobile responsive
- Universal search (7 categories)
- Landing page path query with graph highlighting
- Evidence Locker design system (7 phases complete)
- 0 TypeScript errors, production-ready

**Agents:** UX Obsessive Designer, Frontend Polish Specialist

---

### 🎯 Sprint 2: Data Provenance & Content Growth (Feb 3 - Feb 14) - CURRENT
**Status:** Planned
**Theme:** Track who created what, grow the graph

**Planned Deliverables:**
- CREATED_BY relationship implementation (Phase 2.1)
- Migration script to backfill provenance for existing data
- Ingest 50+ Roman historical figures
- Entity resolution documentation
- Database health monitoring infrastructure

**Agents:** Data Architect, Research Analyst, Technical Writer, DevOps Engineer

**Key Decisions Needed:**
- CEO approval of sprint plan
- Confirm Roman history content focus
- Formalize 2-week sprint cadence

---

### Sprint 3: Duplicate Detection & Graph Polish (Feb 17 - Feb 28) - TENTATIVE
**Status:** Planned
**Theme:** Surface data quality issues, improve deep exploration UX

**Planned Deliverables:**
- Duplicate detection dashboard (Phase 2.2)
  - API endpoint finding high-similarity figure pairs
  - Review UI for potential duplicates
  - Manual merge action
- Graph exploration enhancements (Phase 3.1)
  - Breadcrumb trail showing exploration path
  - Forward navigation (after using back button)
  - Keyboard shortcuts (B=back, R=reset, Esc=collapse)

**Agents:** Data Architect, Frontend Polish Specialist, DevOps Engineer

**Dependencies:**
- CREATED_BY infrastructure from Sprint 2
- Entity resolution test suite from Sprint 2

---

### Sprint 4: Bulk Data Ingestion & Performance (Mar 3 - Mar 14) - TENTATIVE
**Status:** Conceptual
**Theme:** Scale up content, optimize for growth

**Planned Deliverables:**
- Batch import tooling for curated JSON files
- Scheduled Wikidata sync for canonical records
- Database indexing audit and optimization
- Query performance testing (target: <500ms for graph queries)
- 200+ additional figures ingested (cumulative: 700+)

**Agents:** Data Architect, Research Analyst, DevOps Engineer

**Dependencies:**
- Duplicate detection from Sprint 3
- Health monitoring from Sprint 2

---

### Sprint 5: Multi-User Contribution Prep (Mar 17 - Mar 28) - TENTATIVE
**Status:** Conceptual
**Theme:** Prepare for community contributions

**Planned Deliverables:**
- Edit history tracking UI
- Attribution display on contributions
- Review queue for community edits (optional)
- Contribution guidelines and code of conduct
- Beta user onboarding flow

**Agents:** Data Architect, Frontend Polish Specialist, Technical Writer, Growth Director

**Dependencies:**
- CREATED_BY infrastructure stable and tested
- Documentation complete and validated

---

### Sprint 6: Beta Launch Preparation (Mar 31 - Apr 11) - TENTATIVE
**Status:** Conceptual
**Theme:** Public beta launch

**Planned Deliverables:**
- Launch page and marketing materials
- Social media campaign
- Analytics and monitoring infrastructure
- Bug bash and final polish
- Beta user feedback collection system

**Agents:** Chief Marketing Officer, Growth Director, DevOps Engineer, Technical Writer

**Dependencies:**
- All core features stable
- Documentation complete
- Content at critical mass (500-700+ figures)

---

## Q1 Milestones

| Milestone | Target Date | Status | Impact |
|-----------|-------------|--------|--------|
| Phase 1 Complete | Jan 31 | ✅ Done | Production-ready UX |
| Design System Shipped | Jan 31 | ✅ Done | Cohesive visual identity |
| Provenance Tracking Live | Feb 14 | 🎯 Planned | Data quality foundation |
| 500+ Figures in DB | Mar 14 | 🔮 Forecast | Critical mass for network effects |
| Duplicate Detection | Feb 28 | 🔮 Forecast | Data quality assurance |
| Beta Launch Ready | Mar 31 | 🔮 Forecast | Public-facing platform |

---

## Agent Workload by Sprint

### UX Obsessive Designer
- Sprint 1: Heavy (design system lead)
- Sprint 2: Light (documentation review)
- Sprint 3: Medium (graph polish UI)
- Sprint 4: Light (maintenance)
- Sprint 5: Medium (contribution UI)
- Sprint 6: Light (launch materials review)

**Total Q1 Allocation:** ~40% (heavily front-loaded)

### Frontend Polish Specialist
- Sprint 1: Heavy (implementation lead)
- Sprint 2: Light (support for APIs)
- Sprint 3: Heavy (duplicate detection UI + graph polish)
- Sprint 4: Medium (performance optimization)
- Sprint 5: Heavy (multi-user features)
- Sprint 6: Medium (bug fixes, polish)

**Total Q1 Allocation:** ~60% (steady throughout)

### Data Architect
- Sprint 1: None
- Sprint 2: Heavy (provenance implementation lead)
- Sprint 3: Heavy (duplicate detection backend)
- Sprint 4: Heavy (batch import + performance)
- Sprint 5: Heavy (multi-user backend)
- Sprint 6: Medium (monitoring, stability)

**Total Q1 Allocation:** ~70% (heavily back-loaded)

### Research Analyst
- Sprint 1: None
- Sprint 2: Heavy (content ingestion lead)
- Sprint 3: Light (validate duplicate detection)
- Sprint 4: Heavy (bulk ingestion)
- Sprint 5: Light (contribution testing)
- Sprint 6: None

**Total Q1 Allocation:** ~40% (burst work in Sprints 2 & 4)

### Technical Writer
- Sprint 1: Light (Phase 1 documentation)
- Sprint 2: Medium (entity resolution guide)
- Sprint 3: Light (duplicate detection docs)
- Sprint 4: Medium (batch import guide)
- Sprint 5: Heavy (contribution guidelines + CoC)
- Sprint 6: Heavy (launch materials, onboarding)

**Total Q1 Allocation:** ~50% (steadily increasing)

### DevOps Engineer
- Sprint 1: None
- Sprint 2: Medium (health checks, testing)
- Sprint 3: Medium (duplicate detection monitoring)
- Sprint 4: Heavy (performance testing, indexing)
- Sprint 5: Light (review queue infrastructure)
- Sprint 6: Heavy (analytics, monitoring, launch prep)

**Total Q1 Allocation:** ~50% (back-loaded)

### Growth Director
- Sprint 1-4: Light (strategic planning, feedback collection)
- Sprint 5: Heavy (beta user flow design)
- Sprint 6: Heavy (launch strategy)

**Total Q1 Allocation:** ~25% (concentrated at end)

### Chief Marketing Officer
- Sprint 1-4: Light (brand development)
- Sprint 5: Medium (contribution guidelines voice/tone)
- Sprint 6: Heavy (launch campaign lead)

**Total Q1 Allocation:** ~20% (concentrated at end)

---

## Cross-Quarter Dependencies

**Q1 → Q2 Handoffs:**
- Public beta launched → user feedback loop established
- Multi-user infrastructure → scale community contributions
- 500-700 figures → network effects visible
- All protocols documented → onboard external contributors

**Risks Carrying to Q2:**
- If beta launch slips, Q2 growth plans delayed
- If data quality issues emerge, Q2 ingestion slowed
- If performance doesn't scale, Q2 user experience degraded

---

## Success Criteria (End of Q1)

### Must Achieve (Launch Blockers)
- [ ] 500+ historical figures with quality metadata
- [ ] CREATED_BY provenance on all nodes
- [ ] Duplicate detection preventing bad data
- [ ] All core features (search, graph, contribute) stable
- [ ] Documentation complete for contributors

### Should Achieve (Launch Enablers)
- [ ] 700+ historical figures
- [ ] Batch import tooling working
- [ ] Edit history tracking implemented
- [ ] Beta user onboarding flow tested

### Nice to Have (Launch Enhancements)
- [ ] Graph exploration keyboard shortcuts
- [ ] Automated Wikidata sync
- [ ] Review queue for community edits
- [ ] Advanced analytics dashboard

---

## Quarterly Themes by Agent

**UX Obsessive Designer:** "Design System & Consistency"
- Establish visual language
- Ensure all features feel cohesive
- Design for contributor delight

**Frontend Polish Specialist:** "Feature Implementation & Polish"
- Ship all planned features on time
- Maintain TypeScript quality
- Performance optimization

**Data Architect:** "Data Quality & Scale"
- Provenance tracking infrastructure
- Performance at 500-700+ entities
- Multi-user contribution backend

**Research Analyst:** "Content Growth"
- Double database size (231 → 500+)
- Focus on interconnected figures
- Validate entity resolution

**Technical Writer:** "Knowledge Capture"
- Document all protocols
- Contributor guides
- Launch materials

**DevOps Engineer:** "Reliability & Monitoring"
- Test infrastructure
- Performance testing
- Launch monitoring

**Growth Director:** "Launch Strategy"
- Beta user acquisition plan
- Feedback collection
- Feature prioritization

**Chief Marketing Officer:** "Brand & Positioning"
- Launch campaign
- Content marketing
- Community building

---

## Adjustments from Original Roadmap

**What Changed:**
1. Design system work was unplanned but high-value (Sprint 1)
2. Content growth moved up in priority (Sprint 2 instead of Sprint 4)
3. Multi-user features simplified (focus on provenance first)

**Why:**
- Evidence Locker design system critical for brand identity
- Need content sooner to demonstrate value
- Full review queue may be overkill for beta launch

**Impact:**
- Sprint 6 might slip to early Q2 (acceptable)
- Launch date more realistic (late Q1 → early Q2)
- Quality bar higher (good trade-off)

---

## Quarter-End Review Questions

**For Sprint Retrospective (March 31):**
1. Did we achieve critical mass (500+ figures)?
2. Is data quality infrastructure working (CREATED_BY, duplicate detection)?
3. Are we ready for public beta launch?
4. What worked well in agent coordination?
5. What should we change for Q2?
6. Which agents were over/under-utilized?

**Prepare for Q2 Planning:**
- User acquisition strategy
- Content vertical expansion (beyond Roman history)
- Community contribution scaling
- Performance optimization for 1000+ entities
- Revenue model exploration (if applicable)

---

**Status:** 🟢 On Track (1/6 sprints complete, 0 blockers)
**Next Review:** February 14, 2026 (Sprint 2 Retrospective)
**CEO Approval Required:** Sprint 2 plan (by February 3, 2026)
