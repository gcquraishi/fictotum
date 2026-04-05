'use client';

import { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface AccuracyData {
  accuracyScore: number;
  tier: string;
  totalWorks: number;
  conflictCount: number;
  anachronismCount: number;
  totalFlags: number;
  flaggedWorks: number;
  cleanWorks: number;
  conflictDetails: { figure: string; work: string; notes: string | null }[];
  anachronismDetails: { figure: string; work: string; notes: string | null }[];
  percentile: number | null;
  avgAccuracy: number | null;
}

interface AccuracyReputationProps {
  creatorName: string;
}

const TIER_COLORS: Record<string, string> = {
  'Historical Purist': '#2D7D46',
  'Historically Grounded': '#4682B4',
  'Creative License': '#B8860B',
  'Historical Fantasy': '#8B2635',
};

export default function AccuracyReputation({ creatorName }: AccuracyReputationProps) {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const response = await fetch(
          `/api/creator/accuracy-reputation?creator=${encodeURIComponent(creatorName)}`
        );
        if (!response.ok) return;
        const json = await response.json();
        if (!cancelled) setData(json);
      } catch {
        // Silently fail — component just won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [creatorName]);

  if (loading) {
    return (
      <div className="bg-white border-2 border-stone-300 p-6 flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!data || data.totalWorks === 0) return null;

  const tierColor = TIER_COLORS[data.tier] || '#666';
  const allFlags = [...data.conflictDetails, ...data.anachronismDetails]
    .filter((d) => d && d.notes)
    .slice(0, 5);

  return (
    <div className="bg-white border-2 border-stone-300 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-4 h-4 text-amber-600" />
        <h3 className="text-[10px] font-black text-stone-900 uppercase tracking-[0.3em]">
          Historical Accuracy
        </h3>
      </div>

      {/* Score + Tier */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-3xl font-bold font-mono" style={{ color: tierColor }}>
          {data.accuracyScore}%
        </div>
        <div>
          <span
            className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-1 border-2"
            style={{ borderColor: tierColor, color: tierColor }}
          >
            {data.tier}
          </span>
          {data.percentile !== null && (
            <p className="text-[10px] text-stone-500 font-mono mt-1">
              More accurate than {data.percentile}% of creators
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-stone-50 p-2 text-center">
          <div className="text-lg font-bold font-mono text-stone-900">{data.cleanWorks}</div>
          <div className="text-[8px] font-bold uppercase tracking-wider text-stone-500">Clean</div>
        </div>
        <div className="bg-stone-50 p-2 text-center">
          <div className="text-lg font-bold font-mono text-amber-700">{data.conflictCount}</div>
          <div className="text-[8px] font-bold uppercase tracking-wider text-stone-500">Conflicts</div>
        </div>
        <div className="bg-stone-50 p-2 text-center">
          <div className="text-lg font-bold font-mono text-red-700">{data.anachronismCount}</div>
          <div className="text-[8px] font-bold uppercase tracking-wider text-stone-500">Anachronisms</div>
        </div>
      </div>

      {/* Flag Details */}
      {allFlags.length > 0 && (
        <div className="border-t border-stone-200 pt-3 mt-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-2">
            Notable Flags
          </p>
          {allFlags.map((flag, idx) => (
            <div key={idx} className="text-[10px] text-stone-600 mb-1 leading-snug">
              <span className="font-bold text-stone-800">{flag.work}</span>
              {flag.figure && <> · {flag.figure}</>}
              {flag.notes && <> — {flag.notes}</>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
