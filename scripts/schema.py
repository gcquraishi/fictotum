"""
Fictotum Schema Definition

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
    BOOK_SERIES = "BookSeries"
    FILM_SERIES = "FilmSeries"
    TV_SERIES_COLLECTION = "TVSeriesCollection"
    GAME_SERIES = "GameSeries"
    BOARD_GAME_SERIES = "BoardGameSeries"


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
    publisher: Optional[str] = Field(default=None, description="Publisher (for books)")
    translator: Optional[str] = Field(default=None, description="Translator (for translated works)")
    channel: Optional[str] = Field(default=None, description="Channel/Network (for TV)")
    production_studio: Optional[str] = Field(default=None, description="Production studio (for film/TV)")


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
    actor_name: Optional[str] = Field(default=None, description="Name of the actor portraying the figure")
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


class HistoricalEvent(BaseModel):
    """
    A historical event that figures participated in and media works depict.
    Uses Wikidata Q-ID for canonical entity resolution.
    """
    event_id: str = Field(description="Unique identifier (Wikidata Q-ID preferred, e.g., 'Q48314' for Battle of Waterloo)")
    wikidata_id: Optional[str] = Field(default=None, description="Wikidata Q-ID for entity resolution")
    name: str = Field(description="Display name of the event")
    description: Optional[str] = Field(default=None, description="Brief description of the event")
    date: Optional[str] = Field(default=None, description="Primary date (ISO 8601 or year, e.g., '1815-06-18' or '1815')")
    date_precision: Optional[str] = Field(default=None, description="Precision level: 'day', 'month', 'year', 'decade', 'century'")
    start_date: Optional[str] = Field(default=None, description="Start date for spanning events (wars, reigns)")
    end_date: Optional[str] = Field(default=None, description="End date for spanning events")
    start_year: Optional[int] = Field(default=None, description="Start year (negative for BCE)")
    end_year: Optional[int] = Field(default=None, description="End year (negative for BCE)")
    location: Optional[str] = Field(default=None, description="Primary location of the event")
    era: Optional[str] = Field(default=None, description="Historical era")
    event_type: Optional[str] = Field(default=None, description="Type: 'battle', 'treaty', 'coronation', 'revolution', 'discovery', 'founding', 'assassination', 'other'")


class Source(BaseModel):
    """
    A source document from which data was extracted.
    Tracks provenance of information beyond CREATED_BY agent attribution.
    """
    source_id: str = Field(description="Unique identifier (e.g., 'src-wikipedia-napoleon')")
    source_type: str = Field(description="Type: 'wikipedia_article', 'book', 'documentary', 'academic_paper', 'database'")
    title: str = Field(description="Title of the source")
    url: Optional[str] = Field(default=None, description="URL for online sources")
    author: Optional[str] = Field(default=None, description="Author or contributor")
    publication_year: Optional[int] = Field(default=None, description="Year of publication")
    accessed_date: Optional[str] = Field(default=None, description="Date the source was accessed (ISO 8601)")
    wikidata_id: Optional[str] = Field(default=None, description="Wikidata Q-ID if the source itself has one")
    description: Optional[str] = Field(default=None, description="Brief description of the source")


class Agent(BaseModel):
    """Represents the user or AI agent creating the data."""
    name: str = Field(description="Unique name of the agent (e.g., 'Claude', 'Gemini', 'GCQ')")


class LocationType(str, Enum):
    """Types of geographic locations."""
    CITY = "city"
    REGION = "region"
    COUNTRY = "country"
    FICTIONAL_PLACE = "fictional_place"


class Location(BaseModel):
    """
    A geographic location where stories are set or where historical figures lived.
    Uses optional Wikidata Q-ID for real-world locations.
    """
    location_id: str = Field(description="Unique identifier (e.g., 'location-london')")
    name: str = Field(description="Display name (e.g., 'London', 'The Midlands')")
    location_type: LocationType = Field(description="Type of location")
    wikidata_id: Optional[str] = Field(default=None, description="Wikidata Q-ID for real places")
    parent_location: Optional[str] = Field(
        default=None,
        description="location_id of parent location (e.g., 'London' -> 'England')"
    )
    coordinates: Optional[dict] = Field(
        default=None,
        description="Geographic coordinates {latitude: float, longitude: float}"
    )
    description: Optional[str] = Field(default=None, description="Brief description of the location")


class EraType(str, Enum):
    """Types of historical/literary eras."""
    HISTORICAL_PERIOD = "historical_period"
    LITERARY_PERIOD = "literary_period"
    DYNASTY = "dynasty"
    REIGN = "reign"


class Era(BaseModel):
    """
    A time period during which stories are set or in which historical figures lived.
    """
    era_id: str = Field(description="Unique identifier (e.g., 'era-regency')")
    name: str = Field(description="Display name (e.g., 'Regency Era', 'Victorian Era')")
    start_year: int = Field(description="Start year of era (negative for BCE)")
    end_year: int = Field(description="End year of era (negative for BCE)")
    era_type: EraType = Field(description="Type of era")
    wikidata_id: Optional[str] = Field(default=None, description="Wikidata Q-ID for named periods")
    parent_era: Optional[str] = Field(default=None, description="era_id of parent era")
    description: Optional[str] = Field(default=None, description="Historical context")



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

// Location & Era Discovery: Ensure unique locations and eras
CREATE CONSTRAINT location_unique IF NOT EXISTS
FOR (l:Location) REQUIRE l.location_id IS UNIQUE;

CREATE CONSTRAINT era_unique IF NOT EXISTS
FOR (e:Era) REQUIRE e.era_id IS UNIQUE;

// Ensure unique historical events by event_id
CREATE CONSTRAINT event_unique IF NOT EXISTS
FOR (ev:HistoricalEvent) REQUIRE ev.event_id IS UNIQUE;

// Ensure unique sources by source_id
CREATE CONSTRAINT source_unique IF NOT EXISTS
FOR (s:Source) REQUIRE s.source_id IS UNIQUE;

// Index for efficient lookups
CREATE INDEX figure_name_idx IF NOT EXISTS FOR (f:HistoricalFigure) ON (f.name);
CREATE INDEX media_title_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.title);
CREATE INDEX media_type_idx IF NOT EXISTS FOR (m:MediaWork) ON (m.media_type);
CREATE INDEX fictional_character_name_idx IF NOT EXISTS FOR (c:FictionalCharacter) ON (c.name);
CREATE INDEX location_name_idx IF NOT EXISTS FOR (l:Location) ON (l.name);
CREATE INDEX location_type_idx IF NOT EXISTS FOR (l:Location) ON (l.location_type);
CREATE INDEX era_name_idx IF NOT EXISTS FOR (e:Era) ON (e.name);
CREATE INDEX era_years_idx IF NOT EXISTS FOR (e:Era) ON (e.start_year, e.end_year);

// Historical Event indexes
CREATE INDEX event_name_idx IF NOT EXISTS FOR (ev:HistoricalEvent) ON (ev.name);
CREATE INDEX event_year_idx IF NOT EXISTS FOR (ev:HistoricalEvent) ON (ev.start_year, ev.end_year);
CREATE INDEX event_type_idx IF NOT EXISTS FOR (ev:HistoricalEvent) ON (ev.event_type);

// Source indexes
CREATE INDEX source_title_idx IF NOT EXISTS FOR (s:Source) ON (s.title);
CREATE INDEX source_type_idx IF NOT EXISTS FOR (s:Source) ON (s.source_type);

// Composite indexes for efficient filtering and discovery
CREATE INDEX location_type_name_idx IF NOT EXISTS FOR (l:Location) ON (l.location_type, l.name);
CREATE INDEX era_type_name_idx IF NOT EXISTS FOR (e:Era) ON (e.era_type, e.name);
"""

