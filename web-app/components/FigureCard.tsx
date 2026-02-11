import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import {
  formatLifespan,
  getFigureTypeColor,
  getPlaceholderStyle,
} from '@/lib/card-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface FigureCardProps {
  canonicalId: string;
  name: string;
  birthYear?: number | null;
  deathYear?: number | null;
  era?: string;
  imageUrl?: string | null;
  portrayalCount?: number;
  portrayalLabel?: string;
  historicityStatus?: 'Historical' | 'Fictional' | 'Disputed';
  variant?: 'standard' | 'compact';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function FigureCard({
  canonicalId,
  name,
  birthYear,
  deathYear,
  era,
  imageUrl,
  portrayalCount,
  portrayalLabel,
  historicityStatus = 'Historical',
  variant = 'standard',
}: FigureCardProps) {
  const lifespan = formatLifespan(birthYear, deathYear);
  const placeholder = getPlaceholderStyle('figure', name, historicityStatus);
  const borderColor = getFigureTypeColor(historicityStatus);

  if (variant === 'compact') {
    return (
      <Link
        href={`/figure/${canonicalId}`}
        style={{
          display: 'block',
          textDecoration: 'none',
          color: 'var(--color-text)',
          width: '140px',
          flexShrink: 0,
        }}
        className="group"
      >
        {/* Image */}
        <div
          style={{
            width: '140px',
            height: '187px',
            overflow: 'hidden',
            position: 'relative',
            borderBottom: `3px solid ${borderColor}`,
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="140px"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: placeholder.backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '36px',
                  fontWeight: 300,
                  color: placeholder.textColor,
                  opacity: 0.6,
                }}
              >
                {placeholder.initials}
              </span>
            </div>
          )}
        </div>

        {/* Label */}
        <div style={{ padding: '8px 0' }}>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              fontWeight: 400,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className="group-hover:opacity-70 transition-opacity"
          >
            {name}
          </p>
          {lifespan && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-gray)',
                marginTop: '2px',
              }}
            >
              {lifespan}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // ============================================================================
  // STANDARD VARIANT
  // ============================================================================

  return (
    <Link
      href={`/figure/${canonicalId}`}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        overflow: 'hidden',
      }}
      className="group hover:opacity-90 transition-opacity"
    >
      {/* Image */}
      <div
        style={{
          width: '100%',
          height: '256px',
          overflow: 'hidden',
          position: 'relative',
          borderBottom: `3px solid ${borderColor}`,
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: placeholder.backgroundColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '56px',
                fontWeight: 300,
                color: placeholder.textColor,
                opacity: 0.5,
              }}
            >
              {placeholder.initials}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            fontWeight: 300,
            lineHeight: 1.3,
            marginBottom: '4px',
          }}
        >
          {name}
        </h3>

        {lifespan && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--color-gray)',
              marginBottom: '8px',
            }}
          >
            {lifespan}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {era && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-accent)',
              }}
            >
              {era}
            </span>
          )}

          {portrayalCount !== undefined && portrayalCount > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-gray)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Clock size={10} />
              {portrayalLabel || `${portrayalCount} portrayal${portrayalCount !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
