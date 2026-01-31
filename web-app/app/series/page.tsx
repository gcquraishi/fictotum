'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookMarked, Search, Loader2 } from 'lucide-react';

interface SeriesListItem {
  wikidata_id: string;
  title: string;
  media_type: string;
  creator?: string;
  work_count: number;
  character_count: number;
}

export default function SeriesBrowsePage() {
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSeries, setFilteredSeries] = useState<SeriesListItem[]>([]);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await fetch('/api/series/browse');
        if (!response.ok) {
          throw new Error('Failed to fetch series');
        }
        const data = await response.json();
        setSeries(data);
        setFilteredSeries(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load series');
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, []);

  useEffect(() => {
    const filtered = series.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.creator && s.creator.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredSeries(filtered);
  }, [searchQuery, series]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
          <span className="text-xl text-stone-500 font-mono uppercase tracking-widest">Loading series...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header - Case File Style */}
          <div className="mb-8 bg-white border-t-4 border-amber-600 shadow-xl p-8">
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2">
              Series Archive // Fictional Universes
            </div>
            <div className="flex items-center gap-3 mb-2">
              <BookMarked className="w-8 h-8 text-amber-600" />
              <h1 className="text-4xl md:text-6xl font-bold text-stone-900 tracking-tighter uppercase">Browse Series</h1>
            </div>
            <p className="text-stone-600">
              Explore all book, TV, film, and game series in ChronosGraph
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-stone-400" />
              <input
                type="text"
                placeholder="SEARCH BY SERIES NAME OR CREATOR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-stone-300 pl-10 pr-4 py-3 text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 font-mono text-sm uppercase tracking-wide"
              />
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-600 p-4 mb-8">
              <p className="text-red-800 font-mono text-sm uppercase tracking-wide">{error}</p>
            </div>
          )}

          {/* Series Grid */}
          {filteredSeries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSeries.map((s) => (
                <Link
                  key={s.wikidata_id}
                  href={`/series/${s.wikidata_id}`}
                  className="group block bg-white border border-stone-300 p-6 hover:border-amber-600 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <BookMarked className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <span className="inline-flex items-center px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-stone-100 border-stone-400 text-stone-700">
                        {s.media_type}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-stone-900 uppercase tracking-tight group-hover:text-amber-700 transition-colors line-clamp-2">
                      {s.title}
                    </h3>
                    {s.creator && (
                      <p className="text-sm text-stone-600 mt-1">by {s.creator}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t-2 border-stone-200">
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Works</p>
                      <p className="text-2xl font-bold text-amber-600 font-mono">{s.work_count}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black">Characters</p>
                      <p className="text-2xl font-bold text-amber-600 font-mono">{s.character_count}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-amber-600 font-bold uppercase group-hover:translate-x-1 transition-transform">
                    View File →
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white border-2 border-stone-300 shadow-sm">
              <BookMarked className="w-16 h-16 text-stone-400 mx-auto mb-4" />
              <p className="text-xl text-stone-500 mb-2 font-mono uppercase tracking-wide">
                {searchQuery ? 'No series found matching your search' : 'No series available'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-amber-600 hover:text-amber-700 mt-4 font-black uppercase text-sm tracking-widest"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Summary */}
          {!error && series.length > 0 && (
            <div className="mt-12 pt-8 border-t-2 border-stone-300 text-center">
              <p className="text-stone-500 font-mono uppercase tracking-wide text-sm">
                Showing {filteredSeries.length} of {series.length} series
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
