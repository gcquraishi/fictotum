'use client';

import React from 'react';

interface TimelineSmudgeProps {
  data: {
    id: string;
    name: string;
    type: 'figure' | 'media';
    startYear?: number;
    endYear?: number;
    precision?: 'exact' | 'decade' | 'era' | 'unknown';
  };
  minYear: number;
  maxYear: number;
  isActive: boolean;
  zIndex: number;
  labelRow: number;
  onClick: () => void;
}

const BASE_LABEL_Y = 85;
const LABEL_ROW_HEIGHT = 14;

export default function TimelineSmudge({
  data,
  minYear,
  maxYear,
  isActive,
  labelRow,
  onClick
}: TimelineSmudgeProps) {
  const yearRange = maxYear - minYear;
  const getX = (year: number) => ((year - minYear) / yearRange) * 100;

  const labelY = BASE_LABEL_Y + labelRow * LABEL_ROW_HEIGHT;
  const truncatedName = data.name.length > 20 ? data.name.substring(0, 17) + '...' : data.name;

  // Render figure as gradient bar
  if (data.type === 'figure' && data.startYear && data.endYear) {
    const x1 = getX(data.startYear);
    const x2 = getX(data.endYear);
    const blur = data.precision === 'era' ? 4 : data.precision === 'decade' ? 2 : 0;
    const labelX = (x1 + x2) / 2;

    return (
      <g
        className="cursor-pointer transition-opacity hover:opacity-100"
        onClick={onClick}
        style={{ opacity: isActive ? 1.0 : 0.7 }}
      >
        <defs>
          <linearGradient id={`gradient-${data.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#57534E" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#57534E" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#57534E" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect
          x={`${x1}%`}
          y="40"
          width={`${x2 - x1}%`}
          height="30"
          fill={`url(#gradient-${data.id})`}
          filter={blur > 0 ? `blur(${blur}px)` : undefined}
          rx="4"
        />
        {/* Connector line when label is staggered */}
        {labelRow > 0 && (
          <line
            x1={`${labelX}%`}
            y1="70"
            x2={`${labelX}%`}
            y2={labelY - 10}
            stroke="#A8A29E"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        )}
        <text
          x={`${labelX}%`}
          y={labelY}
          textAnchor="middle"
          className="text-xs font-mono fill-stone-700"
          style={{ pointerEvents: 'none' }}
        >
          {truncatedName}
        </text>
      </g>
    );
  }

  // Render figure with only birth year (fade right)
  if (data.type === 'figure' && data.startYear && !data.endYear) {
    const x = getX(data.startYear);
    const fadeWidth = Math.min(10, (100 - x) / 2);
    const labelX = x + fadeWidth / 2;

    return (
      <g
        className="cursor-pointer transition-opacity hover:opacity-100"
        onClick={onClick}
        style={{ opacity: isActive ? 1.0 : 0.7 }}
      >
        <defs>
          <linearGradient id={`gradient-fade-${data.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#57534E" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#57534E" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <circle cx={`${x}%`} cy="55" r="4" fill="#57534E" />
        <rect
          x={`${x}%`}
          y="40"
          width={`${fadeWidth}%`}
          height="30"
          fill={`url(#gradient-fade-${data.id})`}
          rx="4"
        />
        {labelRow > 0 && (
          <line
            x1={`${labelX}%`}
            y1="70"
            x2={`${labelX}%`}
            y2={labelY - 10}
            stroke="#A8A29E"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        )}
        <text
          x={`${labelX}%`}
          y={labelY}
          textAnchor="middle"
          className="text-xs font-mono fill-stone-700"
          style={{ pointerEvents: 'none' }}
        >
          {truncatedName}
        </text>
      </g>
    );
  }

  // Render media work as vertical tick
  if (data.type === 'media' && data.startYear) {
    const x = getX(data.startYear);
    // Extend tick line down to meet staggered label
    const tickEndY = labelRow > 0 ? labelY - 10 : 70;

    return (
      <g
        className="cursor-pointer transition-opacity hover:opacity-100"
        onClick={onClick}
        style={{ opacity: isActive ? 1.0 : 0.8 }}
      >
        <line
          x1={`${x}%`}
          y1="30"
          x2={`${x}%`}
          y2={tickEndY}
          stroke="#D97706"
          strokeWidth="3"
          filter="drop-shadow(0 0 4px rgba(217, 119, 6, 0.4))"
        />
        {/* Thin connector from tick to staggered label */}
        {labelRow > 0 && (
          <line
            x1={`${x}%`}
            y1="70"
            x2={`${x}%`}
            y2={labelY - 10}
            stroke="#D97706"
            strokeWidth="1"
            strokeOpacity="0.4"
            strokeDasharray="2 2"
          />
        )}
        <text
          x={`${x}%`}
          y={labelY}
          textAnchor="middle"
          className="text-xs font-mono fill-amber-700"
          style={{ pointerEvents: 'none' }}
        >
          {truncatedName}
        </text>
      </g>
    );
  }

  // Fallback for missing data - render as small circle with "?"
  if (!data.startYear) {
    return (
      <g
        className="cursor-pointer transition-opacity hover:opacity-100"
        onClick={onClick}
        style={{ opacity: 0.4 }}
      >
        <circle
          cx="5%"
          cy="55"
          r="6"
          fill="none"
          stroke="#57534E"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x="5%"
          y="60"
          textAnchor="middle"
          className="text-xs font-mono fill-stone-600"
          style={{ pointerEvents: 'none' }}
        >
          ?
        </text>
        <text
          x="5%"
          y={labelY}
          textAnchor="middle"
          className="text-xs font-mono fill-stone-500"
          style={{ pointerEvents: 'none' }}
        >
          {data.name.length > 15 ? data.name.substring(0, 12) + '...' : data.name}
        </text>
      </g>
    );
  }

  return null;
}
