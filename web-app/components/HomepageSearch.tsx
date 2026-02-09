'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  canonical_id: string;
  name: string;
  era?: string;
}

export default function HomepageSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/figures/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.figures || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: '480px' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search historical figures..."
        style={{
          width: '100%',
          fontFamily: 'var(--font-serif)',
          fontSize: '16px',
          padding: '12px 16px',
          border: '1px solid var(--color-border)',
          background: 'white',
          color: 'var(--color-text)',
          outline: 'none',
        }}
        onFocusCapture={(e) => {
          (e.target as HTMLInputElement).style.borderColor = 'var(--color-border-bold)';
        }}
        onBlurCapture={(e) => {
          (e.target as HTMLInputElement).style.borderColor = 'var(--color-border)';
        }}
      />

      {open && (results.length > 0 || loading) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '2px',
            background: 'white',
            border: '1px solid var(--color-border-bold)',
            zIndex: 20,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {loading ? (
            <div
              style={{
                padding: '12px 16px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-gray)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textAlign: 'center',
              }}
            >
              Searching...
            </div>
          ) : (
            results.map((figure) => (
              <button
                key={figure.canonical_id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/figure/${figure.canonical_id}`);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                }}
                className="hover:bg-[var(--color-section-bg)] transition-colors"
              >
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '16px',
                    color: 'var(--color-text)',
                  }}
                >
                  {figure.name}
                </span>
                {figure.era && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-gray)',
                      marginLeft: '12px',
                    }}
                  >
                    {figure.era}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
