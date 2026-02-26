'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin, Users, Loader2, ArrowLeft } from 'lucide-react';
import type { LocationWorks } from '@/lib/types';

export default function LocationDetailPage({ params }: { params: Promise<{ location_id: string }> }) {
  const [locationId, setLocationId] = useState<string>('');
  const [data, setData] = useState<LocationWorks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ location_id }) => {
      setLocationId(location_id);
    });
  }, [params]);

  useEffect(() => {
    if (!locationId) return;

    const fetchLocation = async () => {
      try {
        const response = await fetch(`/api/browse/location/${locationId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch location');
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load location');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [locationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          <span className="text-xl text-gray-400">Loading location...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <Link href="/browse/locations" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Locations
          </Link>
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6 text-center">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <p className="text-gray-400">Location not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link href="/browse/locations" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Locations
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-bold text-white">{data.location.name}</h1>
            </div>
            {data.location.description && (
              <p className="text-gray-400 text-lg">{data.location.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <p className="text-sm text-gray-500">Type</p>
                <p className="text-white font-semibold">{data.location.location_type}</p>
              </div>
              {data.stats && (
                <>
                  <div className="bg-gray-800 rounded-lg px-4 py-2">
                    <p className="text-sm text-gray-500">Time Span</p>
                    <p className="text-white font-semibold">
                      {data.stats.time_span[0]} – {data.stats.time_span[1]}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          {data.stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Works Set Here</p>
                <p className="text-4xl font-bold text-blue-400">{data.stats.work_count}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Historical Figures</p>
                <p className="text-4xl font-bold text-blue-400">{data.stats.figure_count}</p>
              </div>
            </div>
          )}

          {/* Works Section */}
          {data.works.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Works Set in {data.location.name}</h2>
              <div className="space-y-4">
                {data.works.map((work) => (
                  <Link
                    key={work.wikidata_id}
                    href={`/media/${work.wikidata_id}`}
                    className="block bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-blue-400 hover:text-blue-300">
                          {work.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          {work.media_type} • {work.release_year}
                        </p>
                        {work.creator && (
                          <p className="text-sm text-gray-500 mt-2">by {work.creator}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Figures Section */}
          {data.figures.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Historical Figures Associated with {data.location.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.figures.map((figure) => (
                  <Link
                    key={figure.canonical_id}
                    href={`/figure/${figure.canonical_id}`}
                    className="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition-all"
                  >
                    <h3 className="text-white font-bold text-blue-400 hover:text-blue-300">
                      {figure.name}
                    </h3>
                    {figure.era && (
                      <p className="text-sm text-gray-400 mt-1">{figure.era}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {figure.historicity_status}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {data.works.length === 0 && data.figures.length === 0 && (
            <div className="text-center py-16">
              <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">
                No works or figures associated with this location yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
