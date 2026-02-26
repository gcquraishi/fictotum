'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin, Search, Loader2 } from 'lucide-react';
import type { LocationWithStats } from '@/lib/types';

type LocationType = 'city' | 'region' | 'country' | 'fictional_place';

export default function LocationsBrowsePage() {
  const [locations, setLocations] = useState<LocationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<LocationType | 'all'>('all');
  const [filteredLocations, setFilteredLocations] = useState<LocationWithStats[]>([]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('/api/browse/locations');
        if (!response.ok) {
          throw new Error('Failed to fetch locations');
        }
        const data = await response.json();
        setLocations(data.locations);
        setFilteredLocations(data.locations);
      } catch (err: any) {
        setError(err.message || 'Failed to load locations');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  useEffect(() => {
    const filtered = locations.filter(loc => {
      const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.description && loc.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = filterType === 'all' || loc.location_type === filterType;
      return matchesSearch && matchesType;
    });
    setFilteredLocations(filtered);
  }, [searchQuery, filterType, locations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-xl text-gray-400">Loading locations...</span>
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
              <MapPin className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">Browse Locations</h1>
            </div>
            <p className="text-gray-400">
              Explore {locations.length} locations where stories are set and historical figures lived
            </p>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as LocationType | 'all')}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Location Types</option>
              <option value="city">Cities</option>
              <option value="region">Regions</option>
              <option value="country">Countries</option>
              <option value="fictional_place">Fictional Places</option>
            </select>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Locations Grid */}
          {filteredLocations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLocations.map((location) => (
                <Link
                  key={location.location_id}
                  href={`/browse/location/${location.location_id}`}
                  className="group block bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all"
                >
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-xs text-gray-500 px-2 py-1 bg-gray-700 rounded">
                        {location.location_type}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      {location.name}
                    </h3>
                    {location.description && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                        {location.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Works</p>
                      <p className="text-2xl font-bold text-blue-400">{location.work_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Figures</p>
                      <p className="text-2xl font-bold text-blue-400">{location.figure_count}</p>
                    </div>
                  </div>

                  <div className="mt-4 text-sm text-blue-400 group-hover:translate-x-1 transition-transform">
                    Explore →
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400 mb-2">
                {searchQuery || filterType !== 'all'
                  ? 'No locations found matching your filters'
                  : 'No locations available'}
              </p>
              {(searchQuery || filterType !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                  }}
                  className="text-blue-400 hover:text-blue-300 mt-4"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Summary */}
          {!error && locations.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-700 text-center">
              <p className="text-gray-400">
                Showing {filteredLocations.length} of {locations.length} locations
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
