export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSeriesMetadata } from '@/lib/db';
import {
  getMediaTypeColor,
  getMediaTypeIcon,
  getPlaceholderStyle,
} from '@/lib/card-utils';

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
          Index / Series / {series.wikidata_id || series.media_id}
        </span>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ================================================================
            HERO SECTION
            ================================================================ */}
        <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
          {/* Series Icon Placeholder */}
          <div
            style={{
              width: '180px',
              height: '240px',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
              borderBottom: `3px solid ${accentColor}`,
              backgroundColor: placeholder.backgroundColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SeriesIcon
              style={{
                width: '64px',
                height: '64px',
                color: accentColor,
                opacity: 0.6,
              }}
            />
          </div>

          {/* Title Block */}
          <div style={{ flex: 1 }}>
            {/* Media Type Badge */}
            <div
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                border: `1px solid ${accentColor}`,
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: accentColor,
                marginBottom: '12px',
              }}
            >
              {series.media_type}
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '36px',
                fontWeight: 300,
                lineHeight: 1.15,
                color: 'var(--color-text)',
                marginBottom: '8px',
              }}
            >
              {series.title}
            </h1>

            {series.creator && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                  color: 'var(--color-gray)',
                  marginBottom: '4px',
                }}
              >
                by {series.creator}
              </p>
            )}

            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--color-gray)',
                marginTop: '8px',
              }}
            >
              {works.length} work{works.length !== 1 ? 's' : ''}
              {yearStart > 0 && (
                <>
                  {' '}&middot; {yearStart === yearEnd ? yearStart : `${yearStart}\u2009\u2013\u2009${yearEnd}`}
                </>
              )}
            </p>
          </div>
        </div>

        {/* ================================================================
            STATS BAR
            ================================================================ */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1px',
            background: 'var(--color-border)',
            border: '1px solid var(--color-border)',
            marginBottom: '40px',
          }}
        >
          <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '4px',
              }}
            >
              Works
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '28px',
                fontWeight: 500,
                color: accentColor,
              }}
            >
              {works.length}
            </p>
          </div>
          <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '4px',
              }}
            >
              Figures
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '28px',
                fontWeight: 500,
                color: 'var(--color-text)',
              }}
            >
              {characters.total}
            </p>
          </div>
          <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '4px',
              }}
            >
              Year Range
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '16px',
                fontWeight: 500,
                color: 'var(--color-text)',
                marginTop: '6px',
              }}
            >
              {yearStart === yearEnd ? yearStart : `${yearStart}\u2009\u2013\u2009${yearEnd}`}
            </p>
          </div>
          <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
                marginBottom: '4px',
              }}
            >
              Unique Pairs
            </p>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '28px',
                fontWeight: 500,
                color: 'var(--color-text)',
              }}
            >
              {stats.totalInteractions}
            </p>
          </div>
        </div>

        {/* ================================================================
            WORKS IN THIS SERIES
            ================================================================ */}
        <div className="fsg-section-header" style={{ marginBottom: '0' }}>
          <span>Works in this Series</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1px',
            background: 'var(--color-border)',
            border: '1px solid var(--color-border)',
            borderTop: 'none',
            marginBottom: '40px',
          }}
        >
          {sortedWorks.map((work, idx) => {
            const charCountInWork = characters.roster.filter((c) =>
              c.works.includes(idx)
            ).length;

            return (
              <Link
                key={work.media_id}
                href={`/media/${work.media_id}`}
                style={{
                  display: 'block',
                  background: 'var(--color-bg)',
                  padding: '16px 20px',
                  textDecoration: 'none',
                  color: 'var(--color-text)',
                }}
                className="hover:opacity-80 transition-opacity"
              >
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '15px',
                      fontWeight: 500,
                      lineHeight: 1.3,
                      color: 'var(--color-text)',
                      flex: 1,
                    }}
                  >
                    {work.title}
                  </p>
                  {work.sequence_number && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: accentColor,
                        flexShrink: 0,
                      }}
                    >
                      #{work.sequence_number}
                    </span>
                  )}
                  {work.season_number && work.episode_number && (
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: 'var(--color-gray)',
                        flexShrink: 0,
                      }}
                    >
                      S{work.season_number}E{work.episode_number}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--color-gray)',
                  }}
                >
                  <span>{work.release_year || 'Unknown'}</span>
                  <span style={{ color: accentColor }}>{charCountInWork} figure{charCountInWork !== 1 ? 's' : ''}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* ================================================================
            CHARACTER ROSTER
            ================================================================ */}
        {characters.roster.length > 0 && (
          <>
            <div className="fsg-section-header" style={{ marginBottom: '0' }}>
              <span>Character Roster</span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                marginBottom: '40px',
              }}
            >
              {characters.roster.map((char) => (
                <Link
                  key={char.canonical_id}
                  href={`/figure/${char.canonical_id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 20px',
                    borderBottom: '1px solid var(--color-border)',
                    textDecoration: 'none',
                    color: 'var(--color-text)',
                  }}
                  className="hover:opacity-70 transition-opacity"
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '15px',
                      fontWeight: 500,
                    }}
                  >
                    {char.name}
                  </span>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--color-gray)',
                      }}
                    >
                      {char.appearances} appearance{char.appearances !== 1 ? 's' : ''}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: accentColor,
                      }}
                    >
                      {char.works.length} work{char.works.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* ================================================================
            APPEARANCE MATRIX
            ================================================================ */}
        {characters.roster.length > 0 && works.length > 1 && (
          <>
            <div className="fsg-section-header" style={{ marginBottom: '0' }}>
              <span>Appearance Matrix</span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                marginBottom: '40px',
                padding: '20px',
                overflowX: 'auto',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-gray)',
                  marginBottom: '16px',
                }}
              >
                Top {Math.min(15, characters.roster.length)} characters across {Math.min(works.length, 10)} works
              </p>
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
          </>
        )}

        {/* ================================================================
            PRODUCTION DETAILS
            ================================================================ */}
        {(series.publisher || series.production_studio || series.channel) && (
          <>
            <div className="fsg-section-header" style={{ marginBottom: '0' }}>
              <span>Production Details</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                marginBottom: '40px',
              }}
            >
              {series.publisher && (
                <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>Publisher</p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)' }}>{series.publisher}</p>
                </div>
              )}
              {series.production_studio && (
                <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>Studio</p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)' }}>{series.production_studio}</p>
                </div>
              )}
              {series.channel && (
                <div style={{ background: 'var(--color-bg)', padding: '16px 20px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '4px' }}>Channel</p>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '15px', color: 'var(--color-text)' }}>{series.channel}</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ================================================================
            EXTERNAL REFERENCES
            ================================================================ */}
        {series.wikidata_id && !series.wikidata_id.startsWith('PROV:') && (
          <>
            <div className="fsg-section-header" style={{ marginBottom: '0' }}>
              <span>External References</span>
            </div>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderTop: 'none',
                padding: '16px 20px',
                marginBottom: '40px',
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
          </>
        )}

        {/* ================================================================
            PROVENANCE
            ================================================================ */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            paddingTop: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          Fictotum Archive &middot; Series Record &middot; {series.wikidata_id || series.media_id}
        </div>
      </div>
    </div>
  );
}
