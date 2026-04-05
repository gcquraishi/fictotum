'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import FigureSearchInput from '@/components/FigureSearchInput';

interface PathNode {
  node_id: string;
  node_type: string;
  name: string;
}

interface PathLink {
  from_node: string;
  to_node: string;
  rel_type: string;
  context: string;
}

interface HistoriographicPath {
  start_node: string;
  end_node: string;
  path_length: number;
  nodes: PathNode[];
  relationships: PathLink[];
}

export default function PathfinderPage() {
  const [startId, setStartId] = useState('');
  const [startName, setStartName] = useState('');
  const [endId, setEndId] = useState('');
  const [endName, setEndName] = useState('');
  const [path, setPath] = useState<HistoriographicPath | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSearchPath = () => {
    if (!startId.trim() || !endId.trim()) {
      setError('Please select both start and end figures');
      return;
    }

    if (startId === endId) {
      setError('Start and end figures must be different');
      return;
    }

    setError(null);
    setPath(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/pathfinder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startId,
            endId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to find path');
        }

        if (!data.path) {
          setError('No connection found between these figures');
          return;
        }

        setPath(data.path);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to find path');
      }
    });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 40px' }}>
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
            Six Degrees of Separation
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
            Find the shortest path connecting two historical figures through their media portrayals
          </p>
        </div>

        {/* Search Form */}
        <div
          style={{
            border: '1px solid var(--color-border)',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* Start Figure */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-gray)',
                  marginBottom: '8px',
                }}
              >
                Start Figure
              </label>
              <FigureSearchInput
                onSelect={(id, name) => {
                  setStartId(id);
                  setStartName(name);
                  setPath(null);
                }}
                placeholder="Search first figure..."
              />
              {startName && (
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-accent)',
                    marginTop: '8px',
                  }}
                >
                  Selected: {startName}
                </p>
              )}
            </div>

            {/* End Figure */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  color: 'var(--color-gray)',
                  marginBottom: '8px',
                }}
              >
                End Figure
              </label>
              <FigureSearchInput
                onSelect={(id, name) => {
                  setEndId(id);
                  setEndName(name);
                  setPath(null);
                }}
                placeholder="Search second figure..."
              />
              {endName && (
                <p
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-accent)',
                    marginTop: '8px',
                  }}
                >
                  Selected: {endName}
                </p>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 16px',
                background: 'var(--color-section-bg)',
                borderLeft: '4px solid var(--color-accent)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-accent)',
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleSearchPath}
            disabled={isPending || !startId || !endId}
            className="hover:opacity-80 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              width: '100%',
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              padding: '14px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {isPending ? 'Finding Path...' : 'Find Connection'}
          </button>
        </div>

        {/* Results */}
        {path && (
          <div
            style={{
              border: '1px solid var(--color-border)',
              padding: '24px',
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: 'var(--color-text)',
                }}
              >
                Connection Found
              </h2>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  color: 'var(--color-accent)',
                }}
              >
                {path.path_length} {path.path_length === 1 ? 'degree' : 'degrees'} of separation
              </span>
            </div>

            <div>
              {path.nodes.map((node, idx) => (
                <div key={node.node_id}>
                  {/* Node */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      background: node.node_type === 'HistoricalFigure' ? 'var(--color-hero-bg)' : 'white',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '18px',
                        fontWeight: 400,
                        color: 'var(--color-text)',
                      }}
                    >
                      {node.name}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: 'var(--color-gray)',
                      }}
                    >
                      {node.node_type === 'HistoricalFigure' ? 'Figure' : 'Media'}
                    </span>
                  </div>

                  {/* Relationship connector */}
                  {idx < path.relationships.length && (
                    <div
                      style={{
                        marginLeft: '24px',
                        padding: '8px 16px',
                        borderLeft: '2px solid var(--color-border)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {path.relationships[idx].rel_type}
                      </span>
                      {path.relationships[idx].context && (
                        <div
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '14px',
                            fontStyle: 'italic',
                            color: 'var(--color-gray)',
                            marginTop: '4px',
                          }}
                        >
                          {path.relationships[idx].context}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* View Details Links */}
            <div
              style={{
                marginTop: '32px',
                paddingTop: '24px',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <p className="fsg-label" style={{ marginBottom: '12px' }}>
                View Details
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {path.nodes
                  .filter(n => n.node_type === 'HistoricalFigure')
                  .map(figure => (
                    <Link
                      key={figure.node_id}
                      href={`/figure/${figure.node_id}`}
                      className="hover:opacity-70 transition-opacity"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: 'var(--color-accent)',
                        textDecoration: 'none',
                        border: '1px solid var(--color-accent)',
                        padding: '8px 16px',
                      }}
                    >
                      {figure.name}
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Info Note */}
        {!path && (
          <div
            style={{
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
              <strong>How it works:</strong> Select two historical figures, and the pathfinder will find
              the shortest chain of connections through shared media portrayals. For example: Lincoln appeared
              in film A, actress B played in film A and film C where she portrayed Cleopatra.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
