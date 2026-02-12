'use client';

import { useState, useEffect, useRef } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Era {
  name: string;
  start_year: number;
  end_year: number;
}

interface EraTagPickerProps {
  onSelect: (eraName: string, confidence: number) => void;
  onCancel: () => void;
  settingYear?: number;
  excludeTags?: string[];
}

// ============================================================================
// PRESET ERAS
// ============================================================================
// Common eras with canonical date ranges for quick selection

const PRESET_ERAS = [
  { name: 'Roman Empire', start_year: -27, end_year: 476, is_approximate: true, description: 'Roman imperial period' },
  { name: 'Roman Republic', start_year: -509, end_year: -27, is_approximate: true, description: 'Roman republican period' },
  { name: 'World War II', start_year: 1939, end_year: 1945, is_approximate: false, description: 'Global conflict (1939-1945)' },
  { name: 'High Medieval', start_year: 1000, end_year: 1300, is_approximate: true, description: 'High Middle Ages in Europe' },
  { name: 'Late Medieval', start_year: 1300, end_year: 1500, is_approximate: true, description: 'Late Middle Ages in Europe' },
  { name: 'Early Medieval', start_year: 500, end_year: 1000, is_approximate: true, description: 'Early Middle Ages / Dark Ages' },
  { name: 'American Revolution', start_year: 1765, end_year: 1783, is_approximate: true, description: 'American independence movement' },
  { name: 'French Revolution', start_year: 1789, end_year: 1799, is_approximate: true, description: 'Revolutionary period in France' },
  { name: 'Victorian Era', start_year: 1837, end_year: 1901, is_approximate: false, description: 'British history during Queen Victoria\'s reign' },
  { name: 'Napoleonic Era', start_year: 1799, end_year: 1815, is_approximate: false, description: 'Napoleonic Wars and Empire' },
  { name: 'Cold War', start_year: 1947, end_year: 1991, is_approximate: true, description: 'US-Soviet geopolitical tension' },
  { name: 'Classical Greece', start_year: -510, end_year: -323, is_approximate: true, description: 'Greek classical period' },
  { name: 'Renaissance', start_year: 1300, end_year: 1600, is_approximate: true, description: 'Cultural rebirth in Europe' },
  { name: 'Tudor Era', start_year: 1485, end_year: 1603, is_approximate: false, description: 'Tudor dynasty in England' },
  { name: 'Gilded Age', start_year: 1870, end_year: 1900, is_approximate: true, description: 'American industrial expansion' },
  { name: 'US Civil War', start_year: 1861, end_year: 1865, is_approximate: false, description: 'American Civil War' },
  { name: 'Golden Age of Piracy', start_year: 1650, end_year: 1730, is_approximate: true, description: 'Peak of maritime piracy' },
  { name: 'Prohibition', start_year: 1920, end_year: 1933, is_approximate: false, description: 'US alcohol prohibition' },
  { name: 'Hellenistic Period', start_year: -323, end_year: -31, is_approximate: true, description: 'Post-Alexander Greek world' },
  { name: 'New Kingdom', start_year: -1550, end_year: -1070, is_approximate: true, description: 'Ancient Egyptian New Kingdom' },
];

// Canonical era names from the database — used for fuzzy-match guardrails
const CANONICAL_ERA_NAMES = [
  'Roman Empire', 'Roman Republic', 'World War II', 'High Medieval', 'Late Medieval',
  'Early Medieval', 'American Revolution', 'French Revolution', 'Victorian Era',
  'Napoleonic Era', 'Cold War', 'Classical Greece', 'Renaissance', 'Tudor Era',
  'Gilded Age', 'US Civil War', 'Golden Age of Piracy', 'Prohibition',
  'Hellenistic Period', 'New Kingdom', 'Three Kingdoms China', 'Sengoku Japan',
  'Ptolemaic Egypt', 'Edwardian Era', 'Stuart Era', 'Early Church',
  'Archaic Greece', 'Old Kingdom', 'Late Antiquity', 'Space Race',
  'Ancient Near East', 'Mughal India', 'Medieval Africa', 'Greco-Persian Wars',
  'Early Dynastic', 'Civil Rights Movement', 'English Civil War',
  'Scientific Revolution', 'Islamic Golden Age', 'Dutch Golden Age',
  'Baroque', 'Song Dynasty', 'Tang Dynasty', 'Peloponnesian War',
  'Second Punic War', 'Heian Period Japan',
];

