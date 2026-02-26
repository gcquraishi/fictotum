'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
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
  const searchParams = useSearchParams();
  const [selectedId] = useState<string | null>(searchParams.get('id'));

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ padding: '32px 32px 32px' }}>
        {selectedId ? (
          <GraphExplorer canonicalId={selectedId} />
        ) : (
          <div
            style={{
              padding: '64px 24px',
              textAlign: 'center',
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
      </div>
    </div>
  );
}
