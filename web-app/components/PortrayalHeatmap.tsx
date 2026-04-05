'use client';

import { useState } from 'react';

interface HeatmapPortrayal {
  media: {
    title: string;
    media_type?: string;
    release_year: number;
    media_id?: string;
    wikidata_id?: string;
  };
}

interface PortrayalHeatmapProps {
  portrayals: HeatmapPortrayal[];
}

interface CellData {
  count: number;
  works: { title: string; year: number; id: string }[];
}

function getDecade(year: number): string {
  const d = Math.floor(year / 10) * 10;
  return `${d}s`;
}

function getCellColor(count: number, maxCount: number): string {
  if (count === 0) return 'transparent';
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  // Warm brown scale matching Fictotum palette
  if (intensity <= 0.25) return '#d4c4a8';
  if (intensity <= 0.5) return '#b8976a';
  if (intensity <= 0.75) return '#8B6914';
  return '#6B4423';
}

export default function PortrayalHeatmap({ portrayals }: PortrayalHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ format: string; decade: string } | null>(null);

  // Build the heatmap data
  const grid = new Map<string, CellData>();
  const formats = new Set<string>();
  const decades = new Set<string>();

  for (const p of portrayals) {
    const format = p.media.media_type || 'Unknown';
    const year = p.media.release_year;
    if (!year) continue;

    const decade = getDecade(year);
    formats.add(format);
    decades.add(decade);

    const key = `${format}|${decade}`;
    const existing = grid.get(key) || { count: 0, works: [] };
    existing.count++;
    existing.works.push({
      title: p.media.title,
      year,
      id: p.media.wikidata_id || p.media.media_id || '',
    });
    grid.set(key, existing);
  }

  const sortedFormats = [...formats].sort();
  const sortedDecades = [...decades].sort();

  if (sortedFormats.length < 2 || sortedDecades.length < 2) return null;

  const maxCount = Math.max(...[...grid.values()].map((c) => c.count));

  const hoveredData =
    hoveredCell && grid.get(`${hoveredCell.format}|${hoveredCell.decade}`);

  return (
    <div>
      <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
        <span>Portrayal Heatmap</span>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${sortedDecades.length}, 1fr)`,
            gap: '1px',
            background: 'var(--color-border)',
            border: '1px solid var(--color-border)',
            minWidth: `${120 + sortedDecades.length * 48}px`,
          }}
        >
          {/* Header row */}
          <div
            style={{
              padding: '6px 8px',
              background: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: 'var(--color-gray)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          />
          {sortedDecades.map((decade) => (
            <div
              key={decade}
              style={{
                padding: '6px 4px',
                background: 'var(--color-bg)',
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--color-gray)',
                textAlign: 'center',
              }}
            >
              {decade}
            </div>
          ))}

          {/* Data rows */}
          {sortedFormats.map((format) => (
            <>
              <div
                key={`label-${format}`}
                style={{
                  padding: '8px',
                  background: 'var(--color-bg)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-text)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {format}
              </div>
              {sortedDecades.map((decade) => {
                const cell = grid.get(`${format}|${decade}`);
                const count = cell?.count || 0;
                const isHovered =
                  hoveredCell?.format === format && hoveredCell?.decade === decade;

                return (
                  <div
                    key={`${format}-${decade}`}
                    onMouseEnter={() => setHoveredCell({ format, decade })}
                    onMouseLeave={() => setHoveredCell(null)}
                    style={{
                      background: count > 0 ? getCellColor(count, maxCount) : 'var(--color-bg)',
                      minHeight: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: count > 0 ? 'default' : undefined,
                      outline: isHovered && count > 0 ? '2px solid var(--color-accent)' : undefined,
                      outlineOffset: '-2px',
                    }}
                  >
                    {count > 0 && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 600,
                          color: count / maxCount > 0.5 ? '#fff' : 'var(--color-text)',
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredData && hoveredCell && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 12px',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
          }}
        >
          <span style={{ color: 'var(--color-gray)' }}>
            {hoveredCell.format} · {hoveredCell.decade}
          </span>
          <span style={{ marginLeft: '8px', fontWeight: 600 }}>
            {hoveredData.count} work{hoveredData.count !== 1 ? 's' : ''}
          </span>
          <div style={{ marginTop: '4px', color: 'var(--color-text)', fontSize: '10px' }}>
            {hoveredData.works
              .sort((a, b) => a.year - b.year)
              .slice(0, 5)
              .map((w) => `${w.title} (${w.year})`)
              .join(' · ')}
            {hoveredData.works.length > 5 && ` · +${hoveredData.works.length - 5} more`}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginTop: '8px',
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--color-gray)',
        }}
      >
        <span>Less</span>
        {[0.25, 0.5, 0.75, 1].map((intensity) => (
          <div
            key={intensity}
            style={{
              width: '12px',
              height: '12px',
              background: getCellColor(intensity * maxCount, maxCount),
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
