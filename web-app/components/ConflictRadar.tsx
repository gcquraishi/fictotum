'use client';

import { SentimentDistribution } from '@/lib/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ConflictRadarProps {
  distribution: SentimentDistribution;
}

const COLORS = {
  Heroic: '#22c55e',    // green
  Villainous: '#ef4444', // red
  Complex: '#eab308',    // yellow
};

export default function ConflictRadar({ distribution }: ConflictRadarProps) {
  const data = [
    { name: 'Heroic', value: distribution.Heroic },
    { name: 'Villainous', value: distribution.Villainous },
    { name: 'Complex', value: distribution.Complex },
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Portrayal Distribution</h2>
        <p className="text-gray-400 text-center py-8">No portrayals available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Portrayal Distribution</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-green-500">{distribution.Heroic}%</div>
          <div className="text-sm text-gray-400">Heroic</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-500">{distribution.Villainous}%</div>
          <div className="text-sm text-gray-400">Villainous</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-yellow-500">{distribution.Complex}%</div>
          <div className="text-sm text-gray-400">Complex</div>
        </div>
      </div>
    </div>
  );
}