/**
 * Simple Levenshtein distance for fuzzy matching on custom era creation.
 * Returns similarity score 0-1 (1 = exact match).
 */
function eraNameSimilarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;

  // Check if one contains the other (high similarity)
  if (al.includes(bl) || bl.includes(al)) return 0.8;

  const len = Math.max(al.length, bl.length);
  if (len === 0) return 1;

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= al.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= bl.length; j++) {
      if (i === 0) { matrix[i][j] = j; continue; }
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (al[i - 1] === bl[j - 1] ? 0 : 1)
      );
    }
  }
  return 1 - matrix[al.length][bl.length] / len;
}

/**
 * Find canonical era names similar to the input.
 * Returns matches with similarity >= threshold, sorted by score descending.
 */
function findSimilarEras(input: string, threshold = 0.5): { name: string; score: number }[] {
  if (!input.trim()) return [];
  return CANONICAL_ERA_NAMES
    .map(name => ({ name, score: eraNameSimilarity(input.trim(), name) }))
    .filter(m => m.score >= threshold && m.score < 1) // exclude exact matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EraTagPicker({
  onSelect,
  onCancel,
  settingYear,
  excludeTags = []
}: EraTagPickerProps) {

  const [eras, setEras] = useState<Era[]>([]);
  const [filteredEras, setFilteredEras] = useState<Era[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Custom era creation state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customEra, setCustomEra] = useState({
    name: '',
    start_year: '',
    end_year: '',
    is_approximate: false
  });
  const [dateRangeUncertain, setDateRangeUncertain] = useState(false);
  const [customFormError, setCustomFormError] = useState<string | null>(null);
  const [similarSuggestions, setSimilarSuggestions] = useState<{ name: string; score: number }[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // FETCH ERAS
  // ============================================================================

  useEffect(() => {
    fetchEras();
  }, []);

  const fetchEras = async () => {
    setLoading(true);
    setError(null);

    // Convert presets to Era objects for use as fallback/merge source
    const presetEras: Era[] = PRESET_ERAS.map(p => ({
      name: p.name,
      start_year: p.start_year,
      end_year: p.end_year
    }));

    try {
      const response = await fetch('/api/search/universal?q=a&limit=500');

      if (!response.ok) {
        throw new Error('Failed to fetch eras');
      }

      const data = await response.json();
      const allResults = data.results || [];

      // Filter to only era type results
      const eraResults = allResults.filter((r: any) => r.type === 'era');

      // Transform search results to Era objects
      const transformedEras: Era[] = eraResults.map((result: any) => ({
        name: result.label || result.name,
        start_year: result.metadata?.start_year || parseInt(result.meta?.split(' - ')[0]) || 0,
        end_year: result.metadata?.end_year || parseInt(result.meta?.split(' - ')[1]) || 9999
      }));

      // Merge API results with presets so the list is never empty
      const apiNames = new Set(transformedEras.map(e => e.name));
      const mergedEras = [
        ...transformedEras,
        ...presetEras.filter(p => !apiNames.has(p.name))
      ];

      setEras(mergedEras);
      setFilteredEras(mergedEras.filter(e => !excludeTags.includes(e.name)));
    } catch (err) {
      console.error('Failed to fetch eras:', err);
      // Fall back to presets on error instead of showing an error state
      setEras(presetEras);
      setFilteredEras(presetEras.filter(e => !excludeTags.includes(e.name)));
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SEARCH FILTERING
  // ============================================================================

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEras(eras.filter(e => !excludeTags.includes(e.name)));
      setSelectedIndex(0);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = eras.filter(era => {
      if (excludeTags.includes(era.name)) return false;
      return era.name.toLowerCase().includes(query);
    });

    setFilteredEras(filtered);
    setSelectedIndex(0);
  }, [searchQuery, eras, excludeTags]);

  // ============================================================================
  // CUSTOM ERA CREATION
  // ============================================================================

  const handleCreateCustomEra = () => {
    setCustomFormError(null);

    // Validation
    if (!customEra.name.trim()) {
      setCustomFormError('Era name is required');
      return;
    }

    // Only validate dates if provided (dates are now optional)
    if (!dateRangeUncertain && (customEra.start_year || customEra.end_year)) {
      const startYear = parseInt(customEra.start_year);
      const endYear = parseInt(customEra.end_year);

      if (customEra.start_year && isNaN(startYear)) {
        setCustomFormError('Start year must be a valid number');
        return;
      }

      if (customEra.end_year && isNaN(endYear)) {
        setCustomFormError('End year must be a valid number');
        return;
      }

      if (!isNaN(startYear) && !isNaN(endYear) && startYear > endYear) {
        setCustomFormError('Start year cannot be after end year');
        return;
      }
    }

    // Check for duplicate names
    if (eras.some(e => e.name.toLowerCase() === customEra.name.trim().toLowerCase())) {
      setCustomFormError('An era with this name already exists');
      return;
    }

    // Check for similar canonical names (guardrail)
    const similar = findSimilarEras(customEra.name.trim(), 0.6);
    if (similar.length > 0 && similarSuggestions.length === 0) {
      // First attempt: show suggestions instead of creating
      setSimilarSuggestions(similar);
      return;
    }

    // Create the era (confidence 1.0 for user-created tags)
    onSelect(customEra.name.trim(), 1.0);
  };

  // Update suggestions as user types
  const handleCustomNameChange = (value: string) => {
    setCustomEra(prev => ({ ...prev, name: value }));
    setSimilarSuggestions([]); // Clear previous suggestions on name change
  };

  const handleCancelCustomForm = () => {
    setShowCustomForm(false);
    setCustomEra({ name: '', start_year: '', end_year: '', is_approximate: false });
    setDateRangeUncertain(false);
    setCustomFormError(null);
    setSimilarSuggestions([]);
  };

  const handleSelectPreset = (preset: typeof PRESET_ERAS[0]) => {
    // Pre-fill custom form with preset values
    setCustomEra({
      name: preset.name,
      start_year: preset.start_year.toString(),
      end_year: preset.end_year.toString(),
      is_approximate: preset.is_approximate
    });
    setDateRangeUncertain(false);
    setShowCustomForm(true);
  };

  // ============================================================================
  // ANACHRONISM DETECTION
  // ============================================================================

  const isAnachronistic = (era: Era): boolean => {
    // Skip anachronism check if no setting year provided
    if (!settingYear) return false;
    // Skip anachronism check if era has no dates (impressionistic eras)
    if (!era.start_year || !era.end_year) return false;
    return settingYear < era.start_year || settingYear > era.end_year;
  };

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
        setSelectedIndex(prev => Math.min(prev + 1, filteredEras.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredEras[selectedIndex]) {
          // User-selected tags get confidence 1.0
          onSelect(filteredEras[selectedIndex].name, 1.0);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredEras, onSelect, onCancel]);

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

  // ============================================================================
  // RENDER: PRESET ERA BUTTONS
  // ============================================================================

  const renderPresetEras = () => (
    <div className="px-6 py-4" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-section-bg)' }}>
      <h4 className="mb-3" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>Quick Select Common Eras</h4>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_ERAS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handleSelectPreset(preset)}
            disabled={excludeTags?.includes(preset.name)}
            className="px-3 py-2 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'white', border: '1px solid var(--color-border)', cursor: 'pointer' }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>{preset.name}</div>
            <div className="mt-0.5" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
              {preset.start_year}–{preset.end_year}
              {preset.is_approximate && ' (approx)'}
            </div>
          </button>
        ))}
      </div>
      <p className="mt-3" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
        Click a preset to edit its dates, or create your own below
      </p>
    </div>
  );

  // ============================================================================
  // RENDER: CUSTOM ERA FORM
  // ============================================================================

  const renderCustomEraForm = () => (
    <div className="p-6" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="mb-4">
        <h4 className="mb-2" style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '18px', color: 'var(--color-text)' }}>Create Custom Era Tag</h4>
        <p style={{ fontSize: '14px', color: 'var(--color-gray)' }}>
          Add a new historical period or literary era to the database.
        </p>
      </div>

      {customFormError && (
        <div className="mb-4 p-3 flex items-start gap-2" style={{ background: 'var(--color-section-bg)', border: '1px solid var(--color-accent)' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{customFormError}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
            Era Name <span style={{ color: 'var(--color-accent)' }}>*</span>
          </label>
          <input
            type="text"
            value={customEra.name}
            onChange={(e) => handleCustomNameChange(e.target.value)}
            placeholder="e.g., Tudor Era, Victorian Era"
            className="w-full"
            style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', padding: '10px 12px', border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text)', outline: 'none' }}
          />

          {/* Fuzzy-match suggestions */}
          {similarSuggestions.length > 0 && (
            <div className="mt-2 p-3" style={{ background: 'var(--color-section-bg)', border: '1px solid var(--color-border)' }}>
              <p className="mb-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>
                Did you mean one of these existing eras?
              </p>
              <div className="space-y-1">
                {similarSuggestions.map(s => (
                  <button
                    key={s.name}
                    onClick={() => onSelect(s.name, 1.0)}
                    className="w-full text-left px-3 py-2 transition-colors hover:opacity-80"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  >
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)' }}>{s.name}</span>
                    <span className="ml-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
                      {Math.round(s.score * 100)}% match
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
                Click a suggestion above, or press "Create Era Tag" again to use your custom name.
              </p>
            </div>
          )}
        </div>

        {/* Date Range Uncertain Checkbox */}
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="dateRangeUncertain"
            checked={dateRangeUncertain}
            onChange={(e) => {
              setDateRangeUncertain(e.target.checked);
              if (e.target.checked) {
                // Clear date fields when uncertain is checked
                setCustomEra(prev => ({ ...prev, start_year: '', end_year: '', is_approximate: true }));
              } else {
                setCustomEra(prev => ({ ...prev, is_approximate: false }));
              }
            }}
            className="mt-1 h-4 w-4"
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="dateRangeUncertain" className="cursor-pointer" style={{ fontSize: '14px', color: 'var(--color-text)' }}>
            <span style={{ fontWeight: 500 }}>Date range uncertain</span>
            <p className="mt-0.5" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
              Check this if the era's boundaries are contested or not precisely defined by historians
            </p>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
              Start Year {!dateRangeUncertain && <span style={{ color: 'var(--color-gray)', opacity: 0.6 }}>(Optional)</span>}
            </label>
            <input
              type="number"
              value={customEra.start_year}
              onChange={(e) => setCustomEra(prev => ({ ...prev, start_year: e.target.value }))}
              placeholder="1485"
              disabled={dateRangeUncertain}
              className="w-full"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                background: dateRangeUncertain ? 'var(--color-section-bg)' : 'white',
                color: 'var(--color-text)',
                outline: 'none',
                cursor: dateRangeUncertain ? 'not-allowed' : 'text'
              }}
            />
          </div>

          <div>
            <label className="block mb-1" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>
              End Year {!dateRangeUncertain && <span style={{ color: 'var(--color-gray)', opacity: 0.6 }}>(Optional)</span>}
            </label>
            <input
              type="number"
              value={customEra.end_year}
              onChange={(e) => setCustomEra(prev => ({ ...prev, end_year: e.target.value }))}
              placeholder="1603"
              disabled={dateRangeUncertain}
              className="w-full"
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                background: dateRangeUncertain ? 'var(--color-section-bg)' : 'white',
                color: 'var(--color-text)',
                outline: 'none',
                cursor: dateRangeUncertain ? 'not-allowed' : 'text'
              }}
            />
          </div>
        </div>

        {!dateRangeUncertain && (
          <p className="-mt-2" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
            Date ranges are now optional. Many eras have contested boundaries.
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleCreateCustomEra}
            className="flex-1 transition-colors"
            style={{ background: 'var(--color-text)', color: 'var(--color-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', padding: '14px', border: 'none', cursor: 'pointer' }}
          >
            Create Era Tag
          </button>
          <button
            onClick={handleCancelCustomForm}
            className="transition-colors"
            style={{ border: '1px solid var(--color-border)', background: 'none', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '14px', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: ERA ITEM
  // ============================================================================

  const renderEraItem = (era: Era, index: number) => {
    const isSelected = index === selectedIndex;
    const isAnachronism = isAnachronistic(era);

    return (
      <button
        key={era.name}
        data-index={index}
        onClick={() => onSelect(era.name, 1.0)}
        onMouseEnter={() => setSelectedIndex(index)}
        className="w-full px-4 py-3 text-left transition-colors"
        style={{
          borderBottom: '1px solid var(--color-border)',
          borderLeft: isAnachronism ? '4px solid var(--color-accent)' : 'none',
          background: isSelected ? 'var(--color-section-bg)' : 'var(--color-bg)',
          cursor: 'pointer'
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', fontWeight: 500, color: 'var(--color-text)' }}>{era.name}</p>
            </div>

            <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
              {era.start_year} - {era.end_year}
            </p>

            {isAnachronism && (
              <div className="mt-2 p-2 flex items-start gap-2" style={{ background: 'var(--color-section-bg)', border: '1px solid var(--color-accent)' }}>
                <div className="flex-1">
                  <p style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 500 }}>
                    Potentially anachronistic
                  </p>
                  <p className="mt-1" style={{ fontSize: '12px', color: 'var(--color-accent)' }}>
                    This work is set in {settingYear}, which falls outside this era's time range ({era.start_year}-{era.end_year}). You can still select it if the work addresses this historical period.
                  </p>
                </div>
              </div>
            )}
          </div>

          {isAnachronism && (
            <span style={{ fontSize: '16px', color: 'var(--color-accent)' }}>⚠</span>
          )}
        </div>
      </button>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26, 26, 26, 0.4)' }}>
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border-bold)' }}>
        {/* Header */}
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '24px', color: 'var(--color-text)' }}>Add Era Tag</h3>
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
              placeholder="Search era tags by name..."
              className="w-full"
              style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', padding: '10px 12px', border: '1px solid var(--color-border)', background: 'white', color: 'var(--color-text)', outline: 'none' }}
            />
          </div>

          {/* Setting Year Info */}
          {settingYear && (
            <div className="mt-3 p-2 flex items-start gap-2" style={{ background: 'var(--color-section-bg)', border: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
                This work is set in year {settingYear}. Era tags that don't overlap with this year will be highlighted as potentially anachronistic.
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)' }}>Loading era tags...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center py-12 px-6">
            <div className="text-center">
              <p className="mb-3" style={{ fontSize: '14px', color: 'var(--color-accent)' }}>{error}</p>
              <button
                onClick={fetchEras}
                className="transition-colors"
                style={{ background: 'var(--color-text)', color: 'var(--color-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', padding: '14px', border: 'none', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Preset Eras */}
        {!loading && !error && !showCustomForm && renderPresetEras()}

        {/* Era List */}
        {!loading && !error && !showCustomForm && (
          <div ref={listRef} className="flex-1 overflow-y-auto">
            {filteredEras.length > 0 ? (
              <div>
                {/* Sort eras: non-anachronistic first, then anachronistic */}
                {filteredEras
                  .sort((a, b) => {
                    const aAna = isAnachronistic(a);
                    const bAna = isAnachronistic(b);
                    if (aAna === bAna) return 0;
                    return aAna ? 1 : -1;
                  })
                  .map((era, index) => renderEraItem(era, index))
                }
              </div>
            ) : (
              <div className="text-center py-12 px-6">
                <p className="mb-4" style={{ fontSize: '14px', color: 'var(--color-gray)' }}>
                  {searchQuery
                    ? `No era tags found matching "${searchQuery}"`
                    : 'No era tags available'}
                </p>
                <button
                  onClick={() => setShowCustomForm(true)}
                  className="inline-flex items-center gap-2 transition-colors"
                  style={{ background: 'var(--color-text)', color: 'var(--color-bg)', fontFamily: 'var(--font-mono)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', padding: '14px', border: 'none', cursor: 'pointer' }}
                >
                  Create Custom Era Tag
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom Era Creation Form */}
        {!loading && !error && showCustomForm && renderCustomEraForm()}

        {/* Footer */}
        <div className="px-6 py-3" style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-section-bg)' }}>
          <p className="text-center" style={{ fontSize: '12px', color: 'var(--color-gray)' }}>
            Use arrow keys to navigate, Enter to select, Escape to close
          </p>
        </div>
      </div>
    </div>
  );
}
