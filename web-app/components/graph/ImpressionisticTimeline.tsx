'use client';

import React, { useMemo } from 'react';
import { GraphNode } from '@/lib/types';
import TimelineSmudge from './TimelineSmudge';
import TimelineAxisRenderer from './TimelineAxisRenderer';

interface ImpressionisticTimelineProps {
  explorationPath: string[];
  nodes: GraphNode[];
  onNodeClick: (nodeId: string) => void;
  centerNodeId: string | null;
}

interface TimelineData {
  id: string;
  name: string;
  type: 'figure' | 'media';
  startYear?: number;
  endYear?: number;
  precision?: 'exact' | 'decade' | 'era' | 'unknown';
}

// Minimum x-% gap before we consider labels as overlapping
const LABEL_OVERLAP_THRESHOLD = 8;
const LABEL_ROW_HEIGHT = 14;
const BASE_HEIGHT = 120;

export default function ImpressionisticTimeline({
  explorationPath,
  nodes,
  onNodeClick,
  centerNodeId
}: ImpressionisticTimelineProps) {
  // Extract temporal data from nodes in path
  const timelineData = useMemo(() => {
    const pathNodes = explorationPath
      .map(id => nodes.find(n => n.id === id))
      .filter(Boolean) as GraphNode[];

    return pathNodes
      .map(node => extractTemporalInfo(node))
      .filter(data => data !== null) as TimelineData[];
  }, [explorationPath, nodes]);

  // Calculate timeline bounds (min/max years)
  const { minYear, maxYear } = useMemo(() => {
    const years = timelineData
      .flatMap(d => [d.startYear, d.endYear])
      .filter((y): y is number => y !== undefined);

    if (years.length === 0) {
      return { minYear: 1800, maxYear: 2000 };
    }

    const min = Math.min(...years);
    const max = Math.max(...years);
    const padding = (max - min) * 0.1 || 50;

    return {
      minYear: Math.floor(min - padding),
      maxYear: Math.ceil(max + padding)
    };
  }, [timelineData]);

  // Compute label x-positions and assign stagger rows to avoid overlap
  const { labelRows, maxLabelRow } = useMemo(() => {
    const yearRange = maxYear - minYear;
    if (yearRange === 0) return { labelRows: new Map<string, number>(), maxLabelRow: 0 };

    const getXPercent = (year: number) => ((year - minYear) / yearRange) * 100;

    // For each item, compute the x-% where its label sits
    const items = timelineData.map(d => {
      let labelX: number;
      if (d.type === 'figure' && d.startYear && d.endYear) {
        // Figure bar — label centered between start and end
        labelX = (getXPercent(d.startYear) + getXPercent(d.endYear)) / 2;
      } else if (d.startYear) {
        labelX = getXPercent(d.startYear);
      } else {
        labelX = 5; // fallback "?" items at 5%
      }
      return { id: d.id, labelX };
    });

    // Sort by label x-position
    const sorted = [...items].sort((a, b) => a.labelX - b.labelX);

    // Greedy first-fit row assignment
    // Each row tracks the rightmost x-edge of the last label placed
    const rowEnds: number[] = [];
    const rows = new Map<string, number>();

    for (const item of sorted) {
      let assignedRow = -1;
      for (let i = 0; i < rowEnds.length; i++) {
        if (item.labelX >= rowEnds[i] + LABEL_OVERLAP_THRESHOLD) {
          assignedRow = i;
          break;
        }
      }
      if (assignedRow === -1) {
        assignedRow = rowEnds.length;
        rowEnds.push(-Infinity);
      }
      rowEnds[assignedRow] = item.labelX;
      rows.set(item.id, assignedRow);
    }

    const maxRow = rowEnds.length > 0 ? rowEnds.length - 1 : 0;
    return { labelRows: rows, maxLabelRow: maxRow };
  }, [timelineData, minYear, maxYear]);

  const containerHeight = BASE_HEIGHT + maxLabelRow * LABEL_ROW_HEIGHT;

  if (timelineData.length === 0) {
    return (
      <div className="w-full bg-stone-50 border-t-2 border-stone-300 flex items-center justify-center" style={{ height: `${BASE_HEIGHT}px` }}>
        <p className="text-sm text-stone-500 font-mono">
          No temporal data available for current path
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full bg-stone-50 border-t-2 border-stone-300 relative overflow-hidden"
      style={{ height: `${containerHeight}px` }}
    >
      {/* Year axis */}
      <TimelineAxisRenderer minYear={minYear} maxYear={maxYear} />

      {/* Smudges layer */}
      <svg className="absolute inset-0 w-full h-full">
        {timelineData.map((data, idx) => (
          <TimelineSmudge
            key={data.id}
            data={data}
            minYear={minYear}
            maxYear={maxYear}
            isActive={data.id === centerNodeId}
            zIndex={idx}
            labelRow={labelRows.get(data.id) ?? 0}
            onClick={() => onNodeClick(data.id)}
          />
        ))}
      </svg>
    </div>
  );
}

// Helper to extract temporal info from GraphNode
function extractTemporalInfo(node: GraphNode): TimelineData | null {
  const temporal = node.temporal;

  if (!temporal) {
    return {
      id: node.id,
      name: node.name,
      type: node.type,
      precision: 'unknown'
    };
  }

  if (node.type === 'figure') {
    if (temporal.birth_year || temporal.death_year) {
      return {
        id: node.id,
        name: node.name,
        type: 'figure',
        startYear: temporal.birth_year,
        endYear: temporal.death_year,
        precision: temporal.precision || 'exact'
      };
    }
  } else if (node.type === 'media') {
    if (temporal.release_year) {
      return {
        id: node.id,
        name: node.name,
        type: 'media',
        startYear: temporal.release_year,
        precision: temporal.precision || 'exact'
      };
    }
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    precision: 'unknown'
  };
}
