"""
ChronosGraph Schema Definition

Media-Centric hubs (Books, Games, Films) connected to Historical Figures
using Master Entity Resolution for unique figure nodes.
"""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class MediaType(str, Enum):
    """Types of media in the graph."""
    BOOK = "Book"
    GAME = "Game"
    FILM = "Film"
    TV_SERIES = "TVSeries"


class Sentiment(str, Enum):
    """How a historical figure is portrayed in media."""
    HEROIC = "Heroic"
    VILLAINOUS = "Villainous"
    NEUTRAL = "Neutral"
    COMPLEX = "Complex"


class HistoricalFigure(BaseModel):
    """
    Master Entity for historical figures.
    Uses canonical_id for entity resolution across all media.
    """
    canonical_id: str = Field(
        description="Unique identifier for entity resolution (e.g., 'julius_caesar')"
    )
    name: str = Field(description="Display name of the figure")
    birth_year: Optional[int] = Field(default=None, description="Birth year (negative for BCE)")
    death_year: Optional[int] = Field(default=None, description="Death year (negative for BCE)")
    title: Optional[str] = Field(default=None, description="Primary title or role")
    era: Optional[str] = Field(default=None, description="Historical era (e.g., 'Roman Republic')")


class MediaWork(BaseModel):
    """
    A piece of media (book, game, film, TV series).
    Uses Wikidata Q-ID for canonical entity resolution.
    """
    media_id: str = Field(description="Unique identifier for this media work")
    wikidata_id: str = Field(description="Wikidata Q-ID for entity resolution (e.g., 'Q165399' for HBO Rome)")
    title: str = Field(description="Title of the work")
    media_type: MediaType = Field(description="Type of media")
    release_year: Optional[int] = Field(default=None, description="Year of release")
    creator: Optional[str] = Field(default=None, description="Creator/Director/Author")


class Portrayal(BaseModel):
    """
    Represents how a historical figure appears in a media work.
    Contains sentiment analysis and conflict detection.
    """
    figure_id: str = Field(description="Reference to HistoricalFigure.canonical_id")
    media_id: str = Field(description="Reference to MediaWork.media_id")
    sentiment: Sentiment = Field(description="How the figure is portrayed")
    role_description: Optional[str] = Field(default=None, description="Character's role in the work")
    is_protagonist: bool = Field(default=False, description="Whether figure is a main character")
    conflict_flag: bool = Field(
        default=False,
        description="True if this portrayal conflicts with other media portrayals"
    )
    conflict_notes: Optional[str] = Field(
        default=None,
        description="Notes on why this portrayal is disputed/conflicting"
    )


class ScholarlyWork(BaseModel):
    """
    A scholarly work (academic paper, book, research article).
    Uses Wikidata Q-ID for canonical entity resolution.
    """
    title: str = Field(description="Title of the scholarly work")
    author: str = Field(description="Author(s) of the work")
    year: int = Field(description="Year of publication")
    wikidata_id: str = Field(description="Wikidata Q-ID for entity resolution")
    isbn: Optional[str] = Field(default=None, description="ISBN identifier if applicable")


class FictionalCharacter(BaseModel):
    """
    A fictional character that appears in media works.
    Linked to media works and their creators.
    """
    char_id: str = Field(description="Unique identifier for this fictional character")
    name: str = Field(description="Name of the fictional character")
    media_id: str = Field(description="Reference to MediaWork.media_id")
    creator: Optional[str] = Field(default=None, description="Creator/Author of the character")
    role_type: Optional[str] = Field(default=None, description="Type of role (e.g., 'Protagonist', 'Antagonist', 'Supporting')")


class Agent(BaseModel):
    """Represents the user or AI agent creating the data."""
    name: str = Field(description="Unique name of the agent (e.g., 'Claude', 'Gemini', 'GCQ')")



# Neo4j Schema Constraints and Indexes
SCHEMA_CONSTRAINTS = """
// Master Entity Resolution: Ensure unique historical figures by canonical_id
CREATE CONSTRAINT figure_unique IF NOT EXISTS
FOR (f:HistoricalFigure) REQUIRE f.canonical_id IS UNIQUE;

// Ensure unique media works by internal ID
CREATE CONSTRAINT media_unique IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.media_id IS UNIQUE;

// Wikidata Entity Resolution: Ensure unique media works by Wikidata Q-ID
CREATE CONSTRAINT media_wikidata_unique IF NOT EXISTS
FOR (m:MediaWork) REQUIRE m.wikidata_id IS UNIQUE;

// Ensure unique scholarly works by Wikidata Q-ID
CREATE CONSTRAINT scholarly_work_wikidata_unique IF NOT EXISTS
FOR (s:ScholarlyWork) REQUIRE s.wikidata_id IS UNIQUE;

// Ensure unique fictional characters by ID
CREATE CONSTRAINT fictional_character_unique IF NOT EXISTS
FOR (c:FictionalCharacter) REQUIRE c.char_id IS UNIQUE;

// Ensure unique agents by name
CREATE CONSTRAINT agent_unique IF NOT EXISTS
FOR (a:Agent) REQUIRE a.name IS UNIQUE;

// Index for efficient lookups
CREATE INDEX figure_name_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.name);
CREATE INDEX media_title_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.title);
CREATE INDEX media_type_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.media_type);
CREATE INDEX fictional_character_name_idx IF NOT EXISTS FOR (c:FictionalCharacter) ON (c.name);
"""

# Node Labels
NODE_LABELS = {
    "figure": "HistoricalFigure",
    "media": "MediaWork",
}

# Relationship Types
RELATIONSHIP_TYPES = {
    "appears_in": "APPEARS_IN",      # Figure -> Media (with Portrayal properties)
    "related_to": "RELATED_TO",       # Figure -> Figure (historical relationships)
    "same_era": "SAME_ERA",           # Figure -> Figure (contemporaries)
    "inspired_by": "INSPIRED_BY",     # Media -> Media (creative influence)
    "interacted_with": "INTERACTED_WITH",  # Figure -> Figure (historical social connection)
    "has_scholarly_basis": "HAS_SCHOLARLY_BASIS",  # HistoricalFigure/MediaWork -> ScholarlyWork
    "created_by": "CREATED_BY",       # Node -> Agent
}