'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface SearchResult {
  type: 'figure' | 'media' | 'series' | 'creator' | 'actor';
  id: string;
  label: string;
  meta: string | null;
  url: string;
}

const categoryLabels: Record<string, string> = {
  figure: 'Historical Figures',
  media: 'Media Works',
  series: 'Series',
  creator: 'Creators',
  actor: 'Actors',
};

interface SearchInputProps {
  onSelect?: (result: SearchResult) => void;
}

export default function SearchInput({ onSelect }: SearchInputProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        setLoading(true);
        try {
          const response = await fetch(`/api/search/universal?q=${encodeURIComponent(searchTerm)}`);
          const data = await response.json();
          setResults(data.results || []);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    if (onSelect) {
      onSelect(result);
    } else {
      router.push(result.url);
    }
    setShowResults(false);
    setSearchTerm('');
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div style={{ position: 'relative' }}>
      <form
        action="/search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          if (searchTerm.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
            setShowResults(false);
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          name="q"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
          placeholder="Search figures, works, creators..."
          autoFocus
          style={{
            width: '100%',
            padding: '24px',
            fontFamily: 'var(--font-serif)',
            fontSize: '32px',
            border: '2px solid var(--color-border-bold)',
            outline: 'none',
            textAlign: 'center',
            background: '#fff',
          }}
        />
      </form>

      {showResults && (
        <div
          ref={resultsRef}
          style={{
            position: 'absolute',
            zIndex: 50,
            width: '100%',
            marginTop: '4px',
            background: '#fff',
            border: '1px solid var(--color-border)',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '16px',
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
                padding: '16px',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-gray)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              No results found
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {Object.entries(groupedResults).map(([type, items]) => (
                <div key={type} style={{ marginBottom: '8px' }}>
                  <div
                    style={{
                      padding: '8px 16px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      color: 'var(--color-gray)',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    {categoryLabels[type] || type}
                  </div>
                  {items.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        borderBottom: '1px solid #f0f0f0',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                      className="hover:bg-[#fafafa]"
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '18px',
                          fontWeight: 400,
                          color: 'var(--color-text)',
                        }}
                      >
                        {result.label}
                      </div>
                      {result.meta && (
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-gray)',
                            marginTop: '2px',
                          }}
                        >
                          {result.meta}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
