'use client';

import { Portrayal } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentTrendChartProps {
  portrayals: Portrayal[];
}

// Evidence Locker color palette
const SENTIMENT_COLORS = {
  heroic: '#22c55e',    // green-500 - justice/heroism
  villainous: '#ef4444', // red-500 - danger/villainy
  complex: '#78716c',    // stone-500 - neutral/complex
};

// Hover colors (slightly lighter)
const SENTIMENT_HOVER_COLORS = {
  heroic: '#4ade80',    // green-400
  villainous: '#f87171', // red-400
  complex: '#a8a29e',    // stone-400
};

interface TimelinePeriod {
  decade: string;
  displayLabel: string;
  heroic: number;
  villainous: number;
  complex: number;
  heroicPct: number;
  villainousPct: number;
  complexPct: number;
  total: number;
  portrayals: Portrayal[];
}

// Group portrayals by decade
function groupByDecade(portrayals: Portrayal[]): TimelinePeriod[] {
  if (portrayals.length === 0) return [];

  const decades: Map<number, Portrayal[]> = new Map();

  portrayals.forEach(portrayal => {
    const year = Number(portrayal.media.release_year);
    const decade = Math.floor(year / 10) * 10;

    if (!decades.has(decade)) {
      decades.set(decade, []);
    }
    decades.get(decade)!.push(portrayal);
  });

  // Convert to timeline periods with sentiment counts
  const periods: TimelinePeriod[] = Array.from(decades.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, decadePortrayals]) => {
      const sentimentCounts = {
        heroic: 0,
        villainous: 0,
        complex: 0,
      };

      decadePortrayals.forEach(portrayal => {
        // Check sentiment_tags first (new format), fall back to sentiment (legacy)
        const tags = portrayal.sentiment_tags || [portrayal.sentiment.toLowerCase()];

        // Categorize based on primary tag
        if (tags.includes('heroic') || tags.includes('noble') || tags.includes('courageous')) {
          sentimentCounts.heroic++;
        } else if (tags.includes('villainous') || tags.includes('ruthless') || tags.includes('tyrannical')) {
          sentimentCounts.villainous++;
        } else {
          sentimentCounts.complex++;
        }
      });

      const total = decadePortrayals.length;
      return {
        decade: decade.toString(),
        displayLabel: `${decade}s`,
        heroic: sentimentCounts.heroic,
        villainous: sentimentCounts.villainous,
        complex: sentimentCounts.complex,
        heroicPct: Math.round((sentimentCounts.heroic / total) * 100),
        villainousPct: Math.round((sentimentCounts.villainous / total) * 100),
        complexPct: Math.round((sentimentCounts.complex / total) * 100),
        total,
        portrayals: decadePortrayals,
      };
    });

  return periods;
}

