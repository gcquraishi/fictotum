'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import TwoTierSearchResults from '@/components/TwoTierSearchResults';
import SettingsConfirmation from '@/components/SettingsConfirmation';
import CreatorWorksView from '@/components/CreatorWorksView';
import type {
  SearchResult,
  WikidataMatch,
  EraTag,
  EnrichedEntity,
  WizardStep,
  ContributionSettings,
  BulkAddResults
} from '@/types/contribute';

// ============================================================================
// INTERNAL WIZARD STATE
// ============================================================================

interface WizardState {
  step: WizardStep;
  searchQuery: string;
  entityType: 'figure' | 'work' | null;
  dbResults: SearchResult[];
  wikidataResults: WikidataMatch[];
  selectedMatch: WikidataMatch | 'user_generated' | null;
  settings: {
    locations: string[];
    eraTags: EraTag[];
    customFields: Record<string, any>;
  };
  enrichedData: EnrichedEntity | null;
  isUserGenerated: boolean;
  error: string | null;
}

// ============================================================================
// LOCAL STORAGE UTILITIES
// ============================================================================

const STORAGE_KEY = 'chronos_contribute_search';
const STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface StoredSearch {
  query: string;
  timestamp: number;
}

function saveSearchQuery(query: string) {
  const data: StoredSearch = {
    query,
    timestamp: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadSearchQuery(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: StoredSearch = JSON.parse(stored);
    const age = Date.now() - data.timestamp;

    if (age > STORAGE_EXPIRY) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return data.query;
  } catch {
    return null;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContributePage() {
  const router = useRouter();

  const [wizardState, setWizardState] = useState<WizardState>({
    step: 'search',
    searchQuery: '',
    entityType: null,
    dbResults: [],
    wikidataResults: [],
    selectedMatch: null,
    settings: {
      locations: [],
      eraTags: [],
      customFields: {}
    },
    enrichedData: null,
    isUserGenerated: false,
    error: null
  });

  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [creatorModalOpen, setCreatorModalOpen] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<WikidataMatch | null>(null);

  // Restore search query from localStorage on mount
  useEffect(() => {
    const savedQuery = loadSearchQuery();
    if (savedQuery) {
      setWizardState(prev => ({ ...prev, searchQuery: savedQuery }));
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to go back
      if (e.key === 'Escape' && wizardState.step !== 'search' && wizardState.step !== 'creating') {
        e.preventDefault();
        goBack();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [wizardState.step]);

  // Save search query to localStorage when it changes
  useEffect(() => {
    if (wizardState.searchQuery.length >= 2) {
      saveSearchQuery(wizardState.searchQuery);
    }
  }, [wizardState.searchQuery]);

  // ============================================================================
  // STEP NAVIGATION
  // ============================================================================

  const goToStep = (step: WizardStep) => {
    setWizardState(prev => ({ ...prev, step, error: null }));
  };

  const goBack = () => {
    const stepOrder: WizardStep[] = ['search', 'entity-type', 'figure-form', 'settings', 'confirm', 'creating'];
    const currentIndex = stepOrder.indexOf(wizardState.step);
    if (currentIndex > 0) {
      // Special handling for conditional steps
      if (wizardState.step === 'confirm') {
        // Go back to either figure-form or settings based on entity type
        if (wizardState.entityType === 'figure' && wizardState.isUserGenerated) {
          goToStep('figure-form');
        } else {
          goToStep('settings');
        }
      } else {
        goToStep(stepOrder[currentIndex - 1]);
      }
    }
  };

  // ============================================================================
  // SEARCH HANDLERS
  // ============================================================================

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setWizardState(prev => ({
        ...prev,
        dbResults: [],
        wikidataResults: [],
        error: null
      }));
      return;
    }

    setIsSearching(true);
    setWizardState(prev => ({ ...prev, error: null }));

    try {
      // Parallel search: Fictotum DB + Wikidata (both works and figures)
      const [dbResponse, wikidataWorkResponse, wikidataFigureResponse] = await Promise.all([
        fetch(`/api/search/universal?q=${encodeURIComponent(query)}`),
        fetch('/api/wikidata/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: query,
            entityType: 'work'
          })
        }),
        fetch('/api/wikidata/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            searchQuery: query,
            entityType: 'figure'
          })
        })
      ]);

      const dbData = await dbResponse.json();
      const wikidataWorkData = await wikidataWorkResponse.json();
      const wikidataFigureData = await wikidataFigureResponse.json();

      // Map database results to SearchResult format
      const mappedDbResults: SearchResult[] = (dbData.results || [])
        .filter((r: any) => r.type === 'figure' || r.type === 'media')
        .map((r: any) => ({
          id: r.id,
          name: r.label,
          type: r.type === 'media' ? 'work' : r.type,
          description: r.meta,
          metadata: r
        }));

      // Combine Wikidata results from both searches
      const allWikidataMatches = [
        ...(wikidataWorkData.matches || []),
        ...(wikidataFigureData.matches || [])
      ];

      // CHR-17: Deduplicate by Q-ID (same entity can appear in both work and figure searches)
      // Keep the result with highest confidence, or prefer 'figure' over 'work' if confidence is equal
      const uniqueMatchesByQid = new Map();
      allWikidataMatches.forEach((match: any) => {
        const existing = uniqueMatchesByQid.get(match.qid);

        if (!existing) {
          // No existing match, add this one
          uniqueMatchesByQid.set(match.qid, match);
        } else {
          // Conflict: same Q-ID from both searches
          // Keep the better match based on:
          // 1. Higher confidence (high > medium > low)
          // 2. If confidence equal, prefer 'figure' over 'work' (more specific)

          const confidenceRank = { high: 3, medium: 2, low: 1 };
          const existingScore = confidenceRank[existing.confidence as keyof typeof confidenceRank] || 0;
          const newScore = confidenceRank[match.confidence as keyof typeof confidenceRank] || 0;

          if (newScore > existingScore) {
            // New match has higher confidence, replace
            uniqueMatchesByQid.set(match.qid, match);
          } else if (newScore === existingScore && match.entityType === 'figure' && existing.entityType === 'work') {
            // Same confidence, but new is a figure (more specific than work), replace
            uniqueMatchesByQid.set(match.qid, match);
          }
          // Otherwise keep existing match
        }
      });
      const deduplicatedMatches = Array.from(uniqueMatchesByQid.values());

      // Map Wikidata matches to WikidataMatch format
      const mappedWikidataResults: WikidataMatch[] = deduplicatedMatches.map((m: any) => ({
        qid: m.qid,
        label: m.label,
        description: m.description,
        confidence: (m.confidence || 'medium') as 'high' | 'medium' | 'low',
        entityType: (m.entityType as 'figure' | 'work') || undefined,
        enrichedData: m.enrichedData || undefined
      }));

      setWizardState(prev => ({
        ...prev,
        dbResults: mappedDbResults,
        wikidataResults: mappedWikidataResults
      }));
    } catch (error) {
      console.error('Search error:', error);
      setWizardState(prev => ({
        ...prev,
        error: 'Search failed. Please try again.'
      }));
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchInputChange = useCallback((value: string) => {
    setWizardState(prev => ({ ...prev, searchQuery: value }));

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    if (value.length >= 2) {
      const timeout = setTimeout(() => {
        performSearch(value);
      }, 500);
      setSearchTimeout(timeout);
    } else {
      // Clear results if query is too short
      setWizardState(prev => ({
        ...prev,
        dbResults: [],
        wikidataResults: []
      }));
    }
  }, [searchTimeout, performSearch]);

  // Handle manual search submission (Enter key)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }

    if (wizardState.searchQuery.length < 2) {
      setWizardState(prev => ({
        ...prev,
        error: 'Please enter at least 2 characters to search'
      }));
      return;
    }

    performSearch(wizardState.searchQuery);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleSelectExisting = (result: SearchResult) => {
    // Navigate to entity page directly
    const path = result.type === 'figure'
      ? `/figure/${result.id}`
      : `/media/${result.id}`;
    router.push(path);
  };

  const handleSelectWikidata = async (match: WikidataMatch) => {
    setWizardState(prev => ({
      ...prev,
      selectedMatch: match,
      entityType: match.entityType || 'work',
      isUserGenerated: false
    }));

    setIsEnriching(true);

    try {
      // Step 1: Enrich from Wikidata
      const wikidataResponse = await fetch('/api/wikidata/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wikidataId: match.qid,
          entityType: match.entityType || 'work'
        })
      });

      if (!wikidataResponse.ok) {
        throw new Error('Wikidata enrichment failed');
      }

      const wikidataData = await wikidataResponse.json();

      // For figures, skip settings and go to confirm
      if ((match.entityType || 'work') === 'figure') {
        setWizardState(prev => ({
          ...prev,
          enrichedData: {
            metadata: {
              birth_year: wikidataData.enrichedData?.birth_year,
              death_year: wikidataData.enrichedData?.death_year,
              occupations: wikidataData.enrichedData?.occupations,
              citizenships: wikidataData.enrichedData?.citizenships
            }
          },
          settings: {
            locations: [],
            eraTags: [],
            customFields: {
              birth_year: wikidataData.enrichedData?.birth_year,
              death_year: wikidataData.enrichedData?.death_year
            }
          }
        }));
        setIsEnriching(false);
        goToStep('confirm');
        return;
      }

      // For works, process locations and eras
      const narrativeLocations = wikidataData.enrichedData?.narrative_locations || [];
      // CHR-20: Setting year should NOT default to publication year
      // Setting year is when the story takes place, not when it was published
      // Example: "1984" was published in 1949 but set in 1984
      // Example: "A Place of Greater Safety" was published in 1992 but set in 1789-1799
      const settingYear = wikidataData.enrichedData?.setting_year || null;

      // Step 2: Map Wikidata locations to Fictotum locations
      let suggestedLocations: EnrichedEntity['suggestedLocations'] = [];
      let unmappedLocations: EnrichedEntity['unmappedLocations'] = [];

      if (narrativeLocations.length > 0) {
        const locationMappingResponse = await fetch('/api/locations/map-wikidata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wikidataIds: narrativeLocations.map((l: any) => l.qid)
          })
        });

        if (locationMappingResponse.ok) {
          const mappingData = await locationMappingResponse.json();
          suggestedLocations = mappingData.mapped || [];
          unmappedLocations = mappingData.unmapped || [];
        }
      }

      // Step 3: Get AI era suggestions
      let suggestedEras: EraTag[] = [];

      try {
        const eraResponse = await fetch('/api/ai/suggest-eras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workTitle: match.label,
            settingYear: settingYear,
            wikidataEras: wikidataData.enrichedData?.set_in_periods?.map((p: any) => p.label)
          })
        });

        if (eraResponse.ok) {
          const eraData = await eraResponse.json();
          suggestedEras = eraData.suggestedTags || [];
        }
      } catch (eraError) {
        console.error('Era suggestions failed:', eraError);
        // Continue without AI era suggestions
      }

      // Update wizard state with enriched data
      setWizardState(prev => ({
        ...prev,
        enrichedData: {
          suggestedLocations: suggestedLocations || [],
          suggestedEras: suggestedEras,
          unmappedLocations: unmappedLocations || [],
          settingYear: settingYear,
          metadata: {
            release_year: wikidataData.enrichedData?.publication_year,
            media_type: wikidataData.enrichedData?.media_type || 'Novel', // CHR-20: Media type from Wikidata
            wikidata_locations: narrativeLocations,
            wikidata_periods: wikidataData.enrichedData?.set_in_periods
          }
        }
      }));

      goToStep('settings');
    } catch (error) {
      console.error('Enrichment error:', error);
      setWizardState(prev => ({
        ...prev,
        error: 'Failed to load enrichment data. You can still continue manually.',
        enrichedData: {
          suggestedLocations: [],
          suggestedEras: [],
          unmappedLocations: [],
          metadata: {
            media_type: 'Novel' // CHR-20: Default media type for error fallback
          }
        }
      }));
      goToStep('settings');
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSelectUserGenerated = () => {
    // Bug fix CHR-19: Go to entity-type step first to disambiguate figure vs work
    setWizardState(prev => ({
      ...prev,
      selectedMatch: 'user_generated',
      isUserGenerated: true,
      entityType: null, // Will be set in entity-type step
      enrichedData: {
        suggestedLocations: [],
        suggestedEras: [],
        unmappedLocations: [],
        metadata: {}
      }
    }));
    goToStep('entity-type');
  };

  const handleEntityTypeSelection = (type: 'figure' | 'work') => {
    setWizardState(prev => ({
      ...prev,
      entityType: type,
      // CHR-20: Add default media_type for user-generated works
      enrichedData: type === 'work' ? {
        ...prev.enrichedData,
        metadata: {
          ...prev.enrichedData?.metadata,
          media_type: prev.enrichedData?.metadata?.media_type || 'Novel'
        }
      } : prev.enrichedData
    }));

    if (type === 'figure') {
      // Go to figure-specific form
      goToStep('figure-form');
    } else {
      // Go to standard settings (locations/eras)
      goToStep('settings');
    }
  };

  const handleFigureFormSubmit = (figureData: {
    historicity: string;
    birth_year?: number;
    death_year?: number;
    description?: string;
  }) => {
    setWizardState(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        customFields: {
          ...prev.settings.customFields,
          historicity: figureData.historicity,
          birth_year: figureData.birth_year,
          death_year: figureData.death_year,
          description: figureData.description
        }
      }
    }));
    goToStep('confirm');
  };

  // ============================================================================
  // CREATOR WORKFLOW HANDLERS
  // ============================================================================

  const handleAddAsFigure = async (match: WikidataMatch) => {
    // Add creator as a figure using the same flow as figures
    setWizardState(prev => ({
      ...prev,
      selectedMatch: match,
      entityType: 'figure',
      isUserGenerated: false
    }));

    setIsEnriching(true);

    try {
      // Enrich from Wikidata
      const wikidataResponse = await fetch('/api/wikidata/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wikidataId: match.qid,
          entityType: 'figure'
        })
      });

      if (!wikidataResponse.ok) {
        throw new Error('Wikidata enrichment failed');
      }

      const wikidataData = await wikidataResponse.json();

      setWizardState(prev => ({
        ...prev,
        enrichedData: {
          metadata: {
            birth_year: wikidataData.enrichedData?.birth_year,
            death_year: wikidataData.enrichedData?.death_year,
            occupations: wikidataData.enrichedData?.occupations,
            citizenships: wikidataData.enrichedData?.citizenships
          }
        },
        settings: {
          locations: [],
          eraTags: [],
          customFields: {
            birth_year: wikidataData.enrichedData?.birth_year,
            death_year: wikidataData.enrichedData?.death_year
          }
        }
      }));
      setIsEnriching(false);
      goToStep('confirm');
    } catch (error) {
      console.error('Creator enrichment error:', error);
      setWizardState(prev => ({
        ...prev,
        error: 'Failed to load creator data. Please try again.',
      }));
      setIsEnriching(false);
    }
  };

  const handleBrowseWorks = (match: WikidataMatch) => {
    setSelectedCreator(match);
    setCreatorModalOpen(true);
  };

  const handleCreatorWorksComplete = (results: BulkAddResults) => {
    console.log('Bulk add complete:', results);
    // Could show a success toast or navigate to the creator's page
    if (results.createdCreatorId) {
      // Navigate to the newly created creator's figure page
      router.push(`/figure/${results.createdCreatorId}`);
    }
  };

  // ============================================================================
  // SETTINGS HANDLERS
  // ============================================================================

  const handleSettingsConfirm = (settings: ContributionSettings) => {
    setWizardState(prev => ({
      ...prev,
      settings: {
        locations: settings.locations,
        eraTags: settings.eraTags,
        customFields: {
          ...prev.settings.customFields,
          unmappedLocationActions: settings.unmappedLocationActions
        }
      }
    }));
    goToStep('confirm');
  };

  // ============================================================================
  // CREATION HANDLERS
  // ============================================================================

  const handleConfirmCreate = async () => {
    goToStep('creating');

    const endpoint = wizardState.entityType === 'figure'
      ? '/api/figures/create'
      : '/api/media/create';

    try {
      let payload: any = {};

      // Build payload based on entity type
      if (wizardState.entityType === 'figure') {
        const match = wizardState.selectedMatch !== 'user_generated'
          ? (wizardState.selectedMatch as WikidataMatch)
          : null;

        payload = {
          name: match?.label || wizardState.searchQuery,
          wikidata_id: match?.qid || null,
          birth_year: wizardState.settings.customFields?.birth_year,
          death_year: wizardState.settings.customFields?.death_year,
          historicity: wizardState.settings.customFields?.historicity || 'Historical',
          description: wizardState.settings.customFields?.description,
          wikidata_verified: !!match,
          data_source: match ? 'wikidata' : 'user'
        };
      } else {
        // Media work
        const match = wizardState.selectedMatch !== 'user_generated'
          ? (wizardState.selectedMatch as WikidataMatch)
          : null;

        payload = {
          title: match?.label || wizardState.searchQuery,
          mediaType: wizardState.enrichedData?.metadata?.media_type || 'Novel', // CHR-20: Media type from Wikidata
          wikidata_id: match?.qid || null,
          releaseYear: wizardState.enrichedData?.metadata?.release_year,
          setting_year: wizardState.enrichedData?.settingYear,
          locationIds: wizardState.settings.locations, // CHR-20: Fixed from location_ids to locationIds
          eraIds: [], // Empty for now - we use eraTags instead
          eraTags: wizardState.settings.eraTags.map(tag => ({
            name: tag.name,
            confidence: tag.confidence,
            source: tag.source || 'ai'
          })),
          wikidata_verified: !!match,
          data_source: match ? 'wikidata' : 'user',
          unmapped_location_actions: wizardState.settings.customFields?.unmappedLocationActions || []
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const entityId = data.canonical_id || data.media_id || data.id;
        const path = wizardState.entityType === 'figure'
          ? `/figure/${entityId}` // CHR-17: Fixed plural -> singular (route is /figure/[id] not /figures/[id])
          : `/media/${entityId}`;

        // Clear localStorage and redirect
        localStorage.removeItem(STORAGE_KEY);
        router.push(path);
      } else {
        const errorData = await response.json();
        setWizardState(prev => ({
          ...prev,
          step: 'confirm',
          error: errorData.error || 'Failed to create entity'
        }));
      }
    } catch (error) {
      console.error('Entity creation error:', error);
      setWizardState(prev => ({
        ...prev,
        step: 'confirm',
        error: 'An error occurred. Please try again.'
      }));
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getStepNumber = (step: WizardStep): number => {
    const stepMap: Record<WizardStep, number> = {
      'entity-type': 1,
      search: 1,
      'figure-form': 2,
      settings: 2,
      confirm: 3,
      creating: 3
    };
    return stepMap[step];
  };

  const getTotalSteps = (): number => {
    return wizardState.entityType === 'figure' ? 2 : 3;
  };

  // Skeleton loader for search results
  const renderSearchSkeleton = () => (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ padding: '16px', background: 'white', border: '1px solid var(--color-border)' }}>
          <div style={{ height: '20px', background: 'var(--color-section-bg)', width: '75%', marginBottom: '8px' }} />
          <div style={{ height: '16px', background: 'var(--color-section-bg)', width: '50%' }} />
        </div>
      ))}
    </div>
  );

  // ============================================================================
  // RENDER: PROGRESS INDICATOR
  // ============================================================================

  const renderProgressBar = () => {
    const currentStep = getStepNumber(wizardState.step);
    const totalSteps = getTotalSteps();
    const progress = (currentStep / totalSteps) * 100;

    return (
      <div style={{ marginBottom: '32px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
            Step {currentStep} of {totalSteps}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
            {Math.round(progress)}%
          </p>
        </div>
        <div style={{ width: '100%', background: 'var(--color-section-bg)', height: '2px' }}>
          <div
            className="transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, height: '2px', background: 'var(--color-accent)' }}
          />
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: STEP 1 - SEARCH
  // ============================================================================

  const renderSearchStep = () => (
    <div className="space-y-6">
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            fontWeight: 300,
            color: 'var(--color-text)',
            marginBottom: '8px',
          }}
        >
          What would you like to add?
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
          Search for a historical figure or media work to add to Fictotum
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={wizardState.searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search by name or title..."
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              padding: '12px 16px',
              border: '1px solid var(--color-border)',
              background: 'white',
              color: 'var(--color-text)',
              width: '100%',
              outline: 'none',
            }}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-border-bold)'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)'; }}
            autoFocus
          />
          {isSearching && (
            <span
              className="absolute right-4 top-1/2 transform -translate-y-1/2"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}
            >
              Searching...
            </span>
          )}
        </div>

        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', letterSpacing: '1px' }}>
          Start typing to search automatically, or press Enter
        </p>
      </form>

      {/* Error Display */}
      {wizardState.error && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--color-section-bg)',
            borderLeft: '4px solid var(--color-accent)',
          }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>{wizardState.error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {isSearching && wizardState.searchQuery.length >= 2 && renderSearchSkeleton()}

      {/* Results using TwoTierSearchResults component */}
      {!isSearching && wizardState.searchQuery.length >= 2 && (
        <TwoTierSearchResults
          dbResults={wizardState.dbResults}
          wikidataResults={wizardState.wikidataResults}
          searchQuery={wizardState.searchQuery}
          onSelectExisting={handleSelectExisting}
          onSelectWikidata={handleSelectWikidata}
          onSelectUserGenerated={handleSelectUserGenerated}
          onAddAsFigure={handleAddAsFigure}
          onBrowseWorks={handleBrowseWorks}
          isEnriching={isEnriching}
        />
      )}
    </div>
  );

  // ============================================================================
  // RENDER: ENTITY TYPE SELECTION (USER-GENERATED ONLY)
  // ============================================================================

  const renderEntityTypeStep = () => (
    <div className="space-y-6">
      <div>
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            fontWeight: 300,
            color: 'var(--color-text)',
            marginBottom: '8px',
          }}
        >
          What type of entity are you creating?
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
          Choose whether you&apos;re adding a historical figure or a media work
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--color-border)', border: '1px solid var(--color-border)' }}>
        {/* Figure Option */}
        <button
          onClick={() => handleEntityTypeSelection('figure')}
          className="hover:opacity-80 transition-opacity"
          style={{
            padding: '24px',
            background: 'var(--color-bg)',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-accent)', marginBottom: '8px' }}>
            Figure
          </p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 300, color: 'var(--color-text)', marginBottom: '8px' }}>
            Historical Figure
          </h3>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-gray)', marginBottom: '8px' }}>
            A real or fictional person who appears in media works
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', letterSpacing: '1px' }}>
            e.g. Napoleon Bonaparte, Sherlock Holmes
          </p>
        </button>

        {/* Work Option */}
        <button
          onClick={() => handleEntityTypeSelection('work')}
          className="hover:opacity-80 transition-opacity"
          style={{
            padding: '24px',
            background: 'var(--color-bg)',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-accent)', marginBottom: '8px' }}>
            Work
          </p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', fontWeight: 300, color: 'var(--color-text)', marginBottom: '8px' }}>
            Media Work
          </h3>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-gray)', marginBottom: '8px' }}>
            A book, film, game, or TV series
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', letterSpacing: '1px' }}>
            e.g. War and Peace, The Crown
          </p>
        </button>
      </div>

      <div>
        <button
          onClick={goBack}
          className="hover:opacity-70 transition-opacity"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--color-gray)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          &larr; Back to Search
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: FIGURE FORM (USER-GENERATED FIGURES ONLY)
  // ============================================================================

  const renderFigureFormStep = () => {
    const [formData, setFormData] = useState({
      historicity: 'Historical' as 'Historical' | 'Fictional' | 'Disputed',
      birth_year: '',
      death_year: '',
      description: ''
    });
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = () => {
      setFormError(null);

      if (!formData.historicity) {
        setFormError('Historicity is required');
        return;
      }

      handleFigureFormSubmit({
        historicity: formData.historicity,
        birth_year: formData.birth_year ? parseInt(formData.birth_year) : undefined,
        death_year: formData.death_year ? parseInt(formData.death_year) : undefined,
        description: formData.description || undefined
      });
    };

    const inputStyle = {
      fontFamily: 'var(--font-serif)',
      fontSize: '16px',
      padding: '10px 12px',
      border: '1px solid var(--color-border)',
      background: 'white',
      color: 'var(--color-text)',
      width: '100%',
      outline: 'none',
    };

    return (
      <div className="space-y-6">
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            Create Historical Figure
          </h2>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-gray)' }}>
            Provide details about <span style={{ color: 'var(--color-accent)' }}>{wizardState.searchQuery}</span>
          </p>
        </div>

        {formError && (
          <div style={{ padding: '12px 16px', background: 'var(--color-section-bg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>{formError}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Historicity Field (Required) */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
              Historicity <span style={{ color: 'var(--color-accent)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '0', border: '1px solid var(--color-border)' }}>
              {(['Historical', 'Fictional', 'Disputed'] as const).map((option, idx) => (
                <button
                  key={option}
                  onClick={() => setFormData(prev => ({ ...prev, historicity: option }))}
                  className="hover:opacity-80 transition-opacity"
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    border: 'none',
                    borderRight: idx < 2 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer',
                    background: formData.historicity === option ? 'var(--color-text)' : 'var(--color-bg)',
                    color: formData.historicity === option ? 'var(--color-bg)' : 'var(--color-text)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginTop: '8px', letterSpacing: '1px' }}>
              Was this person real (Historical), fictional (Fictional), or debated (Disputed)?
            </p>
          </div>

          {/* Birth Year */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
              Birth Year
            </label>
            <input
              type="number"
              value={formData.birth_year}
              onChange={(e) => setFormData(prev => ({ ...prev, birth_year: e.target.value }))}
              placeholder="e.g., 1769"
              style={inputStyle}
            />
          </div>

          {/* Death Year */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
              Death Year
            </label>
            <input
              type="number"
              value={formData.death_year}
              onChange={(e) => setFormData(prev => ({ ...prev, death_year: e.target.value }))}
              placeholder="e.g., 1821"
              style={inputStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description or context about this figure..."
              rows={3}
              style={{ ...inputStyle, resize: 'none' as const }}
            />
          </div>
        </div>

        <div className="flex justify-between" style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={goBack}
            className="hover:opacity-70 transition-opacity"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            &larr; Back
          </button>
          <button
            onClick={handleSubmit}
            className="hover:opacity-80 transition-opacity"
            style={{
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '12px 24px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Continue &rarr;
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: STEP 2 - SETTINGS
  // ============================================================================

  const renderSettingsStep = () => {
    // Ensure we have enriched data before rendering
    if (!wizardState.enrichedData) {
      return (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
            Loading settings...
          </p>
        </div>
      );
    }

    return (
      <SettingsConfirmation
        enrichedData={wizardState.enrichedData}
        entityType={wizardState.entityType || 'work'}
        onConfirm={handleSettingsConfirm}
        onBack={goBack}
      />
    );
  };

  // ============================================================================
  // RENDER: STEP 3 - CONFIRM
  // ============================================================================

  const renderConfirmStep = () => {
    const match = wizardState.selectedMatch !== 'user_generated'
      ? (wizardState.selectedMatch as WikidataMatch)
      : null;

    const entityName = match?.label || wizardState.searchQuery;

    return (
      <div className="space-y-6">
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            Confirm &amp; Create
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
            Review the details before adding to Fictotum
          </p>
        </div>

        {/* Error Display */}
        {wizardState.error && (
          <div style={{ padding: '12px 16px', background: 'var(--color-section-bg)', borderLeft: '4px solid var(--color-accent)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>{wizardState.error}</p>
          </div>
        )}

        {/* Preview Card */}
        <div style={{ border: '1px solid var(--color-border)', padding: '24px' }}>
          <div className="flex items-center gap-3" style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex-1">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>
                {wizardState.entityType}
              </p>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 300, color: 'var(--color-text)' }}>
                {entityName}
              </h3>
            </div>
            {!wizardState.isUserGenerated && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text)', border: '1px solid var(--color-border-bold)', padding: '4px 10px' }}>
                Wikidata Verified
              </span>
            )}
          </div>

          <div className="space-y-3">
            {/* Wikidata Q-ID */}
            {match && (
              <div className="fsg-meta-row">
                <span>Wikidata ID</span>
                <span style={{ color: 'var(--color-accent)' }}>{match.qid}</span>
              </div>
            )}

            {/* Birth/Death years for figures */}
            {wizardState.entityType === 'figure' && wizardState.settings.customFields?.birth_year && (
              <div className="fsg-meta-row">
                <span>Lifespan</span>
                <span style={{ color: 'var(--color-accent)' }}>
                  {wizardState.settings.customFields.birth_year} &ndash; {wizardState.settings.customFields.death_year || 'present'}
                </span>
              </div>
            )}

            {/* Release/Setting year for works */}
            {wizardState.entityType === 'work' && wizardState.enrichedData?.metadata?.release_year && (
              <div className="fsg-meta-row">
                <span>Publication Year</span>
                <span style={{ color: 'var(--color-accent)' }}>{wizardState.enrichedData.metadata.release_year}</span>
              </div>
            )}

            {wizardState.entityType === 'work' && wizardState.enrichedData?.settingYear && (
              <div className="fsg-meta-row">
                <span>Setting Year</span>
                <span style={{ color: 'var(--color-accent)' }}>{wizardState.enrichedData.settingYear}</span>
              </div>
            )}

            {/* Locations */}
            {wizardState.settings.locations.length > 0 && (
              <div style={{ paddingTop: '12px', borderTop: '1px dotted var(--color-border)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
                  Locations ({wizardState.settings.locations.length})
                </p>
                <div className="space-y-1" style={{ marginLeft: '16px' }}>
                  {wizardState.enrichedData?.suggestedLocations
                    ?.filter(loc => wizardState.settings.locations.includes(loc.id))
                    .map(loc => (
                      <div key={loc.id} style={{ fontFamily: 'var(--font-serif)', fontSize: '13px', color: 'var(--color-gray)' }}>
                        {loc.name}
                        {loc.modern_name && loc.modern_name !== loc.name && ` (${loc.modern_name})`}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Era Tags */}
            {wizardState.settings.eraTags.length > 0 && (
              <div style={{ paddingTop: '12px', borderTop: '1px dotted var(--color-border)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '8px' }}>
                  Era Tags ({wizardState.settings.eraTags.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {wizardState.settings.eraTags.map(era => (
                    <span
                      key={era.name}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        border: '1px solid var(--color-border)',
                        padding: '4px 10px',
                        color: 'var(--color-text)',
                      }}
                    >
                      {era.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Source */}
        <div className="fsg-meta-row">
          <span>Data source</span>
          <span>{wizardState.isUserGenerated ? 'User-generated' : 'Wikidata'}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3" style={{ paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
          <button
            onClick={goBack}
            className="flex-1 hover:opacity-70 transition-opacity"
            style={{
              padding: '14px',
              background: 'none',
              border: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            Back
          </button>
          <button
            onClick={handleConfirmCreate}
            className="flex-1 hover:opacity-80 transition-opacity"
            style={{
              padding: '14px',
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Confirm &amp; Create
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: STEP 4 - CREATING
  // ============================================================================

  const renderCreatingStep = () => (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '28px',
          fontWeight: 300,
          color: 'var(--color-text)',
          marginBottom: '8px',
        }}
      >
        Creating Entity...
      </h2>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
        Please wait while we add this to Fictotum
      </p>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 40px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '42px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            Add to Fictotum
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
            Contributing historical figures and media works
          </p>
        </div>

        {/* Progress Indicator */}
        {wizardState.step !== 'search' && renderProgressBar()}

        {/* Step Content */}
        <div style={{ border: '1px solid var(--color-border)', padding: '32px' }}>
          {wizardState.step === 'search' && renderSearchStep()}
          {wizardState.step === 'entity-type' && renderEntityTypeStep()}
          {wizardState.step === 'figure-form' && renderFigureFormStep()}
          {wizardState.step === 'settings' && renderSettingsStep()}
          {wizardState.step === 'confirm' && renderConfirmStep()}
          {wizardState.step === 'creating' && renderCreatingStep()}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="hidden md:block" style={{ marginTop: '24px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', letterSpacing: '1px' }}>
            Tab to navigate &middot; Enter to select &middot; Escape to go back
          </p>
        </div>
      </div>

      {/* Creator Works Modal */}
      {creatorModalOpen && selectedCreator && (
        <CreatorWorksView
          creatorQid={selectedCreator.qid}
          creatorName={selectedCreator.label}
          creatorBirthYear={selectedCreator.enrichedData?.birth_year}
          creatorDeathYear={selectedCreator.enrichedData?.death_year}
          onClose={() => {
            setCreatorModalOpen(false);
            setSelectedCreator(null);
          }}
          onComplete={handleCreatorWorksComplete}
        />
      )}
    </div>
  );
}
