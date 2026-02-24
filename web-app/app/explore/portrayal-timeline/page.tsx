'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getEraColor, GRAPH_PALETTE } from '@/lib/colors';
import type { PortrayalTimelineFigure } from '@/lib/db';

export default function PortrayalTimelinePage() {
  return (
    <Suspense fallback={<Loading />}>
      <PortrayalTimelineContent />
    </Suspense>
  );
}

function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: GRAPH_PALETTE.CREAM_BG }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        color: 'var(--color-gray)',
      }}>
        Loading portrayal timeline...
      </div>
    </div>
  );
}

// Media type → shape marker
const MEDIA_SHAPES: Record<string, string> = {
  Film: '●',
  'TV Series': '■',
  'TV Mini-Series': '■',
  Book: '◆',
  Novel: '◆',
  Play: '◆',
  Opera: '▲',
  'Video Game': '⬡',
};

function getMediaShape(mediaType: string): string {
  return MEDIA_SHAPES[mediaType] || '●';
}

const SENTIMENT_COLORS: Record<string, string> = {
  Heroic: '#2D7D46',
  Complex: '#B8860B',
  Villainous: '#8B0000',
  Sympathetic: '#4682B4',
  Neutral: '#8B7355',
};

function getSentimentColor(sentiment?: string): string {
  if (!sentiment) return '#8B7355';
  for (const [key, color] of Object.entries(SENTIMENT_COLORS)) {
    if (sentiment.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#8B7355';
}

// Constants
const LEFT_LABEL_WIDTH = 180;
const ROW_HEIGHT = 32;
const ROW_GAP = 2;
const DOT_RADIUS = 5;
const MEDIA_AXIS_HEIGHT = 60;
const TOP_PADDING = 40;

function PortrayalTimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [figures, setFigures] = useState<PortrayalTimelineFigure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState(searchParams.get('era') || '');
  const [mediaTypeFilter, setMediaTypeFilter] = useState(searchParams.get('mediaType') || '');
  const [hoveredItem, setHoveredItem] = useState<{ x: number; y: number; text: string } | null>(null);
  const [availableEras, setAvailableEras] = useState<string[]>([]);
  const [availableMediaTypes, setAvailableMediaTypes] = useState<string[]>([]);

  // Fetch data
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (eraFilter) params.set('era', eraFilter);
        if (mediaTypeFilter) params.set('mediaType', mediaTypeFilter);
        params.set('minPortrayals', '2');

        const res = await fetch(`/api/portrayal-timeline?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch data');
        const data = await res.json();
        if (!cancelled) {
          setFigures(data.figures || []);

          // Collect available eras and media types from full dataset
          const eras = new Set<string>();
          const mediaTypes = new Set<string>();
          for (const f of data.figures || []) {
            if (f.era) eras.add(f.era);
            for (const p of f.portrayals) {
              if (p.media_type) mediaTypes.add(p.media_type);
            }
          }
          setAvailableEras([...eras].sort());
          setAvailableMediaTypes([...mediaTypes].sort());
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [eraFilter, mediaTypeFilter]);

  const handleEraChange = useCallback((era: string) => {
    setEraFilter(era);
    const params = new URLSearchParams();
    if (era) params.set('era', era);
    if (mediaTypeFilter) params.set('mediaType', mediaTypeFilter);
    const qs = params.toString();
    router.push(`/explore/portrayal-timeline${qs ? `?${qs}` : ''}`);
  }, [router, mediaTypeFilter]);

  const handleMediaTypeChange = useCallback((type: string) => {
    setMediaTypeFilter(type);
    const params = new URLSearchParams();
    if (eraFilter) params.set('era', eraFilter);
    if (type) params.set('mediaType', type);
    const qs = params.toString();
    router.push(`/explore/portrayal-timeline${qs ? `?${qs}` : ''}`);
  }, [router, eraFilter]);

  // Compute time range
  const allYears = figures.flatMap(f => [
    f.birth_year,
    f.death_year,
    ...f.portrayals.map(p => p.release_year),
  ]);
  const minYear = allYears.length > 0 ? Math.min(...allYears) : -500;
  const maxYear = allYears.length > 0 ? Math.max(...allYears) : 2025;
  const yearPadding = Math.max(50, (maxYear - minYear) * 0.05);
  const timeStart = minYear - yearPadding;
  const timeEnd = maxYear + yearPadding;

  // Canvas dimensions
  const canvasWidth = containerRef.current?.clientWidth || 1200;
  const chartWidth = canvasWidth - LEFT_LABEL_WIDTH - 40;
  const canvasHeight = TOP_PADDING + MEDIA_AXIS_HEIGHT + figures.length * (ROW_HEIGHT + ROW_GAP) + 40;

  const yearToX = useCallback((year: number) => {
    return LEFT_LABEL_WIDTH + ((year - timeStart) / (timeEnd - timeStart)) * chartWidth;
  }, [timeStart, timeEnd, chartWidth]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || figures.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasWidth * dpr;
    canvas.height = canvasHeight * dpr;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = GRAPH_PALETTE.CREAM_BG;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // --- Time axis ---
    const axisY = TOP_PADDING + 20;
    ctx.strokeStyle = '#D6D0C4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT_LABEL_WIDTH, axisY);
    ctx.lineTo(canvasWidth - 20, axisY);
    ctx.stroke();

    // Tick marks
    const yearRange = timeEnd - timeStart;
    const tickInterval = yearRange > 2000 ? 500 : yearRange > 500 ? 100 : yearRange > 100 ? 50 : 10;
    const firstTick = Math.ceil(timeStart / tickInterval) * tickInterval;
    ctx.fillStyle = '#A09880';
    ctx.font = '10px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    for (let year = firstTick; year <= timeEnd; year += tickInterval) {
      const x = yearToX(year);
      ctx.beginPath();
      ctx.moveTo(x, axisY - 4);
      ctx.lineTo(x, axisY + 4);
      ctx.stroke();
      const label = year < 0 ? `${Math.abs(year)} BC` : `${year}`;
      ctx.fillText(label, x, axisY - 10);
    }

    // --- Figure rows ---
    const rowStartY = TOP_PADDING + MEDIA_AXIS_HEIGHT;

    figures.forEach((figure, i) => {
      const y = rowStartY + i * (ROW_HEIGHT + ROW_GAP);
      const eraColor = getEraColor(figure.era);

      // Zebra stripe
      if (i % 2 === 1) {
        ctx.fillStyle = GRAPH_PALETTE.LANE_ALT_BG;
        ctx.fillRect(0, y, canvasWidth, ROW_HEIGHT);
      }

      // Figure name label
      ctx.fillStyle = '#4A4535';
      ctx.font = '11px "IBM Plex Serif", Georgia, serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const rowCenterY = y + ROW_HEIGHT / 2;
      const displayName = figure.name.length > 22 ? figure.name.slice(0, 20) + '...' : figure.name;
      ctx.fillText(displayName, LEFT_LABEL_WIDTH - 12, rowCenterY);

      // Lifespan bar
      const barX1 = yearToX(figure.birth_year);
      const barX2 = yearToX(figure.death_year);
      const barH = 8;
      const barY = rowCenterY - barH / 2;

      ctx.fillStyle = eraColor + '40'; // 25% opacity
      ctx.fillRect(barX1, barY, Math.max(barX2 - barX1, 2), barH);
      ctx.strokeStyle = eraColor + '80';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX1, barY, Math.max(barX2 - barX1, 2), barH);

      // Portrayal dots
      figure.portrayals.forEach(p => {
        const px = yearToX(p.release_year);
        const color = getSentimentColor(p.sentiment);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, rowCenterY, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Tiny outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Portrayal count badge
      ctx.fillStyle = '#A09880';
      ctx.font = '9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${figure.portrayals.length}`, canvasWidth - 35, rowCenterY);
    });

    // --- Vertical guide lines (light, behind everything except they draw on top; acceptable) ---
    ctx.strokeStyle = '#E8E2D6';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);
    for (let year = firstTick; year <= timeEnd; year += tickInterval) {
      const x = yearToX(year);
      ctx.beginPath();
      ctx.moveTo(x, rowStartY);
      ctx.lineTo(x, canvasHeight - 20);
      ctx.stroke();
    }
    ctx.setLineDash([]);

  }, [figures, canvasWidth, canvasHeight, yearToX, timeStart, timeEnd]);

  // Hover handler
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const rowStartY = TOP_PADDING + MEDIA_AXIS_HEIGHT;

    // Check portrayal dots
    for (let i = 0; i < figures.length; i++) {
      const y = rowStartY + i * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT / 2;
      for (const p of figures[i].portrayals) {
        const px = yearToX(p.release_year);
        const dist = Math.sqrt((mx - px) ** 2 + (my - y) ** 2);
        if (dist <= DOT_RADIUS + 2) {
          setHoveredItem({
            x: e.clientX,
            y: e.clientY,
            text: `${p.title} (${p.release_year}) — ${p.media_type}${p.sentiment ? ` — ${p.sentiment}` : ''}`,
          });
          return;
        }
      }

      // Check lifespan bar
      if (my >= rowStartY + i * (ROW_HEIGHT + ROW_GAP) && my <= rowStartY + i * (ROW_HEIGHT + ROW_GAP) + ROW_HEIGHT) {
        const barX1 = yearToX(figures[i].birth_year);
        const barX2 = yearToX(figures[i].death_year);
        if (mx >= barX1 && mx <= barX2) {
          setHoveredItem({
            x: e.clientX,
            y: e.clientY,
            text: `${figures[i].name} (${figures[i].birth_year}–${figures[i].death_year})${figures[i].era ? ` — ${figures[i].era}` : ''}`,
          });
          return;
        }
      }
    }

    setHoveredItem(null);
  }, [figures, yearToX]);

  // Click handler — navigate to figure detail
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const my = e.clientY - rect.top;

    const rowStartY = TOP_PADDING + MEDIA_AXIS_HEIGHT;
    const rowIndex = Math.floor((my - rowStartY) / (ROW_HEIGHT + ROW_GAP));
    if (rowIndex >= 0 && rowIndex < figures.length) {
      router.push(`/figure/${figures[rowIndex].canonical_id}`);
    }
  }, [figures, router]);

  return (
    <div style={{ background: GRAPH_PALETTE.CREAM_BG, minHeight: '100vh' }}>
      <div style={{ padding: '40px', maxWidth: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            fontWeight: 400,
            marginBottom: '8px',
            color: 'var(--color-text)',
          }}>
            Portrayal Timeline
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            Figure lifespans overlaid with when media was created about them
          </p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Era filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleEraChange('')}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '4px 10px',
                border: '1px solid var(--color-border)',
                background: !eraFilter ? 'var(--color-text)' : 'white',
                color: !eraFilter ? 'white' : 'var(--color-text)',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}
            >
              All Eras
            </button>
            {availableEras.map(era => (
              <button
                key={era}
                onClick={() => handleEraChange(era)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '4px 10px',
                  border: '1px solid var(--color-border)',
                  background: eraFilter === era ? 'var(--color-text)' : 'white',
                  color: eraFilter === era ? 'white' : 'var(--color-text)',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
              >
                {era}
              </button>
            ))}
          </div>

          {/* Media type filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleMediaTypeChange('')}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '4px 10px',
                border: '1px solid #D4A017',
                background: !mediaTypeFilter ? '#D4A017' : 'white',
                color: !mediaTypeFilter ? 'white' : '#D4A017',
                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}
            >
              All Media
            </button>
            {availableMediaTypes.map(mt => (
              <button
                key={mt}
                onClick={() => handleMediaTypeChange(mt)}
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '4px 10px',
                  border: '1px solid #D4A017',
                  background: mediaTypeFilter === mt ? '#D4A017' : 'white',
                  color: mediaTypeFilter === mt ? 'white' : '#D4A017',
                  cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
              >
                {mt}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{
          marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap',
          fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#A09880',
          textTransform: 'uppercase', letterSpacing: '1px',
        }}>
          <span>
            <span style={{ display: 'inline-block', width: 20, height: 6, background: '#8B735540', border: '1px solid #8B735580', marginRight: 4, verticalAlign: 'middle' }} />
            Lifespan
          </span>
          {Object.entries(SENTIMENT_COLORS).map(([label, color]) => (
            <span key={label}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: color, marginRight: 4, verticalAlign: 'middle',
              }} />
              {label}
            </span>
          ))}
        </div>

        {/* Content */}
        {loading && <Loading />}

        {error && (
          <div style={{
            padding: '24px', border: '1px solid #EF4444',
            fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#EF4444',
          }}>
            Error: {error}
          </div>
        )}

        {!loading && figures.length === 0 && !error && (
          <div style={{
            padding: '40px', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gray)',
          }}>
            No figures with 2+ portrayals found{eraFilter ? ` for "${eraFilter}"` : ''}.
          </div>
        )}

        {!loading && figures.length > 0 && (
          <div ref={containerRef} style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
            <canvas
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={handleClick}
              style={{ cursor: 'pointer', display: 'block' }}
            />

            {/* Tooltip */}
            {hoveredItem && (
              <div style={{
                position: 'fixed',
                left: hoveredItem.x + 12,
                top: hoveredItem.y - 8,
                background: '#1C1917',
                color: '#FAF8F0',
                padding: '6px 10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                pointerEvents: 'none',
                zIndex: 100,
                maxWidth: 360,
                whiteSpace: 'nowrap',
              }}>
                {hoveredItem.text}
              </div>
            )}

            {/* Stats bar */}
            <div style={{
              marginTop: '12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: '#A09880',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              display: 'flex',
              gap: '24px',
            }}>
              <span>{figures.length} figures</span>
              <span>{figures.reduce((sum, f) => sum + f.portrayals.length, 0)} portrayals</span>
              <span>{Math.abs(minYear)}{minYear < 0 ? ' BC' : ''} – {maxYear}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
