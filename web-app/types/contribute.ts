// ============================================================================
// SHARED TYPE DEFINITIONS FOR CONTRIBUTE WORKFLOW
// ============================================================================
// This file exports all TypeScript interfaces used across the unified
// contribute workflow components (CHR-16)
// ============================================================================

// ============================================================================
// SEARCH RESULT TYPES
// ============================================================================

export interface SearchResult {
  id: string;
  type: 'figure' | 'work' | 'location' | 'era';
  name: string;
  description?: string;
  year?: number;
  metadata?: Record<string, any>;
}

export interface WikidataMatch {
  qid: string;
  label: string;
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
  entityType?: 'figure' | 'work';
  enrichedData?: {
    birth_year?: number;
    death_year?: number;
    release_year?: number;
    locations?: Array<{
      name: string;
      qid: string;
      modern_name?: string;
    }>;
    eras?: Array<{
      name: string;
      confidence: number;
    }>;
    isCreator?: boolean;
    worksCount?: number;
  };
}

// ============================================================================
// LOCATION TYPES
// ============================================================================

export interface Location {
  location_id: string;
  name: string;
  modern_name?: string;
  time_period?: string;
  wikidata_id?: string;
  location_type?: string;
}

export interface UnmappedLocation {
  name: string;
  wikidata_id: string;
  modern_name?: string;
}

// ============================================================================
// ERA TYPES
// ============================================================================

export interface Era {
  name: string;
  start_year: number;
  end_year: number;
}

export interface EraTag {
  name: string;
  confidence: number;
  source?: 'ai' | 'user';
}

// ============================================================================
// ENRICHED ENTITY TYPES
// ============================================================================

export interface EnrichedEntity {
  suggestedLocations?: Array<{
    id: string;
    name: string;
    modern_name?: string;
    confidence: number;
    wikidata_id?: string;
  }>;
  suggestedEras?: EraTag[];
  unmappedLocations?: UnmappedLocation[];
  metadata?: Record<string, any>;
  settingYear?: number;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

// ============================================================================
// CREATOR WORKFLOW TYPES
// ============================================================================

export interface CreatorWork {
  qid: string;
  title: string;
  year: number | null;
  type: string;
  inDatabase: boolean;  // Already exists in Fictotum
}

export interface BulkAddResults {
  totalAttempted: number;
  succeeded: number;
  failed: number;
  errors: Array<{ workTitle: string; error: string }>;
  createdWorkIds: string[];
  createdCreatorId?: string;
}

export interface CreatorWorksViewProps {
  creatorQid: string;
  creatorName: string;
  creatorBirthYear?: number;
  creatorDeathYear?: number;
  onClose: () => void;
  onComplete?: (results: BulkAddResults) => void;
}
