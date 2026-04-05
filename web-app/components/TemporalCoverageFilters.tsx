'use client';

import { useState } from 'react';

interface TemporalCoverageFiltersProps {
  onFilterChange: (filters: {
    granularity: 'century' | 'decade' | 'year';
    mediaType?: string;
    showSeriesOnly?: boolean;
  }) => void;
}

export default function TemporalCoverageFilters({
  onFilterChange,
}: TemporalCoverageFiltersProps) {
  const [granularity, setGranularity] = useState<'century' | 'decade' | 'year'>('century');
  const [mediaType, setMediaType] = useState<string>('all');
  const [showSeriesOnly, setShowSeriesOnly] = useState(false);

  const handleGranularityChange = (value: 'century' | 'decade' | 'year') => {
    setGranularity(value);
    onFilterChange({
      granularity: value,
      mediaType: mediaType === 'all' ? undefined : mediaType,
      showSeriesOnly,
    });
  };

  const handleMediaTypeChange = (value: string) => {
    setMediaType(value);
    onFilterChange({
      granularity,
      mediaType: value === 'all' ? undefined : value,
      showSeriesOnly,
    });
  };

  const handleSeriesToggle = (checked: boolean) => {
    setShowSeriesOnly(checked);
    onFilterChange({
      granularity,
      mediaType: mediaType === 'all' ? undefined : mediaType,
      showSeriesOnly: checked,
    });
  };

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        padding: '24px',
      }}
    >
      <p className="fsg-label" style={{ marginBottom: '16px' }}>
        Coverage Filters
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
        {/* Granularity Selector */}
        <div>
          <label
            className="fsg-label-sm"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            Time Granularity
          </label>
          <div style={{ display: 'flex', gap: '0' }}>
            {(['century', 'decade', 'year'] as const).map((option) => (
              <button
                key={option}
                onClick={() => handleGranularityChange(option)}
                className="hover:opacity-80 transition-opacity"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  border: '1px solid var(--color-border)',
                  marginLeft: option === 'century' ? '0' : '-1px',
                  background: granularity === option ? 'var(--color-text)' : 'white',
                  color: granularity === option ? 'var(--color-bg)' : 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Media Type Filter */}
        <div>
          <label
            htmlFor="mediaType"
            className="fsg-label-sm"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            Media Type
          </label>
          <select
            id="mediaType"
            value={mediaType}
            onChange={(e) => handleMediaTypeChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              border: '1px solid var(--color-border)',
              background: 'white',
              color: 'var(--color-text)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Types</option>
            <option value="Book">Books Only</option>
            <option value="Film">Films Only</option>
            <option value="Game">Games Only</option>
            <option value="TV">TV Series Only</option>
          </select>
        </div>

        {/* Series Toggle */}
        <div>
          <label
            className="fsg-label-sm"
            style={{ display: 'block', marginBottom: '8px' }}
          >
            Content Type
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              border: '1px solid var(--color-border)',
              padding: '8px 12px',
            }}
            className="hover:opacity-80 transition-opacity"
          >
            <input
              type="checkbox"
              checked={showSeriesOnly}
              onChange={(e) => handleSeriesToggle(e.target.checked)}
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-text)',
              }}
            >
              Series Only
            </span>
          </label>
        </div>
      </div>

      {/* Active Filters Summary */}
      {(mediaType !== 'all' || showSeriesOnly) && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <span className="fsg-label-sm">Active:</span>
          {mediaType !== 'all' && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                background: 'var(--color-text)',
                color: 'var(--color-bg)',
                padding: '4px 8px',
              }}
            >
              {mediaType}
            </span>
          )}
          {showSeriesOnly && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                background: 'var(--color-accent)',
                color: 'white',
                padding: '4px 8px',
              }}
            >
              Series Only
            </span>
          )}
          <button
            onClick={() => {
              setMediaType('all');
              setShowSeriesOnly(false);
              onFilterChange({ granularity, mediaType: undefined, showSeriesOnly: false });
            }}
            className="hover:opacity-70 transition-opacity"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-accent)',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
