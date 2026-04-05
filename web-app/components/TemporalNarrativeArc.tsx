import React from 'react';
import { ArrowRight } from 'lucide-react';

interface TemporalNarrativeArcProps {
  wikidataId: string;
  workTitle: string;
}

/**
 * Temporal Narrative Arc
 *
 * For series: tracks how historical portrayals evolve across episodes/books.
 * For standalone works: analyzes temporal progression of portrayed figures.
 *
 * Reveals narrative treatment of historical characters over time:
 * - Character development arcs
 * - Changing sentiment trajectories
 * - Figure prominence fluctuations
 */
export default function TemporalNarrativeArc({
  wikidataId,
  workTitle
}: TemporalNarrativeArcProps) {
  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Temporal Narrative Arc
      </h2>

      <div className="bg-white border-2 border-stone-300 p-8 text-center">
        <ArrowRight className="w-12 h-12 text-amber-600 mx-auto mb-4 opacity-30" />

        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">
          Narrative Trajectory
        </div>

        <div className="text-xl font-bold text-stone-700 font-mono mb-6">
          TRACKING EVOLUTION
        </div>

        <div className="border-t-2 border-stone-200 pt-4 mt-4">
          <p className="text-xs text-stone-500 leading-relaxed">
            Charts how historical figures are developed and portrayed across the
            narrative timeline of {workTitle}.
          </p>
        </div>
      </div>
    </div>
  );
}
