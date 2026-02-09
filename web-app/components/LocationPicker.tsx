'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Location {
  location_id: string;
  name: string;
  modern_name?: string;
  time_period?: string;
  wikidata_id?: string;
  location_type?: string;
}

interface LocationPickerProps {
  onSelect: (locationId: string) => void;
  onCancel: () => void;
  excludeIds?: string[];
  onSuggestLocation?: (suggestion: {
    name: string;
    wikidataId?: string;
    notes?: string;
  }) => void;
}

interface LocationSuggestion {
  name: string;
  wikidataId: string;
  notes: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LocationPicker({
  onSelect,
  onCancel,
  excludeIds = [],
  onSuggestLocation
}: LocationPickerProps) {

  const [locations, setLocations] = useState<Location[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Suggestion modal state
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestion, setSuggestion] = useState<LocationSuggestion>({
    name: '',
    wikidataId: '',
    notes: ''
  });
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const suggestNameInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // FETCH LOCATIONS
  // ============================================================================

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use universal search endpoint to fetch locations
      const response = await fetch('/api/search/universal?q=&type=location&limit=500');

      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }

      const data = await response.json();
      const locationResults = data.results || [];

      // Transform search results to Location objects
      const transformedLocations: Location[] = locationResults.map((result: any) => ({
        location_id: result.id,
        name: result.name,
        modern_name: result.metadata?.modern_name,
        time_period: result.metadata?.time_period,
        wikidata_id: result.metadata?.wikidata_id,
        location_type: result.metadata?.location_type
      }));

