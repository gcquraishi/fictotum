import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getMediaById, getMediaGraphData } from '@/lib/db';
import GraphExplorer from '@/components/GraphExplorer';
import { BookOpen, Film, Tv, Gamepad2, User, List } from 'lucide-react';

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

  const getIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'FILM': return <Film className="w-10 h-10 text-blue-400" />;
      case 'TV_SERIES': return <Tv className="w-10 h-10 text-blue-400" />;
      case 'GAME': return <Gamepad2 className="w-10 h-10 text-blue-400" />;
      default: return <BookOpen className="w-10 h-10 text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
            ← Back to Dashboard
          </Link>

          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-lg p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500/30">
                  {getIcon(media.media_type)}
                </div>
              </div>
              <div className="flex-grow">
                <h1 className="text-4xl font-bold text-white mb-2">{media.title}</h1>
                <p className="text-lg text-gray-300 mb-2">
                  {media.media_type} {media.release_year ? `(${media.release_year})` : ''}
                </p>
                {media.creator && (
                  <p className="text-gray-400">Created by <span className="text-white">{media.creator}</span></p>
                )}
              </div>
            </div>
          </div>

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
