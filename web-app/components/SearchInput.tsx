'use client';

import { Search, User, Film, Layers, UserCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface SearchResult {
  type: 'figure' | 'media' | 'series' | 'creator' | 'actor';
  id: string;
  label: string;
  meta: string | null;
  url: string;
}

const categoryConfig = {
  figure: { label: 'Historical Figures', icon: User, color: 'text-amber-600' },
  media: { label: 'Media Works', icon: Film, color: 'text-amber-600' },
  series: { label: 'Series', icon: Layers, color: 'text-amber-600' },
  creator: { label: 'Creators', icon: UserCircle, color: 'text-amber-600' },
  actor: { label: 'Actors', icon: Users, color: 'text-amber-600' },
};

export default function SearchInput() {
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
    router.push(result.url);
    setShowResults(false);
    setSearchTerm('');
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm.length >= 2 && setShowResults(true)}
        placeholder="SEARCH FIGURES, MEDIA, SERIES, CREATORS, ACTORS..."
        className="w-full pl-12 pr-4 py-4 bg-white border-2 border-stone-300 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 shadow-sm font-mono text-sm uppercase tracking-wide"
        autoFocus
      />

      {showResults && (
        <div
          ref={resultsRef}
          className="absolute z-50 w-full mt-2 bg-white border-2 border-stone-300 shadow-xl max-h-96 overflow-y-auto"
        >
          {loading ? (
            <div className="p-4 text-center text-stone-500 font-mono text-sm uppercase tracking-widest">
              <Search className="w-5 h-5 animate-pulse mx-auto" />
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-stone-500 font-mono text-sm uppercase tracking-widest">No results found</div>
          ) : (
            <div className="py-2">
              {Object.entries(groupedResults).map(([type, items]) => {
                const config = categoryConfig[type as keyof typeof categoryConfig];
                const Icon = config.icon;

                return (
                  <div key={type} className="mb-2">
                    <div className="px-4 py-2 text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      {config.label}
                    </div>
                    {items.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600"
                      >
                        <div className="font-bold text-stone-900 font-mono uppercase tracking-wide text-sm">{result.label}</div>
                        {result.meta && (
                          <div className="text-xs text-stone-600 mt-1">{result.meta}</div>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
