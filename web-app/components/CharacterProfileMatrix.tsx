'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatMediaType, getSentimentColor } from '@/lib/card-utils';
import type { Portrayal } from '@/lib/types';

interface CharacterProfileMatrixProps {
  portrayals: Portrayal[];
  figureName: string;
}

type SortField = 'year' | 'sentiment' | 'creator';
type SortDir = 'asc' | 'desc';

export default function CharacterProfileMatrix({
  portrayals,
  figureName,
}: CharacterProfileMatrixProps) {
  const [sortField, setSortField] = useState<SortField>('year');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const mediaTypes = useMemo(() => {
    const types = new Set<string>();
    portrayals.forEach((p) => {
      if (p.media.media_type) types.add(p.media.media_type);
    });
    return Array.from(types).sort();
  }, [portrayals]);

  const getCreator = (p: Portrayal): string =>
    p.media.creator || p.media.director || p.media.author || '';

  const sorted = useMemo(() => {
    let result = [...portrayals];

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.media.media_type === typeFilter);
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'year':
          cmp = Number(a.media.release_year || 0) - Number(b.media.release_year || 0);
          break;
        case 'sentiment':
          cmp = (a.sentiment || '').localeCompare(b.sentiment || '');
          break;
        case 'creator':
          cmp = getCreator(a).localeCompare(getCreator(b));
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [portrayals, sortField, sortDir, typeFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ opacity: 0.3 }} />;
    return sortDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  };

  const headerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    color: 'var(--color-gray)',
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: '2px solid var(--color-border)',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  };

  const cellStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    padding: '10px 12px',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'top',
  };

  const controlStyle: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    padding: '4px 10px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  };

  const activeControlStyle: React.CSSProperties = {
    ...controlStyle,
    background: 'var(--color-text)',
    color: '#fff',
    borderColor: 'var(--color-text)',
  };

  if (portrayals.length === 0) return null;

  return (
    <div>
      <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
        <span>Creator Interpretation Matrix</span>
        <span>({sorted.length} Records)</span>
      </div>

      {/* Type filter */}
      {mediaTypes.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Type:
          </span>
          <button onClick={() => setTypeFilter('all')} style={typeFilter === 'all' ? activeControlStyle : controlStyle}>
            All
          </button>
          {mediaTypes.map((type) => (
            <button key={type} onClick={() => setTypeFilter(type)} style={typeFilter === type ? activeControlStyle : controlStyle}>
              {formatMediaType(type)}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: '1px solid var(--color-border)' }}>
          <thead>
            <tr>
              <th style={headerStyle} onClick={() => toggleSort('year')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Work <SortIcon field="year" />
                </span>
              </th>
              <th style={headerStyle} onClick={() => toggleSort('creator')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Creator <SortIcon field="creator" />
                </span>
              </th>
              <th style={headerStyle} onClick={() => toggleSort('sentiment')}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  Interpretation <SortIcon field="sentiment" />
                </span>
              </th>
              <th style={{ ...headerStyle, cursor: 'default' }}>Actor / Character</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, idx) => {
              const creator = getCreator(p);
              const mediaLink = p.media.wikidata_id
                ? `/media/${p.media.wikidata_id}`
                : p.media.media_id
                  ? `/media/${p.media.media_id}`
                  : null;

              return (
                <tr
                  key={`${p.media.title}-${idx}`}
                  style={{ transition: 'background 0.15s' }}
                  className="hover:bg-stone-50"
                >
                  {/* Work */}
                  <td style={cellStyle}>
                    <div>
                      {mediaLink ? (
                        <Link
                          href={mediaLink}
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '14px',
                            color: 'var(--color-text)',
                            textDecoration: 'none',
                          }}
                          className="hover:underline"
                        >
                          {p.media.title}
                        </Link>
                      ) : (
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '14px' }}>
                          {p.media.title}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginTop: '2px' }}>
                      {p.media.release_year || '—'}
                      {p.media.media_type && ` · ${formatMediaType(p.media.media_type)}`}
                    </div>
                  </td>

                  {/* Creator */}
                  <td style={{ ...cellStyle, fontFamily: 'var(--font-serif)', fontSize: '13px' }}>
                    {creator || '—'}
                  </td>

                  {/* Interpretation */}
                  <td style={cellStyle}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '2px 8px',
                        border: `1px solid ${getSentimentColor(p.sentiment || 'Complex')}`,
                        color: getSentimentColor(p.sentiment || 'Complex'),
                      }}
                    >
                      {p.sentiment || 'Complex'}
                    </span>
                    {p.is_protagonist && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '2px 6px',
                          marginLeft: '4px',
                          border: '1px solid var(--color-accent)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        Lead
                      </span>
                    )}
                    {p.conflict_flag && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#ef4444', marginTop: '4px' }}>
                        Historically contested
                      </div>
                    )}
                  </td>

                  {/* Actor / Character */}
                  <td style={{ ...cellStyle, fontSize: '13px' }}>
                    {p.actor_name && (
                      <div style={{ fontFamily: 'var(--font-serif)' }}>{p.actor_name}</div>
                    )}
                    {p.character_name && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginTop: '2px' }}>
                        as &ldquo;{p.character_name}&rdquo;
                      </div>
                    )}
                    {!p.actor_name && !p.character_name && (
                      <span style={{ color: 'var(--color-gray)' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div style={{ padding: '32px', border: '1px solid var(--color-border)', textAlign: 'center', fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-gray)' }}>
          No portrayals match the current filter
        </div>
      )}
    </div>
  );
}
