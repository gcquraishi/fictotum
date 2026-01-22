export interface HistoricalFigure {
  canonical_id: string;
  name: string;
  is_fictional: boolean;
  historicity_status?: 'Historical' | 'Fictional' | 'Disputed';
  era?: string;
}

export interface MediaWork {
  title: string;
  release_year: number;
  wikidata_id?: string;
  publisher?: string;
  translator?: string;
  channel?: string;
  production_studio?: string;
}

export interface Portrayal {
  media: MediaWork;
  sentiment: 'Heroic' | 'Villainous' | 'Complex'; // Legacy field (deprecated, use sentiment_tags)
  sentiment_tags?: string[]; // New: array of sentiment tags (lowercase normalized)
  tag_metadata?: {
    common: string[]; // Tags from SUGGESTED_TAGS
    custom: string[];  // User-provided custom tags
  };
}

export interface FigureProfile extends HistoricalFigure {
  portrayals: Portrayal[];
}

export interface SentimentDistribution {
  Heroic: number;
  Villainous: number;
  Complex: number;
}

export type MediaCategory = 'primary' | 'academic' | 'reference';

export interface GraphNode {
  id: string;
  name: string;
  type: 'figure' | 'media';
  sentiment?: 'Heroic' | 'Villainous' | 'Complex';
  mediaCategory?: MediaCategory; // Only applicable to media nodes
}

export interface GraphLink {
  source: string;
  target: string;
  sentiment: 'Heroic' | 'Villainous' | 'Complex';
  relationshipType?: 'APPEARS_IN' | 'INTERACTED_WITH' | string;
  featured?: boolean;
}

export interface PathVisualization {
  pathIds: string[];  // Node IDs to highlight
  pathLinks: { source: string; target: string }[];  // Links to emphasize
}

export interface ScholarlyWork {
  wikidata_id: string;
  title: string;
  author: string;
  year: number;
  isbn?: string;
  notes?: string;
}

export interface DetailedPortrayal {
  media: MediaWork & {
    media_id: string;
    media_type: 'Book' | 'Game' | 'Film' | 'TVSeries';
    creator?: string;
  };
  sentiment: 'Heroic' | 'Villainous' | 'Complex' | 'Neutral'; // Legacy (deprecated)
  sentiment_tags?: string[]; // New: array of sentiment tags
  tag_metadata?: {
    common: string[];
    custom: string[];
  };
  role_description?: string;
  is_protagonist: boolean;
  conflict_flag?: boolean;
  conflict_notes?: string;
  anachronism_flag?: boolean;
  anachronism_notes?: string;
}

export interface FigureDossier {
  canonical_id: string;
  name: string;
  birth_year?: number;
  death_year?: number;
  title?: string;
  era?: string;
  historicity_status?: 'Historical' | 'Fictional' | 'Disputed';
  portrayals: DetailedPortrayal[];
  scholarly_works: ScholarlyWork[];
}

export interface ConflictPortrayal {
  media: MediaWork & {
    media_id: string;
    media_type: 'Book' | 'Game' | 'Film' | 'TVSeries';
    creator?: string;
  };
  sentiment: 'Heroic' | 'Villainous' | 'Complex' | 'Neutral'; // Legacy (deprecated)
  sentiment_tags?: string[];
  tag_metadata?: {
    common: string[];
    custom: string[];
  };
  role_description?: string;
  conflict_notes?: string;
  is_protagonist: boolean;
}

export interface ConflictingFigure {
  figure: {
    canonical_id: string;
    name: string;
    era?: string;
    title?: string;
    historicity_status?: 'Historical' | 'Fictional' | 'Disputed';
  };
  portrayals: ConflictPortrayal[];
}

export interface PathNode {
  node_type: string;
  node_id: string;
  name: string;
  properties: any;
}

export interface PathRelationship {
  rel_type: string;
  from_node: string;
  to_node: string;
  context?: string;
}

export interface HistoriographicPath {
  start_node: string;
  end_node: string;
  path_length: number;
  nodes: PathNode[];
  relationships: PathRelationship[];
}

export interface SeriesRelationship {
  media_id: string;
  title: string;
  release_year: number;
  sequence_number?: number;
  season_number?: number;
  episode_number?: number;
  is_main_series: boolean;
  relationship_type: 'sequel' | 'prequel' | 'expansion' | 'episode' | 'part' | 'season';
}

export interface MediaWorkWithSeries extends MediaWork {
  media_id?: string;
  media_type?: 'Book' | 'Game' | 'Film' | 'TVSeries' | 'BookSeries' | 'FilmSeries' | 'TVSeriesCollection' | 'GameSeries' | 'BoardGameSeries';
  parent_series?: MediaWork;
  child_works?: SeriesRelationship[];
  series_position?: {
    sequence_number?: number;
    season_number?: number;
    episode_number?: number;
    relationship_type: string;
  };
}

export interface CharacterAppearance {
  canonical_id: string;
  name: string;
  appearances: number;
  works: number[];
}

export interface SeriesMetadata {
  series: MediaWork & {
    media_id: string;
    media_type: string;
    creator?: string;
  };
  works: SeriesRelationship[];
  characters: {
    total: number;
    roster: CharacterAppearance[];
    matrix: Record<string, number[]>;
  };
  stats: {
    yearRange: [number, number];
    avgCharactersPerWork: number;
    totalInteractions: number;
  };
}

// Location & Era Discovery Types

export interface Location {
  location_id: string;
  name: string;
  location_type: 'city' | 'region' | 'country' | 'fictional_place';
  wikidata_id?: string;
  parent_location?: string;
  coordinates?: { latitude: number; longitude: number };
  description?: string;
}

export interface LocationWithStats extends Location {
  work_count: number;
  figure_count: number;
}

export interface Era {
  era_id: string;
  name: string;
  start_year: number;
  end_year: number;
  era_type: 'historical_period' | 'literary_period' | 'dynasty' | 'reign';
  wikidata_id?: string;
  parent_era?: string;
  description?: string;
}

export interface EraWithStats extends Era {
  work_count: number;
  figure_count: number;
}

export interface LocationWorks {
  location: Location;
  works: (MediaWork & {
    media_id: string;
    media_type: string;
    creator?: string;
  })[];
  figures: HistoricalFigure[];
  stats: {
    work_count: number;
    figure_count: number;
    time_span: [number, number];
  };
}

export interface EraWorks {
  era: Era;
  works: (MediaWork & {
    media_id: string;
    media_type: string;
    creator?: string;
  })[];
  figures: HistoricalFigure[];
  timeline?: Array<{ year: number; work_count: number }>;
  stats: {
    work_count: number;
    figure_count: number;
    year_range: [number, number];
  };
}

export interface DiscoveryBrowseResult {
  locations: LocationWithStats[];
  eras: EraWithStats[];
  stats: {
    total_locations: number;
    total_eras: number;
    most_works_location: string;
    most_works_era: string;
  };
}
