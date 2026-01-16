import { Portrayal } from '@/lib/types';
import { Film } from 'lucide-react';

interface MediaTimelineProps {
  portrayals: Portrayal[];
}

const SENTIMENT_COLORS = {
  Heroic: 'bg-green-500/20 text-green-300 border-green-500/30',
  Villainous: 'bg-red-500/20 text-red-300 border-red-500/30',
  Complex: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
};

export default function MediaTimeline({ portrayals }: MediaTimelineProps) {
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

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">
        Media Appearances ({portrayals.length})
      </h2>
      <div className="space-y-3">
        {sortedPortrayals.map((portrayal, index) => (
          <div
            key={index}
            className="flex items-start gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700"
          >
            <div className="flex-shrink-0 mt-1">
              <Film className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-grow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{portrayal.media.title}</h3>
                  <p className="text-sm text-gray-400">{portrayal.media.release_year}</p>
                </div>
                <span
                  className={`px-3 py-1 text-xs rounded-full border ${
                    SENTIMENT_COLORS[portrayal.sentiment]
                  }`}
                >
                  {portrayal.sentiment}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
