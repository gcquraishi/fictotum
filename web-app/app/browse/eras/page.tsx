'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock, Search, Loader2 } from 'lucide-react';
import type { EraWithStats } from '@/lib/types';

type EraType = 'historical_period' | 'literary_period' | 'dynasty' | 'reign';

function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year}`;
}

export default function ErasBrowsePage() {
  const [eras, setEras] = useState<EraWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EraType | 'all'>('all');
  const [filteredEras, setFilteredEras] = useState<EraWithStats[]>([]);

  useEffect(() => {
    const fetchEras = async () => {
      try {
        const response = await fetch('/api/browse/eras');
        if (!response.ok) {
          throw new Error('Failed to fetch eras');
        }
        const data = await response.json();
        setEras(data.eras);
        setFilteredEras(data.eras);
      } catch (err: any) {
        setError(err.message || 'Failed to load eras');
      } finally {
        setLoading(false);
      }
    };

    fetchEras();
  }, []);

  useEffect(() => {
    const filtered = eras.filter(era => {
      const matchesSearch = era.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (era.description && era.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || era.era_type === filterType;
      return matchesSearch && matchesType;
    });
    setFilteredEras(filtered);
  }, [searchQuery, filterType, eras]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xl text-gray-400">Loading eras...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-purple-400" />
              <h1 className="text-4xl font-bold text-white">Browse Eras</h1>
            </div>
            <p className="text-gray-400">
              Explore {eras.length} time periods where stories are set and historical figures lived
            </p>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search eras..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EraType | 'all')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Era Types</option>
              <option value="historical_period">Historical Periods</option>
              <option value="literary_period">Literary Periods</option>
              <option value="dynasty">Dynasties</option>
              <option value="reign">Reigns</option>
            </select>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Eras Grid */}
          {filteredEras.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEras.map((era) => (
                <Link
                  key={era.era_id}
                  href={`/browse/era/${era.era_id}`}
                  className="group block bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-all"
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <Clock className="w-5 h-5 text-purple-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
                        {era.era_type.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                      {era.name}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {formatYear(era.start_year)} – {formatYear(era.end_year)}
                    </p>
                  </div>

                  {era.description && (
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                      {era.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Works</p>
                      <p className="text-2xl font-bold text-purple-400">{era.work_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Figures</p>
                      <p className="text-2xl font-bold text-purple-400">{era.figure_count}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-purple-400 group-hover:translate-x-1 transition-transform">
                    Explore →
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">
                {searchQuery || filterType !== 'all'
                  ? 'No eras found matching your filters'
                  : 'No eras available'}
              </p>
              {(searchQuery || filterType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className="text-purple-400 hover:text-purple-300 mt-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Summary */}
          {!error && eras.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-700 text-center">
              <p className="text-gray-400">
                Showing {filteredEras.length} of {eras.length} eras
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
