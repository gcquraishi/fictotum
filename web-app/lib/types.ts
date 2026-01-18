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
}

export interface Portrayal {
  media: MediaWork;
  sentiment: 'Heroic' | 'Villainous' | 'Complex';
}

export interface FigureProfile extends HistoricalFigure {
  portrayals: Portrayal[];
}

export interface SentimentDistribution {
  Heroic: number;
  Villainous: number;
  Complex: number;
}

export interface GraphNode {
  id: string;
  name: string;
  type: 'figure' | 'media';
  sentiment?: 'Heroic' | 'Villainous' | 'Complex';
}

export interface GraphLink {
  source: string;
  target: string;
  sentiment: 'Heroic' | 'Villainous' | 'Complex';
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
  sentiment: 'Heroic' | 'Villainous' | 'Complex' | 'Neutral';
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
  sentiment: 'Heroic' | 'Villainous' | 'Complex' | 'Neutral';
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
