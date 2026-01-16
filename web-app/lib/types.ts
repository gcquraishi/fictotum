export interface HistoricalFigure {
  canonical_id: string;
  name: string;
  is_fictional: boolean;
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
