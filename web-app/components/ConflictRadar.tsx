'use client';

import { SentimentDistribution } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ConflictRadarProps {
  distribution: SentimentDistribution;
}

// Evidence Locker color palette
const COLORS = {
  Heroic: '#22c55e',    // green-500 - justice/heroism
  Villainous: '#ef4444', // red-500 - danger/villainy
  Complex: '#78716c',    // stone-500 - neutral/complex
};

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];

  return (
    <div className="bg-white border-2 border-stone-300 p-3 shadow-xl">
      <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-1">
        {data.name}
      </div>
      <div className="font-mono text-lg font-bold text-stone-900">
        {data.value}%
      </div>
    </div>
  );
};

export default function ConflictRadar({ distribution }: ConflictRadarProps) {
  const data = [
    { name: 'Heroic', value: distribution.Heroic },
    { name: 'Villainous', value: distribution.Villainous },
    { name: 'Complex', value: distribution.Complex },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Sentiment Distribution
        </h2>
        <div className="text-center py-8">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">
            No Data Available
          </p>
        </div>
      </div>
    );
  }

  // Calculate dominant sentiment
  const dominant = data.reduce((prev, current) => (prev.value > current.value ? prev : current));

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      {/* Header */}
      <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="text-amber-600">■</span> Sentiment Distribution
      </h2>

      {/* Chart */}
      <div className="h-48 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={70}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={3}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white border-2 border-stone-300 text-center">
          <div className="text-2xl font-bold text-green-600 font-mono">{distribution.Heroic}%</div>
          <div className="text-[9px] text-stone-500 uppercase tracking-[0.15em] font-black mt-1">Heroic</div>
        </div>
        <div className="p-3 bg-white border-2 border-stone-300 text-center">
          <div className="text-2xl font-bold text-stone-600 font-mono">{distribution.Complex}%</div>
          <div className="text-[9px] text-stone-500 uppercase tracking-[0.15em] font-black mt-1">Complex</div>
        </div>
        <div className="p-3 bg-white border-2 border-stone-300 text-center">
          <div className="text-2xl font-bold text-red-600 font-mono">{distribution.Villainous}%</div>
          <div className="text-[9px] text-stone-500 uppercase tracking-[0.15em] font-black mt-1">Villainous</div>
        </div>
      </div>

      {/* Dominant Sentiment Badge */}
      <div className="mt-4 p-3 bg-amber-50 border-2 border-amber-600">
        <div className="text-[8px] font-black text-amber-700 uppercase tracking-[0.3em] mb-1">
          Dominant Portrayal
        </div>
        <div className="text-sm font-bold text-stone-900 uppercase tracking-wide">
          {dominant.name} ({dominant.value}%)
        </div>
      </div>
    </div>
  );
}
