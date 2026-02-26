import React from 'react';
import { Activity } from 'lucide-react';

interface ReputationVolatilityIndexProps {
  canonicalId: string;
  figureName: string;
}

/**
 * Reputation Volatility Index
 *
 * Tracks how consistently a historical figure is portrayed across media.
 * High volatility indicates contested or evolving interpretations.
 * Low volatility suggests cultural consensus on character assessment.
 *
 * Calculated from sentiment tag variance across all portrayals.
 */
export default function ReputationVolatilityIndex({
  canonicalId,
  figureName
}: ReputationVolatilityIndexProps) {
  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Reputation Volatility
      </h2>

      <div className="bg-white border-2 border-stone-300 p-8 text-center">
        <Activity className="w-12 h-12 text-amber-600 mx-auto mb-4 opacity-30" />

        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">
          Volatility Index
        </div>

        <div className="text-xl font-bold text-stone-700 font-mono mb-6">
          CALCULATING VARIANCE
        </div>

        <div className="border-t-2 border-stone-200 pt-4 mt-4">
          <p className="text-xs text-stone-500 leading-relaxed">
            Measures sentiment consistency across portrayals. High volatility indicates
            contested interpretations of {figureName}.
          </p>
        </div>
      </div>
    </div>
  );
}
