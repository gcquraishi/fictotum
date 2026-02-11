import Link from 'next/link';
import Image from 'next/image';
import {
  getMediaTypeColor,
  getMediaTypeIcon,
  getPlaceholderStyle,
  formatMediaType,
} from '@/lib/card-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface WorkCardProps {
  mediaId: string;
  title: string;
  releaseYear?: number | null;
  mediaType?: string;
  creator?: string;
  imageUrl?: string | null;
  wikidataId?: string;
  variant?: 'standard' | 'compact';
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function WorkCard({
  mediaId,
  title,
  releaseYear,
  mediaType,
  creator,
  imageUrl,
  wikidataId,
  variant = 'standard',
}: WorkCardProps) {
  const accentColor = getMediaTypeColor(mediaType);
  const MediaIcon = getMediaTypeIcon(mediaType);
  const placeholder = getPlaceholderStyle('work', title, mediaType);
  // No work detail page yet -- link to graph explorer focused on this entity
  const href = `/explore/graph?focus=${encodeURIComponent(mediaId)}`;

  if (variant === 'compact') {
    return (
      <Link
        href={href}
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
            borderBottom: `3px solid ${accentColor}`,
          }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
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
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <MediaIcon size={24} color={placeholder.textColor} style={{ opacity: 0.5 }} />
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '28px',
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

        {/* Label */}
        <div style={{ padding: '8px 0' }}>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className="group-hover:opacity-70 transition-opacity"
          >
            {title}
          </p>
          {releaseYear && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: accentColor,
                marginTop: '2px',
              }}
            >
              {releaseYear}
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
      href={href}
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
          borderBottom: `3px solid ${accentColor}`,
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
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
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <MediaIcon size={32} color={placeholder.textColor} style={{ opacity: 0.4 }} />
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '48px',
                fontWeight: 300,
                color: placeholder.textColor,
                opacity: 0.4,
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
            fontStyle: 'italic',
            lineHeight: 1.3,
            marginBottom: '4px',
          }}
        >
          {title}
        </h3>

        {releaseYear && (
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              color: accentColor,
              marginBottom: '8px',
            }}
          >
            {releaseYear}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-gray)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <MediaIcon size={12} />
            {formatMediaType(mediaType)}
          </span>

          {creator && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-gray)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '120px',
              }}
            >
              {creator}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
