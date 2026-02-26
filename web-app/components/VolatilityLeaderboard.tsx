'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, TrendingUp } from 'lucide-react';

interface VolatileFigure {
  canonicalId: string;
  name: string;
  volatilityScore: number;
  portrayalCount: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    complex: number;
    neutral: number;
  };
  sparklineData: Array<{ year: number; sentiment: number }>;
}

interface VolatilityLeaderboardProps {
  maxDisplay?: number; // Number of figures to display (default: 7)
}

/**
 * VolatilityLeaderboard Component
 *
 * Displays top figures with most controversial reputations (highest sentiment variance).
 * Part of the "Reputation Engine" design direction.
 *
 * Visual Design:
 * - Ranked list with volatility scores (0-100)
 * - Mini sparkline showing sentiment trajectory
 * - Evidence Locker aesthetic
 * - Links to figure detail pages
 */
export default function VolatilityLeaderboard({ maxDisplay = 7 }: VolatilityLeaderboardProps) {
  const [figures, setFigures] = useState<VolatileFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/figures/volatility');
        if (!response.ok) {
          throw new Error('Failed to fetch volatility data');
        }
        const result = await response.json();
        setFigures(result.figures || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Generate mini sparkline SVG path
  const generateSparkline = (data: Array<{ year: number; sentiment: number }>) => {
    if (data.length < 2) return '';

    const width = 60;
    const height = 20;
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.sentiment / 100) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  if (loading) {
    return (
      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  if (error || figures.length === 0) {
    return (
      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="text-center py-8">
          <Activity className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500 text-xs font-mono uppercase tracking-widest">
            {error || 'No volatility data available'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t-4 border-amber-600 shadow-xl">
      {/* Header */}
      <div className="bg-amber-600 text-white px-4 py-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
          <span>■</span> Most Debated Figures
        </h2>
      </div>

      {/* Leaderboard */}
      <div className="divide-y-2 divide-stone-200">
        {figures.slice(0, maxDisplay).map((figure, index) => {
          const rank = index + 1;
          const hasSparkline = figure.sparklineData.length >= 2;

          return (
            <Link
              key={figure.canonicalId}
              href={`/figure/${figure.canonicalId}`}
              className="block px-4 py-3 hover:bg-amber-50 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                {/* Rank & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={`
                      flex-shrink-0 w-8 h-8 flex items-center justify-center font-black text-sm
                      ${
                        rank === 1
                          ? 'bg-amber-600 text-white'
                          : rank === 2
                          ? 'bg-amber-500 text-white'
                          : rank === 3
                          ? 'bg-amber-400 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }
                    `}
                  >
                    {rank}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-stone-900 truncate group-hover:text-amber-700 transition-colors">
                      {figure.name}
                    </div>
                    <div className="text-[10px] text-stone-500 font-mono uppercase tracking-wider">
                      {figure.portrayalCount} portrayals
                    </div>
                  </div>
                </div>

                {/* Volatility Score & Sparkline */}
                <div className="flex items-center gap-3">
                  {/* Mini Sparkline */}
                  {hasSparkline && (
                    <svg
                      width="60"
                      height="20"
                      className="opacity-60 group-hover:opacity-100 transition-opacity"
                      role="img"
                      aria-label={`Sentiment trend sparkline for ${figure.name} showing ${figure.sparklineData.length} data points`}
                    >
                      <title>Sentiment Trend for {figure.name}</title>
                      <path
                        d={generateSparkline(figure.sparklineData)}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}

                  {/* Score Badge */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-2xl font-black font-mono text-amber-600 leading-none">
                      {figure.volatilityScore}
                    </div>
                    <div className="text-[8px] font-black uppercase tracking-wider text-stone-400">
                      / 100
                    </div>
                  </div>
                </div>
              </div>

              {/* Sentiment Breakdown Bar (optional, for top 3) */}
              {rank <= 3 && (
                <div className="mt-2 flex gap-px h-1">
                  {figure.sentimentBreakdown.positive > 0 && (
                    <div
                      className="bg-amber-600"
                      style={{
                        width: `${
                          (figure.sentimentBreakdown.positive / figure.portrayalCount) * 100
                        }%`,
                      }}
                    />
                  )}
                  {figure.sentimentBreakdown.complex > 0 && (
                    <div
                      className="bg-stone-500"
                      style={{
                        width: `${
                          (figure.sentimentBreakdown.complex / figure.portrayalCount) * 100
                        }%`,
                      }}
                    />
                  )}
                  {figure.sentimentBreakdown.neutral > 0 && (
                    <div
                      className="bg-stone-400"
                      style={{
                        width: `${
                          (figure.sentimentBreakdown.neutral / figure.portrayalCount) * 100
                        }%`,
                      }}
                    />
                  )}
                  {figure.sentimentBreakdown.negative > 0 && (
                    <div
                      className="bg-stone-800"
                      style={{
                        width: `${
                          (figure.sentimentBreakdown.negative / figure.portrayalCount) * 100
                        }%`,
                      }}
                    />
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-stone-50 border-t-2 border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <div className="text-stone-500 uppercase tracking-wider">
            Volatility = Sentiment Variance
          </div>
          <div className="flex items-center gap-1 text-amber-600 font-black uppercase tracking-wider">
            <TrendingUp className="w-3 h-3" />
            <span>Higher = More Controversial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
