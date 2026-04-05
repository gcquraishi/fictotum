'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Clock, Users, Loader2, ArrowLeft } from 'lucide-react';
import type { EraWorks } from '@/lib/types';

function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year} CE`;
}

export default function EraDetailPage({ params }: { params: Promise<{ era_id: string }> }) {
  const [eraId, setEraId] = useState<string>('');
  const [data, setData] = useState<EraWorks | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ era_id }) => {
      setEraId(era_id);
    });
  }, [params]);

  useEffect(() => {
    if (!eraId) return;

    const fetchEra = async () => {
      try {
        const response = await fetch(`/api/browse/era/${eraId}`);

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 404) {
            setError('This era could not be found. Please check the URL or browse all eras.');
          } else {
            setError(errorData.error || 'Failed to load era');
          }
          setLoading(false);
          return;
        }

        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to load era');
      } finally {
        setLoading(false);
      }
    };

    fetchEra();
  }, [eraId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span className="text-xl text-gray-400">Loading era...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <Link href="/browse/eras" className="text-purple-400 hover:text-purple-300 flex items-center gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Eras
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
          <p className="text-gray-400">Era not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link href="/browse/eras" className="text-purple-400 hover:text-purple-300 flex items-center gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Eras
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-8 h-8 text-purple-400" />
              <h1 className="text-4xl font-bold text-white">{data.era.name}</h1>
            </div>
            {data.era.description && (
              <p className="text-gray-400 text-lg">{data.era.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <p className="text-sm text-gray-500">Type</p>
                <p className="text-white font-semibold">{data.era.era_type.replace('_', ' ')}</p>
              </div>
              <div className="bg-gray-800 rounded-lg px-4 py-2">
                <p className="text-sm text-gray-500">Years</p>
                <p className="text-white font-semibold">
                  {formatYear(data.era.start_year)} – {formatYear(data.era.end_year)}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          {data.stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Works Set in This Era</p>
                <p className="text-4xl font-bold text-purple-400">{data.stats.work_count}</p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Historical Figures</p>
                <p className="text-4xl font-bold text-purple-400">{data.stats.figure_count}</p>
              </div>
            </div>
          )}

          {/* Timeline Visualization */}
          {data.timeline && data.timeline.length > 0 && (
            <div className="mb-12 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Publication Timeline</h2>
              <div className="space-y-3">
                {data.timeline.slice(0, 10).map((entry) => {
                  const maxCount = Math.max(...data.timeline!.map(t => t.work_count));
                  const percentage = (entry.work_count / maxCount) * 100;
                  return (
                    <div key={entry.year}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-300">{entry.year}</span>
                        <span className="text-sm text-gray-400">{entry.work_count} work{entry.work_count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-purple-500 h-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Works Section */}
          {data.works.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Works Set in the {data.era.name}</h2>
              <div className="space-y-4">
                {data.works.map((work) => (
                  <Link
                    key={work.wikidata_id}
                    href={`/media/${work.wikidata_id}`}
                    className="block bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-purple-400 hover:text-purple-300">
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
                Historical Figures from the {data.era.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.figures.map((figure) => (
                  <Link
                    key={figure.canonical_id}
                    href={`/figure/${figure.canonical_id}`}
                    className="block bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-purple-500 transition-all"
                  >
                    <h3 className="text-white font-bold text-purple-400 hover:text-purple-300">
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
              <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-xl text-gray-400">
                No works or figures associated with this era yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
