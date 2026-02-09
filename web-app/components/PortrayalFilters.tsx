'use client';

import { useState, useMemo } from 'react';
import PortrayalCard from '@/components/PortrayalCard';
import { formatMediaType } from '@/lib/card-utils';
import type { Portrayal } from '@/lib/types';

interface PortrayalFiltersProps {
  portrayals: Portrayal[];
}

type SortOption = 'year-asc' | 'year-desc' | 'sentiment';
type FilterOption = 'all' | string;

export default function PortrayalFilters({ portrayals }: PortrayalFiltersProps) {
  const [sort, setSort] = useState<SortOption>('year-asc');
  const [filter, setFilter] = useState<FilterOption>('all');

  // Get unique media types for filter options
  const mediaTypes = useMemo(() => {
    const types = new Set<string>();
    portrayals.forEach((p) => {
      if (p.media.media_type) types.add(p.media.media_type);
    });
    return Array.from(types).sort();
  }, [portrayals]);

  // Apply sort and filter
  const filtered = useMemo(() => {
    let result = [...portrayals];

    // Filter
    if (filter !== 'all') {
      result = result.filter((p) => p.media.media_type === filter);
    }

    // Sort
    switch (sort) {
      case 'year-asc':
        result.sort((a, b) => Number(a.media.release_year) - Number(b.media.release_year));
        break;
      case 'year-desc':
        result.sort((a, b) => Number(b.media.release_year) - Number(a.media.release_year));
        break;
      case 'sentiment':
        result.sort((a, b) => (a.sentiment || '').localeCompare(b.sentiment || ''));
        break;
    }

    return result;
  }, [portrayals, sort, filter]);

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
    appearance: 'none' as const,
  };

  const activeStyle: React.CSSProperties = {
    ...controlStyle,
    background: 'var(--color-text)',
    color: '#fff',
    borderColor: 'var(--color-text)',
  };

  return (
    <div>
      {/* Controls Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        {/* Sort Buttons */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Sort:
        </span>
        <button
          onClick={() => setSort('year-asc')}
          style={sort === 'year-asc' ? activeStyle : controlStyle}
        >
          Oldest First
        </button>
        <button
          onClick={() => setSort('year-desc')}
          style={sort === 'year-desc' ? activeStyle : controlStyle}
        >
          Newest First
        </button>
        <button
          onClick={() => setSort('sentiment')}
          style={sort === 'sentiment' ? activeStyle : controlStyle}
        >
          Sentiment
        </button>

        {/* Filter Separator */}
        {mediaTypes.length > 1 && (
          <>
            <span style={{ color: 'var(--color-border)', margin: '0 4px' }}>|</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Type:
            </span>
            <button
              onClick={() => setFilter('all')}
              style={filter === 'all' ? activeStyle : controlStyle}
            >
              All
            </button>
            {mediaTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                style={filter === type ? activeStyle : controlStyle}
              >
                {formatMediaType(type)}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Results Count */}
      {filter !== 'all' && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginBottom: '12px' }}>
          Showing {filtered.length} of {portrayals.length} records
        </div>
      )}

      {/* Portrayal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((portrayal, idx) => (
          <PortrayalCard
            key={`${portrayal.media.title}-${idx}`}
            media={{
              mediaId: portrayal.media.media_id,
              title: portrayal.media.title,
              releaseYear: portrayal.media.release_year,
              mediaType: portrayal.media.media_type,
              creator: portrayal.media.creator || portrayal.media.director || portrayal.media.author,
              imageUrl: portrayal.media.image_url,
              wikidataId: portrayal.media.wikidata_id,
            }}
            actorName={portrayal.actor_name}
            characterName={portrayal.character_name}
            sentiment={portrayal.sentiment}
            sentimentTags={portrayal.sentiment_tags}
            roleDescription={portrayal.role_description}
            isProtagonist={portrayal.is_protagonist}
            conflictFlag={portrayal.conflict_flag}
            conflictNotes={portrayal.conflict_notes}
            anachronismFlag={portrayal.anachronism_flag}
            anachronismNotes={portrayal.anachronism_notes}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            padding: '48px',
            border: '1px solid var(--color-border)',
            textAlign: 'center',
          }}
        >
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-gray)' }}>
            No portrayals match the current filter
          </span>
        </div>
      )}
    </div>
  );
}
