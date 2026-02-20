'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

// Era color palette — muted, consistent
const ERA_COLORS: Record<string, string> = {
  'Ancient': '#8B7355',
  'Classical Antiquity': '#8B7355',
  'Ancient Rome': '#A0522D',
  'Ancient Greece': '#6B8E23',
  'Medieval': '#4A6741',
  'Middle Ages': '#4A6741',
  'Renaissance': '#6A5ACD',
  'Early Modern': '#4682B4',
  'Enlightenment': '#DAA520',
  'Victorian Era': '#8B4513',
  'Modern': '#2F4F4F',
  'Contemporary': '#36454F',
};

function getEraColor(era?: string): string {
  if (!era) return '#666666';
  for (const [key, color] of Object.entries(ERA_COLORS)) {
    if (era.toLowerCase().includes(key.toLowerCase())) return color;
  }
  // Generate a stable color from era string
  let hash = 0;
  for (let i = 0; i < era.length; i++) {
    hash = era.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 35%, 45%)`;
}

const ROW_HEIGHT = 28;
const LEFT_GUTTER = 0;
const RIGHT_PADDING = 40;
const TOP_PADDING = 60;
const EVENT_MARKER_HEIGHT = 20;

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

  // Sort figures by birth year
  const sortedFigures = [...figures].sort((a, b) => a.birth_year - b.birth_year);

  const totalHeight = TOP_PADDING + EVENT_MARKER_HEIGHT + 20 + sortedFigures.length * ROW_HEIGHT + 40;

  // Year-to-pixel conversion
  const yearToX = useCallback((year: number) => {
    const range = viewEnd - viewStart;
    return LEFT_GUTTER + ((year - viewStart) / range) * (canvasWidth - LEFT_GUTTER - RIGHT_PADDING);
  }, [viewStart, viewEnd, canvasWidth]);

  const xToYear = useCallback((x: number) => {
    const range = viewEnd - viewStart;
    return viewStart + ((x - LEFT_GUTTER) / (canvasWidth - LEFT_GUTTER - RIGHT_PADDING)) * range;
  }, [viewStart, viewEnd, canvasWidth]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Draw the timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = totalHeight * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, totalHeight);

    const range = viewEnd - viewStart;

    // Calculate tick interval
    let tickInterval = 10;
    if (range > 2000) tickInterval = 500;
    else if (range > 1000) tickInterval = 200;
    else if (range > 500) tickInterval = 100;
    else if (range > 200) tickInterval = 50;
    else if (range > 50) tickInterval = 10;
    else tickInterval = 5;

    // Draw year axis
    const firstTick = Math.ceil(viewStart / tickInterval) * tickInterval;
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 1;

    for (let year = firstTick; year <= viewEnd; year += tickInterval) {
      const x = yearToX(year);

      // Vertical grid line
      ctx.beginPath();
      ctx.moveTo(x, TOP_PADDING - 10);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();

      // Year label
      ctx.fillStyle = '#999999';
      ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      const label = year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
      ctx.fillText(label, x, TOP_PADDING - 16);
    }

    // Draw event markers (top section)
    const eventY = TOP_PADDING;
    events.forEach(event => {
      if (event.start_year == null) return;
      const x = yearToX(event.start_year);
      const endX = event.end_year ? yearToX(event.end_year) : x;

      if (x > canvasWidth + 10 || endX < -10) return;

      // Event marker
      ctx.fillStyle = '#EF4444';
      ctx.globalAlpha = 0.7;

      if (event.end_year && event.end_year !== event.start_year) {
        // Spanning event — draw a line
        ctx.fillRect(x, eventY, Math.max(endX - x, 2), 3);
      } else {
        // Point event — draw a diamond
        ctx.beginPath();
        ctx.moveTo(x, eventY - 4);
        ctx.lineTo(x + 4, eventY);
        ctx.lineTo(x, eventY + 4);
        ctx.lineTo(x - 4, eventY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });

    // Draw figure lifespans
    const figureStartY = TOP_PADDING + EVENT_MARKER_HEIGHT + 20;

    sortedFigures.forEach((figure, index) => {
      const y = figureStartY + index * ROW_HEIGHT;
      const startX = yearToX(figure.birth_year);
      const endX = yearToX(figure.death_year);
      const barWidth = Math.max(endX - startX, 2);

      // Skip if entirely out of view
      if (endX < 0 || startX > canvasWidth) return;

      const color = getEraColor(figure.era);
      const isHovered = hoveredFigure?.canonical_id === figure.canonical_id;

      // Lifespan bar
      ctx.fillStyle = color;
      ctx.globalAlpha = isHovered ? 1 : 0.65;
      ctx.fillRect(startX, y + 4, barWidth, ROW_HEIGHT - 10);
      ctx.globalAlpha = 1;

      // Portrayal count indicator (small dots)
      if (figure.portrayal_count > 0) {
        const dotCount = Math.min(figure.portrayal_count, 5);
        for (let i = 0; i < dotCount; i++) {
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(startX + 8 + i * 6, y + ROW_HEIGHT / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Name label — show if bar is wide enough or if hovered
      if (barWidth > 60 || isHovered) {
        ctx.fillStyle = isHovered ? '#000000' : '#333333';
        ctx.font = isHovered
          ? 'bold 11px ui-sans-serif, system-ui, sans-serif'
          : '11px ui-sans-serif, system-ui, sans-serif';
        ctx.textAlign = 'left';

        const labelX = Math.max(startX + 4, LEFT_GUTTER + 4);
        const displayName = figure.name.length > 30 ? figure.name.slice(0, 28) + '...' : figure.name;
        ctx.fillText(displayName, labelX, y - 1);
      }
    });

    // Draw "now" line if in view
    const currentYear = new Date().getFullYear();
    if (currentYear >= viewStart && currentYear <= viewEnd) {
      const nowX = yearToX(currentYear);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(nowX, TOP_PADDING - 10);
      ctx.lineTo(nowX, totalHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [sortedFigures, events, viewStart, viewEnd, canvasWidth, totalHeight, yearToX, hoveredFigure]);

  // Mouse interaction handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePos({ x: e.clientX, y: e.clientY });

    // Check events
    const eventY = TOP_PADDING;
    if (y >= eventY - 8 && y <= eventY + EVENT_MARKER_HEIGHT) {
      const year = xToYear(x);
      const hitEvent = events.find(ev => {
        if (ev.start_year == null) return false;
        const evEnd = ev.end_year ?? ev.start_year;
        const tolerance = (viewEnd - viewStart) * 0.01;
        return year >= ev.start_year - tolerance && year <= evEnd + tolerance;
      });
      setHoveredEvent(hitEvent || null);
      setHoveredFigure(null);
      canvas.style.cursor = hitEvent ? 'pointer' : 'default';
      return;
    }

    // Check figures
    const figureStartY = TOP_PADDING + EVENT_MARKER_HEIGHT + 20;
    const rowIndex = Math.floor((y - figureStartY) / ROW_HEIGHT);

    if (rowIndex >= 0 && rowIndex < sortedFigures.length) {
      const figure = sortedFigures[rowIndex];
      const startX = yearToX(figure.birth_year);
      const endX = yearToX(figure.death_year);

      if (x >= startX - 5 && x <= endX + 5) {
        setHoveredFigure(figure);
        setHoveredEvent(null);
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    setHoveredFigure(null);
    setHoveredEvent(null);
    canvas.style.cursor = 'default';
  }, [sortedFigures, events, yearToX, xToYear, viewStart, viewEnd]);

  const handleClick = useCallback(() => {
    if (hoveredFigure) {
      router.push(`/figure/${hoveredFigure.canonical_id}`);
    }
  }, [hoveredFigure, router]);

  // Zoom via scroll wheel
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseYear = xToYear(mouseX);

    const zoomFactor = e.deltaY > 0 ? 1.15 : 0.87;
    const range = viewEnd - viewStart;
    const newRange = Math.max(20, Math.min(range * zoomFactor, 8000));

    const ratio = (mouseYear - viewStart) / range;
    const newStart = mouseYear - ratio * newRange;
    const newEnd = mouseYear + (1 - ratio) * newRange;

    setViewStart(Math.round(newStart));
    setViewEnd(Math.round(newEnd));
  }, [viewStart, viewEnd, xToYear]);

  // Pan via drag
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
    const yearDelta = (dx / (canvasWidth - LEFT_GUTTER - RIGHT_PADDING)) * range;

    setViewStart(prev => Math.round(prev - yearDelta));
    setViewEnd(prev => Math.round(prev - yearDelta));
  }, [viewStart, viewEnd, canvasWidth, handleMouseMove]);

  const formatYear = (year: number) => year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '8px',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
          {stats.total_figures} figures
          {stats.total_events > 0 && ` / ${stats.total_events} events`}
          {' '} | {formatYear(viewStart)} to {formatYear(viewEnd)}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              const mid = (viewStart + viewEnd) / 2;
              const range = viewEnd - viewStart;
              setViewStart(Math.round(mid - range * 0.35));
              setViewEnd(Math.round(mid + range * 0.35));
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '4px 12px',
              border: '1px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Zoom In
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
              fontSize: '11px',
              padding: '4px 12px',
              border: '1px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Zoom Out
          </button>
          <button
            onClick={() => {
              setViewStart(stats.earliest_year - 50);
              setViewEnd(stats.latest_year + 50);
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '4px 12px',
              border: '1px solid var(--color-border)',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: `${canvasWidth}px`,
            height: `${totalHeight}px`,
            cursor: 'grab',
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
          onWheel={handleWheel}
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
            {formatYear(hoveredFigure.birth_year)} - {formatYear(hoveredFigure.death_year)}
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
            border: '1px solid #EF4444',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{hoveredEvent.name}</div>
          {hoveredEvent.description && (
            <div style={{ color: '#aaa', fontSize: '11px' }}>{hoveredEvent.description}</div>
          )}
          <div style={{ color: '#aaa', fontSize: '11px', marginTop: '2px' }}>
            {hoveredEvent.start_year && formatYear(hoveredEvent.start_year)}
            {hoveredEvent.end_year && hoveredEvent.end_year !== hoveredEvent.start_year && (
              <> - {formatYear(hoveredEvent.end_year)}</>
            )}
          </div>
          {hoveredEvent.location && (
            <div style={{ color: '#888', fontSize: '10px' }}>{hoveredEvent.location}</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 0',
          borderTop: '1px solid var(--color-border)',
          marginTop: '8px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Scroll to zoom / Drag to pan / Click figure to view
        </div>
      </div>
    </div>
  );
}
