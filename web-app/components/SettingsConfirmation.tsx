'use client';

import { useState } from 'react';
import { MapPin, Calendar, Plus, ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Loader2, X, Info } from 'lucide-react';
import LocationPicker from './LocationPicker';
import EraTagPicker from './EraTagPicker';
import type {
  Location,
  EraTag,
  EnrichedEntity,
  SettingsConfirmationProps,
  UnmappedLocation
} from '@/types/contribute';

// ============================================================================
// TYPES
// ============================================================================

interface SuggestedLocation {
  name: string;
  wikidataId?: string;
  notes?: string;
  validationStatus?: 'validating' | 'valid' | 'uncertain' | 'invalid';
  validationConfidence?: number;
  validationReasoning?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SettingsConfirmation({
  enrichedData,
  entityType = 'work',
  onConfirm,
  onBack
}: SettingsConfirmationProps) {

  // State for selected locations and era tags
  const [selectedLocations, setSelectedLocations] = useState<string[]>(
    enrichedData.suggestedLocations?.filter(l => l.confidence > 0.7).map(l => l.id) || []
  );
  const [selectedEras, setSelectedEras] = useState<EraTag[]>(
    enrichedData.suggestedEras?.filter(e => e.confidence > 0.5) || []
  );

  // State for pickers
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showEraTagPicker, setShowEraTagPicker] = useState(false);

  // State for unmapped locations
  const [unmappedActions, setUnmappedActions] = useState<Record<string, { action: 'skip' | 'flag' | 'map'; mappedTo?: string }>>(
    Object.fromEntries(
      (enrichedData.unmappedLocations || []).map(l => [l.wikidata_id, { action: 'skip' }])
    )
  );

  // State for user-suggested locations
  const [suggestedUserLocations, setSuggestedUserLocations] = useState<SuggestedLocation[]>([]);

  const suggestedLocations = enrichedData.suggestedLocations || [];
  const suggestedEras = enrichedData.suggestedEras || [];
  const unmappedLocations = enrichedData.unmappedLocations || [];
  const settingYear = enrichedData.settingYear;

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const toggleEra = (era: EraTag) => {
    setSelectedEras(prev => {
      const exists = prev.find(e => e.name === era.name);
      return exists
        ? prev.filter(e => e.name !== era.name)
        : [...prev, era];
    });
  };

  const addManualLocation = (locationId: string) => {
    if (!selectedLocations.includes(locationId)) {
      setSelectedLocations(prev => [...prev, locationId]);
    }
    setShowLocationPicker(false);
  };

  const addManualEra = (eraName: string, confidence: number) => {
    const newEra: EraTag = { name: eraName, confidence, source: 'user' };
    setSelectedEras(prev => {
      const exists = prev.find(e => e.name === eraName);
      return exists ? prev : [...prev, newEra];
    });
    setShowEraTagPicker(false);
  };

