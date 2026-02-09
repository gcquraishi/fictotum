'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { PeriodDetail } from '@/lib/types';

interface PeriodDetailPanelProps {
  period: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PeriodDetailPanel({
  period,
  isOpen,
  onClose,
}: PeriodDetailPanelProps) {
  const [data, setData] = useState<PeriodDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeriodDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/temporal-coverage/${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch period details');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isOpen && period) {
      fetchPeriodDetails();
    }
  }, [isOpen, period, fetchPeriodDetails]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26, 26, 26, 0.4)',
          zIndex: 40,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '50%',
          minWidth: '400px',
          maxWidth: '700px',
          background: 'var(--color-bg)',
          borderLeft: '1px solid var(--color-border-bold)',
          zIndex: 50,
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'var(--color-text)',
            color: 'var(--color-bg)',
            padding: '24px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '28px',
                  fontWeight: 300,
                  marginBottom: '4px',
                }}
              >
                Period Analysis
              </h2>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  letterSpacing: '2px',
                  opacity: 0.7,
                }}
              >
                Temporal Range: {period}
              </div>
            </div>
            <button
              onClick={onClose}
              className="hover:opacity-70 transition-opacity"
              aria-label="Close panel"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-bg)',
                background: 'none',
                border: '1px solid rgba(254, 254, 254, 0.3)',
                padding: '6px 16px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading && (
            <div style={{ padding: '48px 0', textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-gray)',
                }}
              >
                Loading period data...
              </p>
            </div>
          )}

          {error && (
            <div
              style={{
                marginBottom: '24px',
                padding: '12px 16px',
                background: 'var(--color-section-bg)',
                borderLeft: '4px solid var(--color-accent)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-accent)',
              }}
            >
              Error: {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Statistics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1px',
                  background: 'var(--color-border)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '24px',
                }}
              >
                <div style={{ background: 'var(--color-bg)', padding: '16px' }}>
                  <p className="fsg-label-sm" style={{ marginBottom: '4px' }}>Total Works</p>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '28px',
                      fontWeight: 500,
                      color: 'var(--color-accent)',
                    }}
                  >
                    {data.statistics.workCount}
                  </p>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: '16px' }}>
                  <p className="fsg-label-sm" style={{ marginBottom: '4px' }}>Historical Figures</p>
                  <p
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '28px',
                      fontWeight: 500,
                      color: 'var(--color-text)',
                    }}
                  >
                    {data.statistics.figureCount}
                  </p>
                </div>
              </div>

              {/* Media Type Breakdown */}
              {Object.keys(data.statistics.mediaTypeBreakdown).length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                    <span>Media Type Distribution</span>
                  </div>
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderTop: 'none',
                    }}
                  >
                    {Object.entries(data.statistics.mediaTypeBreakdown).map(([type, count]) => (
                      <div
                        key={type}
                        className="fsg-meta-row"
                        style={{
                          padding: '10px 16px',
                          borderBottom: '1px dotted var(--color-border)',
                        }}
                      >
                        <span style={{ textTransform: 'uppercase' }}>{type}</span>
                        <span style={{ color: 'var(--color-accent)' }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Creators */}
              {data.statistics.topCreators.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                    <span>Top Creators in Period</span>
                  </div>
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderTop: 'none',
                    }}
                  >
                    {data.statistics.topCreators.map((creator) => (
                      <div
                        key={creator.name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 16px',
                          borderBottom: '1px dotted var(--color-border)',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '14px',
                            color: 'var(--color-text)',
                          }}
                        >
                          {creator.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-gray)',
                          }}
                        >
                          {creator.workCount} work{creator.workCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Works List */}
              <div style={{ marginBottom: '24px' }}>
                <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                  <span>Works from this Period ({data.works.length})</span>
                </div>
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderTop: 'none',
                    maxHeight: '384px',
                    overflowY: 'auto',
                  }}
                >
                  {data.works.map((work) => (
                    <Link
                      key={work.media_id}
                      href={`/media/${work.media_id}`}
                      className="hover:opacity-70 transition-opacity"
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--color-border)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '15px',
                          fontStyle: 'italic',
                          color: 'var(--color-text)',
                          marginBottom: '4px',
                        }}
                      >
                        {work.title}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: 'var(--color-gray)',
                        }}
                      >
                        {work.release_year} &middot; {work.media_type}
                        {work.creator && ` &middot; ${work.creator}`}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Figures List */}
              {data.figures.length > 0 && (
                <div>
                  <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                    <span>Historical Figures ({data.figures.length})</span>
                  </div>
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderTop: 'none',
                      maxHeight: '384px',
                      overflowY: 'auto',
                    }}
                  >
                    {data.figures.map((figure) => (
                      <Link
                        key={figure.canonical_id}
                        href={`/figure/${figure.canonical_id}`}
                        className="hover:opacity-70 transition-opacity"
                        style={{
                          display: 'block',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--color-border)',
                          textDecoration: 'none',
                          color: 'var(--color-text)',
                        }}
                      >
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            color: 'var(--color-text)',
                          }}
                        >
                          {figure.name}
                        </p>
                        {figure.era && (
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--color-gray)',
                              marginTop: '2px',
                            }}
                          >
                            {figure.era}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
