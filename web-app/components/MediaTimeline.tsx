import { Portrayal } from '@/lib/types';
import { Film, List } from 'lucide-react';

interface MediaTimelineProps {
  portrayals: Portrayal[];
  groupBySeries?: boolean;
}

const SENTIMENT_COLORS = {
  Heroic: 'bg-green-500/20 text-green-300 border-green-500/30',
  Villainous: 'bg-red-500/20 text-red-300 border-red-500/30',
  Complex: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export default function MediaTimeline({ portrayals, groupBySeries = false }: MediaTimelineProps) {
  const sortedPortrayals = [...portrayals].sort(
    (a, b) => Number(a.media.release_year) - Number(b.media.release_year)
  );

  if (portrayals.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Media Appearances</h2>
        <p className="text-gray-400 text-center py-8">No media appearances recorded</p>
      </div>
    );
  }

  // Group portrayals by series if enabled
  const groupedPortrayals = groupBySeries
    ? sortedPortrayals.reduce((acc, portrayal) => {
        // Use parent_series title as key if available, otherwise use the media title itself
        const seriesKey = (portrayal.media as any).parent_series?.title || portrayal.media.title;
        if (!acc[seriesKey]) {
          acc[seriesKey] = [];
        }
        acc[seriesKey].push(portrayal);
        return acc;
      }, {} as Record<string, typeof sortedPortrayals>)
    : { 'All': sortedPortrayals };

  const renderPortrayal = (portrayal: Portrayal, index: number) => {
    const media = portrayal.media as any;
    const hasSequenceInfo = media.series_position?.sequence_number ||
                            media.series_position?.season_number ||
                            media.series_position?.episode_number;

    return (
      <div
        key={index}
        className="flex items-start gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700"
      >
        <div className="flex-shrink-0 mt-1">
          <Film className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex-grow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              <h3 className="font-semibold text-white">{portrayal.media.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>{portrayal.media.release_year}</span>
                {hasSequenceInfo && (
                  <>
                    <span>•</span>
                    {media.series_position?.sequence_number && (
                      <span className="text-blue-400">#{media.series_position.sequence_number}</span>
                    )}
                    {media.series_position?.season_number && media.series_position?.episode_number && (
                      <span className="text-blue-400">
                        S{media.series_position.season_number}E{media.series_position.episode_number}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <span
              className={`px-3 py-1 text-xs rounded-full border flex-shrink-0 ${
                SENTIMENT_COLORS[portrayal.sentiment]
              }`}
            >
              {portrayal.sentiment}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        Media Appearances ({portrayals.length})
      </h2>

      {groupBySeries && Object.keys(groupedPortrayals).length > 1 ? (
        <div className="space-y-6">
          {Object.entries(groupedPortrayals).map(([seriesTitle, seriesPortrayals]) => (
            <div key={seriesTitle}>
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-blue-400" />
                <h3 className="font-medium text-gray-300">{seriesTitle}</h3>
                <span className="text-sm text-gray-500">({seriesPortrayals.length})</span>
              </div>
              <div className="space-y-3">
                {seriesPortrayals.map((portrayal, index) => renderPortrayal(portrayal, index))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPortrayals.map((portrayal, index) => renderPortrayal(portrayal, index))}
        </div>
      )}
    </div>
  );
}
