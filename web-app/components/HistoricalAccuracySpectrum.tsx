import React from 'react';
import { Target } from 'lucide-react';

interface HistoricalAccuracySpectrumProps {
  wikidataId: string;
  workTitle: string;
}

/**
 * Historical Accuracy Spectrum
 *
 * Evaluates how figures are portrayed relative to historical record:
 * - Documented historical figures with accurate details
 * - Historical figures with creative liberties
 * - Composite characters (multiple historical sources)
 * - Fully fictional characters in historical settings
 *
 * Aggregates historicity_status across all portrayals in work.
 */
export default function HistoricalAccuracySpectrum({
  wikidataId,
  workTitle
}: HistoricalAccuracySpectrumProps) {
  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Historical Accuracy Spectrum
      </h2>

      <div className="bg-white border-2 border-stone-300 p-8 text-center">
        <Target className="w-12 h-12 text-amber-600 mx-auto mb-4 opacity-30" />

        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">
          Fidelity Assessment
        </div>

        <div className="text-xl font-bold text-stone-700 font-mono mb-6">
          VERIFYING SOURCES
        </div>

        <div className="border-t-2 border-stone-200 pt-4 mt-4">
          <p className="text-xs text-stone-500 leading-relaxed">
            Analyzes the balance between documented history and creative fiction
            in {workTitle}.
          </p>
        </div>
      </div>
    </div>
  );
}
