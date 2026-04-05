'use client';

import React, { useEffect, useState } from 'react';
import { Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface RecurringFigure {
  name: string;
  canonical_id: string;
  appearances: number;
  works: string[];
}

interface CastRepertoryCompanyProps {
  creatorName: string;
}

/**
 * Cast Repertory Company
 *
 * Identifies which historical figures a creator repeatedly portrays:
 * - Most frequently depicted figures
 * - Figure recurrence patterns across works
 * - Signature character roster
 *
 * Reveals creator's historiographical fixations and narrative universes.
 */
export default function CastRepertoryCompany({
  creatorName
}: CastRepertoryCompanyProps) {
  const [recurringFigures, setRecurringFigures] = useState<RecurringFigure[]>([]);
  const [uniqueCount, setUniqueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRepertoryData() {
      try {
        const response = await fetch(`/api/creator/repertory?creator=${encodeURIComponent(creatorName)}`);
        if (response.ok) {
          const data = await response.json();
          setRecurringFigures(data.recurringFigures || []);
          setUniqueCount(data.uniqueCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch repertory data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRepertoryData();
  }, [creatorName]);

  const getObsessionLabel = (appearances: number) => {
    if (appearances >= 10) return 'OBSESSION';
    if (appearances >= 5) return 'CORE CAST';
    if (appearances >= 3) return 'RECURRING';
    return 'CAMEO';
  };

  const getBarWidth = (appearances: number) => {
    const maxAppearances = recurringFigures.length > 0 ? recurringFigures[0].appearances : 1;
    return Math.max(10, (appearances / maxAppearances) * 100);
  };

  if (loading) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Cast Repertory Company
        </h2>
        <div className="bg-white border-2 border-stone-300 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (recurringFigures.length === 0) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Cast Repertory Company
        </h2>
        <div className="bg-white border-2 border-stone-300 p-6 text-center">
          <Users className="w-12 h-12 text-stone-400 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-stone-600">
            No recurring characters found for this creator
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Cast Repertory Company
      </h2>

      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">
          Recurring Historical Characters
        </div>

        {/* Recurring Figures List */}
        <div className="space-y-3 mb-6">
          {recurringFigures.map((figure) => (
            <Link
              key={figure.canonical_id}
              href={`/figure/${figure.canonical_id}`}
              className="block group"
            >
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className="font-bold text-stone-900 group-hover:text-amber-700 transition-colors uppercase tracking-tight">
                  {figure.name}
                </span>
                <span className="text-xs font-black px-2 py-1 bg-amber-50 border border-amber-600 text-amber-900 uppercase tracking-wider">
                  {getObsessionLabel(figure.appearances)}
                </span>
              </div>

              {/* Visual bar */}
              <div className="flex items-center gap-2">
                <div className="flex-grow bg-stone-200 h-2">
                  <div
                    className="bg-amber-600 h-full transition-all duration-300 group-hover:bg-amber-700"
                    style={{ width: `${getBarWidth(figure.appearances)}%` }}
                  />
                </div>
                <span className="text-sm font-mono font-bold text-stone-600 min-w-[60px] text-right">
                  {figure.appearances} work{figure.appearances !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Sample works */}
              {figure.works.length > 0 && (
                <div className="mt-1 text-xs text-stone-500 font-mono truncate">
                  {figure.works.slice(0, 3).join(', ')}
                  {figure.works.length > 3 && ` +${figure.works.length - 3} more`}
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="border-t-2 border-stone-200 pt-4">
          <div className="bg-stone-100 border-2 border-stone-300 p-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400">
                Total Unique Figures
              </div>
              <div className="text-2xl font-black text-amber-600 font-mono">
                {uniqueCount}
              </div>
            </div>
            <div className="text-xs text-stone-600 mt-2 font-mono">
              {uniqueCount - recurringFigures.length} appear once
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