      setLocations(transformedLocations);
      setFilteredLocations(transformedLocations.filter(l => !excludeIds.includes(l.location_id)));
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      setError('Failed to load locations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SEARCH FILTERING
  // ============================================================================

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLocations(locations.filter(l => !excludeIds.includes(l.location_id)));
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = locations.filter(location => {
      if (excludeIds.includes(location.location_id)) return false;

      const nameMatch = location.name.toLowerCase().includes(query);
      const modernNameMatch = location.modern_name?.toLowerCase().includes(query);
      const typeMatch = location.location_type?.toLowerCase().includes(query);

      return nameMatch || modernNameMatch || typeMatch;
    });

    setFilteredLocations(filtered);
    setSelectedIndex(0);
  }, [searchQuery, locations, excludeIds]);

  // ============================================================================
  // KEYBOARD NAVIGATION
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredLocations.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredLocations[selectedIndex]) {
          onSelect(filteredLocations[selectedIndex].location_id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredLocations, onSelect, onCancel]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Auto-focus suggestion modal name input when modal opens
  useEffect(() => {
    if (showSuggestModal) {
      suggestNameInputRef.current?.focus();
    }
  }, [showSuggestModal]);

  // ============================================================================
  // SUGGESTION MODAL HANDLERS
  // ============================================================================

  const handleOpenSuggestModal = () => {
    // Pre-fill suggestion name with current search query if available
    setSuggestion({
      name: searchQuery || '',
      wikidataId: '',
      notes: ''
    });
    setSuggestionError(null);
    setShowSuggestModal(true);
  };

  const handleCloseSuggestModal = () => {
    setShowSuggestModal(false);
    setSuggestion({ name: '', wikidataId: '', notes: '' });
    setSuggestionError(null);
  };

  const handleSubmitSuggestion = () => {
    setSuggestionError(null);

    // Client-side validation
    if (!suggestion.name.trim()) {
      setSuggestionError('Location name is required');
      return;
    }

    if (suggestion.name.trim().length < 2) {
      setSuggestionError('Location name must be at least 2 characters');
      return;
    }

    if (suggestion.name.trim().length > 100) {
      setSuggestionError('Location name must be less than 100 characters');
      return;
    }

    // Validate Wikidata Q-ID format if provided
    if (suggestion.wikidataId.trim() && !suggestion.wikidataId.trim().match(/^Q\d+$/)) {
      setSuggestionError('Wikidata ID must be in format Q12345 (uppercase Q followed by numbers)');
      return;
    }

    // Call parent handler if provided
    if (onSuggestLocation) {
      onSuggestLocation({
        name: suggestion.name.trim(),
        wikidataId: suggestion.wikidataId.trim() || undefined,
        notes: suggestion.notes.trim() || undefined
      });
    }

    // Close modal and reset form
    handleCloseSuggestModal();
  };

  // ============================================================================
  // RENDER: SUGGESTION MODAL
  // ============================================================================

  const renderSuggestionModal = () => {
    if (!showSuggestModal) return null;

    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4" style={{ background: 'rgba(26, 26, 26, 0.4)' }}>
        <div className="w-full max-w-md" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-bold)' }}>
          {/* Modal Header */}
          <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <h4 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '18px', color: 'var(--color-text)' }}>Suggest New Location</h4>
              <button
                onClick={handleCloseSuggestModal}
                className="p-1 transition-colors"
                aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                ✕
              </button>
            </div>
            <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
              Can't find the location you're looking for? Suggest it and we'll validate it.
            </p>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-4 space-y-4">
            {suggestionError && (
              <div className="p-3 flex items-start gap-2" style={{ background: 'var(--color-section-bg)', border: '1px solid var(--color-accent)' }}>
                <p style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{suggestionError}</p>
              </div>
            )}

            {/* Location Name */}
            <div>
              <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
                Location Name <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <input
                ref={suggestNameInputRef}
                type="text"
                value={suggestion.name}
                onChange={(e) => setSuggestion(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Paris, Narnia, Atlantis"
                className="w-full"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', padding: '10px 12px', border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text)', outline: 'none' }}
                maxLength={100}
              />
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
                {suggestion.name.length}/100 characters
              </p>
            </div>

            {/* Wikidata Q-ID (Optional) */}
            <div>
              <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
                Wikidata Q-ID (Optional)
              </label>
              <input
                type="text"
                value={suggestion.wikidataId}
                onChange={(e) => setSuggestion(prev => ({ ...prev, wikidataId: e.target.value }))}
                placeholder="e.g., Q90 (Paris)"
                className="w-full"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', padding: '10px 12px', border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text)', outline: 'none' }}
              />
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
                If you know the Wikidata identifier for this location, you can provide it here
              </p>
            </div>

            {/* Notes (Optional) */}
            <div>
              <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
                Notes (Optional)
              </label>
              <textarea
                value={suggestion.notes}
                onChange={(e) => setSuggestion(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional context about this location..."
                rows={2}
                className="w-full resize-none"
                style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', padding: '10px 12px', border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text)', outline: 'none' }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-section-bg)' }}>
            <button
              onClick={handleCloseSuggestModal}
              className="flex-1 transition-colors"
              style={{ border: '1px solid var(--color-border)', background: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '14px', cursor: 'pointer', color: 'var(--color-text)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitSuggestion}
              className="flex-1 transition-colors"
              style={{ background: 'var(--color-text)', color: 'var(--color-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', padding: '14px', border: 'none', cursor: 'pointer' }}
            >
              Suggest Location
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: LOCATION TYPE BADGE
  // ============================================================================

  const renderTypeBadge = (type?: string) => {
    if (!type) return null;

    return (
      <span className="px-2 py-0.5" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '1px', border: '1px solid var(--color-border)', color: 'var(--color-gray)' }}>
        {type}
      </span>
    );
  };

  // ============================================================================
  // RENDER: LOCATION ITEM
  // ============================================================================

  const renderLocationItem = (location: Location, index: number) => {
    const isSelected = index === selectedIndex;

    return (
      <button
        key={location.location_id}
        data-index={index}
        onClick={() => onSelect(location.location_id)}
        onMouseEnter={() => setSelectedIndex(index)}
        className="w-full px-4 py-3 text-left transition-colors"
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: isSelected ? 'var(--color-section-bg)' : 'var(--color-bg)',
          cursor: 'pointer'
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 500, color: 'var(--color-text)' }}>{location.name}</p>
            </div>

            {location.modern_name && location.modern_name !== location.name && (
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
                Modern: {location.modern_name}
              </p>
            )}

            {location.time_period && (
              <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
                Period: {location.time_period}
              </p>
            )}
          </div>

          {renderTypeBadge(location.location_type)}
        </div>
      </button>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26, 26, 26, 0.4)' }}>
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col relative" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-bold)' }}>
        {/* Header */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '24px', color: 'var(--color-text)' }}>Add Location</h3>
            <button
              onClick={onCancel}
              className="p-1 transition-colors"
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)' }}
            >
              ✕
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search locations by name or type..."
              className="w-full"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', padding: '10px 12px', border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text)', outline: 'none' }}
            />
          </div>

          {/* Admin-only info notice */}
          <div className="mt-3 p-2 flex items-start gap-2" style={{ background: 'var(--color-section-bg)', border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
              Only existing locations can be selected. New locations must be created by admins to ensure data quality.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>Loading locations...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center py-12 px-6">
            <div className="text-center">
              <p className="mb-3" style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{error}</p>
              <button
                onClick={fetchLocations}
                className="transition-colors"
                style={{ background: 'var(--color-text)', color: 'var(--color-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', padding: '14px', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Location List */}
        {!loading && !error && (
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((location, index) => renderLocationItem(location, index))
            ) : (
              <div className="text-center py-12 px-6">
                <p style={{ fontSize: '14px', color: 'var(--color-gray)' }}>
                  {searchQuery
                    ? `No locations found matching "${searchQuery}"`
                    : 'No locations available'}
                </p>
              </div>
            )}

            {/* Suggest Location Button */}
            {onSuggestLocation && (
              <div className="p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={handleOpenSuggestModal}
                  className="w-full px-4 py-3 transition-colors flex items-center justify-center gap-2"
                  style={{ border: '1px solid var(--color-border)', background: 'var(--color-section-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px', cursor: 'pointer', color: 'var(--color-text)' }}
                >
                  <span>Can't find your location? Suggest a new one</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-section-bg)' }}>
          <p className="text-center" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
            Use arrow keys to navigate, Enter to select, Escape to close
          </p>
        </div>

        {/* Suggestion Modal (rendered on top when active) */}
        {renderSuggestionModal()}
      </div>
    </div>
  );
}
