'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import {
  getMediaTypeColor,
  getMediaTypeIcon,
  getSentimentColor,
  getPlaceholderStyle,
  formatMediaType,
} from '@/lib/card-utils';

// =============================================================================
// TYPES
// =============================================================================

export interface PortrayalCardProps {
  media: {
    mediaId?: string;
    title: string;
    releaseYear?: number | null;
    mediaType?: string;
    creator?: string;
    imageUrl?: string | null;
    wikidataId?: string;
  };
  actorName?: string;
  characterName?: string;
  sentiment?: string;
  sentimentTags?: string[];
  roleDescription?: string;
  isProtagonist?: boolean;
  portrayalType?: string;
  conflictFlag?: boolean;
  conflictNotes?: string;
  anachronismFlag?: boolean;
  anachronismNotes?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function PortrayalCard({
  media,
  actorName,
  characterName,
  sentiment,
  sentimentTags,
  roleDescription,
  isProtagonist,
  conflictFlag,
  conflictNotes,
  anachronismFlag,
  anachronismNotes,
}: PortrayalCardProps) {
  const accentColor = getMediaTypeColor(media.mediaType);
  const MediaIcon = getMediaTypeIcon(media.mediaType);
  const placeholder = getPlaceholderStyle('work', media.title, media.mediaType);

  // Determine display sentiment: prefer first sentiment tag, fall back to legacy
  const displaySentiment = sentimentTags?.[0] || sentiment || 'Complex';
  const sentimentColor = getSentimentColor(displaySentiment);

  // Capitalize first letter for display
  const sentimentLabel = displaySentiment.charAt(0).toUpperCase() + displaySentiment.slice(1);

  return (
    <div
      style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
      }}
      className="hover:opacity-90 transition-opacity"
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '80px',
          height: '107px',
          flexShrink: 0,
          overflow: 'hidden',
          borderBottom: `2px solid ${accentColor}`,
        }}
      >
        {media.imageUrl ? (
          <img
            src={media.imageUrl}
            alt={media.title}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
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
              gap: '4px',
            }}
          >
            <MediaIcon size={16} color={placeholder.textColor} style={{ opacity: 0.5 }} />
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '18px',
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
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title + Year + Type + Creator */}
        <h4
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '18px',
            fontWeight: 400,
            fontStyle: 'italic',
            lineHeight: 1.3,
            marginBottom: '4px',
          }}
        >
          {media.title}
        </h4>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          {media.releaseYear && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-accent)' }}>
              {media.releaseYear}
            </span>
          )}
          <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>&middot;</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-gray)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
            }}
          >
            <MediaIcon size={10} />
            {formatMediaType(media.mediaType)}
          </span>
          {media.creator && (
            <>
              <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>&middot;</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
                {media.creator}
              </span>
            </>
          )}
        </div>

        {/* Actor / Character */}
        {(actorName || characterName) && (
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '14px',
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            {characterName && actorName
              ? <>as &ldquo;{characterName}&rdquo; by {actorName}</>
              : actorName
                ? <>portrayed by {actorName}</>
                : <>as &ldquo;{characterName}&rdquo;</>
            }
          </p>
        )}

        {/* Role Description */}
        {roleDescription && (
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '13px',
              color: 'var(--color-gray)',
              lineHeight: 1.5,
              marginBottom: '8px',
            }}
          >
            {roleDescription}
          </p>
        )}

        {/* Badges Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {/* Sentiment Badge */}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '3px 8px',
              border: `1px solid ${sentimentColor}`,
              color: sentimentColor,
              background: `${sentimentColor}10`,
            }}
          >
            {sentimentLabel}
          </span>

          {/* Protagonist Badge */}
          {isProtagonist && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '3px 8px',
                border: '1px solid var(--color-text)',
                color: 'var(--color-text)',
              }}
            >
              Protagonist
            </span>
          )}

          {/* Wikidata Link */}
          {media.wikidataId && (
            <a
              href={`https://www.wikidata.org/wiki/${media.wikidataId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--color-gray)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                marginLeft: 'auto',
              }}
              className="hover:opacity-70 transition-opacity"
            >
              <ExternalLink size={10} />
              {media.wikidataId}
            </a>
          )}
        </div>

        {/* Flags */}
        {anachronismFlag && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px',
              marginTop: '10px',
              borderLeft: '3px solid #ea580c',
              background: 'rgba(234, 88, 12, 0.05)',
            }}
          >
            <AlertTriangle size={14} color="#ea580c" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: '#ea580c' }}>
                Anachronism
              </span>
              {anachronismNotes && (
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: 'var(--color-gray)', marginTop: '2px' }}>
                  {anachronismNotes}
                </p>
              )}
            </div>
          </div>
        )}

        {conflictFlag && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              padding: '10px',
              marginTop: anachronismFlag ? '6px' : '10px',
              borderLeft: '3px solid var(--color-accent)',
              background: 'rgba(139, 38, 53, 0.05)',
            }}
          >
            <AlertTriangle size={14} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-accent)' }}>
                Characterization Conflict
              </span>
              {conflictNotes && (
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: 'var(--color-gray)', marginTop: '2px' }}>
                  {conflictNotes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