  // Handler for user-suggested locations
  const handleSuggestLocation = async (suggestion: { name: string; wikidataId?: string; notes?: string }) => {
    // Add suggestion with "validating" status
    const newSuggestion: SuggestedLocation = {
      ...suggestion,
      validationStatus: 'validating'
    };
    setSuggestedUserLocations(prev => [...prev, newSuggestion]);
    setShowLocationPicker(false);

    // Call AI validation API
    try {
      const response = await fetch('/api/ai/validate-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: suggestion.name,
          wikidataId: suggestion.wikidataId,
          workTitle: 'the current work', // TODO: Get from context
          workYear: enrichedData.settingYear,
          notes: suggestion.notes
        })
      });

      if (!response.ok) {
        throw new Error('Validation API failed');
      }

      const validation = await response.json();

      // Update suggestion with validation result
      setSuggestedUserLocations(prev =>
        prev.map(loc =>
          loc.name === suggestion.name && loc.wikidataId === suggestion.wikidataId
            ? {
                ...loc,
                validationStatus: validation.valid
                  ? validation.confidence >= 0.7
                    ? 'valid'
                    : 'uncertain'
                  : 'invalid',
                validationConfidence: validation.confidence,
                validationReasoning: validation.reasoning,
                wikidataId: validation.wikidataId || loc.wikidataId
              }
            : loc
        )
      );
    } catch (error) {
      console.error('Location validation failed:', error);
      // Mark as uncertain if validation fails
      setSuggestedUserLocations(prev =>
        prev.map(loc =>
          loc.name === suggestion.name && loc.wikidataId === suggestion.wikidataId
            ? { ...loc, validationStatus: 'uncertain', validationReasoning: 'Validation service unavailable' }
            : loc
        )
      );
    }
  };

  const removeSuggestedLocation = (name: string) => {
    setSuggestedUserLocations(prev => prev.filter(loc => loc.name !== name));
  };

  const handleConfirm = () => {
    const unmappedLocationActions = Object.entries(unmappedActions).map(([wikidata_id, action]) => ({
      wikidata_id,
      ...action
    }));

    // Include user-suggested locations that are valid or uncertain (allow user override)
    const suggestedLocationActions = suggestedUserLocations
      .filter(loc => loc.validationStatus === 'valid' || loc.validationStatus === 'uncertain')
      .map(loc => ({
        action: 'suggest' as const,
        name: loc.name,
        wikidata_id: loc.wikidataId,
        notes: loc.notes,
        validationConfidence: loc.validationConfidence,
        validationReasoning: loc.validationReasoning
      }));

    onConfirm({
      locations: selectedLocations,
      eraTags: selectedEras,
      unmappedLocationActions: [...unmappedLocationActions, ...suggestedLocationActions]
    });
  };

  // ============================================================================
  // VALIDATION STATUS BADGE
  // ============================================================================

  const getValidationBadge = (status?: 'validating' | 'valid' | 'uncertain' | 'invalid') => {
    switch (status) {
      case 'validating':
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300 rounded text-xs font-medium flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Validating...
          </span>
        );
      case 'valid':
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Validated
          </span>
        );
      case 'uncertain':
        return (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Uncertain
          </span>
        );
      case 'invalid':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-xs font-medium flex items-center gap-1">
            <X className="w-3 h-3" />
            Invalid
          </span>
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // CONFIDENCE BADGE
  // ============================================================================

  const getConfidenceBadge = (confidence: number) => {
    if (confidence > 0.8) {
      return (
        <span className="px-2 py-0.5 bg-green-100 text-green-800 border border-green-300 rounded text-xs font-medium flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          High
        </span>
      );
    } else if (confidence >= 0.5) {
      return (
        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded text-xs font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Medium
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-300 rounded text-xs font-medium flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Low
        </span>
      );
    }
  };

  // ============================================================================
  // RENDER: LOCATIONS SECTION
  // ============================================================================

  const renderLocationsSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-primary" />
          <h3 className="text-lg font-semibold text-brand-primary">Locations</h3>
        </div>
        <button
          onClick={() => setShowLocationPicker(true)}
          className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {suggestedLocations.length > 0 ? (
        <div className="space-y-2">
          {suggestedLocations.map((location) => (
            <label
              key={location.id}
              className="flex items-start gap-3 p-3 bg-white border border-brand-primary/20 rounded-lg hover:bg-brand-primary/5 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedLocations.includes(location.id)}
                onChange={() => toggleLocation(location.id)}
                className="mt-1 h-4 w-4 rounded border-brand-primary/30 text-brand-accent focus:ring-brand-accent"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-brand-text">{location.name}</p>
                  {getConfidenceBadge(location.confidence)}
                </div>
                {location.modern_name && location.modern_name !== location.name && (
                  <p className="text-xs text-brand-text/60 mt-1">
                    Modern: {location.modern_name}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-brand-primary/5 border border-dashed border-brand-primary/30 rounded-lg text-center">
          <p className="text-sm text-brand-text/60">No locations suggested by AI</p>
          <p className="text-xs text-brand-text/50 mt-1">Click "Add Location" to add manually</p>
        </div>
      )}

      {/* User-suggested locations */}
      {suggestedUserLocations.length > 0 && (
        <div className="space-y-2 mt-4">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-brand-text/70">New Locations (Will Be Created)</h4>
            <div className="group relative">
              <Info className="w-4 h-4 text-brand-text/40 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-brand-text text-white text-xs rounded shadow-lg z-10">
                These locations don't exist in the database yet. They'll be automatically created when you click Continue.
              </div>
            </div>
          </div>
          {suggestedUserLocations.map((loc) => (
            <div
              key={loc.name}
              className="p-3 bg-green-50 border-2 border-green-200 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="font-medium text-brand-text">{loc.name}</p>
                    {getValidationBadge(loc.validationStatus)}
                  </div>
                  {loc.wikidataId && (
                    <p className="text-xs text-brand-text/60 mt-1 ml-6">Wikidata: {loc.wikidataId}</p>
                  )}
                  {loc.validationReasoning && loc.validationStatus !== 'validating' && (
                    <p className="text-xs text-brand-text/60 mt-1 ml-6 italic">{loc.validationReasoning}</p>
                  )}
                  {loc.validationStatus === 'invalid' && (
                    <p className="text-xs text-red-700 mt-2 ml-6 font-medium">
                      ⚠️ This location was marked as invalid and will NOT be created.
                    </p>
                  )}
                  {loc.validationStatus === 'valid' && (
                    <p className="text-xs text-green-700 mt-2 ml-6 font-medium">
                      ✓ This location will be created in the database when you continue.
                    </p>
                  )}
                  {loc.validationStatus === 'uncertain' && (
                    <p className="text-xs text-yellow-700 mt-2 ml-6 font-medium">
                      ⚠️ Validation uncertain. This location will still be created if you continue.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeSuggestedLocation(loc.name)}
                  className="p-1 hover:bg-red-50 rounded transition-colors"
                  aria-label="Remove suggestion"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLocations.length === 0 && suggestedUserLocations.filter(l => l.validationStatus !== 'invalid').length === 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">
            No locations selected. This work will not appear in location-based searches.
          </p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER: ERA TAGS SECTION
  // ============================================================================

  const renderEraTagsSection = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-primary" />
          <h3 className="text-lg font-semibold text-brand-primary">Era Tags</h3>
        </div>
        <button
          onClick={() => setShowEraTagPicker(true)}
          className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Era Tag
        </button>
      </div>

      {/* AI-Suggested Eras */}
      {suggestedEras.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-brand-text/70">AI Suggestions</h4>
          {suggestedEras.map((era) => (
            <label
              key={era.name}
              className="flex items-start gap-3 p-3 bg-white border border-brand-primary/20 rounded-lg hover:bg-brand-primary/5 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedEras.some(e => e.name === era.name)}
                onChange={() => toggleEra(era)}
                className="mt-1 h-4 w-4 rounded border-brand-primary/30 text-brand-accent focus:ring-brand-accent"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-brand-text">{era.name}</p>
                  {getConfidenceBadge(era.confidence)}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Currently Selected Eras */}
      {selectedEras.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium text-brand-text/70">Selected Era Tags ({selectedEras.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedEras.map((era) => (
              <div
                key={era.name}
                className="px-3 py-2 bg-brand-accent/10 border border-brand-accent/30 rounded-lg flex items-center gap-2"
              >
                <Calendar className="w-4 h-4 text-brand-accent" />
                <span className="text-sm font-medium text-brand-text">{era.name}</span>
                <button
                  onClick={() => toggleEra(era)}
                  className="ml-1 p-0.5 hover:bg-red-50 rounded transition-colors"
                  aria-label={`Remove ${era.name}`}
                >
                  <X className="w-3.5 h-3.5 text-red-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestedEras.length === 0 && selectedEras.length === 0 && (
        <div className="p-4 bg-brand-primary/5 border border-dashed border-brand-primary/30 rounded-lg text-center">
          <p className="text-sm text-brand-text/60">No era tags yet</p>
          <p className="text-xs text-brand-text/50 mt-1">Click "Add Era Tag" to add one</p>
        </div>
      )}

      {selectedEras.length === 0 && suggestedEras.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800">
            No era tags selected. This work will not appear in era-based searches.
          </p>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // RENDER: UNMAPPED LOCATIONS SECTION
  // ============================================================================

  const renderUnmappedLocationsSection = () => {
    if (unmappedLocations.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <h3 className="text-lg font-semibold text-brand-primary">Unmapped Locations</h3>
        </div>
        <p className="text-sm text-brand-text/70">
          These locations from Wikidata are not yet in ChronosGraph. Choose how to handle them:
        </p>

        <div className="space-y-2">
          {unmappedLocations.map((location) => (
            <div
              key={location.wikidata_id}
              className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2"
            >
              <div>
                <p className="font-medium text-brand-text">{location.name}</p>
                {location.modern_name && location.modern_name !== location.name && (
                  <p className="text-xs text-brand-text/60">Modern: {location.modern_name}</p>
                )}
                <p className="text-xs text-brand-text/50 font-mono mt-1">{location.wikidata_id}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUnmappedActions(prev => ({ ...prev, [location.wikidata_id]: { action: 'skip' } }))}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    unmappedActions[location.wikidata_id]?.action === 'skip'
                      ? 'bg-brand-primary text-white'
                      : 'bg-white border border-brand-primary/30 text-brand-text hover:bg-brand-primary/5'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={() => setUnmappedActions(prev => ({ ...prev, [location.wikidata_id]: { action: 'flag' } }))}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    unmappedActions[location.wikidata_id]?.action === 'flag'
                      ? 'bg-brand-accent text-white'
                      : 'bg-white border border-brand-primary/30 text-brand-text hover:bg-brand-primary/5'
                  }`}
                >
                  Flag for Admin
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  // For figures, skip settings entirely
  if (entityType === 'figure') {
    return (
      <div className="text-center py-8">
        <p className="text-brand-text/60">Figures don't require location or era configuration.</p>
        <button
          onClick={handleConfirm}
          className="mt-4 px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold rounded-lg flex items-center justify-center gap-2 mx-auto transition-colors shadow-sm"
        >
          <CheckCircle2 className="w-5 h-5" />
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-primary mb-2">
            Configure Settings
          </h2>
          <p className="text-brand-text/70">
            Select locations and era tags for this media work
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-brand-text hover:text-brand-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Locations Section */}
      {renderLocationsSection()}

      {/* Era Tags Section */}
      {renderEraTagsSection()}

      {/* Unmapped Locations Section */}
      {renderUnmappedLocationsSection()}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-brand-primary/10">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 bg-white border border-brand-primary/30 text-brand-text font-semibold rounded-lg hover:bg-brand-primary/5 transition-colors min-h-[48px] sm:min-h-0"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm min-h-[48px] sm:min-h-0"
        >
          Continue
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={addManualLocation}
          onCancel={() => setShowLocationPicker(false)}
          excludeIds={selectedLocations}
          onSuggestLocation={handleSuggestLocation}
        />
      )}

      {/* Era Tag Picker Modal */}
      {showEraTagPicker && (
        <EraTagPicker
          onSelect={addManualEra}
          onCancel={() => setShowEraTagPicker(false)}
          settingYear={settingYear}
          excludeTags={selectedEras.map(e => e.name)}
        />
      )}
    </div>
  );
}
