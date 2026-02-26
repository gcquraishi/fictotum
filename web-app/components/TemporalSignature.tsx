import React from 'react';
import { Clock, Calendar } from 'lucide-react';

interface TemporalSignatureProps {
  settingYear: number;
  releaseYear: number;
  historicalSpan?: number;
}

/**
 * Temporal Signature
 *
 * Visualizes the temporal relationship between a work's setting and its creation.
 * Shows:
 * - Story setting period
 * - Time depth (distance between setting and publication)
 * - Historical span covered by the narrative
 */
export default function TemporalSignature({
  settingYear,
  releaseYear,
  historicalSpan
}: TemporalSignatureProps) {

  // Calculate time depth
  const timeDepth = releaseYear - settingYear;

  // Format year for display (handle BCE)
  const formatYear = (year: number): string => {
    if (year < 0) {
      return `${Math.abs(year)} BCE`;
    }
    return `${year} CE`;
  };

  // Calculate visual positions for timeline (0-100%)
  const minYear = Math.min(settingYear, releaseYear);
  const maxYear = Math.max(settingYear, releaseYear);
  const totalRange = maxYear - minYear;

  const settingPosition = totalRange > 0 ? ((settingYear - minYear) / totalRange) * 100 : 50;
  const releasePosition = totalRange > 0 ? ((releaseYear - minYear) / totalRange) * 100 : 50;

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Temporal Signature
      </h2>

      <div className="bg-white border-2 border-stone-300 p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Story Setting */}
          <div className="bg-stone-100 border-2 border-stone-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                Story Setting
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900 font-mono">
              {formatYear(settingYear)}
            </div>
            {historicalSpan && historicalSpan > 0 && (
              <div className="text-xs text-stone-600 mt-1 font-mono">
                Span: {historicalSpan} years
              </div>
            )}
          </div>

          {/* Time Depth */}
          <div className="bg-amber-50 border-2 border-amber-600 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                Time Depth
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">
              ~{Math.abs(timeDepth)} yrs
            </div>
            <div className="text-xs text-amber-700 mt-1 font-mono">
              before publication
            </div>
          </div>

          {/* Publication */}
          <div className="bg-stone-100 border-2 border-stone-300 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-stone-600" />
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
                Published
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900 font-mono">
              {formatYear(releaseYear)}
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="border-t-2 border-stone-200 pt-6">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 mb-4">
            Temporal Distance Visualization
          </div>

          {/* Timeline Bar */}
          <div className="relative h-16 mb-2">
            {/* Base timeline */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-stone-300 transform -translate-y-1/2" />

            {/* Connection line between setting and release */}
            <div
              className="absolute top-1/2 h-1 bg-amber-600/30 transform -translate-y-1/2"
              style={{
                left: `${Math.min(settingPosition, releasePosition)}%`,
                right: `${100 - Math.max(settingPosition, releasePosition)}%`
              }}
            />

            {/* Setting marker */}
            <div
              className="absolute top-0 transform -translate-x-1/2"
              style={{ left: `${settingPosition}%` }}
            >
              <div className="w-3 h-3 bg-amber-600 border-2 border-white rotate-45" />
              <div className="text-[8px] font-black uppercase tracking-wider text-amber-700 mt-2 whitespace-nowrap transform -translate-x-1/3">
                Setting
              </div>
            </div>

            {/* Release marker */}
            <div
              className="absolute bottom-0 transform -translate-x-1/2"
              style={{ left: `${releasePosition}%` }}
            >
              <div className="text-[8px] font-black uppercase tracking-wider text-stone-600 mb-2 whitespace-nowrap transform -translate-x-1/3">
                Release
              </div>
              <div className="w-3 h-3 bg-stone-600 border-2 border-white rounded-full" />
            </div>
          </div>

          {/* Year labels */}
          <div className="flex justify-between text-xs text-stone-500 font-mono mt-4">
            <span>{formatYear(minYear)}</span>
            <span>{formatYear(maxYear)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
