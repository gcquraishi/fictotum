'use client';

import { useState, useEffect, useRef } from 'react';

interface Figure {
  canonical_id: string;
  name: string;
  era?: string;
}

interface FigureSearchInputProps {
  placeholder?: string;
  onSelect: (canonicalId: string, name: string) => void;
  value?: string;
  disabled?: boolean;
}

export default function FigureSearchInput({
  placeholder = 'Search for a historical figure...',
  onSelect,
  value = '',
  disabled = false,
}: FigureSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(value);
  const [results, setResults] = useState<Figure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/figures/search?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        setResults(data.figures || []);
        setShowDropdown(true);
      } catch (error) {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (figure: Figure) => {
    setSelectedFigure(figure);
    setSearchTerm(figure.name);
    setShowDropdown(false);
    onSelect(figure.canonical_id, figure.name);
  };

  const handleClear = () => {
    setSelectedFigure(null);
    setSearchTerm('');
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setSelectedFigure(null);
          }}
          onFocus={() => {
            if (results.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            padding: '10px 36px 10px 12px',
            border: '1px solid var(--color-border)',
            background: 'white',
            color: 'var(--color-text)',
            width: '100%',
            outline: 'none',
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = 'var(--color-border-bold)';
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)';
          }}
          className="disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70 transition-opacity"
            type="button"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'var(--color-gray)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (results.length > 0 || isLoading) && (
        <div
          className="absolute z-10 w-full overflow-y-auto"
          style={{
            marginTop: '2px',
            background: 'white',
            border: '1px solid var(--color-border-bold)',
            maxHeight: '256px',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-gray)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-gray)',
              }}
            >
              No figures found
            </div>
          ) : (
            <ul style={{ listStyle: 'none' }}>
              {results.map((figure) => (
                <li key={figure.canonical_id}>
                  <button
                    onClick={() => handleSelect(figure)}
                    className="w-full text-left hover:bg-[var(--color-section-bg)] transition-colors"
                    type="button"
                    style={{
                      padding: '10px 16px',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      background: 'none',
                      border: 'none',
                      borderBottomWidth: '1px',
                      borderBottomStyle: 'solid',
                      borderBottomColor: 'var(--color-border)',
                      width: '100%',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '16px',
                        color: 'var(--color-text)',
                      }}
                    >
                      {figure.name}
                    </p>
                    {figure.era && (
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--color-gray)',
                          marginTop: '2px',
                        }}
                      >
                        {figure.era}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected indicator */}
      {selectedFigure && (
        <div
          style={{
            marginTop: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-gray)',
          }}
        >
          Selected: <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>{selectedFigure.name}</span>
        </div>
      )}
    </div>
  );
}
