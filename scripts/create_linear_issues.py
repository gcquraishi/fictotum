#!/usr/bin/env python3
"""
Create Linear issues for profile page differentiation features.
"""

import os
import json
import requests
from typing import Dict, List

LINEAR_API_KEY = os.environ.get("LINEAR_API_KEY", "")
LINEAR_TEAM_ID = os.environ.get("LINEAR_TEAM_ID", "")
LINEAR_API_URL = "https://api.linear.app/graphql"

ISSUES = [
    {
        "title": "Cultural Impact Score - Calculate from portrayal metrics",
        "description": """## Overview
Implement a Cultural Impact Score that quantifies a historical figure's lasting influence based on how frequently and diversely they're portrayed in media.

## Calculation Formula
- **Portrayal Count**: Total number of appearances across all media
- **Media Diversity**: Number of unique media types (film, TV, book, game, etc.)
- **Temporal Span**: Years between first and most recent portrayal

## Display Requirements
- Prominent score display on figure profile page
- Visual indicator (progress bar, gauge, or badge)
- Breakdown showing contributing factors
- Comparison context (e.g., "Top 5% of figures")

## Technical Implementation
- Create Cypher query aggregating portrayal data
- Implement normalization algorithm for 0-100 score
- Add caching for performance
- Create reusable component for score display

## Acceptance Criteria
- Score calculated accurately from database
- Visual display integrated on figure pages
- Score updates when new portrayals added
- Performance < 100ms for score calculation"""
    },
    {
        "title": "Reputation Volatility Index - Track portrayal consistency",
        "description": """## Overview
Implement a Reputation Volatility Index showing how consistently a historical figure is portrayed across different media vs. controversial/varied interpretations.

## Calculation Method
- Analyze sentiment distribution across all portrayals (heroic/villainous/complex/neutral)
- Calculate variance in character roles (protagonist/antagonist/supporting)
- Factor in conflicting historical narratives (conflicting_information flags)
- Generate 0-10 scale (0 = universal consensus, 10 = highly contested)

## Display Requirements
- Visual volatility meter on figure profile page
- Sentiment distribution chart (pie/bar chart)
- Highlight most controversial portrayals
- Comparison: "More controversial than 75% of figures"

## Technical Implementation
- Create sentiment aggregation Cypher query
- Implement statistical variance calculation
- Build interactive visualization component
- Add tooltips explaining volatility factors

## Acceptance Criteria
- Volatility score calculated from APPEARS_IN sentiments
- Visual chart shows sentiment distribution
- Index updates when new portrayals added
- Clear explanation of what volatility means"""
    },
    {
        "title": "Character Profile Matrix - Compare creator interpretations",
        "description": """## Overview
Create a Character Profile Matrix table showing how different creators interpret the same historical figure across different works.

## Data Structure
Table columns:
- Media Work (title + year)
- Creator/Director
- Interpretation (heroic/villainous/complex/neutral)
- Key Character Traits (tags from portrayal_details)
- Actor/Performer (if known)

## Display Requirements
- Sortable, filterable table on figure profile page
- Group by creator to see patterns
- Highlight conflicting interpretations
- Link to media work detail pages

## Technical Implementation
- Create Cypher query joining HistoricalFigure -> APPEARS_IN -> MediaWork -> CREATED_BY
- Build sortable table component with filters
- Add sentiment tag visualization
- Implement responsive design for mobile

## Acceptance Criteria
- Table displays all portrayals of figure
- Sortable by year, sentiment, creator
- Filterable by media type
- Clickable links to work detail pages
- Performance < 200ms for data fetch"""
    },
    {
        "title": "Portrayal Heatmap - Visualize genre/format by decade",
        "description": """## Overview
Implement a Portrayal Heatmap showing visual grid of media genres/formats by decade, revealing temporal patterns in how figures are depicted.

## Visualization Design
- Y-axis: Media formats (Film, TV, Book, Game, Theater, etc.)
- X-axis: Decades (1900s, 1910s, 1920s, etc.)
- Cell intensity: Number of portrayals in that format/decade
- Color scale: Light (1-2 works) to Dark (10+ works)

## Interactivity
- Hover: Show exact count and work titles
- Click cell: Navigate to filtered media list
- Toggle between absolute counts and normalized view

## Technical Implementation
- Create Cypher query aggregating by format and decade
- Build D3.js or recharts heatmap component
- Implement responsive sizing
- Add color accessibility features

## Acceptance Criteria
- Heatmap displays on figure profile page
- Accurate counts per format/decade combination
- Interactive tooltips with work details
- Responsive design for mobile
- Clear legend explaining color scale"""
    },
    {
        "title": "Cross-Temporal Connections - Historical vs fictional relationships",
        "description": """## Overview
Implement Cross-Temporal Connections section distinguishing between historical relationships (real-life) and fictional relationships (invented for narrative).

## Relationship Categories
1. **Historical Relationships**
   - Family (parent, sibling, spouse)
   - Political (ally, rival, subordinate)
   - Social (friend, mentor, colleague)

2. **Fictional Relationships**
   - Created by media works
   - Tagged with source work
   - Sentiment: heroic/villainous/complex/neutral

## Display Requirements
- Split view: Historical vs Fictional relationships
- Relationship type badges (family, political, social, etc.)
- Source attribution for fictional relationships
- Visual network diagram showing connections

## Technical Implementation
- Create Cypher queries for KNOWS/RELATED_TO relationships
- Distinguish via relationship metadata (source: "historical" vs work_id)
- Build relationship network visualization
- Add filtering by relationship type

## Acceptance Criteria
- Clear separation of historical vs fictional relationships
- Source work links for fictional relationships
- Relationship types displayed with icons
- Network diagram navigable and interactive
- Mobile-responsive design"""
    },
    {
        "title": "Temporal Signature & Time Depth - Distance metrics for works",
        "description": """## Overview
Implement Temporal Signature showing distance between when a work is set vs. when it was released, plus historical span covered by the narrative.

## Metrics to Calculate
1. **Time Depth**: Years between story setting and release date
   - Example: Hamilton (2015) set in 1776 = 239 years depth

2. **Historical Span**: Years covered in narrative
   - Example: The Crown (1947-2005) = 58 years span

3. **Temporal Distance**: Era classification
   - Contemporary (0-20 years)
   - Recent past (20-50 years)
   - Historical (50-100 years)
   - Ancient (100+ years)

## Display Requirements
- Visual timeline showing setting vs release
- Calculated metrics with explanatory text
- Comparison to similar works
- Era classification badge

## Technical Implementation
- Extract setting_year and release_date from MediaWork nodes
- Calculate depth and span metrics
- Build timeline visualization component
- Add classification logic

## Acceptance Criteria
- Metrics displayed on work profile page
- Accurate calculations from database dates
- Timeline visualization clear and intuitive
- Era badges color-coded
- Handles missing date data gracefully"""
    },
    {
        "title": "Historical Accuracy Spectrum - Balance metric for works",
        "description": """## Overview
Implement Historical Accuracy Spectrum showing balance between documented historical figures vs fictional characters in a work.

## Calculation Method
- Count HistoricalFigure nodes connected to work
- Count FictionalCharacter nodes connected to work
- Calculate ratio: Historical / (Historical + Fictional)
- Scale: 0% (all fictional) to 100% (all historical)

## Accuracy Indicators
- High historical fidelity (80-100%)
- Balanced mix (40-60%)
- Fictional-heavy (0-20%)
- Flag works with conflicting_information=true

## Display Requirements
- Visual spectrum slider on work profile page
- Character count breakdown (X historical, Y fictional)
- List of anachronism flags from database
- Comparison to similar works

## Technical Implementation
- Create Cypher query counting character types
- Implement ratio calculation
- Build spectrum visualization component
- Query conflicting_information flags

## Acceptance Criteria
- Spectrum accurately reflects character ratio
- Anachronisms displayed if present
- Visual indicator clear and intuitive
- Updates when characters added/removed
- Handles edge cases (no characters, all fictional)"""
    },
    {
        "title": "Temporal Narrative Arc - Timeline of events vs lifespans",
        "description": """## Overview
Implement Temporal Narrative Arc timeline showing when story events occur vs. when historical figures actually lived, revealing anachronisms and fictional liberties.

## Timeline Visualization
- X-axis: Year/decade
- Swim lanes: Each historical figure's lifespan
- Event markers: Key story events from narrative
- Conflict indicators: Events outside figure's lifespan

## Data Requirements
- Figure birth_year and death_year from database
- Story setting_year from MediaWork
- Event data (may need new schema for story events)

## Display Requirements
- Interactive timeline with zoom/pan
- Hover: Show figure details and dates
- Red flags: Anachronisms (event outside lifespan)
- Legend explaining visualization

## Technical Implementation
- Create Cypher query fetching figure lifespans
- Build D3.js timeline component
- Implement conflict detection logic
- Add responsive zoom controls

## Acceptance Criteria
- Timeline displays on work profile page
- Accurate figure lifespans from database
- Anachronisms clearly marked
- Interactive and zoomable
- Mobile-responsive fallback view"""
    },
    {
        "title": "Historical Footprint Map - Interactive location visualization",
        "description": """## Overview
Implement Historical Footprint Map showing interactive map of story locations, connecting geographic settings to narrative events.

## Map Features
- Pin markers: Story locations (setting_location from MediaWork)
- Location clustering: Multiple works at same location
- Figure birthplace markers (optional)
- Era-based filtering (show locations by time period)

## Data Sources
- MediaWork.setting_location
- HistoricalFigure.birthplace (if available)
- Geographic coordinates (geocode locations)

## Display Requirements
- Interactive map on work profile page
- Click marker: Show works set at that location
- Legend showing location types
- Zoom controls and responsive design

## Technical Implementation
- Geocode location strings to lat/lng (use geocoding API)
- Build map component (Leaflet.js or Google Maps)
- Create Cypher query for location data
- Implement marker clustering for performance

## Acceptance Criteria
- Map displays on work profile page
- Accurate location markers from database
- Clickable markers show work details
- Map responsive and mobile-friendly
- Handles missing location data gracefully"""
    },
    {
        "title": "Enhanced Cast of Characters - Grouped by narrative role",
        "description": """## Overview
Implement Enhanced Cast of Characters list grouping characters by narrative role (protagonists, antagonists, supporting) with clear visual hierarchy.

## Role Categories
1. **Protagonists**: Main characters driving the narrative
2. **Antagonists**: Characters opposing protagonists
3. **Supporting**: Secondary characters
4. **Minor/Cameo**: Brief appearances

## Data Sources
- APPEARS_IN.sentiment can indicate heroic/villainous
- APPEARS_IN.portrayal_details may contain role info
- May need new role field in APPEARS_IN relationship

## Display Requirements
- Grouped sections on work profile page
- Character cards with portraits (if available)
- Role badges (color-coded by protagonist/antagonist)
- Link to character detail pages

## Technical Implementation
- Create Cypher query grouping by role/sentiment
- Build role inference logic (if not explicit in DB)
- Design character card component
- Implement responsive grid layout

## Acceptance Criteria
- Characters grouped by narrative role
- Clear visual distinction between groups
- Links to figure/character detail pages
- Sortable by importance/screen time (if available)
- Mobile-responsive card layout"""
    },
    {
        "title": "Creator Page Infrastructure - New route and data model",
        "description": """## Overview
Create foundational infrastructure for Creator profile pages showing directors, authors, showrunners, and their body of work.

## New Route Structure
- `/creator/[name]` - Creator profile page
- `/api/creators/[name]` - API endpoint for creator data

## Data Model Changes
- Extract creator from MediaWork.director/author fields
- Create :Creator node type (optional, or query dynamically)
- Relationship: (:Creator)-[:CREATED]->(:MediaWork)

## Page Sections (Initial)
1. Creator header (name, photo, bio)
2. List of works created (MediaWork grid)
3. Total figures portrayed count
4. Career timeline (earliest to latest work)

## Technical Implementation
- Create Next.js dynamic route `/creator/[name]`
- Build API endpoint querying MediaWork by creator
- Design creator profile page layout
- Extract creator names from existing data

## Acceptance Criteria
- `/creator/[name]` route renders successfully
- API returns creator's works and stats
- Page displays creator info and work list
- Links from work pages to creator pages functional
- SEO-friendly metadata for creator pages"""
    },
    {
        "title": "Temporal Obsession Map - Creator's recurring time periods",
        "description": """## Overview
Implement Temporal Obsession Map showing which time periods a creator repeatedly returns to across their body of work.

## Visualization Design
- Timeline showing all eras covered by creator's works
- Stacked bars: Number of works per era
- Highlight: Most frequently depicted period
- Comparison: Creator's range vs database average

## Metrics to Calculate
1. **Era Frequency**: Count works by historical period
2. **Temporal Range**: Span from earliest to latest setting
3. **Specialization Score**: Concentration in specific eras
4. **Favorite Era**: Most frequently depicted period

## Display Requirements
- Visual timeline/bar chart on creator profile page
- Era labels (Ancient, Medieval, Renaissance, Modern, etc.)
- Work titles shown on hover
- Comparison text (e.g., "Specializes in WWII era")

## Technical Implementation
- Create Cypher query aggregating work settings by creator
- Implement era classification logic
- Build timeline/chart visualization component
- Calculate specialization metrics

## Acceptance Criteria
- Timeline displays on creator profile page
- Accurate era counts from database
- Interactive hover showing work titles
- Specialization metrics calculated correctly
- Responsive chart design"""
    },
    {
        "title": "Cast Repertory Company - Creator's recurring historical figures",
        "description": """## Overview
Implement Cast Repertory Company showing which historical figures a creator portrays repeatedly across multiple works, revealing thematic obsessions.

## Data Analysis
- Query all figures appearing in creator's works
- Count appearances per figure across works
- Identify figures appearing 2+ times
- Calculate percentage of total cast

## Display Requirements
- List of recurring figures on creator profile page
- Appearance count badges (e.g., "3 works")
- Figure portraits and brief descriptions
- Link to figure detail pages
- Highlight creator's "signature figures"

## Metrics
1. **Repeat Figure Count**: How many figures appear 2+ times
2. **Most Portrayed Figure**: Figure with most appearances
3. **Repertory Percentage**: Recurring figures / total unique figures
4. **Era Consistency**: Do recurring figures share time period?

## Technical Implementation
- Create Cypher query: Creator -> Works -> Figures (with counts)
- Implement grouping and counting logic
- Build figure card grid component
- Add filtering and sorting options

## Acceptance Criteria
- List displays on creator profile page
- Accurate appearance counts from database
- Sorted by appearance frequency (descending)
- Links to figure pages functional
- Handles creators with no recurring figures"""
    },
    {
        "title": "Sentiment Signature - Creator's narrative perspective patterns",
        "description": """## Overview
Implement Sentiment Signature showing a creator's narrative perspective patterns - do they portray figures heroically, villainously, or with moral complexity?

## Sentiment Analysis
- Aggregate APPEARS_IN.sentiment across all creator's works
- Calculate distribution: heroic / villainous / complex / neutral
- Compare to database average sentiment distribution
- Identify creator's "default lens" (most common sentiment)

## Metrics to Display
1. **Sentiment Distribution**: % of each sentiment type
2. **Moral Complexity Score**: Ratio of "complex" portrayals
3. **Hero/Villain Balance**: Ratio of heroic to villainous
4. **Signature Style**: Narrative lens classification

## Visualization
- Pie chart or stacked bar: Sentiment distribution
- Comparison text: "More nuanced than 80% of creators"
- Example portrayals for each sentiment category

## Technical Implementation
- Create Cypher query aggregating sentiments by creator
- Calculate distribution percentages
- Build visualization component (recharts)
- Implement comparison logic vs database averages

## Acceptance Criteria
- Sentiment chart displays on creator profile page
- Accurate percentages from database
- Comparison to average shown
- Example portrayals linked
- Updates when new works/portrayals added"""
    },
    {
        "title": "Historical Accuracy Reputation - Aggregate conflict flags",
        "description": """## Overview
Implement Historical Accuracy Reputation showing aggregate anachronism and conflict flags across all of a creator's works, establishing their fidelity to historical record.

## Data Aggregation
- Count MediaWork.conflicting_information flags across creator's works
- Count anachronism_flagged instances in APPEARS_IN relationships
- Calculate accuracy score: Works without flags / Total works
- Compare to database average accuracy

## Accuracy Tiers
1. **Historical Purist** (90-100% accuracy, 0-1 flags)
2. **Historically Grounded** (70-90%, 2-5 flags)
3. **Creative License** (40-70%, 6-15 flags)
4. **Historical Fantasy** (0-40%, 15+ flags)

## Display Requirements
- Accuracy score and tier badge on creator profile page
- List of specific conflicts/anachronisms with work attribution
- Comparison text (e.g., "More accurate than 65% of creators")
- Context: Some genres prioritize narrative over accuracy

## Technical Implementation
- Create Cypher query counting conflict flags by creator
- Implement tier classification logic
- Build accuracy score component
- Display conflict details with work links

## Acceptance Criteria
- Accuracy score calculated from database flags
- Tier badge displayed prominently
- Specific conflicts listed with context
- Comparison to database average shown
- Updates when works flagged/unflagged"""
    }
]


