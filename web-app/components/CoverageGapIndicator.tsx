'use client';

interface CoverageGapIndicatorProps {
  coverageGaps: string[];
  onGapClick?: (period: string) => void;
}

export default function CoverageGapIndicator({
  coverageGaps,
  onGapClick,
}: CoverageGapIndicatorProps) {
  if (coverageGaps.length === 0) {
    return (
      <div
        style={{
          border: '1px solid var(--color-border)',
          borderTop: 'none',
          padding: '24px',
          background: 'var(--color-hero-bg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              color: 'var(--color-text)',
            }}
          >
            &#10003;
          </span>
          <div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-text)',
                marginBottom: '4px',
              }}
            >
              Complete Coverage
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
              All time periods have adequate representation (5+ works each)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderTop: 'none',
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-accent)',
              marginBottom: '4px',
            }}
          >
            Under-Represented Periods
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
            {coverageGaps.length} time period{coverageGaps.length !== 1 ? 's' : ''} with sparse coverage (&lt;5 works)
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
        {coverageGaps.map((period) => (
          <button
            key={period}
            onClick={() => onGapClick?.(period)}
            className="hover:opacity-70 transition-opacity"
            style={{
              border: '1px solid var(--color-accent)',
              background: 'white',
              padding: '12px',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-accent)',
                marginBottom: '4px',
              }}
            >
              {period}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-gray)',
              }}
            >
              Explore
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px dotted var(--color-border)',
        }}
      >
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)', lineHeight: '1.5' }}>
          These periods need more historical works to improve database coverage. Click a period to explore existing content or contribute new entries.
        </p>
      </div>
    </div>
  );
}
