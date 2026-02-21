'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Timeline from '@/components/Timeline';
import { TimelineData } from '@/lib/types';

export default function TimelinePage() {
  return (
    <Suspense fallback={<TimelineLoading />}>
      <TimelineContent />
    </Suspense>
  );
}

function TimelineLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)',
          }}
        >
          Loading timeline...
        </div>
      </div>
    </div>
  );
}

function TimelineContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eraFilter, setEraFilter] = useState<string>(searchParams.get('era') || '');

  // FIC-131: Push era filter to URL so browser back button works
  const handleEraChange = useCallback((era: string) => {
    setEraFilter(era);
    const url = era ? `/explore/timeline?era=${encodeURIComponent(era)}` : '/explore/timeline';
    router.push(url);
  }, [router]);

  // Sync filter state from URL when navigating back/forward
  useEffect(() => {
    const urlEra = searchParams.get('era') || '';
    if (urlEra !== eraFilter) {
      setEraFilter(urlEra);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally omits eraFilter to avoid sync loop

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (eraFilter) params.set('era', eraFilter);

        const res = await fetch(`/api/timeline?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch timeline data');

        const result: TimelineData = await res.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [eraFilter]);

  // Collect unique eras for filter
  const eras = data
    ? [...new Set(data.figures.map(f => f.era).filter(Boolean) as string[])].sort()
    : [];

  return (
    <div
      style={{
        padding: '40px',
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '28px',
            fontWeight: 400,
            marginBottom: '8px',
          }}
        >
          Timeline
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Explore historical figures across time
        </p>
      </div>

      {/* Era filter */}
      {eras.length > 0 && (
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleEraChange('')}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              padding: '4px 12px',
              border: '1px solid var(--color-border)',
              background: !eraFilter ? 'var(--color-text)' : 'white',
              color: !eraFilter ? 'white' : 'var(--color-text)',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            All Eras
          </button>
          {eras.map(era => (
            <button
              key={era}
              onClick={() => handleEraChange(era)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '4px 12px',
                border: '1px solid var(--color-border)',
                background: eraFilter === era ? 'var(--color-text)' : 'white',
                color: eraFilter === era ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {era}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && <TimelineLoading />}

      {error && (
        <div
          style={{
            padding: '24px',
            border: '1px solid #EF4444',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#EF4444',
          }}
        >
          Error: {error}
        </div>
      )}

      {data && !loading && data.figures.length === 0 && (
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: 'var(--color-gray)',
          }}
        >
          No figures with birth/death year data found
          {eraFilter && ` for era "${eraFilter}"`}.
        </div>
      )}

      {data && !loading && data.figures.length > 0 && (
        <Timeline
          figures={data.figures}
          events={data.events}
          stats={data.stats}
        />
      )}
    </div>
  );
}
