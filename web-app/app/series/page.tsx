import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getSession } from '@/lib/neo4j';
import { getMediaTypeColor, getMediaTypeIcon, isValidImageUrl } from '@/lib/card-utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Series Archive — Fictotum',
  description:
    'Browse all book, TV, film, and game series in the Fictotum archive — multi-work franchises featuring historical figures across centuries.',
  openGraph: {
    title: 'Series Archive — Fictotum',
    description:
      'Browse all book, TV, film, and game series in the Fictotum archive — multi-work franchises featuring historical figures across centuries.',
  },
  twitter: {
    card: 'summary',
    title: 'Series Archive — Fictotum',
    description:
      'Browse all book, TV, film, and game series in the Fictotum archive — multi-work franchises featuring historical figures across centuries.',
  },
};

interface SeriesListItem {
  wikidata_id: string;
  media_id: string;
  title: string;
  media_type: string;
  creator?: string;
  image_url?: string | null;
  work_count: number;
  character_count: number;
  year_range: [number, number] | null;
}

async function getAllSeries(): Promise<SeriesListItem[]> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (series:MediaWork)
       WHERE (series.media_type IN ['Book Series', 'Game Series'])
       OR (series.media_type IN ['Book', 'Film', 'TV Series', 'Video Game'] AND (series)-[:PART_OF]->())
       OPTIONAL MATCH (work:MediaWork)-[:PART_OF]->(series)
       OPTIONAL MATCH (fig:HistoricalFigure)-[:APPEARS_IN]->(work)
       WITH series,
            count(DISTINCT work) as work_count,
            count(DISTINCT fig) as character_count,
            collect(DISTINCT work.release_year) as release_years,
            collect(DISTINCT work.image_url)[0] as first_work_image
       WHERE work_count > 0
       RETURN series.wikidata_id as wikidata_id,
              series.media_id as media_id,
              series.title as title,
              series.media_type as media_type,
              series.creator as creator,
              series.image_url as series_image_url,
              first_work_image,
              work_count,
              character_count,
              release_years
       ORDER BY work_count DESC
       LIMIT 100`
    );

    return result.records.map(record => {
      const releaseYears: number[] = (record.get('release_years') || [])
        .map((y: any) => y?.toNumber?.() ?? Number(y))
        .filter((y: number) => y && y > 0);
      const minYear = releaseYears.length > 0 ? Math.min(...releaseYears) : 0;
      const maxYear = releaseYears.length > 0 ? Math.max(...releaseYears) : 0;
      const seriesImageUrl = record.get('series_image_url');
      const firstWorkImage = record.get('first_work_image');

      return {
        wikidata_id: record.get('wikidata_id'),
        media_id: record.get('media_id'),
        title: record.get('title'),
        media_type: record.get('media_type'),
        creator: record.get('creator'),
        image_url: seriesImageUrl || firstWorkImage || null,
        work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
        character_count: record.get('character_count')?.toNumber?.() ?? Number(record.get('character_count')),
        year_range: minYear > 0 ? [minYear, maxYear] : null,
      };
    });
  } finally {
    await session.close();
  }
}

export default async function SeriesBrowsePage() {
  const series = await getAllSeries();

  // Top series by work count (for featured strip)
  const featured = series.slice(0, 3);

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
          Index / Series
        </span>
      </div>

      {/* Page header */}
      <div
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-section-bg)',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 40px 32px' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)',
              marginBottom: '8px',
            }}
          >
            Series Archive
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '48px',
              fontWeight: 300,
              color: 'var(--color-text)',
              marginBottom: '8px',
            }}
          >
            Browse Series
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '17px',
              color: 'var(--color-gray)',
              marginBottom: '0',
            }}
          >
            Multi-work franchises featuring historical figures across centuries of storytelling.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 40px 80px' }}>

        {/* Summary stat */}
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '32px',
          }}
        >
          {series.length} series in archive
        </div>

        {/* Featured strip — top 3 series */}
        {featured.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '12px',
              }}
            >
              Most populated
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
              }}
            >
              {featured.map((s) => {
                const accentColor = getMediaTypeColor(s.media_type);
                const id = s.wikidata_id || s.media_id;
                const hasImage = isValidImageUrl(s.image_url);

                return (
                  <Link
                    key={id}
                    href={`/series/${id}`}
                    style={{
                      display: 'block',
                      background: 'var(--color-bg)',
                      textDecoration: 'none',
                      color: 'var(--color-text)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    className="hover:opacity-90 transition-opacity"
                  >
                    {/* Cover image */}
                    <div
                      style={{
                        height: '200px',
                        position: 'relative',
                        background: accentColor,
                        overflow: 'hidden',
                      }}
                    >
                      {hasImage ? (
                        <Image
                          src={s.image_url!}
                          alt={s.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          style={{ objectFit: 'cover', objectPosition: 'top' }}
                        />
                      ) : (
                        (() => {
                          const Icon = getMediaTypeIcon(s.media_type);
                          return (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon style={{ width: '48px', height: '48px', color: 'rgba(255,255,255,0.4)' }} />
                            </div>
                          );
                        })()
                      )}
                      {/* Dark gradient at bottom */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)',
                        }}
                        aria-hidden="true"
                      />
                      {/* Type badge */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          padding: '3px 8px',
                          background: 'rgba(0,0,0,0.5)',
                          border: `1px solid ${accentColor}`,
                          backdropFilter: 'blur(4px)',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            color: accentColor,
                          }}
                        >
                          {s.media_type}
                        </span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: '16px 20px 20px' }}>
                      <h3
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '20px',
                          fontWeight: 500,
                          lineHeight: 1.2,
                          marginBottom: '4px',
                        }}
                      >
                        {s.title}
                      </h3>
                      {s.creator && (
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '13px',
                            color: 'var(--color-gray)',
                            fontStyle: 'italic',
                            marginBottom: '12px',
                          }}
                        >
                          by {s.creator}
                        </p>
                      )}
                      <div
                        style={{
                          display: 'flex',
                          gap: '20px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <div>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '2px' }}>Works</p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600, color: accentColor, lineHeight: 1 }}>{s.work_count}</p>
                        </div>
                        <div>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '2px' }}>Figures</p>
                          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1 }}>{s.character_count}</p>
                        </div>
                        {s.year_range && (
                          <div>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)', marginBottom: '2px' }}>Span</p>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', lineHeight: 1, marginTop: '4px' }}>
                              {s.year_range[0] === s.year_range[1] ? s.year_range[0] : `${s.year_range[0]}\u2009\u2013\u2009${s.year_range[1]}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            FULL LIST — compact grid
            ================================================================ */}
        {series.length > 3 && (
          <div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '12px',
              }}
            >
              All Series
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '1px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
              }}
            >
              {series.slice(3).map((s) => {
                const accentColor = getMediaTypeColor(s.media_type);
                const Icon = getMediaTypeIcon(s.media_type);
                const id = s.wikidata_id || s.media_id;
                const hasImage = isValidImageUrl(s.image_url);

                return (
                  <Link
                    key={id}
                    href={`/series/${id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      gap: 0,
                      background: 'var(--color-bg)',
                      textDecoration: 'none',
                      color: 'var(--color-text)',
                    }}
                    className="hover:opacity-80 transition-opacity"
                  >
                    {/* Thumbnail strip */}
                    <div
                      style={{
                        width: '56px',
                        flexShrink: 0,
                        position: 'relative',
                        background: accentColor,
                        overflow: 'hidden',
                      }}
                    >
                      {hasImage ? (
                        <Image
                          src={s.image_url!}
                          alt={s.title}
                          fill
                          sizes="56px"
                          style={{ objectFit: 'cover', objectPosition: 'top' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}>
                          <Icon style={{ width: '20px', height: '20px', color: 'rgba(255,255,255,0.4)' }} />
                        </div>
                      )}
                    </div>

                    {/* Card body */}
                    <div style={{ flex: 1, padding: '14px 16px', borderLeft: `3px solid ${accentColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                        <h3
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            fontWeight: 500,
                            lineHeight: 1.3,
                            flex: 1,
                          }}
                        >
                          {s.title}
                        </h3>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            padding: '2px 6px',
                            border: `1px solid ${accentColor}`,
                            color: accentColor,
                            flexShrink: 0,
                          }}
                        >
                          {s.media_type}
                        </span>
                      </div>

                      {s.creator && (
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '12px',
                            color: 'var(--color-gray)',
                            fontStyle: 'italic',
                            marginBottom: '8px',
                          }}
                        >
                          {s.creator}
                        </p>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          gap: '16px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--color-border)',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: accentColor }}>{s.work_count}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>works</span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'baseline' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--color-text)' }}>{s.character_count}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-gray)' }}>figures</span>
                        </div>
                        {s.year_range && s.year_range[0] !== s.year_range[1] && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-gray)', marginLeft: 'auto' }}>
                            {s.year_range[0]}\u2013{s.year_range[1]}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {series.length === 0 && (
          <div
            style={{
              padding: '80px 0',
              textAlign: 'center',
              border: '1px solid var(--color-border)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-gray)' }}>
              No series available
            </p>
          </div>
        )}

        {/* Footer summary */}
        {series.length > 0 && (
          <div
            style={{
              marginTop: '32px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-gray)',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              {series.length} series &middot; Fictotum Archive
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