// Calculate trend direction
function calculateTrend(periods: TimelinePeriod[]): 'up' | 'down' | 'stable' {
  if (periods.length < 2) return 'stable';

  const firstPeriod = periods[0];
  const lastPeriod = periods[periods.length - 1];

  const firstHeroicRatio = firstPeriod.heroic / firstPeriod.total;
  const lastHeroicRatio = lastPeriod.heroic / lastPeriod.total;

  const difference = lastHeroicRatio - firstHeroicRatio;

  if (difference > 0.15) return 'up'; // More heroic over time
  if (difference < -0.15) return 'down'; // Less heroic (more villainous/complex) over time
  return 'stable';
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  const total = data.heroic + data.villainous + data.complex;

  return (
    <div className="bg-white border-2 border-stone-300 p-4 shadow-xl">
      <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2">
        {data.displayLabel}
      </div>
      <div className="space-y-1 font-mono text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-stone-600">Total:</span>
          <span className="font-bold text-stone-900">{total}</span>
        </div>
        {data.heroic > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-green-600">Heroic:</span>
            <span className="font-bold">{data.heroic} ({Math.round((data.heroic / total) * 100)}%)</span>
          </div>
        )}
        {data.villainous > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-red-600">Villainous:</span>
            <span className="font-bold">{data.villainous} ({Math.round((data.villainous / total) * 100)}%)</span>
          </div>
        )}
        {data.complex > 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-stone-600">Complex:</span>
            <span className="font-bold">{data.complex} ({Math.round((data.complex / total) * 100)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default function SentimentTrendChart({ portrayals }: SentimentTrendChartProps) {
  const timelinePeriods = groupByDecade(portrayals);

  if (portrayals.length === 0) {
    return (
      <div className="bg-stone-100 border-2 border-stone-200 p-6">
        <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-amber-600">■</span> Sentiment Timeline
        </h2>
        <div className="text-center py-12">
          <div className="text-stone-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] mb-2">
            No Timeline Data Available
          </p>
          <p className="text-sm text-stone-500">
            Add portrayals to see how this figure&apos;s representation has evolved over time
          </p>
        </div>
      </div>
    );
  }

  const trend = calculateTrend(timelinePeriods);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendLabel = trend === 'up'
    ? 'More Heroic Over Time'
    : trend === 'down'
    ? 'Less Heroic Over Time'
    : 'Stable Portrayal';
  const trendColor = trend === 'up'
    ? 'text-green-600'
    : trend === 'down'
    ? 'text-red-600'
    : 'text-stone-500';

  return (
    <div className="bg-stone-100 border-2 border-stone-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-stone-900 uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="text-amber-600">■</span> Sentiment Timeline
          </h2>
          <p className="text-[10px] text-stone-500 uppercase tracking-[0.15em] font-bold">
            How portrayals evolved across {timelinePeriods.length} {timelinePeriods.length === 1 ? 'decade' : 'decades'}
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 bg-white border-2 border-stone-300 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em]">{trendLabel}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 md:h-96 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={timelinePeriods}
            margin={{
              top: 20,
              right: 10,
              left: -10,
              bottom: 40
            }}
          >
            <XAxis
              dataKey="displayLabel"
              tick={{ fill: '#57534E', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
              stroke="#D6D3D1"
              tickLine={{ stroke: '#D6D3D1' }}
              angle={-45}
              textAnchor="end"
              height={60}
              label={{
                value: 'Time Period',
                position: 'insideBottom',
                offset: -5,
                style: {
                  fill: '#78716c',
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  fontFamily: 'monospace'
                }
              }}
            />
            <YAxis
              tick={{ fill: '#57534E', fontSize: 10, fontFamily: 'monospace', fontWeight: 700 }}
              stroke="#D6D3D1"
              tickLine={{ stroke: '#D6D3D1' }}
              label={{
                value: 'Portrayals',
                angle: -90,
                position: 'insideLeft',
                style: {
                  fill: '#78716c',
                  fontSize: 9,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  fontFamily: 'monospace'
                }
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(215, 119, 6, 0.1)' }} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontFamily: 'monospace',
                fontSize: '9px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.15em'
              }}
              iconType="square"
            />
            <Bar
              dataKey="heroic"
              stackId="a"
              fill={SENTIMENT_COLORS.heroic}
              name="Heroic"
              radius={[0, 0, 0, 0]}
              animationDuration={800}
              animationBegin={0}
            />
            <Bar
              dataKey="complex"
              stackId="a"
              fill={SENTIMENT_COLORS.complex}
              name="Complex"
              radius={[0, 0, 0, 0]}
              animationDuration={800}
              animationBegin={100}
            />
            <Bar
              dataKey="villainous"
              stackId="a"
              fill={SENTIMENT_COLORS.villainous}
              name="Villainous"
              radius={[4, 4, 0, 0]}
              animationDuration={800}
              animationBegin={200}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Context */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-stone-200">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-stone-300" style={{ backgroundColor: SENTIMENT_COLORS.heroic }} />
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-[0.15em]">Heroic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-stone-300" style={{ backgroundColor: SENTIMENT_COLORS.complex }} />
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-[0.15em]">Complex</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-stone-300" style={{ backgroundColor: SENTIMENT_COLORS.villainous }} />
          <span className="text-[10px] font-black text-stone-700 uppercase tracking-[0.15em]">Villainous</span>
        </div>
      </div>

      {/* Key Insight */}
      {timelinePeriods.length >= 2 && (
        <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-600">
          <div className="text-[8px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2">
            Key Insight
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">
            {getKeyInsight(timelinePeriods)}
          </p>
        </div>
      )}
    </div>
  );
}

// Generate contextual insight based on data
function getKeyInsight(periods: TimelinePeriod[]): string {
  const firstPeriod = periods[0];
  const lastPeriod = periods[periods.length - 1];

  const firstHeroicRatio = firstPeriod.heroic / firstPeriod.total;
  const lastHeroicRatio = lastPeriod.heroic / lastPeriod.total;

  const firstVillainousRatio = firstPeriod.villainous / firstPeriod.total;
  const lastVillainousRatio = lastPeriod.villainous / lastPeriod.total;

  const heroicChange = lastHeroicRatio - firstHeroicRatio;
  const villainousChange = lastVillainousRatio - firstVillainousRatio;

  if (heroicChange > 0.2) {
    return `Portrayals have become significantly more heroic from the ${firstPeriod.displayLabel} to ${lastPeriod.displayLabel}, suggesting a cultural shift toward viewing this figure more positively.`;
  } else if (villainousChange > 0.2) {
    return `Portrayals have become significantly more villainous from the ${firstPeriod.displayLabel} to ${lastPeriod.displayLabel}, indicating a more critical modern perspective.`;
  } else if (Math.abs(heroicChange) < 0.1 && Math.abs(villainousChange) < 0.1) {
    return `Portrayals have remained remarkably consistent across time periods, maintaining a stable interpretation of this figure despite ${periods.length} decades of cultural change.`;
  } else {
    const mostCommonInLast = lastPeriod.heroic > lastPeriod.villainous && lastPeriod.heroic > lastPeriod.complex
      ? 'heroic'
      : lastPeriod.villainous > lastPeriod.complex
      ? 'villainous'
      : 'complex';

    return `Recent portrayals (${lastPeriod.displayLabel}) predominantly show this figure as ${mostCommonInLast}, with ${lastPeriod.total} recorded appearances in that decade.`;
  }
}
