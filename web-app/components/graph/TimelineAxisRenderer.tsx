'use client';

import React, { useMemo } from 'react';

interface TimelineAxisRendererProps {
  minYear: number;
  maxYear: number;
}

export default function TimelineAxisRenderer({
  minYear,
  maxYear
}: TimelineAxisRendererProps) {
  // Smart label placement - show ~5-10 year markers based on range
  const yearMarkers = useMemo(() => {
    const range = maxYear - minYear;
    let step: number;

    if (range <= 50) step = 10;
    else if (range <= 200) step = 25;
    else if (range <= 500) step = 50;
    else step = 100;

    const markers: number[] = [];
    const start = Math.ceil(minYear / step) * step;

    for (let year = start; year <= maxYear; year += step) {
      markers.push(year);
    }

    return markers;
  }, [minYear, maxYear]);

  const getX = (year: number) =>
    ((year - minYear) / (maxYear - minYear)) * 100;

  return (
    <div className="absolute top-0 left-0 w-full h-6 border-b border-stone-300">
      {yearMarkers.map(year => (
        <div
          key={year}
          className="absolute top-0 h-full flex flex-col items-center"
          style={{ left: `${getX(year)}%` }}
        >
          <div className="h-2 w-px bg-stone-400" />
          <span className="text-xs font-mono text-stone-600 mt-0.5">
            {year}
          </span>
        </div>
      ))}
    </div>
  );
}
