#!/usr/bin/env python3
"""
Fictotum Linear Ticket Grooming Script - PRD Alignment
=======================================================

Executes bulk ticket grooming operations against the Linear GraphQL API
to align existing tickets with the new PRD.

Operations:
  1. Close completed tickets as DONE
  2. Cancel irrelevant/misplaced tickets
  3. Update priorities on existing tickets
  4. Create new tickets for PRD gaps

Usage:
  python3 scripts/linear/groom_linear_prd.py
  python3 scripts/linear/groom_linear_prd.py --dry-run
  python3 scripts/linear/groom_linear_prd.py --skip-create   # skip new ticket creation
"""

import json
import os
import ssl
import sys
import time
import argparse
import urllib.request
import urllib.error

# ──────────────────────────────────────────────────────────────
# SSL Setup (macOS Python often lacks system certificates)
# ──────────────────────────────────────────────────────────────

try:
    import certifi
    SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CONTEXT = ssl.create_default_context()

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────

API_URL = "https://api.linear.app/graphql"
API_KEY = os.getenv("LINEAR_API_KEY")
TEAM_ID = "37ed983e-84aa-4245-9894-443835075e7e"

if not API_KEY:
    print("Error: LINEAR_API_KEY environment variable is required")
    sys.exit(1)

# Workflow State IDs
STATE_BACKLOG = "0a7b1039-da13-48b6-a23e-233ac51e025b"
STATE_TODO = "8f55b50e-9747-4aa8-a0d8-e3d53250001b"
STATE_IN_PROGRESS = "ad1265b7-3ed6-4234-901f-744de3381089"
STATE_DONE = "1c77823f-8763-43ff-903b-0cdfb580823b"
STATE_CANCELED = "17072183-a1a0-49eb-bdae-04e211be24be"

# Label IDs
LABEL_FEATURE = "db921d73-a9e2-460e-be2d-dfb0d415b135"
LABEL_BUG = "8fa3cdae-c5c3-4cb5-ac04-818ac7d8f7cf"
LABEL_IMPROVEMENT = "2e883afa-af48-4aca-ab6a-3d731e1fb5d0"

# Priority values in Linear: 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
PRIORITY_URGENT = 1
PRIORITY_HIGH = 2
PRIORITY_MEDIUM = 3
PRIORITY_LOW = 4

# ──────────────────────────────────────────────────────────────
# GraphQL Client
# ──────────────────────────────────────────────────────────────

