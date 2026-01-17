'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

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
        console.error('Error searching figures:', error);
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
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
          className="w-full pl-10 pr-10 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (results.length > 0 || isLoading) && (
        <div className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
              <span className="ml-2">Searching...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-center text-gray-400">
              No figures found
            </div>
          ) : (
            <ul>
              {results.map((figure) => (
                <li key={figure.canonical_id}>
                  <button
                    onClick={() => handleSelect(figure)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none transition-colors"
                    type="button"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{figure.name}</p>
                        {figure.era && (
                          <p className="text-sm text-gray-400 truncate">{figure.era}</p>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Selected indicator */}
      {selectedFigure && (
        <div className="mt-2 text-sm text-gray-400">
          Selected: <span className="text-blue-400 font-medium">{selectedFigure.name}</span>
        </div>
      )}
    </div>
  );
}
