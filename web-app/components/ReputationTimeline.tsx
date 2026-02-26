'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getSentimentScore, parseSentiment } from '@/lib/sentiment-parser';

interface ReputationDataPoint {
  workId: string;
  workTitle: string;
  year: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'complex';
  characterName?: string;
  mediaType?: string;
}

interface ReputationTimelineProps {
  canonicalId: string;
  figureName: string;
}

/**
 * ReputationTimeline Component
 *
 * Scatter plot visualization showing how a figure's portrayal sentiment
 * evolves over time. Part of the "Reputation Engine" design direction.
 *
 * Visual Design:
 * - X-axis: Time (decades from 1900-2020s)
 * - Y-axis: Sentiment (Heroic → Complex → Villainous)
 * - Dots: Individual portrayals with hover tooltips
 * - Trendline: Shows overall reputation shift
 * - Evidence Locker aesthetic with amber accents
 */
export default function ReputationTimeline({
  canonicalId,
  figureName,
}: ReputationTimelineProps) {
  const [data, setData] = useState<ReputationDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<ReputationDataPoint | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [svgWidth, setSvgWidth] = useState(800);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/figure/${canonicalId}/reputation-timeline`);
        if (!response.ok) {
          throw new Error('Failed to fetch reputation data');
        }
        const result = await response.json();
        setData(result.dataPoints || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [canonicalId]);

  // Make SVG responsive to window size
  useEffect(() => {
    const updateWidth = () => {
      // Use container-based calculation with max width of 800px
      const containerWidth = window.innerWidth - 96; // Account for padding
      setSvgWidth(Math.min(800, Math.max(600, containerWidth)));
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Calculate position on SVG canvas
  const getPosition = (point: ReputationDataPoint, width: number, height: number) => {
    const minYear = 1900;
    const maxYear = 2030;
    const x = ((point.year - minYear) / (maxYear - minYear)) * width;
    const sentimentScore = getSentimentScore(point.sentiment);
    const y = height - (sentimentScore / 100) * height; // Invert Y axis
    return { x, y };
  };

  // Calculate simple linear regression trendline
  const calculateTrendline = (points: ReputationDataPoint[], width: number, height: number) => {
    if (points.length < 2) return null;

    const minYear = 1900;
    const maxYear = 2030;

    // Convert to numerical coordinates
    const coords = points.map(p => ({
      x: (p.year - minYear) / (maxYear - minYear),
      y: getSentimentScore(p.sentiment) / 100,
    }));

    // Calculate means
    const meanX = coords.reduce((sum, c) => sum + c.x, 0) / coords.length;
    const meanY = coords.reduce((sum, c) => sum + c.y, 0) / coords.length;

    // Calculate slope
    let numerator = 0;
    let denominator = 0;
    coords.forEach(c => {
      numerator += (c.x - meanX) * (c.y - meanY);
      denominator += (c.x - meanX) * (c.x - meanX);
    });

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = meanY - slope * meanX;

    // Calculate start and end points
    const x1 = 0;
    const y1 = height - (intercept * height);
    const x2 = width;
    const y2 = height - ((slope + intercept) * height);

    return { x1, y1, x2, y2, slope };
  };

  // Determine trend direction
  const getTrendDirection = (slope: number) => {
    if (slope > 0.05) return 'improving';
    if (slope < -0.05) return 'declining';
    return 'stable';
  };

  const handleMouseMove = (e: React.MouseEvent<SVGCircleElement>, point: ReputationDataPoint) => {
    setHoveredPoint(point);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  if (loading) {
    return (
      <div className="bg-white border-t-4 border-amber-600 shadow-xl p-8">
        <div className="flex items-center justify-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-stone-500 font-mono text-sm uppercase tracking-widest">
              Loading reputation data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-t-4 border-amber-600 shadow-xl p-8">
        <div className="text-center py-12">
          <Minus className="w-12 h-12 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500 font-mono text-sm uppercase tracking-widest">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border-t-4 border-amber-600 shadow-xl">
        {/* Header */}
        <div className="bg-amber-600 text-white px-6 py-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
            <span>■</span> Reputation Evolution Analysis
          </h2>
        </div>

        <div className="p-8">
          <div className="text-center py-12 bg-amber-50 border-2 border-amber-200">
            <Minus className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-amber-900 font-mono text-sm uppercase tracking-widest mb-2">
              No Sentiment Data Available
            </p>
            <p className="text-stone-600 text-xs max-w-md mx-auto">
              {figureName} appears in our database but sentiment analysis has not yet been completed for their portrayals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const svgHeight = 400;
  const padding = 60;
  const chartWidth = svgWidth - padding * 2;
  const chartHeight = svgHeight - padding * 2;

  const trendline = calculateTrendline(data, chartWidth, chartHeight);
  const trend = trendline ? getTrendDirection(trendline.slope) : 'stable';

  return (
    <div className="bg-white border-t-4 border-amber-600 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-amber-600 text-white px-6 py-3 flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
          <span>■</span> Reputation Evolution Analysis
        </h2>
        <div className="flex items-center gap-2">
          {trend === 'improving' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Improving</span>
            </div>
          )}
          {trend === 'declining' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded">
              <TrendingDown className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Declining</span>
            </div>
          )}
          {trend === 'stable' && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded">
              <Minus className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Stable</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-6 bg-stone-50">
        <div className="bg-white border-2 border-stone-300 p-4">
          <div className="text-center mb-4">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-1">
              Subject: {figureName}
            </div>
            <div className="text-xs text-stone-600 font-mono">
              {data.length} portrayals analyzed // {data[0]?.year} - {data[data.length - 1]?.year}
            </div>
          </div>

          <div className="relative overflow-x-auto">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="mx-auto"
              style={{ minWidth: '600px' }}
              role="img"
              aria-label={`Reputation timeline showing sentiment changes for ${figureName} from ${data[0]?.year} to ${data[data.length - 1]?.year}`}
            >
              <title>Reputation Timeline for {figureName}</title>
              <desc>Scatter plot showing how {figureName}'s portrayal sentiment has evolved across {data.length} media works from {data[0]?.year} to {data[data.length - 1]?.year}. Sentiment ranges from heroic (top) to villainous (bottom).</desc>
              {/* Y-axis labels */}
              <text
                x={padding - 10}
                y={padding}
                textAnchor="end"
                className="text-[10px] font-mono font-bold uppercase fill-amber-600"
              >
                Heroic
              </text>
              <text
                x={padding - 10}
                y={svgHeight / 2}
                textAnchor="end"
                className="text-[10px] font-mono font-bold uppercase fill-stone-600"
              >
                Complex
              </text>
              <text
                x={padding - 10}
                y={svgHeight - padding}
                textAnchor="end"
                className="text-[10px] font-mono font-bold uppercase fill-stone-800"
              >
                Villainous
              </text>

              {/* Horizontal reference lines */}
              <line
                x1={padding}
                y1={padding}
                x2={svgWidth - padding}
                y2={padding}
                stroke="#D6D3D1"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <line
                x1={padding}
                y1={svgHeight / 2}
                x2={svgWidth - padding}
                y2={svgHeight / 2}
                stroke="#D6D3D1"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <line
                x1={padding}
                y1={svgHeight - padding}
                x2={svgWidth - padding}
                y2={svgHeight - padding}
                stroke="#D6D3D1"
                strokeWidth="1"
                strokeDasharray="4,4"
              />

              {/* X-axis */}
              <line
                x1={padding}
                y1={svgHeight - padding}
                x2={svgWidth - padding}
                y2={svgHeight - padding}
                stroke="#57534E"
                strokeWidth="2"
              />

              {/* X-axis labels (decades) */}
              {[1900, 1920, 1940, 1960, 1980, 2000, 2020].map(year => {
                const x = padding + ((year - 1900) / 130) * chartWidth;
                return (
                  <g key={year}>
                    <line
                      x1={x}
                      y1={svgHeight - padding}
                      x2={x}
                      y2={svgHeight - padding + 5}
                      stroke="#57534E"
                      strokeWidth="2"
                    />
                    <text
                      x={x}
                      y={svgHeight - padding + 20}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-stone-600"
                    >
                      {year}s
                    </text>
                  </g>
                );
              })}

              {/* Trendline */}
              {trendline && (
                <line
                  x1={padding + trendline.x1}
                  y1={padding + trendline.y1}
                  x2={padding + trendline.x2}
                  y2={padding + trendline.y2}
                  stroke="#D97706"
                  strokeWidth="3"
                  strokeDasharray="8,4"
                  opacity="0.6"
                />
              )}

              {/* Data points */}
              {data.map((point, idx) => {
                const pos = getPosition(point, chartWidth, chartHeight);
                const color =
                  point.sentiment === 'positive'
                    ? '#D97706'
                    : point.sentiment === 'negative'
                    ? '#57534E'
                    : '#78716C';

                return (
                  <circle
                    key={`${point.workId}-${idx}`}
                    cx={padding + pos.x}
                    cy={padding + pos.y}
                    r={hoveredPoint === point ? 8 : 6}
                    fill={color}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200"
                    style={{ filter: hoveredPoint === point ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
                    onMouseEnter={(e) => handleMouseMove(e, point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t-2 border-stone-200">
            <div className="flex items-center justify-center gap-6 text-xs font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-600 border-2 border-white"></div>
                <span className="text-stone-600 uppercase tracking-wider">Heroic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-stone-500 border-2 border-white"></div>
                <span className="text-stone-600 uppercase tracking-wider">Complex</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-stone-800 border-2 border-white"></div>
                <span className="text-stone-600 uppercase tracking-wider">Villainous</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 15,
            top: mousePosition.y - 15,
          }}
        >
          <div className="bg-stone-900 text-white px-3 py-2 border-2 border-amber-600 shadow-xl max-w-xs">
            <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-1">
              {hoveredPoint.year} // {hoveredPoint.mediaType || 'Media'}
            </div>
            <div className="text-sm font-bold mb-1">{hoveredPoint.workTitle}</div>
            {hoveredPoint.characterName && (
              <div className="text-xs text-stone-300 font-mono">
                Character: {hoveredPoint.characterName}
              </div>
            )}
            <div className="text-xs text-amber-400 font-mono mt-1">
              Sentiment: {hoveredPoint.sentiment.toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