def graphql_request(query, variables=None):
    """Execute a GraphQL request against the Linear API."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": API_KEY,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30, context=SSL_CONTEXT) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else "No response body"
        print(f"  [ERROR] HTTP {e.code}: {error_body}")
        return None
    except urllib.error.URLError as e:
        print(f"  [ERROR] Network error: {e.reason}")
        return None

    if "errors" in body:
        for err in body["errors"]:
            print(f"  [ERROR] GraphQL: {err.get('message', err)}")
        return None

    return body.get("data")


def rate_limit_pause():
    """Brief pause to respect Linear API rate limits (1,500 req/hour)."""
    time.sleep(0.25)


# ──────────────────────────────────────────────────────────────
# Issue Lookup - resolve FIC-XX identifiers to Linear issue IDs
# ──────────────────────────────────────────────────────────────

ISSUE_ID_CACHE = {}


def lookup_issue_id(identifier):
    """
    Look up the Linear internal UUID for a given issue identifier like 'FIC-97'.
    Uses the issues filter API since Linear doesn't expose team.issue(number:).
    Caches results to avoid repeated lookups.
    """
    if identifier in ISSUE_ID_CACHE:
        return ISSUE_ID_CACHE[identifier]

    # Extract the number from the identifier (e.g., "FIC-97" -> 97)
    number = int(identifier.split("-")[1])

    query = """
    query IssueByNumber($filter: IssueFilter) {
        issues(filter: $filter, first: 1) {
            nodes {
                id
                identifier
                title
                state { name }
                priority
            }
        }
    }
    """

    variables = {
        "filter": {
            "team": {"id": {"eq": TEAM_ID}},
            "number": {"eq": number},
        }
    }

    data = graphql_request(query, variables)
    if not data or not data.get("issues") or not data["issues"].get("nodes"):
        print(f"  [WARN] Could not find issue {identifier}")
        return None

    nodes = data["issues"]["nodes"]
    if len(nodes) == 0:
        print(f"  [WARN] No issue found for {identifier}")
        return None

    issue = nodes[0]
    issue_id = issue["id"]
    ISSUE_ID_CACHE[identifier] = issue_id
    rate_limit_pause()
    return issue_id


# ──────────────────────────────────────────────────────────────
# Mutations
# ──────────────────────────────────────────────────────────────

UPDATE_ISSUE_MUTATION = """
mutation IssueUpdate($issueId: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $issueId, input: $input) {
        success
        issue {
            id
            identifier
            title
            state { name }
            priority
        }
    }
}
"""

CREATE_ISSUE_MUTATION = """
mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
        success
        issue {
            id
            identifier
            title
            state { name }
            priority
        }
    }
}
"""


def update_issue(issue_id, updates):
    """Update an existing issue."""
    data = graphql_request(UPDATE_ISSUE_MUTATION, {
        "issueId": issue_id,
        "input": updates,
    })
    if data and data.get("issueUpdate", {}).get("success"):
        return data["issueUpdate"]["issue"]
    return None


def create_issue(input_data):
    """Create a new issue."""
    data = graphql_request(CREATE_ISSUE_MUTATION, {"input": input_data})
    if data and data.get("issueCreate", {}).get("success"):
        return data["issueCreate"]["issue"]
    return None


# ──────────────────────────────────────────────────────────────
# Operation Definitions
# ──────────────────────────────────────────────────────────────

# 1. Close as DONE (from Backlog)
CLOSE_AS_DONE_BACKLOG = [
    ("FIC-97", "Migrate figure illustrations to next/image for performance",
     "Proven by commit 1539ea0"),
    ("FIC-87", "Big Bet 5 - Show-Don't-Tell Onboarding Flow",
     "Welcome page exists at /welcome with Caesar sticker"),
    ("FIC-86", "Big Bet 4 - Browse-First Discovery Homepage",
     "Homepage is browse-first with search, eras, featured figures"),
    ("FIC-85", "Big Bet 3 - Figure Dossier Redesign",
     "Single-column dossier with AI portrait, portrayal cards, connected figures"),
    ("FIC-84", "Big Bet 2 - AI House-Style Image Generation Pipeline",
     "Gemini pipeline in scripts/image-gen/, Vercel Blob storage, 958+ illustrations"),
    ("FIC-83", "Big Bet 1 - Entity Card Components",
     "FigureCard, WorkCard, PortrayalCard all exist and are used"),
    ("FIC-74", "Creator Page Infrastructure",
     "/creator/[name] route exists with CreatorWorksView component"),
    ("FIC-65", "Reputation Volatility Index",
     "ReputationVolatilityIndex component exists, /api/figures/volatility endpoint"),
    ("FIC-64", "Cultural Impact Score",
     "CulturalImpactScore component exists"),
    ("FIC-25", "Add related figures section to figure profile pages",
     "/api/figures/[id]/connected endpoint exists, ConnectedFigures component"),
]

# 2. Close as DONE (from In Progress / In Review)
CLOSE_AS_DONE_IN_PROGRESS = [
    ("FIC-22", "Fix graph readability: overlapping labels and poor layout",
     "Graph explorer completely rebuilt with bloom expansion, node type design system"),
    ("FIC-12", "Enhance sentiment selection with hybrid tag system",
     "SentimentTagSelector component exists, sentiment_tags migration completed"),
]

# 3. Cancel (no longer relevant)
CANCEL_TICKETS = [
    ("FIC-98", "Check Stripe payments and signed agreements",
     "Not a Fictotum ticket - belongs to a different project"),
    ("FIC-95", "Roster Page Redesign: Enhanced Admin Attendee Management",
     "Not a Fictotum ticket - wrong project"),
    ("FIC-94", "Redesign trip prep checklist for info page",
     "Not a Fictotum ticket - wrong project"),
    ("FIC-82", "[Documentation] Profile page differentiation design guide",
     "Superseded by the dossier redesign which is already done (FIC-85)"),
    ("FIC-9", "Remove find historical paths section from landing page",
     "Stale - pathfinder was re-added later as a feature"),
]

# 4. Priority updates
PRIORITY_UPDATES = [
    ("FIC-89", "Clean up period labels and add creation guardrails",
     PRIORITY_HIGH, "Maps to PRD 7.1 Data Quality Hardening - P0"),
    ("FIC-88", "Historical accuracy guardrails for AI image generation",
     PRIORITY_LOW, "Nice-to-have, not in PRD critical path"),
    ("FIC-81", "Create series detail page route",
     PRIORITY_HIGH, "Maps to PRD 7.2 Media Work Detail Pages"),
    ("FIC-55", "End-to-end contribution workflow tests",
     PRIORITY_HIGH, "PRD identifies no automated tests as tech debt"),
    ("FIC-54", "Entity resolution test suite",
     PRIORITY_HIGH, "PRD identifies no automated tests as tech debt"),
    ("FIC-41", "Scheduled Wikidata sync",
     PRIORITY_MEDIUM, "PRD 7.5 Content Growth Engine"),
    ("FIC-50", "Figure comparison tool",
     PRIORITY_MEDIUM, "Maps to PRD 7.4 Comparative Analysis Tools - P0"),
    ("FIC-56", "Evaluate GraphQL API",
     PRIORITY_LOW, "PRD 7.6 Public API, longer-term"),
]

# 5. New tickets to create
NEW_TICKETS = [
    {
        "title": "Normalize media_type values to canonical controlled vocabulary",
        "description": (
            "## Context\n"
            "PRD 7.1 - Data Quality Hardening\n\n"
            "## Problem\n"
            "Standardize all `media_type` values across 1,215 MediaWork nodes. "
            "Current state has case inconsistencies (\"Film\" vs \"film\") and "
            "synonym variations (\"Book\" vs \"novel\" vs \"literary work\"). "
            "7 nodes have null `media_type`.\n\n"
            "## Acceptance Criteria\n"
            "- [ ] Define canonical set: Film, Book, TV Series, Video Game, "
            "Documentary, Play, Musical, Podcast, Comic\n"
            "- [ ] Create migration script with dry-run mode\n"
            "- [ ] Backfill 7 null `media_type` values\n"
            "- [ ] Add validation to ingestion pipeline to enforce canonical values\n"
            "- [ ] Document canonical vocabulary in CLAUDE.md"
        ),
        "priority": PRIORITY_URGENT,
        "labelIds": [LABEL_IMPROVEMENT],
        "stateId": STATE_TODO,
    },
    {
        "title": "Normalize sentiment values to controlled vocabulary",
        "description": (
            "## Context\n"
            "PRD 7.1 - Data Quality Hardening\n\n"
            "## Problem\n"
            "Standardize all `sentiment` values on APPEARS_IN relationships. "
            "Current state: \"Complex\" vs \"complex\", \"Heroic\" vs \"heroic\". "
            "119 null sentiment values (9% of portrayals) need backfill.\n\n"
            "## Acceptance Criteria\n"
            "- [ ] Audit current sentiment value distribution\n"
            "- [ ] Define canonical sentiment vocabulary with consistent casing\n"
            "- [ ] Create migration script with dry-run mode\n"
            "- [ ] Backfill 119 null sentiment values\n"
            "- [ ] Add validation to contribution workflow\n"
            "- [ ] Update SentimentTagSelector to use canonical values"
        ),
        "priority": PRIORITY_URGENT,
        "labelIds": [LABEL_IMPROVEMENT],
        "stateId": STATE_TODO,
    },
    {
        "title": "Complete canonical ID migration for 116 legacy figures",
        "description": (
            "## Context\n"
            "PRD 7.1 - Data Quality Hardening\n\n"
            "## Problem\n"
            "116 figures (12%) still use non-prefixed slug IDs instead of "
            "Wikidata Q-IDs or PROV: format.\n\n"
            "## Implementation\n"
            "Script exists at `scripts/migration/prefix_provisional_canonical_ids.py`.\n\n"
            "## Acceptance Criteria\n"
            "- [ ] Run migration in dry-run mode and review output\n"
            "- [ ] Execute migration after review\n"
            "- [ ] Verify 100% of figures have either Q-ID or PROV: prefix\n"
            "- [ ] Update health check to flag non-canonical IDs"
        ),
        "priority": PRIORITY_HIGH,
        "labelIds": [LABEL_IMPROVEMENT],
        "stateId": STATE_TODO,
    },
    {
        "title": "Build media work detail page (/media/[id])",
        "description": (
            "## Context\n"
            "PRD 7.2 - Media Work Detail Pages\n\n"
            "## Requirements\n"
            "Create dedicated detail pages for media works.\n\n"
            "## Must Include\n"
            "- [ ] Work metadata (title, year, media type, creator, description)\n"
            "- [ ] \"Who's in this?\" section showing all historical figures that "
            "APPEARS_IN this work with sentiment\n"
            "- [ ] Historical accuracy section surfacing `historical_inaccuracies` property\n"
            "- [ ] Related works (same series, same era, shared figures)\n"
            "- [ ] Scholarly sources\n"
            "- [ ] Responsive design consistent with figure dossier pages\n\n"
            "## Technical Notes\n"
            "- Route: `/media/[id]/page.tsx`\n"
            "- API endpoint: `/api/media/[id]`\n"
            "- Reuse existing WorkCard component for related works section"
        ),
        "priority": PRIORITY_HIGH,
        "labelIds": [LABEL_FEATURE],
        "stateId": STATE_TODO,
    },
    {
        "title": "User authentication and watched/read tracking",
        "description": (
            "## Context\n"
            "PRD 7.3 - User Accounts & Collections\n\n"
            "## Requirements\n"
            "Implement user-facing authentication and personal media tracking.\n\n"
            "## Acceptance Criteria\n"
            "- [ ] NextAuth OAuth integration (Google, GitHub providers)\n"
            "- [ ] \"Watched/Read\" toggle on MediaWork pages\n"
            "- [ ] Personal lists/collections CRUD\n"
            "- [ ] User profile page showing activity\n"
            "- [ ] User data stored in Neo4j (User node, HAS_WATCHED/HAS_READ relationships)\n\n"
            "## Technical Notes\n"
            "- NextAuth is already partially configured but not user-facing\n"
            "- Consider Prisma adapter or custom Neo4j adapter for session storage"
        ),
        "priority": PRIORITY_MEDIUM,
        "labelIds": [LABEL_FEATURE],
        "stateId": STATE_BACKLOG,
    },
    {
        "title": "Side-by-side portrayal comparison tool",
        "description": (
            "## Context\n"
            "PRD 7.4 - Comparative Analysis Tools\n\n"
            "## Requirements\n"
            "Pick 2-3 portrayals of the same figure and compare sentiment, accuracy, "
            "and characterization side-by-side. This is a core differentiator per the PRD.\n\n"
            "## Acceptance Criteria\n"
            "- [ ] Portrayal picker UI (select 2-3 portrayals of the same figure)\n"
            "- [ ] Side-by-side comparison view with sentiment, accuracy, characterization\n"
            "- [ ] Visual diff highlighting (sentiment polarity chart, accuracy radar)\n"
            "- [ ] Shareable comparison URL\n"
            "- [ ] Mobile-responsive layout\n\n"
            "## Notes\n"
            "Supersedes/replaces FIC-50 (Figure comparison tool). "
            "FIC-50 should be updated to reference this ticket."
        ),
        "priority": PRIORITY_MEDIUM,
        "labelIds": [LABEL_FEATURE],
        "stateId": STATE_BACKLOG,
    },
    {
        "title": "Automated test suite for web application",
        "description": (
            "## Context\n"
            "PRD Success Metrics - Tech Debt Reduction\n\n"
            "## Problem\n"
            "The PRD identifies no automated tests as critical tech debt. "
            "The codebase has zero test coverage.\n\n"
            "## Acceptance Criteria\n"
            "- [ ] Set up Jest + React Testing Library\n"
            "- [ ] Unit tests for critical lib functions:\n"
            "  - Entity resolution (`lib/wikidata.ts`)\n"
            "  - Enhanced name matching (`enhancedNameSimilarity`)\n"
            "  - Sentiment parsing\n"
            "- [ ] Integration tests for key API endpoints:\n"
            "  - `/api/figures/[id]`\n"
            "  - `/api/search`\n"
            "  - `/api/figures/[id]/connected`\n"
            "- [ ] CI pipeline integration (GitHub Actions)\n"
            "- [ ] Minimum 60% coverage on `lib/` directory\n\n"
            "## Technical Notes\n"
            "- Sentiment parser test file already exists as starting point\n"
            "- Vitest may be preferable given Next.js + TypeScript stack"
        ),
        "priority": PRIORITY_HIGH,
        "labelIds": [LABEL_FEATURE],
        "stateId": STATE_TODO,
    },
]


# ──────────────────────────────────────────────────────────────
# Execution
# ──────────────────────────────────────────────────────────────

PRIORITY_NAMES = {0: "None", 1: "Urgent", 2: "High", 3: "Medium", 4: "Low"}


def run_close_as_done(tickets, section_name, dry_run):
    """Close tickets by setting their state to DONE."""
    print(f"\n{'='*60}")
    print(f"  CLOSE AS DONE - {section_name}")
    print(f"{'='*60}")

    success_count = 0
    fail_count = 0

    for identifier, title, reason in tickets:
        print(f"\n  {identifier}: {title}")
        print(f"    Reason: {reason}")

        if dry_run:
            print(f"    [DRY RUN] Would set state -> Done")
            success_count += 1
            continue

        issue_id = lookup_issue_id(identifier)
        if not issue_id:
            print(f"    [SKIP] Could not resolve issue ID")
            fail_count += 1
            continue

        result = update_issue(issue_id, {"stateId": STATE_DONE})
        rate_limit_pause()

        if result:
            print(f"    [OK] -> Done (state: {result['state']['name']})")
            success_count += 1
        else:
            print(f"    [FAIL] Could not update issue")
            fail_count += 1

    return success_count, fail_count


def run_cancel(tickets, dry_run):
    """Cancel tickets by setting their state to Canceled."""
    print(f"\n{'='*60}")
    print(f"  CANCEL - No Longer Relevant")
    print(f"{'='*60}")

    success_count = 0
    fail_count = 0

    for identifier, title, reason in tickets:
        print(f"\n  {identifier}: {title}")
        print(f"    Reason: {reason}")

        if dry_run:
            print(f"    [DRY RUN] Would set state -> Canceled")
            success_count += 1
            continue

        issue_id = lookup_issue_id(identifier)
        if not issue_id:
            print(f"    [SKIP] Could not resolve issue ID")
            fail_count += 1
            continue

        result = update_issue(issue_id, {"stateId": STATE_CANCELED})
        rate_limit_pause()

        if result:
            print(f"    [OK] -> Canceled (state: {result['state']['name']})")
            success_count += 1
        else:
            print(f"    [FAIL] Could not update issue")
            fail_count += 1

    return success_count, fail_count


def run_priority_updates(tickets, dry_run):
    """Update priority on existing tickets."""
    print(f"\n{'='*60}")
    print(f"  UPDATE PRIORITIES - PRD Alignment")
    print(f"{'='*60}")

    success_count = 0
    fail_count = 0

    for identifier, title, new_priority, reason in tickets:
        priority_name = PRIORITY_NAMES.get(new_priority, str(new_priority))
        print(f"\n  {identifier}: {title}")
        print(f"    New priority: {priority_name}")
        print(f"    Reason: {reason}")

        if dry_run:
            print(f"    [DRY RUN] Would set priority -> {priority_name}")
            success_count += 1
            continue

        issue_id = lookup_issue_id(identifier)
        if not issue_id:
            print(f"    [SKIP] Could not resolve issue ID")
            fail_count += 1
            continue

        result = update_issue(issue_id, {"priority": new_priority})
        rate_limit_pause()

        if result:
            actual_priority = PRIORITY_NAMES.get(result["priority"], str(result["priority"]))
            print(f"    [OK] Priority -> {actual_priority}")
            success_count += 1
        else:
            print(f"    [FAIL] Could not update issue")
            fail_count += 1

    return success_count, fail_count


def run_create_new(tickets, dry_run):
    """Create new tickets for PRD gaps."""
    print(f"\n{'='*60}")
    print(f"  CREATE NEW TICKETS - PRD Gap Coverage")
    print(f"{'='*60}")

    success_count = 0
    fail_count = 0

    for ticket in tickets:
        priority_name = PRIORITY_NAMES.get(ticket["priority"], str(ticket["priority"]))
        print(f"\n  NEW: {ticket['title']}")
        print(f"    Priority: {priority_name}")

        if dry_run:
            print(f"    [DRY RUN] Would create ticket")
            success_count += 1
            continue

        input_data = {
            "teamId": TEAM_ID,
            "title": ticket["title"],
            "description": ticket["description"],
            "priority": ticket["priority"],
            "labelIds": ticket.get("labelIds", []),
            "stateId": ticket.get("stateId", STATE_BACKLOG),
        }

        result = create_issue(input_data)
        rate_limit_pause()

        if result:
            print(f"    [OK] Created {result['identifier']}: {result['title']}")
            success_count += 1
        else:
            print(f"    [FAIL] Could not create issue")
            fail_count += 1

    return success_count, fail_count


def main():
    parser = argparse.ArgumentParser(
        description="Groom Fictotum Linear tickets to align with PRD"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview all changes without executing them",
    )
    parser.add_argument(
        "--skip-create",
        action="store_true",
        help="Skip new ticket creation (use if tickets were already created)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  Fictotum Linear Ticket Grooming - PRD Alignment")
    print("=" * 60)

    if args.dry_run:
        print("\n  *** DRY RUN MODE - No changes will be made ***\n")
    else:
        print("\n  *** LIVE MODE - Changes will be applied ***\n")
        print("  Press Ctrl+C within 5 seconds to abort...")
        try:
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n  Aborted.")
            sys.exit(0)

    # Verify API connectivity first
    print("  Verifying API connectivity...")
    test_query = '{ viewer { id name } }'
    test_data = graphql_request(test_query)
    if not test_data:
        print("  [FATAL] Cannot connect to Linear API. Aborting.")
        sys.exit(1)
    viewer = test_data.get("viewer", {})
    print(f"  Connected as: {viewer.get('name', 'Unknown')}\n")

    total_success = 0
    total_fail = 0

    # 1. Close completed tickets (from Backlog)
    s, f = run_close_as_done(CLOSE_AS_DONE_BACKLOG, "From Backlog", args.dry_run)
    total_success += s
    total_fail += f

    # 2. Close completed tickets (from In Progress)
    s, f = run_close_as_done(CLOSE_AS_DONE_IN_PROGRESS, "From In Progress", args.dry_run)
    total_success += s
    total_fail += f

    # 3. Cancel irrelevant tickets
    s, f = run_cancel(CANCEL_TICKETS, args.dry_run)
    total_success += s
    total_fail += f

    # 4. Update priorities
    s, f = run_priority_updates(PRIORITY_UPDATES, args.dry_run)
    total_success += s
    total_fail += f

    # 5. Create new tickets (unless --skip-create)
    if args.skip_create:
        print(f"\n{'='*60}")
        print(f"  CREATE NEW TICKETS - SKIPPED (--skip-create)")
        print(f"{'='*60}")
    else:
        s, f = run_create_new(NEW_TICKETS, args.dry_run)
        total_success += s
        total_fail += f

    # Summary
    total_ops = total_success + total_fail
    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Total operations: {total_ops}")
    print(f"  Succeeded:        {total_success}")
    print(f"  Failed:           {total_fail}")
    print(f"  Mode:             {'DRY RUN' if args.dry_run else 'LIVE'}")
    if args.skip_create:
        print(f"  Skipped:          New ticket creation")
    print(f"{'='*60}")

    breakdown_close = len(CLOSE_AS_DONE_BACKLOG) + len(CLOSE_AS_DONE_IN_PROGRESS)
    breakdown_cancel = len(CANCEL_TICKETS)
    breakdown_update = len(PRIORITY_UPDATES)
    breakdown_create = 0 if args.skip_create else len(NEW_TICKETS)
    print(f"\n  Breakdown:")
    print(f"    Close as Done:    {breakdown_close} tickets")
    print(f"    Cancel:           {breakdown_cancel} tickets")
    print(f"    Priority updates: {breakdown_update} tickets")
    print(f"    New tickets:      {breakdown_create} tickets")
    print()

    if total_fail > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
