import React from 'react';
import { Grid3x3 } from 'lucide-react';

interface CharacterProfileMatrixProps {
  canonicalId: string;
  figureName: string;
}

/**
 * Character Profile Matrix
 *
 * Multi-dimensional analysis of how a figure is characterized across media:
 * - Heroic vs Villainous axis
 * - Active vs Passive axis
 * - Tragic vs Triumphant axis
 * - Historical vs Mythologized axis
 *
 * Visualized as a radar chart showing composite character archetype.
 */
export default function CharacterProfileMatrix({
  canonicalId,
  figureName
}: CharacterProfileMatrixProps) {
  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Character Profile Matrix
      </h2>

      <div className="bg-white border-2 border-stone-300 p-8 text-center">
        <Grid3x3 className="w-12 h-12 text-amber-600 mx-auto mb-4 opacity-30" />

        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">
          Dimensional Analysis
        </div>

        <div className="text-xl font-bold text-stone-700 font-mono mb-6">
          MAPPING ARCHETYPES
        </div>

        <div className="border-t-2 border-stone-200 pt-4 mt-4">
          <p className="text-xs text-stone-500 leading-relaxed">
            Multi-dimensional character assessment plotting {figureName} across
            heroic, tragic, active, and historical interpretation axes.
          </p>
        </div>
      </div>
    </div>
  );
}