# Node Labels
NODE_LABELS = {
    "figure": "HistoricalFigure",
    "media": "MediaWork",
    "event": "HistoricalEvent",
    "source": "Source",
    "location": "Location",
    "era": "Era",
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
    "part_of": "PART_OF",            # MediaWork -> MediaWork (series membership)
                                     # Properties: sequence_number, season_number, episode_number,
                                     # is_main_series, relationship_type (sequel/prequel/expansion/episode/part/season)
    # Location & Era Discovery relationships:
    "set_in": "SET_IN",              # MediaWork -> Location (with prominence: primary|secondary)
    "set_in_era": "SET_IN_ERA",      # MediaWork -> Era (with era_setting_type: contemporary|historical|alternate)
    "lived_in": "LIVED_IN",          # HistoricalFigure -> Location (with period: birth|primary_residence|active|death)
    "lived_in_era": "LIVED_IN_ERA",  # HistoricalFigure -> Era (with era_type: lived_through|primarily_active|associated_with)
    # Event relationships:
    "participated_in": "PARTICIPATED_IN",  # HistoricalFigure -> HistoricalEvent (with role: commander|participant|victim|witness|instigator)
    "depicted_in": "DEPICTED_IN",          # HistoricalEvent -> MediaWork (with accuracy: faithful|dramatized|fictionalized)
    "led_to": "LED_TO",                    # HistoricalEvent -> HistoricalEvent (causal chain)
    # Source provenance relationships:
    "sourced_from": "SOURCED_FROM",        # Any entity -> Source (with extraction_date, confidence)
}