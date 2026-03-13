# Fictotum — Open & Social

## North Star
Fictotum goes from a password-gated internal tool to a public product that people explore, contribute to, and share.

## Milestones

### M1: Open the Gates — Complete
- **Why it matters**: The product is feature-rich and visually compelling, but locked behind a password with no explanation of what it is. Nobody can find it, share it, or link to it. This is the prerequisite for everything else.
- **Acceptance criteria**:
  - [x] Public landing/about experience — a new visitor understands what Fictotum is in 5 seconds and wants to explore (FIC-43)
  - [x] Password gate removed (SITE_PASSWORD env var unset or middleware bypassed) — browsing is fully open
  - [x] Open Graph meta tags on figure, media, creator, and series pages — shared links show illustration + title + stats on social/Slack/iMessage
  - [x] Privacy-first analytics wired up — page views, search queries, popular figures, referral sources (FIC-44)
  - [x] Sentry error monitoring verified working for public traffic (already wired, just confirm)
- [x] Post-build review passed (CRITICAL: 0, HIGH: 0, MEDIUM: 0)
- **Tickets**: FIC-43, FIC-44
- **Key files**: `web-app/middleware.ts`, `web-app/app/page.tsx` (homepage), `web-app/app/layout.tsx`, all `[id]/page.tsx` routes (metadata), new about/landing component

### M2: User Identity + Collections — Complete
- **Why it matters**: Users who love the product have no way to save their explorations or track their contributions. OAuth social login gives them an identity; collections give them a reason to come back.
- **Acceptance criteria**:
  - [x] OAuth social login (Google + GitHub) via NextAuth.js or Auth.js — sign up only if you want to; browsing is free
  - [x] User profile page showing contribution history (figures added, portrayals submitted, works created)
  - [x] Contribution attribution — contributed entities display the contributor's name/avatar
  - [x] User collections / curated paths — save sets of connected figures/works as named, shareable explorations (FIC-116)
  - [x] Collection detail page with a mini-graph of the collected entities
  - [x] Share collection via permalink (OG tags for social sharing)
- [x] Post-build review passed (CRITICAL: 0, HIGH: 0, MEDIUM: 0)
- **Tickets**: FIC-103, FIC-116
- **Key files**: `web-app/app/api/auth/`, `web-app/lib/auth.ts` (new), `web-app/app/profile/` (new), `web-app/app/collection/` (new), contribution API routes
- **Dependencies**: M1 (site must be public before user sign-up makes sense)

### M3: The Collection Experience — Complete
- **Why it matters**: Series pages exist and have good data (appearance matrix, character roster, stats). But they're not *compelling*. This milestone makes series pages into destination pages that franchise fans want to explore and share — the kind of page someone sends to their book club or posts in a subreddit.
- **Acceptance criteria**:
  - [x] Series detail page visual redesign — illustrations integrated, stronger visual hierarchy, feels like a franchise retrospective
  - [x] Franchise timeline: show the series' works on a mini-timeline with the historical figures they portray, making the temporal span visible
  - [x] Portrayal highlights — standout or surprising historical figure appearances surfaced (e.g., "Did you know Assassin's Creed features Leonardo da Vinci?")
  - [x] Open Graph tags on series pages (illustration + title + stats)
  - [x] Series browse page (`/series`) enhanced with illustrations and richer cards
  - [x] At least 3 well-populated series in the DB to showcase (e.g., Assassin's Creed, Civilization, Wolf Hall trilogy) — ingest data if needed
- [x] Post-build review passed (CRITICAL: 0, HIGH: 0, MEDIUM: 0)
- **Tickets**: (carried from portraits-and-fiction M3)
- **Key files**: `web-app/app/series/[seriesId]/page.tsx`, `web-app/app/series/page.tsx`, `web-app/lib/db.ts`
- **Dependencies**: M1 (OG tags pattern established), benefits from M2 (users can save series to collections)

### M4: Content Density Push — Not Started
- **Why it matters**: 2,621 entities is credible but thin in some of the most popular historical fiction eras. Ancient Egypt and Tudor England are massive in the genre but underrepresented in the graph. Filling these gaps makes the product feel authoritative.
- **Acceptance criteria**:
  - [ ] Ancient Egypt & Near East cluster ingested — 40+ figures (FIC-36)
  - [ ] Tudor & Stuart England cluster ingested — 30+ figures (FIC-38)
  - [ ] Illustrations generated for all new figures
  - [ ] Alternate names populated from Wikidata aliases across existing figures (FIC-24 UI ready, needs data)
  - [ ] Total entity count reaches 3,000+
  - [ ] Zero orphan figures maintained
- **Tickets**: FIC-36, FIC-38, FIC-24
- **Key files**: `scripts/import/batch_import.py`, `scripts/image-gen/generate-images.ts`, `data/`
- **Dependencies**: None (can run in parallel with M2/M3 via nightshift)

## Deferred (explicitly not this roadmap)
- **Location data + map (FIC-132/133)** — enriches but isn't what gets Fictotum shared
- **Side-by-side portrayal comparison (FIC-104)** — niche feature, not a destination page
- **Email digest (FIC-114)** — no subscriber base yet
- **GraphQL API (FIC-56)** — premature optimization
- **Narrative timeline summaries (FIC-119)** — good but lower priority than user identity
- **AI Portrayal Researcher (FIC-111)** — overlaps with discovery agent
- **Neo4j Aura upgrade** — monitor after opening; free tier may suffice with keepalive cron
- **Theme clustering (FIC-115)** — interesting but M3 series work addresses the same "group things" need
- **Connection quality scoring (FIC-120)** — polish for discovery agent, not a standalone outcome

## Dependencies
- M1 is fully independent — can start immediately
- M2 depends on M1 (public site before user sign-up)
- M3 depends on M1 (OG tag patterns), benefits from M2 (collections)
- M4 is independent — can run in parallel via nightshift batches

## Risks
- **OAuth provider setup** — Google OAuth requires console config, callback URLs, consent screen. GitHub is simpler. Budget time for provider setup in M2.
- **Neo4j Aura free tier under public traffic** — auto-pause after 3 days inactivity, plus connection limits. If traffic is sustained, may need to upgrade or implement aggressive caching.
- **User-generated content moderation** — once contributions are open, need at least basic review. Start with admin approval queue.
- **NextAuth.js / Auth.js migration complexity** — if the existing password gate middleware conflicts with OAuth session handling, may need careful refactoring of middleware.ts.
