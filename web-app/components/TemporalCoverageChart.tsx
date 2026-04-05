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
  const getBarColor = (status: 'sparse' | 'moderate' | 'rich'): string => {
    switch (status) {
      case 'sparse':
        return '#8B2635'; // burgundy accent for sparse (needs attention)
      case 'moderate':
        return '#666666'; // gray for moderate
      case 'rich':
        return '#1A1A1A'; // text color for rich (solid)
    }
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimeBucket }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            padding: '16px',
            border: '1px solid var(--color-border)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-accent)',
              marginBottom: '8px',
              borderBottom: '1px solid rgba(255,255,255,0.2)',
              paddingBottom: '8px',
            }}
          >
            {data.period}
          </p>
          <div style={{ fontSize: '11px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.6 }}>Works:</span>
              <span>{data.workCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.6 }}>Figures:</span>
              <span>{data.figureCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '4px' }}>
              <span style={{ opacity: 0.6 }}>Series:</span>
              <span>{data.seriesCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ opacity: 0.6 }}>Standalone:</span>
              <span>{data.standaloneCount}</span>
            </div>
          </div>
          {Object.keys(data.mediaTypes).length > 0 && (
            <>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', margin: '8px 0' }} />
              <p
                style={{
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  marginBottom: '4px',
                  opacity: 0.6,
                }}
              >
                Media Types
              </p>
              {Object.entries(data.mediaTypes).map(([type, count]) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '11px', marginBottom: '2px' }}>
                  <span style={{ opacity: 0.6 }}>{type}:</span>
                  <span>{count as number}</span>
                </div>
              ))}
            </>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: '8px', paddingTop: '8px' }}>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-accent)' }}>
              Click to explore
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatXAxis = (value: string) => {
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
    <div
      style={{
        width: '100%',
        height: '500px',
        background: 'var(--color-hero-bg)',
        border: '1px solid var(--color-border)',
        borderTop: 'none',
        padding: '24px',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={timeBuckets}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          onClick={(data: unknown) => {
            const chartData = data as { activePayload?: Array<{ payload: TimeBucket }> } | null;
            if (chartData?.activePayload?.[0]) {
              onPeriodClick(chartData.activePayload[0].payload);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            dataKey="period"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{ fill: '#666666', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            tickFormatter={formatXAxis}
          />
          <YAxis
            label={{
              value: 'Number of Works',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#666666', fontSize: 11, fontFamily: 'IBM Plex Mono' },
            }}
            tick={{ fill: '#666666', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(139, 38, 53, 0.05)' }} />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono',
            }}
          />
          <Bar
            dataKey="workCount"
            name="Works in Period"
            radius={[0, 0, 0, 0]}
            cursor="pointer"
          >
            {timeBuckets.map((bucket, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(bucket.coverageStatus)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', background: '#8B2635' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>
            Sparse (&lt;5 works)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', background: '#666666' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>
            Moderate (5-19 works)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '16px', height: '16px', background: '#1A1A1A' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>
            Rich (20+ works)
          </span>
        </div>
      </div>
    </div>
  );
}
