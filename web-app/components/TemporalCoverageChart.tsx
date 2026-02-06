'use client';

import { TimeBucket } from '@/lib/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TemporalCoverageChartProps {
  timeBuckets: TimeBucket[];
  onPeriodClick: (bucket: TimeBucket) => void;
}

export default function TemporalCoverageChart({
  timeBuckets,
  onPeriodClick,
}: TemporalCoverageChartProps) {
  // Get color based on coverage status
  const getBarColor = (status: 'sparse' | 'moderate' | 'rich'): string => {
    switch (status) {
      case 'sparse':
        return '#dc2626'; // red-600
      case 'moderate':
        return '#d97706'; // amber-600
      case 'rich':
        return '#16a34a'; // green-600
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-stone-900 text-white p-4 border-2 border-amber-600 shadow-lg">
          <p className="font-black text-amber-400 text-xs uppercase tracking-widest mb-2">
            {data.period}
          </p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-stone-400">Works:</span>
              <span className="font-bold text-white">{data.workCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-400">Figures:</span>
              <span className="font-bold text-white">{data.figureCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-400">Series:</span>
              <span className="font-bold text-white">{data.seriesCount}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-stone-400">Standalone:</span>
              <span className="font-bold text-white">{data.standaloneCount}</span>
            </div>
          </div>
          {Object.keys(data.mediaTypes).length > 0 && (
            <>
              <div className="border-t border-stone-700 my-2"></div>
              <p className="font-black text-amber-400 text-[10px] uppercase tracking-widest mb-1">
                Media Types
              </p>
              <div className="space-y-0.5">
                {Object.entries(data.mediaTypes).map(([type, count]) => (
                  <div key={type} className="flex justify-between gap-4 text-xs">
                    <span className="text-stone-400">{type}:</span>
                    <span className="font-bold text-white">{count as number}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="border-t border-stone-700 mt-2 pt-2">
            <p className="text-[10px] text-amber-500 uppercase tracking-wider">
              Click to explore →
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format X-axis labels
  const formatXAxis = (value: string) => {
    // For century view, show start year of period
    const match = value.match(/^(-?\d+)-/);
    if (match) {
      const year = parseInt(match[1]);
      if (year < 0) {
        return `${Math.abs(year)} BCE`;
      }
      return `${year}`;
    }
    return value;
  };

  return (
    <div className="w-full h-[500px] bg-stone-50 border-2 border-stone-200 p-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={timeBuckets}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          onClick={(data: any) => {
            if (data && data.activePayload && data.activePayload[0]) {
              onPeriodClick(data.activePayload[0].payload);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fill: '#44403c', fontSize: 10, fontWeight: 'bold' }}
            tickFormatter={formatXAxis}
          />
          <YAxis
            label={{
              value: 'Number of Works',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#44403c', fontSize: 12, fontWeight: 'bold' },
            }}
            tick={{ fill: '#44403c', fontSize: 11, fontWeight: 'bold' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(217, 119, 6, 0.1)' }} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '11px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
            }}
          />
          <Bar
            dataKey="workCount"
            name="Works in Period"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
          >
            {timeBuckets.map((bucket, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(bucket.coverageStatus)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 border border-stone-300"></div>
          <span className="text-stone-700 font-bold uppercase tracking-wide">
            Sparse (&lt;5 works)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-600 border border-stone-300"></div>
          <span className="text-stone-700 font-bold uppercase tracking-wide">
            Moderate (5-19 works)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 border border-stone-300"></div>
          <span className="text-stone-700 font-bold uppercase tracking-wide">
            Rich (20+ works)
          </span>
        </div>
      </div>
    </div>
  );
}
