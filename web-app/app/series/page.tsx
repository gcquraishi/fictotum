'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getMediaTypeColor, getMediaTypeIcon } from '@/lib/card-utils';

interface SeriesListItem {
  wikidata_id: string;
  title: string;
  media_type: string;
  creator?: string;
  work_count: number;
  character_count: number;
}

export default function SeriesBrowsePage() {
  const [series, setSeries] = useState<SeriesListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSeries, setFilteredSeries] = useState<SeriesListItem[]>([]);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await fetch('/api/series/browse');
        if (!response.ok) throw new Error('Failed to fetch series');
        const data = await response.json();
        setSeries(data);
        setFilteredSeries(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load series');
      } finally {
        setLoading(false);
      }
    };
    fetchSeries();
  }, []);

  useEffect(() => {
    const filtered = series.filter(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.creator && s.creator.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredSeries(filtered);
  }, [searchQuery, series]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Breadcrumb Header */}
      <div
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--color-text)',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          Fictotum Archive
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
          }}
        >
          Index / Series
        </span>
      </div>

      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* Page Header */}
        <div style={{ marginBottom: '32px' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)',
              marginBottom: '8px',
            }}
          >
            Series Archive
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '42px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            Browse Series
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              color: 'var(--color-gray)',
            }}
          >
            Explore all book, TV, film, and game series in the archive.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '32px' }}>
          <input
            type="text"
            placeholder="Search by series name or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              padding: '12px 16px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
              }}
            >
              Loading series...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              padding: '16px 20px',
              border: '1px solid var(--color-accent)',
              borderLeft: '4px solid var(--color-accent)',
              marginBottom: '32px',
            }}
          >
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Series Grid */}
        {!loading && !error && filteredSeries.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1px',
              background: 'var(--color-border)',
              border: '1px solid var(--color-border)',
            }}
          >
            {filteredSeries.map((s) => {
              const accentColor = getMediaTypeColor(s.media_type);
              const Icon = getMediaTypeIcon(s.media_type);

              return (
                <Link
                  key={s.wikidata_id}
                  href={`/series/${s.wikidata_id}`}
                  style={{
                    display: 'block',
                    background: 'var(--color-bg)',
                    padding: '20px',
                    textDecoration: 'none',
                    color: 'var(--color-text)',
                    borderBottom: `2px solid transparent`,
                  }}
                  className="hover:opacity-80 transition-opacity"
                >
                  {/* Type Badge + Icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Icon style={{ width: '20px', height: '20px', color: accentColor, opacity: 0.7 }} />
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        padding: '2px 8px',
                        border: `1px solid ${accentColor}`,
                        color: accentColor,
                      }}
                    >
                      {s.media_type}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '17px',
                      fontWeight: 500,
                      color: 'var(--color-text)',
                      lineHeight: 1.3,
                      marginBottom: '4px',
                    }}
                  >
                    {s.title}
                  </h3>
                  {s.creator && (
                    <p
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '13px',
                        color: 'var(--color-gray)',
                        marginBottom: '12px',
                      }}
                    >
                      by {s.creator}
                    </p>
                  )}

                  {/* Stats */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>Works</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 500, color: accentColor }}>{s.work_count}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>Figures</p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 500, color: 'var(--color-text)' }}>{s.character_count}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSeries.length === 0 && (
          <div
            style={{
              padding: '80px 0',
              textAlign: 'center',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-gray)', marginBottom: '8px' }}>
              {searchQuery ? `No series found matching "${searchQuery}"` : 'No series available'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Summary */}
        {!error && series.length > 0 && !loading && (
          <div
            style={{
              marginTop: '32px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-gray)',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              Showing {filteredSeries.length} of {series.length} series
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
