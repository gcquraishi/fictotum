import React from 'react';
import { TrendingUp } from 'lucide-react';

interface CulturalImpactScoreProps {
  portrayalCount: number;
  mediaTypes: string[];
  firstAppearance: number;
  mostRecentAppearance: number;
}

/**
 * Cultural Impact Score
 *
 * Measures a historical figure's cultural penetration across media works.
 * Scoring algorithm considers:
 * - Total portrayal count (breadth)
 * - Temporal span of appearances (longevity)
 * - Media diversity (film, TV, books, games)
 * - Recent momentum (appearances in last 10 years)
 */
export default function CulturalImpactScore({
  portrayalCount,
  mediaTypes,
  firstAppearance,
  mostRecentAppearance
}: CulturalImpactScoreProps) {

  // Calculate cultural impact score
  const currentYear = new Date().getFullYear();
  const temporalSpan = mostRecentAppearance - firstAppearance;
  const recencyBonus = (currentYear - mostRecentAppearance < 10) ? 20 : 0;

  const rawScore = (
    portrayalCount * 2 +
    mediaTypes.length * 10 +
    temporalSpan / 10 +
    recencyBonus
  ) / 1.5;

  // Clamp to 0-100
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Format media types for display
  const formatCount = (count: number) => {
    return count.toLocaleString();
  };

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Cultural Impact Score
      </h2>

      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-amber-600" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-1">
                Impact Rating
              </div>
              <div className="text-4xl font-black text-amber-600 font-mono">
                {score}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-stone-900 font-mono">
              / 100
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mb-6">
          <div className="w-full h-4 bg-stone-200 border-2 border-stone-300">
            <div
              className="h-full bg-amber-600 transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="border-t-2 border-stone-200 pt-4">
          <div className="text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 mb-3">
            Impact Analysis
          </div>
          <p className="text-sm text-stone-700 leading-relaxed font-mono">
            <span className="font-black text-amber-600">{formatCount(portrayalCount)}</span> portrayals across{' '}
            <span className="font-black text-amber-600">{mediaTypes.length}</span> format{mediaTypes.length !== 1 ? 's' : ''}{' '}
            spanning{' '}
            <span className="font-black text-amber-600">{temporalSpan}</span> years
          </p>

          {recencyBonus > 0 && (
            <div className="mt-3 inline-flex items-center px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-amber-50 border-amber-600 text-amber-900">
              Active: Recent appearance within 10 years
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
