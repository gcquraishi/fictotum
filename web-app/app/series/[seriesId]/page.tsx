export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getSeriesMetadata } from '@/lib/db';
import {
  getMediaTypeColor,
  getMediaTypeIcon,
  getPlaceholderStyle,
  isValidImageUrl,
  getFigureTypeColor,
} from '@/lib/card-utils';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}): Promise<Metadata> {
  const { seriesId } = await params;
  const data = await getSeriesMetadata(seriesId);
  if (!data) return { title: 'Series Not Found' };

  const { series, works, characters } = data;
  const creator = series.creator ? ` by ${series.creator}` : '';
  const description = `${series.title}${creator} — ${works.length} works featuring ${characters.total} historical figures in the Fictotum archive.`;

  const heroImage = series.image_url;
  const images = heroImage
    ? [{ url: heroImage, width: 400, height: 400, alt: series.title }]
    : [];

  return {
    title: series.title,
    description,
    openGraph: {
      title: `${series.title} — Fictotum`,
      description,
      images,
    },
    twitter: {
      card: heroImage ? 'summary_large_image' : 'summary',
      title: `${series.title} — Fictotum`,
      description,
      images: heroImage ? [heroImage] : [],
    },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const metadata = await getSeriesMetadata(seriesId);

  if (!metadata) {
    notFound();
  }

  const { series, works, characters, stats } = metadata;
  const accentColor = getMediaTypeColor(series.media_type);
  const SeriesIcon = getMediaTypeIcon(series.media_type);
  const placeholder = getPlaceholderStyle('work', series.title, series.media_type);
  const [yearStart, yearEnd] = stats.yearRange;

  // Sort works by sequence, then release year
  const sortedWorks = [...works].sort((a, b) => {
    if (a.season_number && b.season_number) {
      if (a.season_number !== b.season_number) return a.season_number - b.season_number;
      if (a.episode_number && b.episode_number) return a.episode_number - b.episode_number;
    }
    if (a.sequence_number && b.sequence_number) return a.sequence_number - b.sequence_number;
    return (a.release_year || 0) - (b.release_year || 0);
  });

  // Franchise timeline: works with valid release years, sorted chronologically
  const timelineWorks = sortedWorks.filter(w => w.release_year && w.release_year > 0);
  const timelineMinYear = timelineWorks.length > 0 ? Math.min(...timelineWorks.map(w => w.release_year)) : 0;
  const timelineMaxYear = timelineWorks.length > 0 ? Math.max(...timelineWorks.map(w => w.release_year)) : 0;
  const timelineSpan = timelineMaxYear - timelineMinYear || 1;

  // Portrayal highlights: top figures by fame (total_portrayal_count), take top 4
  const highlightFigures = [...characters.roster]
    .filter(c => (c.total_portrayal_count ?? 0) > 0 && c.image_url)
    .sort((a, b) => (b.total_portrayal_count ?? 0) - (a.total_portrayal_count ?? 0))
    .slice(0, 4);

  // Fallback: if no illustrated figures, use top-appearing figures
  const highlightFallback = highlightFigures.length < 2
    ? [...characters.roster].slice(0, 4)
    : highlightFigures;

  // Work illustration strip: works with images
  const illustratedWorks = sortedWorks.filter(w => isValidImageUrl(w.image_url));

  const hasHeroImage = isValidImageUrl(series.image_url);

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
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link
            href="/series"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-gray)',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            Series Archive
          </Link>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-gray)',
              textTransform: 'uppercase',
            }}
          >
            {series.wikidata_id || series.media_id}
          </span>
        </div>
      </div>

      {/* ================================================================
          FULL-WIDTH HERO — Illustrated banner with overlaid title
          ================================================================ */}
      <div
        style={{
          position: 'relative',
          background: placeholder.backgroundColor,
          borderBottom: `4px solid ${accentColor}`,
          overflow: 'hidden',
          minHeight: '320px',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        {/* Background image strip from works */}
        {illustratedWorks.length > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              gap: 0,
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            {illustratedWorks.slice(0, 6).map((work, i) => (
              <div
                key={work.media_id}
                style={{
                  flex: 1,
                  position: 'relative',
                  minWidth: 0,
                }}
              >
                <Image
                  src={work.image_url!}
                  alt={work.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  style={{ objectFit: 'cover', objectPosition: 'top' }}
                />
                {/* Gradient darkening per strip */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.65) 100%)`,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* No images: subtle texture overlay */}
        {illustratedWorks.length === 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(
                45deg,
                rgba(255,255,255,0.04) 0px,
                rgba(255,255,255,0.04) 1px,
                transparent 1px,
                transparent 12px
              )`,
            }}
            aria-hidden="true"
          />
        )}

        {/* Dark gradient for text legibility */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: illustratedWorks.length > 0
              ? 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.20) 60%, transparent 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.50) 0%, transparent 100%)',
          }}
          aria-hidden="true"
        />

        {/* Hero content */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '48px 40px 40px',
          }}
        >
          {/* Media type badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              border: `1px solid ${accentColor}`,
              marginBottom: '16px',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <SeriesIcon style={{ width: '12px', height: '12px', color: accentColor }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: accentColor,
              }}
            >
              {series.media_type}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 300,
              lineHeight: 1.1,
              color: '#FEFEFE',
              marginBottom: '8px',
              textShadow: '0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            {series.title}
          </h1>

          {/* Creator + year range row */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            {series.creator && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '18px',
                  color: 'rgba(255,255,255,0.80)',
                  fontStyle: 'italic',
                }}
              >
                by {series.creator}
              </p>
            )}
            {yearStart > 0 && (
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.60)',
                }}
              >
                {yearStart === yearEnd ? yearStart : `${yearStart}\u2009\u2013\u2009${yearEnd}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================
          STATS BAR — full width, cream background
          ================================================================ */}
      <div
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-section-bg)',
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
          }}
        >
          <div style={{ padding: '20px 32px', borderRight: '1px solid var(--color-border)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>
              Works
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 600, color: accentColor, lineHeight: 1 }}>
              {works.length}
            </p>
          </div>
          <div style={{ padding: '20px 32px', borderRight: '1px solid var(--color-border)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>
              Historical Figures
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1 }}>
              {characters.total}
            </p>
          </div>
          <div style={{ padding: '20px 32px', borderRight: '1px solid var(--color-border)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>
              Span
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: yearStart > 0 ? '18px' : '32px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1, marginTop: yearStart > 0 ? '6px' : '0' }}>
              {yearStart > 0
                ? yearStart === yearEnd ? `${yearStart}` : `${yearStart}\u2009\u2013\u2009${yearEnd}`
                : '\u2014'}
            </p>
          </div>
          <div style={{ padding: '20px 32px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>
              Co-appearances
            </p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '32px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1 }}>
              {stats.totalInteractions}
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================
          MAIN CONTENT — two-column on wide, single on mobile
          ================================================================ */}
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '48px 40px 80px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: '48px',
          alignItems: 'start',
        }}
      >
        {/* ---- LEFT COLUMN ---- */}
        <div>

          {/* ================================================================
              FRANCHISE TIMELINE
              ================================================================ */}
          {timelineWorks.length > 0 && (
            <section style={{ marginBottom: '48px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Franchise Timeline</span>
                {timelineWorks.length > 1 && (
                  <span style={{ color: 'var(--color-gray)', fontSize: '10px' }}>
                    {timelineMinYear} — {timelineMaxYear}
                  </span>
                )}
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  padding: '24px 24px 16px',
                  background: 'var(--color-bg)',
                  overflowX: 'auto',
                }}
              >
                {/* Timeline track */}
                <div
                  style={{
                    position: 'relative',
                    paddingTop: '8px',
                    paddingBottom: '32px',
                  }}
                >
                  {/* Spine */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: '22px',
                      height: '2px',
                      background: 'var(--color-border)',
                    }}
                    aria-hidden="true"
                  />

                  {/* Work nodes */}
                  <div
                    style={{
                      position: 'relative',
                      height: '80px',
                      minWidth: `${Math.max(400, timelineWorks.length * 80)}px`,
                    }}
                  >
                    {timelineWorks.map((work, i) => {
                      const pct = timelineSpan > 0
                        ? ((work.release_year - timelineMinYear) / timelineSpan) * 100
                        : (i / Math.max(timelineWorks.length - 1, 1)) * 100;
                      const clampedPct = Math.max(0, Math.min(98, pct));
                      const isAbove = i % 2 === 0;

                      return (
                        <div
                          key={work.media_id}
                          style={{
                            position: 'absolute',
                            left: `${clampedPct}%`,
                            top: 0,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {/* Year label — alternates above/below */}
                          {isAbove && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '28px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '9px',
                                color: 'var(--color-gray)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {work.release_year}
                            </div>
                          )}

                          {/* Node dot */}
                          <Link href={`/media/${work.media_id}`} style={{ textDecoration: 'none' }}>
                            <div
                              style={{
                                position: 'absolute',
                                top: '16px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: accentColor,
                                border: '2px solid var(--color-bg)',
                                boxShadow: `0 0 0 1px ${accentColor}`,
                                cursor: 'pointer',
                                transition: 'transform 0.15s ease',
                                zIndex: 1,
                              }}
                              title={`${work.title} (${work.release_year})`}
                            />
                          </Link>

                          {/* Work title below — alternates */}
                          {!isAbove && (
                            <div
                              style={{
                                position: 'absolute',
                                top: '36px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontFamily: 'var(--font-mono)',
                                fontSize: '9px',
                                color: 'var(--color-gray)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {work.release_year}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Work list below timeline */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                      marginTop: '8px',
                    }}
                  >
                    {timelineWorks.map((work, i) => {
                      const charCountInWork = characters.roster.filter(c =>
                        c.works.includes(sortedWorks.findIndex(w => w.media_id === work.media_id))
                      ).length;

                      return (
                        <Link
                          key={work.media_id}
                          href={`/media/${work.media_id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            padding: '10px 0',
                            borderTop: '1px solid var(--color-border)',
                            textDecoration: 'none',
                            color: 'var(--color-text)',
                          }}
                          className="hover:opacity-70 transition-opacity"
                        >
                          {/* Work thumbnail */}
                          {isValidImageUrl(work.image_url) ? (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                flexShrink: 0,
                                position: 'relative',
                                overflow: 'hidden',
                              }}
                            >
                              <Image
                                src={work.image_url!}
                                alt={work.title}
                                fill
                                sizes="36px"
                                style={{ objectFit: 'cover', objectPosition: 'top' }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                flexShrink: 0,
                                background: accentColor,
                                opacity: 0.15,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <SeriesIcon style={{ width: '16px', height: '16px', color: accentColor, opacity: 1 }} />
                            </div>
                          )}

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {work.sequence_number ? `${work.sequence_number}. ` : ''}{work.title}
                            </p>
                          </div>

                          <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-gray)' }}>
                              {work.release_year || '\u2014'}
                            </span>
                            {charCountInWork > 0 && (
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: accentColor }}>
                                {charCountInWork} fig.
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ================================================================
              PORTRAYAL HIGHLIGHTS — "Did you know..." callouts
              ================================================================ */}
          {highlightFallback.length > 0 && (
            <section style={{ marginBottom: '48px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Featured Figures</span>
                <span style={{ color: 'var(--color-gray)', fontSize: '10px' }}>
                  Historically significant figures in this series
                </span>
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1px',
                  background: 'var(--color-border)',
                }}
              >
                {highlightFallback.map((fig) => {
                  const figColor = getFigureTypeColor(fig.historicity_status);
                  const hasImage = isValidImageUrl(fig.image_url);
                  return (
                    <Link
                      key={fig.canonical_id}
                      href={`/figure/${fig.canonical_id}`}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start',
                        padding: '20px',
                        background: 'var(--color-bg)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                      }}
                      className="hover:opacity-80 transition-opacity"
                    >
                      {/* Portrait */}
                      <div
                        style={{
                          width: '64px',
                          height: '72px',
                          flexShrink: 0,
                          position: 'relative',
                          overflow: 'hidden',
                          borderBottom: `2px solid ${figColor}`,
                          background: figColor,
                        }}
                      >
                        {hasImage ? (
                          <Image
                            src={fig.image_url!}
                            alt={fig.name}
                            fill
                            sizes="64px"
                            style={{ objectFit: 'cover', objectPosition: 'top' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '20px',
                                fontWeight: 300,
                                color: 'rgba(255,255,255,0.7)',
                              }}
                            >
                              {fig.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            fontWeight: 500,
                            lineHeight: 1.3,
                            marginBottom: '4px',
                          }}
                        >
                          {fig.name}
                        </p>
                        {fig.era && (
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '9px',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              color: 'var(--color-gray)',
                              marginBottom: '6px',
                            }}
                          >
                            {fig.era}
                          </p>
                        )}
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: accentColor,
                          }}
                        >
                          {fig.appearances} appearance{fig.appearances !== 1 ? 's' : ''} in series
                        </p>
                        {(fig.total_portrayal_count ?? 0) > fig.appearances && (
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '9px',
                              color: 'var(--color-gray)',
                              marginTop: '2px',
                            }}
                          >
                            {fig.total_portrayal_count} total portrayals across all media
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ================================================================
              APPEARANCE MATRIX
              ================================================================ */}
          {characters.roster.length > 0 && works.length > 1 && (
            <section style={{ marginBottom: '48px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Appearance Matrix</span>
                <span style={{ color: 'var(--color-gray)', fontSize: '10px' }}>
                  Top {Math.min(15, characters.roster.length)} figures across {Math.min(works.length, 10)} works
                </span>
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  padding: '20px',
                  overflowX: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: 'left',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          color: 'var(--color-gray)',
                          padding: '4px 8px 8px 0',
                        }}
                      >
                        Figure
                      </th>
                      {sortedWorks.slice(0, 10).map((work, idx) => (
                        <th
                          key={idx}
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            color: 'var(--color-gray)',
                            padding: '4px 2px 8px',
                            textAlign: 'center',
                            maxWidth: '60px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={work.title}
                        >
                          {work.sequence_number ? `#${work.sequence_number}` : (idx + 1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {characters.roster.slice(0, 15).map((char) => (
                      <tr key={char.canonical_id} style={{ borderTop: '1px solid var(--color-border)' }}>
                        <td
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '13px',
                            color: 'var(--color-text)',
                            padding: '6px 8px 6px 0',
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {char.name}
                        </td>
                        {sortedWorks.slice(0, 10).map((_, idx) => (
                          <td key={idx} style={{ padding: '6px 2px', textAlign: 'center' }}>
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                margin: '0 auto',
                                backgroundColor: char.works.includes(idx) ? accentColor : 'var(--color-section-bg)',
                                opacity: char.works.includes(idx) ? 1 : 0.4,
                              }}
                              title={char.works.includes(idx) ? `In ${sortedWorks[idx]?.title}` : 'Not in work'}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>

        {/* ---- RIGHT COLUMN ---- */}
        <div>

          {/* Character Roster */}
          {characters.roster.length > 0 && (
            <section style={{ marginBottom: '32px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Character Roster</span>
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  maxHeight: '480px',
                  overflowY: 'auto',
                }}
              >
                {characters.roster.map((char, i) => {
                  const figColor = getFigureTypeColor(char.historicity_status);
                  return (
                    <Link
                      key={char.canonical_id}
                      href={`/figure/${char.canonical_id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--color-border)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                      }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      {/* Rank */}
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '9px',
                          color: 'var(--color-gray)',
                          width: '16px',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>

                      {/* Portrait micro */}
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          flexShrink: 0,
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '50%',
                          background: figColor,
                        }}
                      >
                        {isValidImageUrl(char.image_url) ? (
                          <Image
                            src={char.image_url!}
                            alt={char.name}
                            fill
                            sizes="28px"
                            style={{ objectFit: 'cover', objectPosition: 'top' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '11px', color: 'rgba(255,255,255,0.8)' }}>
                              {char.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <span
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '13px',
                          fontWeight: 500,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {char.name}
                      </span>

                      {/* Appearances badge */}
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: accentColor,
                          flexShrink: 0,
                        }}
                      >
                        ×{char.appearances}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Production details */}
          {(series.publisher || series.production_studio || series.channel) && (
            <section style={{ marginBottom: '32px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>Production</span>
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                }}
              >
                {series.publisher && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '2px' }}>Publisher</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)' }}>{series.publisher}</p>
                  </div>
                )}
                {series.production_studio && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '2px' }}>Studio</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)' }}>{series.production_studio}</p>
                  </div>
                )}
                {series.channel && (
                  <div style={{ padding: '12px 16px' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '2px' }}>Channel</p>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--color-text)' }}>{series.channel}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* External References */}
          {series.wikidata_id && !series.wikidata_id.startsWith('PROV:') && (
            <section style={{ marginBottom: '32px' }}>
              <div className="fsg-section-header" style={{ marginBottom: '0' }}>
                <span>External References</span>
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                  padding: '12px 16px',
                }}
              >
                <a
                  href={`https://www.wikidata.org/wiki/${series.wikidata_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: accentColor,
                    textDecoration: 'none',
                  }}
                  className="hover:opacity-70 transition-opacity"
                >
                  Wikidata: {series.wikidata_id} &rarr;
                </a>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Provenance footer */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '16px 40px',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--color-gray)',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        Fictotum Archive &middot; Series Record &middot; {series.wikidata_id || series.media_id}
      </div>
    </div>
  );
}
