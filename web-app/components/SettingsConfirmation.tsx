'use client';

import { useState } from 'react';
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
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)',
            border: '1px solid var(--color-border)',
            padding: '4px 8px'
          }}>
            Validating...
          </span>
        );
      case 'valid':
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border-bold)',
            padding: '4px 8px'
          }}>
            Validated
          </span>
        );
      case 'uncertain':
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)',
            border: '1px solid var(--color-border)',
            padding: '4px 8px'
          }}>
            Uncertain
          </span>
        );
      case 'invalid':
        return (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent)',
            padding: '4px 8px'
          }}>
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
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'var(--color-text)',
          border: '1px solid var(--color-border-bold)',
          padding: '4px 8px'
        }}>
          High
        </span>
      );
    } else if (confidence >= 0.5) {
      return (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'var(--color-gray)',
          border: '1px solid var(--color-border)',
          padding: '4px 8px'
        }}>
          Medium
        </span>
      );
    } else {
      return (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: 'var(--color-accent)',
          border: '1px solid var(--color-accent)',
          padding: '4px 8px'
        }}>
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
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: '28px',
          color: 'var(--color-text)'
        }}>
          Locations
        </h3>
        <button
          onClick={() => setShowLocationPicker(true)}
          style={{
            border: '1px solid var(--color-border)',
            background: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '14px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
        >
          Add Location
        </button>
      </div>

      {suggestedLocations.length > 0 ? (
        <div className="space-y-2">
          {suggestedLocations.map((location) => (
            <label
              key={location.id}
              className="flex items-start gap-3 cursor-pointer"
              style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}
            >
              <input
                type="checkbox"
                checked={selectedLocations.includes(location.id)}
                onChange={() => toggleLocation(location.id)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p style={{ fontWeight: 500, color: 'var(--color-text)' }}>{location.name}</p>
                  {getConfidenceBadge(location.confidence)}
                </div>
                {location.modern_name && location.modern_name !== location.name && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-gray)',
                    marginTop: '4px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    Modern: {location.modern_name}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div style={{
          border: '1px dashed var(--color-border)',
          padding: '16px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-gray)' }}>No locations suggested by AI</p>
          <p style={{ fontSize: '12px', color: 'var(--color-gray)', marginTop: '4px' }}>Click "Add Location" to add manually</p>
        </div>
      )}

      {/* User-suggested locations */}
      {suggestedUserLocations.length > 0 && (
        <div className="space-y-2" style={{ marginTop: '16px' }}>
          <div className="flex items-center gap-2">
            <h4 style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)'
            }}>
              New Locations (Will Be Created)
            </h4>
            <div className="group relative">
              <span style={{
                fontSize: '12px',
                color: 'var(--color-gray)',
                cursor: 'help',
                fontFamily: 'var(--font-mono)'
              }}>
                [?]
              </span>
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 z-10" style={{
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)'
              }}>
                These locations don't exist in the database yet. They'll be automatically created when you click Continue.
              </div>
            </div>
          </div>
          {suggestedUserLocations.map((loc) => (
            <div
              key={loc.name}
              style={{
                borderLeft: '4px solid var(--color-accent)',
                background: 'var(--color-section-bg)',
                padding: '12px 16px'
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--color-accent)'
                    }}>
                      +
                    </span>
                    <p style={{ fontWeight: 500, color: 'var(--color-text)' }}>{loc.name}</p>
                    {getValidationBadge(loc.validationStatus)}
                  </div>
                  {loc.wikidataId && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-gray)',
                      marginTop: '4px',
                      marginLeft: '24px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      Wikidata: {loc.wikidataId}
                    </p>
                  )}
                  {loc.validationReasoning && loc.validationStatus !== 'validating' && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-gray)',
                      marginTop: '4px',
                      marginLeft: '24px',
                      fontStyle: 'italic'
                    }}>
                      {loc.validationReasoning}
                    </p>
                  )}
                  {loc.validationStatus === 'invalid' && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-accent)',
                      marginTop: '8px',
                      marginLeft: '24px',
                      fontWeight: 500
                    }}>
                      This location was marked as invalid and will NOT be created.
                    </p>
                  )}
                  {loc.validationStatus === 'valid' && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-text)',
                      marginTop: '8px',
                      marginLeft: '24px',
                      fontWeight: 500
                    }}>
                      This location will be created in the database when you continue.
                    </p>
                  )}
                  {loc.validationStatus === 'uncertain' && (
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--color-gray)',
                      marginTop: '8px',
                      marginLeft: '24px',
                      fontWeight: 500
                    }}>
                      Validation uncertain. This location will still be created if you continue.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeSuggestedLocation(loc.name)}
                  style={{
                    padding: '4px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    color: 'var(--color-accent)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '16px'
                  }}
                  aria-label="Remove suggestion"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedLocations.length === 0 && suggestedUserLocations.filter(l => l.validationStatus !== 'invalid').length === 0 && (
        <div className="flex items-start gap-2" style={{
          borderLeft: '4px solid var(--color-accent)',
          background: 'var(--color-section-bg)',
          padding: '12px 16px'
        }}>
          <span style={{
            fontSize: '14px',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0
          }}>
            !
          </span>
          <p style={{
            fontSize: '12px',
            color: 'var(--color-text)'
          }}>
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
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: '28px',
          color: 'var(--color-text)'
        }}>
          Era Tags
        </h3>
        <button
          onClick={() => setShowEraTagPicker(true)}
          style={{
            border: '1px solid var(--color-border)',
            background: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '14px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
        >
          Add Era Tag
        </button>
      </div>

      {/* AI-Suggested Eras */}
      {suggestedEras.length > 0 && (
        <div className="space-y-2">
          <h4 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)'
          }}>
            AI Suggestions
          </h4>
          {suggestedEras.map((era) => (
            <label
              key={era.name}
              className="flex items-start gap-3 cursor-pointer"
              style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)'
              }}
            >
              <input
                type="checkbox"
                checked={selectedEras.some(e => e.name === era.name)}
                onChange={() => toggleEra(era)}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p style={{ fontWeight: 500, color: 'var(--color-text)' }}>{era.name}</p>
                  {getConfidenceBadge(era.confidence)}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Currently Selected Eras */}
      {selectedEras.length > 0 && (
        <div className="space-y-2" style={{ marginTop: '16px' }}>
          <h4 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)'
          }}>
            Selected Era Tags ({selectedEras.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedEras.map((era) => (
              <div
                key={era.name}
                className="flex items-center gap-2"
                style={{
                  padding: '12px 16px',
                  border: '1px solid var(--color-border-bold)',
                  background: 'var(--color-bg)'
                }}
              >
                <span style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--color-text)'
                }}>
                  {era.name}
                </span>
                <button
                  onClick={() => toggleEra(era)}
                  style={{
                    marginLeft: '4px',
                    padding: '2px',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    color: 'var(--color-accent)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '16px'
                  }}
                  aria-label={`Remove ${era.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestedEras.length === 0 && selectedEras.length === 0 && (
        <div style={{
          border: '1px dashed var(--color-border)',
          padding: '16px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '14px', color: 'var(--color-gray)' }}>No era tags yet</p>
          <p style={{ fontSize: '12px', color: 'var(--color-gray)', marginTop: '4px' }}>Click "Add Era Tag" to add one</p>
        </div>
      )}

      {selectedEras.length === 0 && suggestedEras.length > 0 && (
        <div className="flex items-start gap-2" style={{
          borderLeft: '4px solid var(--color-accent)',
          background: 'var(--color-section-bg)',
          padding: '12px 16px'
        }}>
          <span style={{
            fontSize: '14px',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0
          }}>
            !
          </span>
          <p style={{
            fontSize: '12px',
            color: 'var(--color-text)'
          }}>
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
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: '28px',
          color: 'var(--color-text)'
        }}>
          Unmapped Locations
        </h3>
        <p style={{
          fontSize: '14px',
          color: 'var(--color-gray)'
        }}>
          These locations from Wikidata are not yet in Fictotum. Choose how to handle them:
        </p>

        <div className="space-y-2">
          {unmappedLocations.map((location) => (
            <div
              key={location.wikidata_id}
              className="space-y-2"
              style={{
                borderLeft: '4px solid var(--color-accent)',
                background: 'var(--color-section-bg)',
                padding: '12px 16px'
              }}
            >
              <div>
                <p style={{ fontWeight: 500, color: 'var(--color-text)' }}>{location.name}</p>
                {location.modern_name && location.modern_name !== location.name && (
                  <p style={{
                    fontSize: '12px',
                    color: 'var(--color-gray)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    Modern: {location.modern_name}
                  </p>
                )}
                <p style={{
                  fontSize: '12px',
                  color: 'var(--color-gray)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: '4px'
                }}>
                  {location.wikidata_id}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setUnmappedActions(prev => ({ ...prev, [location.wikidata_id]: { action: 'skip' } }))}
                  style={
                    unmappedActions[location.wikidata_id]?.action === 'skip'
                      ? {
                          background: 'var(--color-text)',
                          color: 'var(--color-bg)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          padding: '14px',
                          border: 'none',
                          cursor: 'pointer'
                        }
                      : {
                          border: '1px solid var(--color-border)',
                          background: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          padding: '14px',
                          cursor: 'pointer',
                          color: 'var(--color-text)',
                          textTransform: 'uppercase',
                          letterSpacing: '2px'
                        }
                  }
                >
                  Skip
                </button>
                <button
                  onClick={() => setUnmappedActions(prev => ({ ...prev, [location.wikidata_id]: { action: 'flag' } }))}
                  style={
                    unmappedActions[location.wikidata_id]?.action === 'flag'
                      ? {
                          background: 'var(--color-text)',
                          color: 'var(--color-bg)',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '2px',
                          padding: '14px',
                          border: 'none',
                          cursor: 'pointer'
                        }
                      : {
                          border: '1px solid var(--color-border)',
                          background: 'none',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '12px',
                          padding: '14px',
                          cursor: 'pointer',
                          color: 'var(--color-text)',
                          textTransform: 'uppercase',
                          letterSpacing: '2px'
                        }
                  }
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
      <div className="text-center" style={{ padding: '32px 0' }}>
        <p style={{ color: 'var(--color-gray)' }}>Figures don't require location or era configuration.</p>
        <button
          onClick={handleConfirm}
          className="flex items-center justify-center gap-2 mx-auto"
          style={{
            marginTop: '16px',
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            padding: '14px 24px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
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
          <h2 style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: '28px',
            color: 'var(--color-text)',
            marginBottom: '8px'
          }}>
            Configure Settings
          </h2>
          <p style={{
            color: 'var(--color-gray)'
          }}>
            Select locations and era tags for this media work
          </p>
        </div>
        <button
          onClick={onBack}
          className="flex items-center gap-2"
          style={{
            padding: '8px 16px',
            color: 'var(--color-text)',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
        >
          ← Back
        </button>
      </div>

      {/* Locations Section */}
      {renderLocationsSection()}

      {/* Era Tags Section */}
      {renderEraTagsSection()}

      {/* Unmapped Locations Section */}
      {renderUnmappedLocationsSection()}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3" style={{
        paddingTop: '16px',
        borderTop: '1px solid var(--color-border)'
      }}>
        <button
          onClick={onBack}
          className="flex-1 min-h-[48px] sm:min-h-0"
          style={{
            border: '1px solid var(--color-border)',
            background: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            padding: '14px',
            cursor: 'pointer',
            color: 'var(--color-text)',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] sm:min-h-0"
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            padding: '14px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Continue →
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
