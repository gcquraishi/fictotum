'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import SearchInput from '@/components/SearchInput';
import GraphExplorer from '@/components/GraphExplorer';

export default function GraphPage() {
  return (
    <Suspense fallback={<GraphLoading />}>
      <GraphContent />
    </Suspense>
  );
}

function GraphLoading() {
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
          Loading graph...
        </div>
      </div>
    </div>
  );
}

function GraphContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));

  const handleSearch = (id: string, type: 'figure' | 'media') => {
    setSelectedId(id);
    router.push(`/explore/graph?id=${id}&type=${type}`, { scroll: false });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 40px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '42px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            Graph
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)',
            }}
          >
            Visualize connections between historical figures and media works
          </p>
        </div>

        {/* Search Section */}
        <div
          style={{
            marginBottom: '40px',
            border: '1px solid var(--color-border)',
            padding: '24px',
          }}
        >
          <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
            <span>Search</span>
          </div>
          <SearchInput />
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-gray)',
              marginTop: '12px',
            }}
          >
            Select any figure or media work from results to view its network graph
          </p>
        </div>

        {/* Graph Viewer */}
        {selectedId ? (
          <div
            style={{
              border: '1px solid var(--color-border)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="fsg-section-header" style={{ flex: 1 }}>
                <span>Graph View</span>
              </div>
              <button
                onClick={() => {
                  setSelectedId(null);
                  router.push('/explore/graph', { scroll: false });
                }}
                className="hover:opacity-70 transition-opacity"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: 'var(--color-gray)',
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  padding: '6px 16px',
                  cursor: 'pointer',
                  marginLeft: '16px',
                }}
              >
                Clear
              </button>
            </div>
            <GraphExplorer canonicalId={selectedId} />
          </div>
        ) : (
          <div
            style={{
              border: '1px solid var(--color-border)',
              padding: '64px 24px',
              textAlign: 'center',
              background: 'var(--color-hero-bg)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '20px',
                fontWeight: 300,
                color: 'var(--color-gray)',
                marginBottom: '8px',
              }}
            >
              Search for a figure or media work to see their network
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-gray)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Visualize how historical figures and media are connected through portrayals
            </p>
          </div>
        )}

        {/* Info Note */}
        <div
          style={{
            marginTop: '32px',
            padding: '16px',
            background: 'var(--color-section-bg)',
            borderLeft: '4px solid var(--color-border-bold)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-text)',
              lineHeight: '1.6',
            }}
          >
            <strong>Legend:</strong> A force-directed graph showing how the selected entity connects to
            others. Blue nodes are figures, colored nodes are media works (green = heroic, red = villainous,
            yellow = complex).
          </p>
        </div>
      </div>
    </div>
  );
}