def create_linear_issue(title: str, description: str) -> Dict:
    """Create a Linear issue and return the response."""

    mutation = """
    mutation IssueCreate($teamId: String!, $title: String!, $description: String!, $priority: Int!) {
      issueCreate(
        input: {
          teamId: $teamId
          title: $title
          description: $description
          priority: $priority
        }
      ) {
        success
        issue {
          id
          identifier
          url
          title
        }
      }
    }
    """

    variables = {
        "teamId": LINEAR_TEAM_ID,
        "title": title,
        "description": description,
        "priority": 3  # Normal priority
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": LINEAR_API_KEY
    }

    response = requests.post(
        LINEAR_API_URL,
        json={"query": mutation, "variables": variables},
        headers=headers
    )

    return response.json()


def main():
    """Create all Linear issues and print summary."""

    print("Creating 15 Linear issues for profile page differentiation features...\n")

    created_issues = []

    for i, issue_data in enumerate(ISSUES, 1):
        print(f"Creating issue {i}/15: {issue_data['title']}")

        response = create_linear_issue(issue_data["title"], issue_data["description"])

        if "errors" in response:
            print(f"  ❌ ERROR: {response['errors']}")
            continue

        if response.get("data", {}).get("issueCreate", {}).get("success"):
            issue = response["data"]["issueCreate"]["issue"]
            created_issues.append({
                "number": i,
                "identifier": issue["identifier"],
                "title": issue["title"],
                "url": issue["url"]
            })
            print(f"  ✅ Created: {issue['identifier']} - {issue['url']}")
        else:
            print(f"  ❌ Failed to create issue")

        print()

    # Print summary
    print("\n" + "="*80)
    print("SUMMARY: Created Linear Issues")
    print("="*80 + "\n")

    # Group by category
    figure_features = created_issues[0:5]
    work_features = created_issues[5:10]
    creator_features = created_issues[10:15]

    print("FIGURE PAGE FEATURES:")
    for issue in figure_features:
        print(f"  {issue['identifier']}: {issue['title']}")
        print(f"    → {issue['url']}\n")

    print("\nWORK PAGE FEATURES:")
    for issue in work_features:
        print(f"  {issue['identifier']}: {issue['title']}")
        print(f"    → {issue['url']}\n")

    print("\nCREATOR PAGE FEATURES:")
    for issue in creator_features:
        print(f"  {issue['identifier']}: {issue['title']}")
        print(f"    → {issue['url']}\n")

    print(f"\nTotal Issues Created: {len(created_issues)}/15")
    print("="*80)


if __name__ == "__main__":
    main()
