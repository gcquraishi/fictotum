'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { getEraColor } from '@/lib/colors';

interface EraData {
  era: string;
  workCount: number;
  figureCount: number;
  sampleWorks: string[];
}

interface TemporalRange {
  earliest: number | null;
  latest: number | null;
  count: number;
}

interface TemporalObsessionMapProps {
  creatorName: string;
}

export default function TemporalObsessionMap({
  creatorName
}: TemporalObsessionMapProps) {
  const [eras, setEras] = useState<EraData[]>([]);
  const [temporalRange, setTemporalRange] = useState<TemporalRange | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const response = await fetch(`/api/creator/temporal-obsession?creator=${encodeURIComponent(creatorName)}`);
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) {
            setEras(data.eras || []);
            setTemporalRange(data.temporalRange || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch temporal obsession data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [creatorName]);

  if (loading) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Temporal Obsession Map
        </h2>
        <div className="bg-white border-2 border-stone-300 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (eras.length === 0) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Temporal Obsession Map
        </h2>
        <div className="bg-white border-2 border-stone-300 p-6 text-center">
          <MapPin className="w-12 h-12 text-stone-400 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-stone-600">
            No era data available for this creator
          </p>
        </div>
      </div>
    );
  }

  const maxWorkCount = eras[0]?.workCount || 1;

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Temporal Obsession Map
      </h2>

      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">
          Recurring Historical Periods
        </div>

        {/* Era bars */}
        <div className="space-y-3 mb-6">
          {eras.map((era) => {
            const color = getEraColor(era.era);
            const barWidth = Math.max(10, (era.workCount / maxWorkCount) * 100);

            return (
              <div key={era.era}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="font-bold text-stone-900 uppercase tracking-tight text-sm">
                    {era.era}
                  </span>
                  <span className="text-xs font-mono text-stone-500">
                    {era.figureCount} figure{era.figureCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-grow bg-stone-200 h-3">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: color }}
                    />
                  </div>
                  <span className="text-sm font-mono font-bold text-stone-600 min-w-[60px] text-right">
                    {era.workCount} work{era.workCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {era.sampleWorks.length > 0 && (
                  <div className="mt-1 text-xs text-stone-500 font-mono truncate">
                    {era.sampleWorks.slice(0, 3).join(', ')}
                    {era.sampleWorks.length > 3 && ` +${era.sampleWorks.length - 3} more`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Temporal range */}
        {temporalRange && temporalRange.earliest !== null && (
          <div className="border-t-2 border-stone-200 pt-4">
            <div className="bg-stone-100 border-2 border-stone-300 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 mb-1">
                Setting Range
              </div>
              <div className="text-lg font-black text-amber-600 font-mono">
                {temporalRange.earliest < 0 ? `${Math.abs(temporalRange.earliest)} BC` : temporalRange.earliest}
                {' — '}
                {temporalRange.latest}
              </div>
              <div className="text-xs text-stone-500 font-mono mt-1">
                {temporalRange.count} work{temporalRange.count !== 1 ? 's' : ''} with dated settings
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
