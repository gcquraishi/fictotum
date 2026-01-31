import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMediaById, getMediaGraphData, getMediaLocationsAndEras } from '@/lib/db';
import GraphExplorer from '@/components/GraphExplorer';
import { BookOpen, Film, Tv, Gamepad2, User, List, MapPin, Clock } from 'lucide-react';

function formatYear(year: number): string {
  if (year < 0) {
    return `${Math.abs(year)} BCE`;
  }
  return `${year}`;
}

export default async function MediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const media = await getMediaById(id);

  if (!media) {
    notFound();
  }

  const graphData = await getMediaGraphData(id);
  const { locations, eras } = await getMediaLocationsAndEras(id);

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'FILM': return <Film className="w-10 h-10 text-amber-600" />;
      case 'TV_SERIES': return <Tv className="w-10 h-10 text-amber-600" />;
      case 'GAME': return <Gamepad2 className="w-10 h-10 text-amber-600" />;
      default: return <BookOpen className="w-10 h-10 text-amber-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-amber-600 hover:text-amber-700 mb-6 inline-block font-mono text-sm uppercase tracking-wide font-bold">
            ← Back to Dashboard
          </Link>

          <div className="bg-white border-t-4 border-amber-600 shadow-xl p-8 mb-8">
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2">
              Media Work Dossier // {media.wikidata_id}
            </div>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-amber-50 border-2 border-amber-600 flex items-center justify-center">
                  {getIcon(media.media_type)}
                </div>
              </div>
              <div className="flex-grow">
                <h1 className="text-4xl md:text-6xl font-bold text-stone-900 tracking-tighter uppercase mb-2">{media.title}</h1>
                <p className="text-lg text-stone-600 mb-2 font-mono">
                  {media.media_type} {media.release_year ? `(${media.release_year})` : ''}
                </p>
                {media.creator && (
                  <p className="text-stone-600">Created by <span className="text-stone-900 font-bold">{media.creator}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Location & Era Section */}
          {(locations.length > 0 || eras.length > 0) && (
            <div className="bg-stone-100 border-2 border-stone-200 p-6 mb-8">
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-amber-600">■</span> Story Context
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Locations */}
                {locations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-5 h-5 text-amber-600" />
                      <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em]">
                        Locations
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {locations.map(loc => (
                        <Link
                          key={loc.location_id}
                          href={`/browse/location/${loc.location_id}`}
                          className="block p-3 bg-white border-2 border-stone-300 hover:border-amber-600 transition-all"
                        >
                          <p className="text-stone-900 font-bold hover:text-amber-700 uppercase tracking-tight">{loc.name}</p>
                          <p className="text-xs text-stone-500 capitalize font-mono">{loc.location_type}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eras */}
                {eras.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em]">
                        Time Periods
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {eras.map(era => (
                        <Link
                          key={era.era_id}
                          href={`/browse/era/${era.era_id}`}
                          className="block p-3 bg-white border-2 border-stone-300 hover:border-amber-600 transition-all"
                        >
                          <p className="text-stone-900 font-bold hover:text-amber-700 uppercase tracking-tight">{era.name}</p>
                          <p className="text-xs text-stone-500 font-mono">{formatYear(era.start_year)} – {formatYear(era.end_year)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Media Details Section */}
          {(media.publisher || media.translator || media.channel || media.production_studio) && (
            <div className="bg-stone-100 border-2 border-stone-200 p-6 mb-8">
              <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-amber-600">■</span> Media Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {media.publisher && (
                  <div className="bg-white border-2 border-stone-300 p-3">
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black mb-1">Publisher</p>
                    <p className="text-stone-900 font-bold">{media.publisher}</p>
                  </div>
                )}
                {media.translator && (
                  <div className="bg-white border-2 border-stone-300 p-3">
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black mb-1">Translator</p>
                    <p className="text-stone-900 font-bold">{media.translator}</p>
                  </div>
                )}
                {media.channel && (
                  <div className="bg-white border-2 border-stone-300 p-3">
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black mb-1">Channel</p>
                    <p className="text-stone-900 font-bold">{media.channel}</p>
                  </div>
                )}
                {media.production_studio && (
                  <div className="bg-white border-2 border-stone-300 p-3">
                    <p className="text-[10px] text-stone-400 uppercase tracking-widest font-black mb-1">Production Studio</p>
                    <p className="text-stone-900 font-bold">{media.production_studio}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Series Hierarchy Section */}
          {(media.parent_series || (media.child_works && media.child_works.length > 0)) && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <List className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Series Information</h2>
              </div>

              {/* Parent Series Link */}
              {media.parent_series && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Part of Series</h3>
                  <Link
                    href={`/media/${media.parent_series.wikidata_id || media.parent_series.media_id}`}
                    className="block p-4 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">{media.parent_series.title}</p>
                        <p className="text-sm text-gray-400">
                          {media.parent_series.release_year} • {media.parent_series.media_type}
                        </p>
                      </div>
                      {media.series_position && (
                        <div className="text-right">
                          {media.series_position.sequence_number && (
                            <p className="text-sm text-blue-400">#{media.series_position.sequence_number}</p>
                          )}
                          {media.series_position.season_number && media.series_position.episode_number && (
                            <p className="text-xs text-gray-500">
                              S{media.series_position.season_number}E{media.series_position.episode_number}
                            </p>
                          )}
                          {media.series_position.relationship_type && (
                            <p className="text-xs text-gray-500 capitalize">
                              {media.series_position.relationship_type}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              )}

              {/* Child Works */}
              {media.child_works && media.child_works.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">
                    Works in this Series ({media.child_works.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {media.child_works
                      .sort((a: any, b: any) => {
                        // Sort by season, then sequence, then episode, then year
                        if (a.season_number && b.season_number) {
                          if (a.season_number !== b.season_number) return a.season_number - b.season_number;
                          if (a.episode_number && b.episode_number) return a.episode_number - b.episode_number;
                        }
                        if (a.sequence_number && b.sequence_number) return a.sequence_number - b.sequence_number;
                        return a.release_year - b.release_year;
                      })
                      .map((work: any) => (
                        <Link
                          key={work.media_id}
                          href={`/media/${work.media_id}`}
                          className="block p-3 bg-gray-900 rounded-lg border border-gray-700 hover:border-blue-500 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-grow min-w-0">
                              <p className="font-medium text-white truncate">{work.title}</p>
                              <p className="text-xs text-gray-400">{work.release_year}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              {work.sequence_number && (
                                <p className="text-sm font-semibold text-blue-400">#{work.sequence_number}</p>
                              )}
                              {work.season_number && work.episode_number && (
                                <p className="text-xs text-gray-500">
                                  S{work.season_number}E{work.episode_number}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2">
               <GraphExplorer nodes={graphData.nodes} links={graphData.links} />
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Historical Figures</h2>
              <div className="space-y-4">
                {media.portrayals.map((p: any) => (
                  <Link 
                    key={p.figure.canonical_id} 
                    href={`/figure/${p.figure.canonical_id}`}
                    className="block p-4 bg-gray-900 rounded-lg border border-transparent hover:border-blue-500 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white">{p.figure.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        p.sentiment === 'Heroic' ? 'bg-green-500/20 text-green-400' :
                        p.sentiment === 'Villainous' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {p.sentiment}
                      </span>
                    </div>
                    {p.role && <p className="text-sm text-gray-400 italic">"{p.role}"</p>}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
