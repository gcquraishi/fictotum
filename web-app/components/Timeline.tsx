'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { TimelineFigure, HistoricalEvent } from '@/lib/types';

interface TimelineProps {
  figures: TimelineFigure[];
  events: HistoricalEvent[];
  stats: {
    earliest_year: number;
    latest_year: number;
    total_figures: number;
    total_events: number;
  };
}

// Fisk-inspired palette — muted, watercolor-like era tones
const ERA_COLORS: Record<string, string> = {
  'Ancient': '#B8860B',
  'Classical Antiquity': '#CD853F',
  'Ancient Rome': '#A0522D',
  'Ancient Greece': '#6B8E23',
  'Ancient Egypt': '#DAA520',
  'Medieval': '#556B2F',
  'Middle Ages': '#556B2F',
  'Renaissance': '#6A5ACD',
  'Tudor': '#8B4513',
  'Early Modern': '#4682B4',
  'Enlightenment': '#B8860B',
  'Victorian Era': '#8B4513',
  'Napoleonic': '#4169E1',
  'Modern': '#2F4F4F',
  'Contemporary': '#36454F',
  'World War': '#8B0000',
};

function getEraColor(era?: string): string {
  if (!era) return '#8B7355';
  for (const [key, color] of Object.entries(ERA_COLORS)) {
    if (era.toLowerCase().includes(key.toLowerCase())) return color;
  }
  let hash = 0;
  for (let i = 0; i < era.length; i++) {
    hash = era.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 30%, 42%)`;
}

// --- Row packing: greedy first-fit algorithm ---
// Assigns each figure to the first lane where it doesn't overlap,
// with a small pixel gap between bars in the same lane.
interface PackedFigure {
  figure: TimelineFigure;
  lane: number;
}

function packFiguresIntoLanes(
  figures: TimelineFigure[],
  yearToX: (year: number) => number,
  gap: number
): PackedFigure[] {
  // Sort by birth year, then by lifespan length (longer first for better packing)
  const sorted = [...figures].sort((a, b) => {
    if (a.birth_year !== b.birth_year) return a.birth_year - b.birth_year;
    return (b.death_year - b.birth_year) - (a.death_year - a.birth_year);
  });

  // Each lane tracks the rightmost pixel edge of the last bar placed
  const laneEnds: number[] = [];
  const result: PackedFigure[] = [];

  for (const figure of sorted) {
    const startX = yearToX(figure.birth_year);

    // Find the first lane where this figure fits
    let assignedLane = -1;
    for (let i = 0; i < laneEnds.length; i++) {
      if (startX >= laneEnds[i] + gap) {
        assignedLane = i;
        break;
      }
    }

    // No existing lane fits — open a new one
    if (assignedLane === -1) {
      assignedLane = laneEnds.length;
      laneEnds.push(-Infinity);
    }

    const endX = yearToX(figure.death_year);
    laneEnds[assignedLane] = endX;

    result.push({ figure, lane: assignedLane });
  }

  return result;
}

const MIN_BAR_HEIGHT = 10;
const IDEAL_BAR_HEIGHT = 16;
const LANE_PADDING = 2;
const TOP_PADDING = 50;
const EVENT_MARKER_HEIGHT = 16;
const BOTTOM_PADDING = 20;

export default function Timeline({ figures, events, stats }: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [viewStart, setViewStart] = useState(stats.earliest_year - 50);
  const [viewEnd, setViewEnd] = useState(stats.latest_year + 50);
  const [hoveredFigure, setHoveredFigure] = useState<TimelineFigure | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<HistoricalEvent | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [canvasHeight, setCanvasHeight] = useState(600);

  // Year-to-pixel conversion
  const yearToX = useCallback((year: number) => {
    const range = viewEnd - viewStart;
    return ((year - viewStart) / range) * canvasWidth;
  }, [viewStart, viewEnd, canvasWidth]);

  const xToYear = useCallback((x: number) => {
    const range = viewEnd - viewStart;
    return viewStart + (x / canvasWidth) * range;
  }, [viewStart, viewEnd, canvasWidth]);

  // Pack figures into lanes (recalculates when view or data changes)
  const packedFigures = useMemo(() => {
    return packFiguresIntoLanes(figures, yearToX, 4);
  }, [figures, yearToX]);

  const laneCount = useMemo(() => {
    if (packedFigures.length === 0) return 0;
    return Math.max(...packedFigures.map(p => p.lane)) + 1;
  }, [packedFigures]);

  // Compute lane height — enforce minimum; allow canvas to grow beyond viewport
  const figureAreaTop = TOP_PADDING + EVENT_MARKER_HEIGHT + 8;
  const containerVisibleHeight = canvasHeight;
  const figureAreaHeight = containerVisibleHeight - figureAreaTop - BOTTOM_PADDING;
  const idealLaneH = IDEAL_BAR_HEIGHT + LANE_PADDING * 2;
  const naturalLaneH = laneCount > 0 ? figureAreaHeight / laneCount : idealLaneH;
  // Clamp: never smaller than MIN_BAR_HEIGHT, never bigger than ideal
  const laneHeight = Math.max(MIN_BAR_HEIGHT + LANE_PADDING * 2, Math.min(idealLaneH, naturalLaneH));
  const barH = laneHeight - LANE_PADDING * 2;
  // If lanes overflow, the canvas needs to be taller than the container
  const requiredCanvasHeight = figureAreaTop + laneCount * laneHeight + BOTTOM_PADDING;
  const actualCanvasHeight = Math.max(containerVisibleHeight, requiredCanvasHeight);
  const overflows = requiredCanvasHeight > containerVisibleHeight;

  // Resize observer — fill the container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
        setCanvasHeight(entry.contentRect.height);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = actualCanvasHeight * dpr;
    ctx.scale(dpr, dpr);

    // Cream background (Fisk-inspired)
    ctx.fillStyle = '#FAF8F0';
    ctx.fillRect(0, 0, canvasWidth, actualCanvasHeight);

    // Alternating lane shading — subtle zebra stripes for row tracking
    for (let i = 0; i < laneCount; i++) {
      if (i % 2 === 1) {
        const rowY = figureAreaTop + i * laneHeight;
        ctx.fillStyle = '#F2EDE0';
        ctx.fillRect(0, rowY, canvasWidth, laneHeight);
      }
    }

    const range = viewEnd - viewStart;

    // Tick interval
    let tickInterval = 10;
    if (range > 3000) tickInterval = 500;
    else if (range > 1500) tickInterval = 200;
    else if (range > 500) tickInterval = 100;
    else if (range > 200) tickInterval = 50;
    else if (range > 50) tickInterval = 10;
    else tickInterval = 5;

    // Grid lines + year labels
    const firstTick = Math.ceil(viewStart / tickInterval) * tickInterval;
    for (let year = firstTick; year <= viewEnd; year += tickInterval) {
      const x = yearToX(year);

      // Subtle vertical grid
      ctx.strokeStyle = '#E8E2D4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, TOP_PADDING - 6);
      ctx.lineTo(x, actualCanvasHeight - BOTTOM_PADDING);
      ctx.stroke();

      // Year label
      ctx.fillStyle = '#A09880';
      ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      const label = year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
      ctx.fillText(label, x, TOP_PADDING - 12);
    }

    // Event markers (top band)
    const eventY = TOP_PADDING;
    events.forEach(event => {
      if (event.start_year == null) return;
      const x = yearToX(event.start_year);
      const endX = event.end_year ? yearToX(event.end_year) : x;

      if (x > canvasWidth + 10 || endX < -10) return;

      ctx.fillStyle = '#C0392B';
      ctx.globalAlpha = 0.6;

      if (event.end_year && event.end_year !== event.start_year) {
        ctx.fillRect(x, eventY, Math.max(endX - x, 2), 3);
      } else {
        ctx.beginPath();
        ctx.moveTo(x, eventY - 3);
        ctx.lineTo(x + 3, eventY);
        ctx.lineTo(x, eventY + 3);
        ctx.lineTo(x - 3, eventY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    // Figure lifespan bars (packed into lanes)
    packedFigures.forEach(({ figure, lane }) => {
      const startX = yearToX(figure.birth_year);
      const endX = yearToX(figure.death_year);
      const w = Math.max(endX - startX, 2);
      const y = figureAreaTop + lane * laneHeight + LANE_PADDING;

      // Skip if out of view
      if (endX < -10 || startX > canvasWidth + 10) return;

      const color = getEraColor(figure.era);
      const isHovered = hoveredFigure?.canonical_id === figure.canonical_id;

      // Bar — translucent like Fisk's overlapping river courses
      ctx.fillStyle = color;
      ctx.globalAlpha = isHovered ? 0.92 : 0.7;

      // Rounded ends when bars are wide enough
      const radius = Math.min(barH / 2, 4);
      if (w > radius * 2) {
        ctx.beginPath();
        ctx.moveTo(startX + radius, y);
        ctx.lineTo(endX - radius, y);
        ctx.arcTo(endX, y, endX, y + radius, radius);
        ctx.lineTo(endX, y + barH - radius);
        ctx.arcTo(endX, y + barH, endX - radius, y + barH, radius);
        ctx.lineTo(startX + radius, y + barH);
        ctx.arcTo(startX, y + barH, startX, y + barH - radius, radius);
        ctx.lineTo(startX, y + radius);
        ctx.arcTo(startX, y, startX + radius, y, radius);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(startX, y, w, barH);
      }

      // Hover outline
      if (isHovered) {
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 1;
        ctx.strokeRect(startX - 0.5, y - 0.5, w + 1, barH + 1);
      }

      ctx.globalAlpha = 1;

      // Name label
      const fontSize = Math.min(11, Math.max(8, barH - 2));
      ctx.font = isHovered
        ? `bold ${fontSize}px ui-sans-serif, system-ui, sans-serif`
        : `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textBaseline = 'middle';

      const labelFitsInside = w > 50;

      if (labelFitsInside) {
        // White text inside the bar with a subtle shadow for contrast
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0.5;
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.95)';
        ctx.textAlign = 'left';

        const maxChars = Math.floor((w - 8) / (fontSize * 0.55));
        const displayName = figure.name.length > maxChars
          ? figure.name.slice(0, maxChars - 1) + '\u2026'
          : figure.name;

        ctx.fillText(displayName, startX + 4, y + barH / 2 + 0.5);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      } else if (w > 6) {
        // Overflow label — show name to the right of short bars
        ctx.fillStyle = isHovered ? '#1a1a1a' : '#7A7565';
        ctx.textAlign = 'left';
        const overflowName = figure.name.length > 20
          ? figure.name.slice(0, 19) + '\u2026'
          : figure.name;
        ctx.fillText(overflowName, endX + 4, y + barH / 2 + 0.5);
      }
    });

    // "Now" line
    const currentYear = new Date().getFullYear();
    if (currentYear >= viewStart && currentYear <= viewEnd) {
      const nowX = yearToX(currentYear);
      ctx.strokeStyle = '#C0392B';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(nowX, TOP_PADDING - 6);
      ctx.lineTo(nowX, actualCanvasHeight - BOTTOM_PADDING);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [packedFigures, events, viewStart, viewEnd, canvasWidth, canvasHeight, actualCanvasHeight, yearToX, hoveredFigure, laneHeight, barH, figureAreaTop, laneCount]);

  // --- Hit testing ---
  const hitTest = useCallback((x: number, y: number): { figure?: TimelineFigure; event?: HistoricalEvent } => {
    // Check events
    const eventY = TOP_PADDING;
    if (y >= eventY - 6 && y <= eventY + EVENT_MARKER_HEIGHT) {
      const year = xToYear(x);
      const tolerance = (viewEnd - viewStart) * 0.01;
      const hitEvent = events.find(ev => {
        if (ev.start_year == null) return false;
        const evEnd = ev.end_year ?? ev.start_year;
        return year >= ev.start_year - tolerance && year <= evEnd + tolerance;
      });
      if (hitEvent) return { event: hitEvent };
    }

    // Check packed figures
    for (const { figure, lane } of packedFigures) {
      const barY = figureAreaTop + lane * laneHeight + LANE_PADDING;
      if (y < barY || y > barY + barH) continue;

      const startX = yearToX(figure.birth_year);
      const endX = yearToX(figure.death_year);
      if (x >= startX - 2 && x <= endX + 2) {
        return { figure };
      }
    }

    return {};
  }, [packedFigures, events, yearToX, xToYear, viewStart, viewEnd, figureAreaTop, laneHeight, barH]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x: e.clientX, y: e.clientY });

    const hit = hitTest(x, y);
    setHoveredFigure(hit.figure || null);
    setHoveredEvent(hit.event || null);
    canvas.style.cursor = (hit.figure || hit.event) ? 'pointer' : 'grab';
  }, [hitTest]);

  const handleClick = useCallback(() => {
    if (hoveredFigure) {
      router.push(`/figure/${hoveredFigure.canonical_id}`);
    }
  }, [hoveredFigure, router]);

  // Zoom — use native listener so preventDefault works (React onWheel is passive)
  const viewRef = useRef({ viewStart, viewEnd, xToYear });
  viewRef.current = { viewStart, viewEnd, xToYear };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const { viewStart: vs, viewEnd: ve, xToYear: x2y } = viewRef.current;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseYear = x2y(mouseX);

      const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
      const range = ve - vs;
      const newRange = Math.max(20, Math.min(range * zoomFactor, 8000));

      const ratio = (mouseYear - vs) / range;
      const newStart = mouseYear - ratio * newRange;
      const newEnd = mouseYear + (1 - ratio) * newRange;

      setViewStart(Math.round(newStart));
      setViewEnd(Math.round(newEnd));
    };

    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  // Pan
  const isDragging = useRef(false);
  const lastDragX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    lastDragX.current = e.clientX;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) {
      handleMouseMove(e);
      return;
    }

    const dx = e.clientX - lastDragX.current;
    lastDragX.current = e.clientX;

    const range = viewEnd - viewStart;
    const yearDelta = (dx / canvasWidth) * range;

    setViewStart(prev => Math.round(prev - yearDelta));
    setViewEnd(prev => Math.round(prev - yearDelta));
  }, [viewStart, viewEnd, canvasWidth, handleMouseMove]);

  const formatYear = (year: number) => year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 220px)',
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 0',
          flexShrink: 0,
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
          {stats.total_figures} figures across {laneCount} lanes
          {stats.total_events > 0 && ` / ${stats.total_events} events`}
          {' '} | {formatYear(viewStart)} to {formatYear(viewEnd)}
          {overflows && ' | Zoom in to see detail'}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => {
              const mid = (viewStart + viewEnd) / 2;
              const range = viewEnd - viewStart;
              setViewStart(Math.round(mid - range * 0.35));
              setViewEnd(Math.round(mid + range * 0.35));
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              padding: '3px 10px',
              border: '1px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            +
          </button>
          <button
            onClick={() => {
              const mid = (viewStart + viewEnd) / 2;
              const range = viewEnd - viewStart;
              setViewStart(Math.round(mid - range * 0.75));
              setViewEnd(Math.round(mid + range * 0.75));
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              padding: '3px 10px',
              border: '1px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            −
          </button>
          <button
            onClick={() => {
              setViewStart(stats.earliest_year - 50);
              setViewEnd(stats.latest_year + 50);
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              padding: '3px 10px',
              border: '1px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas — fills remaining space; scrolls vertically when lanes overflow */}
      <div style={{
        flex: 1,
        overflow: overflows ? 'auto' : 'hidden',
        borderRadius: '2px',
      }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: overflows ? actualCanvasHeight : '100%',
          cursor: 'grab',
          display: 'block',
        }}
        onMouseMove={handleDragMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp();
          setHoveredFigure(null);
          setHoveredEvent(null);
        }}
        onClick={handleClick}
      />
      </div>

      {/* Tooltip */}
      {hoveredFigure && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 16,
            top: mousePos.y - 8,
            background: '#1a1a1a',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            pointerEvents: 'none',
            zIndex: 100,
            maxWidth: '300px',
            border: '1px solid #333',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{hoveredFigure.name}</div>
          {hoveredFigure.title && (
            <div style={{ color: '#aaa', fontSize: '11px' }}>{hoveredFigure.title}</div>
          )}
          <div style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
            {formatYear(hoveredFigure.birth_year)} – {formatYear(hoveredFigure.death_year)}
          </div>
          {hoveredFigure.portrayal_count > 0 && (
            <div style={{ color: '#888', fontSize: '10px', marginTop: '2px' }}>
              {hoveredFigure.portrayal_count} portrayal{hoveredFigure.portrayal_count !== 1 ? 's' : ''}
            </div>
          )}
          <div style={{ color: '#666', fontSize: '10px', marginTop: '4px' }}>
            Click to view details
          </div>
        </div>
      )}

      {hoveredEvent && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 16,
            top: mousePos.y - 8,
            background: '#1a1a1a',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            pointerEvents: 'none',
            zIndex: 100,
            maxWidth: '300px',
            border: '1px solid #C0392B',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{hoveredEvent.name}</div>
          {hoveredEvent.description && (
            <div style={{ color: '#aaa', fontSize: '11px' }}>{hoveredEvent.description}</div>
          )}
          <div style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
            {hoveredEvent.start_year && formatYear(hoveredEvent.start_year)}
            {hoveredEvent.end_year && hoveredEvent.end_year !== hoveredEvent.start_year && (
              <> – {formatYear(hoveredEvent.end_year)}</>
            )}
          </div>
          {hoveredEvent.location && (
            <div style={{ color: '#888', fontSize: '10px' }}>{hoveredEvent.location}</div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: '#A09880',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          padding: '6px 0 0',
          flexShrink: 0,
        }}
      >
        Scroll to zoom · Drag to pan · Click a bar to view figure
      </div>
    </div>
  );
}
