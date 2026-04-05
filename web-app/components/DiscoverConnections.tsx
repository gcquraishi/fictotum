'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DiscoveredConnection {
  targetId: string;
  targetName: string;
  targetEra?: string;
  score: number;
  hopDistance: number;
  sharedMedia: string[];
  pathSummary: string;
  narration: string | null;
}

interface DiscoveryResult {
  source: { name: string; canonicalId: string };
  connections: DiscoveredConnection[];
  narrated: boolean;
  message?: string;
}

export default function DiscoverConnections({ figureId }: { figureId: string }) {
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiscover = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/figure/${encodeURIComponent(figureId)}/discover`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: DiscoveryResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover connections');
    } finally {
      setLoading(false);
    }
  };

  // Not yet triggered
  if (!result && !loading && !error) {
    return (
      <div>
        <div className="fsg-section-header" style={{ marginBottom: '12px' }}>
          <span>Discover Connections</span>
        </div>
        <button
          onClick={handleDiscover}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '8px 16px',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-accent)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
            <path d="M11 8v6M8 11h6"/>
          </svg>
          Find Hidden Connections
        </button>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '13px',
            fontStyle: 'italic',
            color: 'var(--color-gray)',
            marginTop: '8px',
          }}
        >
          AI-powered discovery of non-obvious connections through the knowledge graph
        </p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div>
        <div className="fsg-section-header" style={{ marginBottom: '12px' }}>
          <span>Discover Connections</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-gray)',
            padding: '20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              border: '2px solid var(--color-border)',
              borderTopColor: 'var(--color-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          Analyzing graph connections...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div>
        <div className="fsg-section-header" style={{ marginBottom: '12px' }}>
          <span>Discover Connections</span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#EF4444',
            padding: '12px 0',
          }}
        >
          {error}
        </p>
        <button
          onClick={handleDiscover}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            padding: '6px 12px',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-gray)',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Results
  if (!result || result.connections.length === 0) {
    return (
      <div>
        <div className="fsg-section-header" style={{ marginBottom: '12px' }}>
          <span>Discover Connections</span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '14px',
            fontStyle: 'italic',
            color: 'var(--color-gray)',
            padding: '12px 0',
          }}
        >
          No hidden connections found in the graph for this figure.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
        <span>Discovered Connections</span>
        <span>({result.connections.length})</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {result.connections.map((conn) => (
          <div
            key={conn.targetId}
            style={{
              borderLeft: '3px solid var(--color-accent)',
              paddingLeft: '16px',
              paddingTop: '4px',
              paddingBottom: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '4px',
              }}
            >
              <Link
                href={`/figure/${encodeURIComponent(conn.targetId)}`}
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '18px',
                  fontWeight: 400,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                }}
                className="hover:opacity-70 transition-opacity"
              >
                {conn.targetName}
              </Link>
              {conn.targetEra && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: 'var(--color-gray)',
                  }}
                >
                  {conn.targetEra}
                </span>
              )}
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--color-accent)',
                  marginLeft: 'auto',
                  flexShrink: 0,
                }}
                title={`Relevance score: ${conn.score}/100`}
              >
                {conn.hopDistance === 1 ? 'Direct' : `${conn.hopDistance} hops`}
              </span>
            </div>

            {/* Narration or path summary */}
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'var(--color-text)',
                margin: '4px 0 8px',
              }}
            >
              {conn.narration || conn.pathSummary}
            </p>

            {/* Shared media chips */}
            {conn.sharedMedia.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {conn.sharedMedia.slice(0, 4).map((title) => (
                  <span
                    key={title}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      padding: '2px 8px',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-gray)',
                    }}
                  >
                    {title}
                  </span>
                ))}
                {conn.sharedMedia.length > 4 && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      padding: '2px 8px',
                      color: 'var(--color-gray)',
                    }}
                  >
                    +{conn.sharedMedia.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!result.narrated && (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            marginTop: '16px',
            fontStyle: 'italic',
          }}
        >
          Showing graph-scored connections. AI narration available when configured.
        </p>
      )}
    </div>
  );
}
