export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { getFigureById } from '@/lib/db';
import { formatLifespan, formatMediaType, getPlaceholderStyle, getFigureTypeColor, isValidImageUrl } from '@/lib/card-utils';
import PortrayalFilters from '@/components/PortrayalFilters';
import ConnectedFigures from '@/components/ConnectedFigures';

export default async function FigurePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const figure = await getFigureById(id);

  if (!figure) {
    notFound();
  }

  // Compute stats
  const totalPortrayals = figure.portrayals.length;
  const mediaTypeCounts: Record<string, number> = {};
  figure.portrayals.forEach((p) => {
    const type = p.media.media_type || 'Unknown';
    mediaTypeCounts[type] = (mediaTypeCounts[type] || 0) + 1;
  });

  const lifespan = formatLifespan(figure.birth_year, figure.death_year);
  const placeholder = getPlaceholderStyle('figure', figure.name, figure.historicity_status);
  const borderColor = getFigureTypeColor(figure.historicity_status);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Breadcrumb Header */}
      <div
        style={{
          padding: '20px 40px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '14px',
            textTransform: 'uppercase',
            textDecoration: 'none',
            color: 'var(--color-text)',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          Fictotum Archive
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
          }}
        >
          Index / Historical Figures / {figure.canonical_id}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* ================================================================
            HERO SECTION
            ================================================================ */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginBottom: '40px',
          }}
        >
          {/* Portrait */}
          <div
            style={{
              width: '180px',
              height: '240px',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
              borderBottom: `3px solid ${borderColor}`,
            }}
          >
            {isValidImageUrl(figure.image_url) ? (
              <Image
                src={figure.image_url!}
                alt={figure.name}
                fill
                priority
                sizes="180px"
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

          {/* Name + Meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '48px',
                fontWeight: 300,
                lineHeight: 1.1,
                marginBottom: '8px',
              }}
            >
              {figure.name}
            </h1>

            {figure.title && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '18px',
                  fontStyle: 'italic',
                  color: 'var(--color-gray)',
                  marginBottom: '8px',
                }}
              >
                {figure.title}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              {lifespan && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--color-accent)',
                  }}
                >
                  {lifespan}
                </span>
              )}
              {figure.era && (
                <>
                  {lifespan && (
                    <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>&middot;</span>
                  )}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      color: 'var(--color-gray)',
                    }}
                  >
                    {figure.era}
                  </span>
                </>
              )}
              {figure.historicity_status && figure.historicity_status !== 'Historical' && (
                <>
                  <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>&middot;</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      padding: '2px 6px',
                      border: `1px solid ${borderColor}`,
                      color: borderColor,
                    }}
                  >
                    {figure.historicity_status}
                  </span>
                </>
              )}
            </div>

            {figure.description && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: 'var(--color-text)',
                }}
              >
                {figure.description}
              </p>
            )}

            {!figure.description && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                  lineHeight: 1.7,
                  color: 'var(--color-text)',
                }}
              >
                {figure.name} is documented in the Fictotum archive with{' '}
                {totalPortrayals} recorded media portrayal{totalPortrayals !== 1 ? 's' : ''}.
                {figure.era && ` Active during the ${figure.era}.`}
              </p>
            )}
          </div>
        </div>

        {/* View in Graph link */}
        <div style={{ marginBottom: '16px' }}>
          <Link
            href={`/explore/graph?id=${encodeURIComponent(figure.canonical_id)}`}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              textDecoration: 'none',
              color: 'var(--color-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: '1px solid var(--color-border)',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/>
              <line x1="12" y1="8" x2="5" y2="16"/><line x1="12" y1="8" x2="19" y2="16"/>
            </svg>
            View in Graph
          </Link>
        </div>

        {/* ================================================================
            STATS BAR
            ================================================================ */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0',
            borderTop: '1px solid var(--color-border)',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              padding: '12px 20px',
              borderRight: '1px solid var(--color-border)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
            }}
          >
            <span style={{ color: 'var(--color-gray)' }}>Total </span>
            <span style={{ fontWeight: 600 }}>{totalPortrayals}</span>
          </div>
          {Object.entries(mediaTypeCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <div
                key={type}
                style={{
                  padding: '12px 20px',
                  borderRight: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: 'var(--color-gray)' }}>{formatMediaType(type)} </span>
                <span>{count}</span>
              </div>
            ))}
        </div>

        {/* ================================================================
            DOCUMENTED APPEARANCES
            ================================================================ */}
        <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
          <span>Documented Appearances</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>({totalPortrayals} Records)</span>
            <Link
              href={`/contribute/portrayal?figure=${encodeURIComponent(figure.canonical_id)}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: 'var(--color-accent)',
                textDecoration: 'none',
              }}
              className="hover:opacity-70 transition-opacity"
            >
              + Add Portrayal
            </Link>
          </div>
        </div>

        <PortrayalFilters portrayals={figure.portrayals} />

        {/* ================================================================
            CONNECTED FIGURES
            ================================================================ */}
        <div style={{ marginTop: '48px' }}>
          <ConnectedFigures figureId={figure.canonical_id} />
        </div>

        {/* ================================================================
            EXTERNAL LINKS
            ================================================================ */}
        {figure.wikidata_id && (
          <div style={{ marginTop: '48px' }}>
            <div className="fsg-section-header">
              <span>External References</span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              <a
                href={`https://www.wikidata.org/wiki/${figure.wikidata_id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  border: '1px solid var(--color-border)',
                }}
                className="hover:opacity-70 transition-opacity"
              >
                <ExternalLink size={12} />
                Wikidata {figure.wikidata_id}
              </a>
            </div>
          </div>
        )}

        {/* ================================================================
            PROVENANCE FOOTER
            ================================================================ */}
        <div
          style={{
            marginTop: '64px',
            paddingTop: '16px',
            borderTop: '1px solid var(--color-border)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>canonical_id: {figure.canonical_id}</span>
          <span>Fictotum Archive</span>
        </div>
      </div>
    </div>
  );
}
