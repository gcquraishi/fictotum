import { Portrayal } from '@/lib/types';
import { Film, List } from 'lucide-react';

interface MediaTimelineProps {
  portrayals: Portrayal[];
  groupBySeries?: boolean;
}

const SENTIMENT_COLORS: Record<string, string> = {
  Heroic: 'bg-green-50 text-green-700 border-green-500',
  Villainous: 'bg-red-50 text-red-700 border-red-500',
  Complex: 'bg-stone-50 text-stone-700 border-stone-500',
};

export default function MediaTimeline({ portrayals, groupBySeries = false }: MediaTimelineProps) {
  const sortedPortrayals = [...portrayals].sort(
    (a, b) => Number(a.media.release_year) - Number(b.media.release_year)
  );

  if (portrayals.length === 0) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Media Appearances
        </h2>
        <div className="text-center py-12">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">
            No Media Appearances Recorded
          </p>
          <p className="text-sm text-stone-500">
            Contribute the first portrayal of this historical figure
          </p>
        </div>
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
        className="flex items-start gap-4 p-4 bg-white border-2 border-stone-300 hover:border-amber-600 transition-colors"
      >
        <div className="flex-shrink-0 mt-1">
          <Film className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-grow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              <h3 className="font-bold text-stone-900 uppercase tracking-tight text-sm mb-1">{portrayal.media.title}</h3>
              <div className="flex items-center gap-2 text-xs text-stone-600 font-mono">
                <span className="font-bold">{portrayal.media.release_year}</span>
                {hasSequenceInfo && (
                  <>
                    <span>•</span>
                    {media.series_position?.sequence_number && (
                      <span className="text-amber-600 font-bold">#{media.series_position.sequence_number}</span>
                    )}
                    {media.series_position?.season_number && media.series_position?.episode_number && (
                      <span className="text-amber-600 font-bold">
                        S{media.series_position.season_number}E{media.series_position.episode_number}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <span
              className={`px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] border-2 flex-shrink-0 ${
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
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="text-amber-600">■</span> Media Appearances
        <span className="text-[10px] font-black text-stone-400 ml-auto">({portrayals.length} TOTAL)</span>
      </h2>

      {groupBySeries && Object.keys(groupedPortrayals).length > 1 ? (
        <div className="space-y-6">
          {Object.entries(groupedPortrayals).map(([seriesTitle, seriesPortrayals]) => (
            <div key={seriesTitle}>
              <div className="flex items-center gap-2 mb-3">
                <List className="w-4 h-4 text-amber-600" />
                <h3 className="font-medium text-stone-900">{seriesTitle}</h3>
                <span className="text-sm text-stone-500">({seriesPortrayals.length})</span>
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
