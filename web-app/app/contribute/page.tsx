'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Settings as SettingsIcon,
  CheckCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  User,
  Film,
  MapPin,
  Calendar,
  Globe,
  AlertCircle,
  Clock,
  Info
} from 'lucide-react';
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
      // Parallel search: ChronosGraph DB + Wikidata (both works and figures)
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

      // Step 2: Map Wikidata locations to ChronosGraph locations
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
        <div key={i} className="p-4 bg-white border border-brand-primary/20 rounded-lg">
          <div className="h-5 bg-brand-primary/10 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-brand-primary/10 rounded w-1/2"></div>
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-brand-text/60">
            Step {currentStep} of {totalSteps}
          </p>
          <p className="text-sm text-brand-text/60">
            {Math.round(progress)}% complete
          </p>
        </div>
        <div className="w-full bg-brand-primary/10 rounded-full h-2">
          <div
            className="bg-brand-accent h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
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
        <h2 className="text-2xl font-bold text-brand-primary mb-2">
          What would you like to add?
        </h2>
        <p className="text-brand-text/70">
          Search for a historical figure or media work to add to ChronosGraph
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-text/40" />
          <input
            type="text"
            value={wizardState.searchQuery}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search by name or title..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-brand-primary/30 rounded-lg text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-transparent transition-shadow"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-brand-accent animate-spin" />
          )}
        </div>

        <p className="text-xs text-brand-text/50">
          Start typing to search automatically, or press Enter
        </p>
      </form>

      {/* Error Display */}
      {wizardState.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{wizardState.error}</p>
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
        <h2 className="text-2xl font-bold text-brand-primary mb-2">
          What type of entity are you creating?
        </h2>
        <p className="text-brand-text/70">
          Choose whether you're adding a historical figure or a media work
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Figure Option */}
        <button
          onClick={() => handleEntityTypeSelection('figure')}
          className="p-6 bg-white border-2 border-brand-primary/20 rounded-lg hover:border-brand-accent hover:shadow-lg transition-all duration-200 text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-lg group-hover:bg-brand-accent/10 transition-colors">
              <User className="w-6 h-6 text-brand-primary group-hover:text-brand-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-brand-text group-hover:text-brand-accent transition-colors">
                Historical Figure
              </h3>
              <p className="text-sm text-brand-text/60 mt-1">
                A real or fictional person who appears in media works
              </p>
              <p className="text-xs text-brand-text/50 mt-2">
                Example: Napoleon Bonaparte, Sherlock Holmes
              </p>
            </div>
          </div>
        </button>

        {/* Work Option */}
        <button
          onClick={() => handleEntityTypeSelection('work')}
          className="p-6 bg-white border-2 border-brand-primary/20 rounded-lg hover:border-brand-accent hover:shadow-lg transition-all duration-200 text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-lg group-hover:bg-brand-accent/10 transition-colors">
              <Film className="w-6 h-6 text-brand-primary group-hover:text-brand-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-brand-text group-hover:text-brand-accent transition-colors">
                Media Work
              </h3>
              <p className="text-sm text-brand-text/60 mt-1">
                A book, film, game, or TV series
              </p>
              <p className="text-xs text-brand-text/50 mt-2">
                Example: War and Peace, The Crown, Assassin's Creed
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="flex justify-start">
        <button
          onClick={goBack}
          className="px-4 py-2 text-brand-text/60 hover:text-brand-text transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
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

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-brand-primary mb-2">
            Create Historical Figure
          </h2>
          <p className="text-brand-text/70">
            Provide details about <span className="font-semibold">{wizardState.searchQuery}</span>
          </p>
        </div>

        {formError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{formError}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Historicity Field (Required) */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-2">
              Historicity <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['Historical', 'Fictional', 'Disputed'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setFormData(prev => ({ ...prev, historicity: option }))}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    formData.historicity === option
                      ? 'border-brand-accent bg-brand-accent/10 text-brand-accent font-medium'
                      : 'border-brand-primary/20 text-brand-text hover:border-brand-primary/40'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="text-xs text-brand-text/50 mt-2">
              Was this person real (Historical), fictional (Fictional), or is their existence debated (Disputed)?
            </p>
          </div>

          {/* Birth Year */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Birth Year (Optional)
            </label>
            <input
              type="number"
              value={formData.birth_year}
              onChange={(e) => setFormData(prev => ({ ...prev, birth_year: e.target.value }))}
              placeholder="e.g., 1769"
              className="w-full px-3 py-2 bg-white border border-brand-primary/30 rounded-md text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </div>

          {/* Death Year */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Death Year (Optional)
            </label>
            <input
              type="number"
              value={formData.death_year}
              onChange={(e) => setFormData(prev => ({ ...prev, death_year: e.target.value }))}
              placeholder="e.g., 1821"
              className="w-full px-3 py-2 bg-white border border-brand-primary/30 rounded-md text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description or context about this figure..."
              rows={3}
              className="w-full px-3 py-2 bg-white border border-brand-primary/30 rounded-md text-brand-text placeholder-brand-text/40 focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={goBack}
            className="px-4 py-2 text-brand-text/60 hover:text-brand-text transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
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
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-brand-accent animate-spin mx-auto mb-4" />
          <p className="text-brand-text/60">Loading settings...</p>
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-brand-primary mb-2">
              Confirm & Create
            </h2>
            <p className="text-brand-text/70">
              Review the details before adding to ChronosGraph
            </p>
          </div>
        </div>

        {/* Error Display */}
        {wizardState.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{wizardState.error}</p>
          </div>
        )}

        {/* Preview Card */}
        <div className="bg-white p-6 rounded-lg border border-brand-primary/20 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            {wizardState.entityType === 'figure' ? (
              <User className="w-8 h-8 text-brand-primary" />
            ) : (
              <Film className="w-8 h-8 text-brand-primary" />
            )}
            <div className="flex-1">
              <p className="text-sm text-brand-text/60 uppercase tracking-wider">
                {wizardState.entityType}
              </p>
              <h3 className="text-lg font-semibold text-brand-text">
                {entityName}
              </h3>
            </div>
            {!wizardState.isUserGenerated && (
              <div className="px-3 py-1 bg-green-100 border border-green-300 text-green-800 rounded text-xs font-medium">
                Wikidata Verified
              </div>
            )}
          </div>

          <div className="space-y-3 text-sm">
            {/* Wikidata Q-ID */}
            {match && (
              <div className="flex items-center gap-2 text-brand-text/70">
                <Globe className="w-4 h-4" />
                <span className="font-mono">{match.qid}</span>
              </div>
            )}

            {/* Birth/Death years for figures */}
            {wizardState.entityType === 'figure' && wizardState.settings.customFields?.birth_year && (
              <div className="flex items-center gap-2 text-brand-text/70">
                <Calendar className="w-4 h-4" />
                <span>
                  {wizardState.settings.customFields.birth_year} - {wizardState.settings.customFields.death_year || 'present'}
                </span>
              </div>
            )}

            {/* Release/Setting year for works */}
            {wizardState.entityType === 'work' && wizardState.enrichedData?.metadata?.release_year && (
              <div className="flex items-center gap-2 text-brand-text/70">
                <Calendar className="w-4 h-4" />
                <div className="flex items-center gap-1">
                  <span>Publication/Release Year: {wizardState.enrichedData.metadata.release_year}</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-brand-text/40 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-brand-text text-white text-xs rounded shadow-lg z-10">
                      When the work was originally published or released
                    </div>
                  </div>
                </div>
              </div>
            )}

            {wizardState.entityType === 'work' && wizardState.enrichedData?.settingYear && (
              <div className="flex items-center gap-2 text-brand-text/70">
                <Clock className="w-4 h-4" />
                <div className="flex items-center gap-1">
                  <span>Setting Year/Period: {wizardState.enrichedData.settingYear}</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-brand-text/40 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-brand-text text-white text-xs rounded shadow-lg z-10">
                      When the story takes place (e.g., "1984" was published in 1949 but set in 1984)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Locations */}
            {wizardState.settings.locations.length > 0 && (
              <div className="pt-3 border-t border-brand-primary/10">
                <div className="flex items-center gap-2 text-brand-text/70 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Locations ({wizardState.settings.locations.length})</span>
                </div>
                <div className="ml-6 space-y-1">
                  {wizardState.enrichedData?.suggestedLocations
                    ?.filter(loc => wizardState.settings.locations.includes(loc.id))
                    .map(loc => (
                      <div key={loc.id} className="text-xs text-brand-text/60">
                        • {loc.name}
                        {loc.modern_name && loc.modern_name !== loc.name && ` (${loc.modern_name})`}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Era Tags */}
            {wizardState.settings.eraTags.length > 0 && (
              <div className="pt-3 border-t border-brand-primary/10">
                <div className="flex items-center gap-2 text-brand-text/70 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Era Tags ({wizardState.settings.eraTags.length})</span>
                </div>
                <div className="ml-6 flex flex-wrap gap-2">
                  {wizardState.settings.eraTags.map(era => (
                    <span
                      key={era.name}
                      className="px-2 py-1 bg-brand-primary/10 text-brand-primary rounded text-xs"
                    >
                      {era.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Source Badge */}
        <div className="flex items-center gap-2 text-xs text-brand-text/60">
          <span>Data source:</span>
          <span className="font-medium">
            {wizardState.isUserGenerated ? 'User-generated' : 'Wikidata'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={goBack}
            className="flex-1 px-6 py-3 bg-white border border-brand-primary/30 text-brand-text font-semibold rounded-lg hover:bg-brand-primary/5 transition-colors min-h-[48px] sm:min-h-0"
          >
            Back
          </button>
          <button
            onClick={handleConfirmCreate}
            className="flex-1 px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm min-h-[48px] sm:min-h-0"
          >
            <CheckCircle className="w-5 h-5" />
            Confirm & Create
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: STEP 4 - CREATING
  // ============================================================================

  const renderCreatingStep = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-accent/10 mb-6">
        <Loader2 className="w-8 h-8 text-brand-accent animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-brand-primary mb-2">
        Creating Entity...
      </h2>
      <p className="text-brand-text/70">
        Please wait while we add this to ChronosGraph
      </p>
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <PlusCircle className="w-6 h-6 md:w-8 md:h-8 text-brand-accent flex-shrink-0" />
            <h1 className="text-2xl md:text-3xl font-bold text-brand-primary">
              Add to ChronosGraph
            </h1>
          </div>
          <p className="text-sm md:text-base text-brand-text/70">
            Unified hub for contributing historical figures and media works
          </p>
        </div>

        {/* Progress Indicator */}
        {wizardState.step !== 'search' && renderProgressBar()}

        {/* Step Content */}
        <div className="bg-white p-4 md:p-8 rounded-lg border border-brand-primary/20 shadow-sm">
          {wizardState.step === 'search' && renderSearchStep()}
          {wizardState.step === 'entity-type' && renderEntityTypeStep()}
          {wizardState.step === 'figure-form' && renderFigureFormStep()}
          {wizardState.step === 'settings' && renderSettingsStep()}
          {wizardState.step === 'confirm' && renderConfirmStep()}
          {wizardState.step === 'creating' && renderCreatingStep()}
        </div>

        {/* Keyboard Shortcuts Hint - Hidden on mobile */}
        <div className="mt-6 text-center hidden md:block">
          <p className="text-xs text-brand-text/40">
            Tip: Use Tab to navigate, Enter to select, and Escape to go back
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
