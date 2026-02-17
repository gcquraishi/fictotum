'use client';

import type { FigureDossier, DetailedPortrayal, ScholarlyWork } from '@/lib/types';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Calendar, Award, Clock, BookOpen, Film, Gamepad2, Tv, AlertTriangle, ExternalLink } from 'lucide-react';

interface FigureDossierProps {
  dossier: FigureDossier;
}

const SENTIMENT_COLORS: Record<string, string> = {
  Heroic: '#22c55e',    // green-500
  Villainous: '#ef4444', // red-500
  Complex: '#eab308',    // yellow-500
  Neutral: '#6b7280',    // gray-500
};

const MEDIA_TYPE_ICONS: Record<string, typeof Film> = {
  Book: BookOpen,
  Game: Gamepad2,
  Film: Film,
  TVSeries: Tv,
};

export default function FigureDossier({ dossier }: FigureDossierProps) {
  // Calculate sentiment distribution for Consensus Radar
  const sentimentCounts = dossier.portrayals.reduce((acc, portrayal) => {
    acc[portrayal.sentiment] = (acc[portrayal.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalPortrayals = dossier.portrayals.length;
  const radarData = [
    { sentiment: 'Heroic', count: sentimentCounts.Heroic || 0, percentage: ((sentimentCounts.Heroic || 0) / totalPortrayals * 100).toFixed(1) },
    { sentiment: 'Villainous', count: sentimentCounts.Villainous || 0, percentage: ((sentimentCounts.Villainous || 0) / totalPortrayals * 100).toFixed(1) },
    { sentiment: 'Complex', count: sentimentCounts.Complex || 0, percentage: ((sentimentCounts.Complex || 0) / totalPortrayals * 100).toFixed(1) },
    { sentiment: 'Neutral', count: sentimentCounts.Neutral || 0, percentage: ((sentimentCounts.Neutral || 0) / totalPortrayals * 100).toFixed(1) },
  ];

  // Format year (BCE/CE)
  const formatYear = (year?: number): string => {
    if (!year) return 'Unknown';
    if (year < 0) return `${Math.abs(year)} BCE`;
    return `${year} CE`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{dossier.name}</h1>
            <div className="flex flex-wrap gap-4 text-gray-300">
              {dossier.birth_year !== undefined && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatYear(dossier.birth_year)} - {formatYear(dossier.death_year)}</span>
                </div>
              )}
              {dossier.title && (
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  <span>{dossier.title}</span>
                </div>
              )}
              {dossier.era && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{dossier.era}</span>
                </div>
              )}
            </div>
          </div>
          {dossier.historicity_status && (
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              dossier.historicity_status === 'Historical'
                ? 'bg-green-900/30 text-green-400 border border-green-700'
                : dossier.historicity_status === 'Fictional'
                ? 'bg-purple-900/30 text-purple-400 border border-purple-700'
                : 'bg-yellow-900/30 text-yellow-400 border border-yellow-700'
            }`}>
              {dossier.historicity_status}
            </div>
          )}
        </div>
        <div className="mt-4 text-gray-400 text-sm">
          <span className="font-semibold">Canonical ID:</span> {dossier.canonical_id}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Consensus Radar Section */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500">
                Consensus Radar
              </span>
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              Distribution of sentiment portrayals across {totalPortrayals} media work{totalPortrayals !== 1 ? 's' : ''}
            </p>

            {totalPortrayals > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis
                      dataKey="sentiment"
                      tick={{ fill: '#9ca3af', fontSize: 14 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, totalPortrayals]}
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <Radar
                      name="Portrayals"
                      dataKey="count"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.6}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '0.5rem'
                      }}
                      formatter={(value: any, name: any, props: any) => [
                        `${value} portrayals (${props.payload.percentage}%)`,
                        'Count'
                      ]}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                No portrayals available
              </div>
            )}

            {/* Sentiment Summary Grid */}
            <div className="mt-6 grid grid-cols-4 gap-4">
              {radarData.map((item) => (
                <div key={item.sentiment} className="text-center">
                  <div
                    className="text-2xl font-bold mb-1"
                    style={{ color: SENTIMENT_COLORS[item.sentiment as keyof typeof SENTIMENT_COLORS] }}
                  >
                    {item.count}
                  </div>
                  <div className="text-xs text-gray-400">{item.sentiment}</div>
                  <div className="text-xs text-gray-500">{item.percentage}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Portrayal Cards Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Media Portrayals</h2>
            {dossier.portrayals.length > 0 ? (
              dossier.portrayals.map((portrayal, idx) => (
                <PortrayalCard key={`${portrayal.media.media_id}-${idx}`} portrayal={portrayal} />
              ))
            ) : (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-gray-500">
                No portrayals recorded
              </div>
            )}
          </div>
        </div>

        {/* Scholarly Review Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Scholarly Review
            </h2>

            {dossier.scholarly_works.length > 0 ? (
              <div className="space-y-4">
                {dossier.scholarly_works.map((work) => (
                  <ScholarlyWorkCard key={work.wikidata_id} work={work} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-8">
                No scholarly sources linked
              </p>
            )}

            {/* Summary Stats */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                <div className="flex justify-between mb-2">
                  <span>Total Sources:</span>
                  <span className="font-semibold text-white">{dossier.scholarly_works.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Portrayals:</span>
                  <span className="font-semibold text-white">{dossier.portrayals.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Portrayal Card Component */
function PortrayalCard({ portrayal }: { portrayal: DetailedPortrayal }) {
  const MediaIcon = MEDIA_TYPE_ICONS[portrayal.media.media_type] || Film;
  const sentimentColor = SENTIMENT_COLORS[portrayal.sentiment];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1">
            <MediaIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{portrayal.media.title}</h3>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-400">
              <span>{portrayal.media.release_year}</span>
              <span>•</span>
              <span>{portrayal.media.media_type}</span>
              {portrayal.media.creator && (
                <>
                  <span>•</span>
                  <span>{portrayal.media.creator}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div
            className="px-3 py-1 rounded-full text-xs font-semibold border"
            style={{
              backgroundColor: `${sentimentColor}20`,
              borderColor: sentimentColor,
              color: sentimentColor
            }}
          >
            {portrayal.sentiment}
          </div>
          {portrayal.is_protagonist && (
            <div className="px-2 py-1 bg-purple-900/30 text-purple-400 border border-purple-700 rounded text-xs font-semibold">
              Protagonist
            </div>
          )}
        </div>
      </div>

      {portrayal.role_description && (
        <p className="text-gray-300 text-sm mb-3 pl-8">
          {portrayal.role_description}
        </p>
      )}

      {/* Flags Section */}
      <div className="space-y-2 pl-8">
        {portrayal.anachronism_flag && (
          <div className="flex items-start gap-2 p-3 bg-orange-900/20 border border-orange-700/50 rounded">
            <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-orange-400">Anachronism Detected</div>
              {portrayal.anachronism_notes && (
                <div className="text-gray-300 mt-1">{portrayal.anachronism_notes}</div>
              )}
            </div>
          </div>
        )}

        {portrayal.conflict_flag && (
          <div className="flex items-start gap-2 p-3 bg-red-900/20 border border-red-700/50 rounded">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-red-400">Characterization Conflict</div>
              {portrayal.conflict_notes && (
                <div className="text-gray-300 mt-1">{portrayal.conflict_notes}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {portrayal.media.wikidata_id && (
        <div className="mt-3 pt-3 border-t border-gray-700 pl-8">
          <a
            href={`https://www.wikidata.org/wiki/${portrayal.media.wikidata_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            Wikidata: {portrayal.media.wikidata_id}
          </a>
        </div>
      )}
    </div>
  );
}

/* Scholarly Work Card Component */
function ScholarlyWorkCard({ work }: { work: ScholarlyWork }) {
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-1">{work.title}</h3>
      <p className="text-xs text-gray-400 mb-2">
        {work.author} ({work.year})
      </p>

      {work.isbn && (
        <p className="text-xs text-gray-500 mb-2">
          ISBN: {work.isbn}
        </p>
      )}

      {work.notes && (
        <p className="text-xs text-gray-300 mb-3 italic">
          "{work.notes}"
        </p>
      )}

      <a
        href={`https://www.wikidata.org/wiki/${work.wikidata_id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
      >
        <ExternalLink className="w-3 h-3" />
        View on Wikidata
      </a>
    </div>
  );
}
