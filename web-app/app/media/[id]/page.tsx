export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { getMediaById, getMediaLocationsAndEras } from '@/lib/db';
import {
  formatYear,
  getMediaTypeColor,
  getMediaTypeIcon,
  getPlaceholderStyle,
  getSentimentColor,
  isValidImageUrl,
} from '@/lib/card-utils';

export default async function MediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const media = await getMediaById(id);

  if (!media) {
    notFound();
  }

  const { locations, eras } = await getMediaLocationsAndEras(id);

  const totalFigures = media.portrayals.length;
  const accentColor = getMediaTypeColor(media.media_type);
  const placeholder = getPlaceholderStyle('work', media.title, media.media_type);
  const MediaIcon = getMediaTypeIcon(media.media_type);

  // Build setting year display
  const settingYearDisplay = media.setting_year
    ? media.setting_year_end
      ? `${formatYear(media.setting_year)}\u2009\u2013\u2009${formatYear(media.setting_year_end)}`
      : formatYear(media.setting_year)
    : null;

  // Collect metadata details for the details grid
  const details: { label: string; value: string }[] = [];
  if (media.publisher) details.push({ label: 'Publisher', value: media.publisher });
  if (media.translator) details.push({ label: 'Translator', value: media.translator });
  if (media.channel) details.push({ label: 'Channel', value: media.channel });
  if (media.production_studio) details.push({ label: 'Studio', value: media.production_studio });

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
          Index / Media Works / {media.wikidata_id || media.media_id}
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
          {/* Cover Image / Placeholder */}
          <div
            style={{
              width: '180px',
              height: '240px',
              flexShrink: 0,
              overflow: 'hidden',
              position: 'relative',
              borderBottom: `3px solid ${accentColor}`,
            }}
          >
            {isValidImageUrl(media.image_url) ? (
              <Image
                src={media.image_url!}
                alt={media.title}
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
                <MediaIcon
                  size={56}
                  style={{ color: placeholder.textColor, opacity: 0.5 }}
                />
              </div>
            )}
          </div>

          {/* Title + Meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '42px',
                fontWeight: 300,
                lineHeight: 1.1,
                marginBottom: '8px',
              }}
            >
              {media.title}
            </h1>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  padding: '2px 8px',
                  border: `1px solid ${accentColor}`,
                  color: accentColor,
                }}
              >
                {media.media_type}
              </span>

              {media.release_year && (
                <>
                  <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>&middot;</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {media.release_year}
                  </span>
                </>
              )}

              {settingYearDisplay && (
                <>
                  <span style={{ color: 'var(--color-border)', fontSize: '12px' }}>&middot;</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-gray)',
                    }}
                  >
                    Set {settingYearDisplay}
                  </span>
                </>
              )}
            </div>

            {media.creator && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '16px',
                  color: 'var(--color-text)',
                  marginBottom: '8px',
                }}
              >
                by{' '}
                <span style={{ fontWeight: 500 }}>{media.creator}</span>
              </p>
            )}

            {media.scholarly_source && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  color: 'var(--color-gray)',
                  fontStyle: 'italic',
                }}
              >
                Scholarly sources: {media.scholarly_source}
              </p>
            )}
          </div>
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
            <span style={{ color: 'var(--color-gray)' }}>Figures </span>
            <span style={{ fontWeight: 600 }}>{totalFigures}</span>
          </div>

          {media.release_year && (
            <div
              style={{
                padding: '12px 20px',
                borderRight: '1px solid var(--color-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--color-gray)' }}>Released </span>
              <span>{media.release_year}</span>
            </div>
          )}

          {locations.length > 0 && (
            <div
              style={{
                padding: '12px 20px',
                borderRight: '1px solid var(--color-border)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--color-gray)' }}>Locations </span>
              <span>{locations.length}</span>
            </div>
          )}

          {media.historical_inaccuracies && (
            <div
              style={{
                padding: '12px 20px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              <span style={{ color: 'var(--color-gray)' }}>Inaccuracies </span>
              <span>{media.historical_inaccuracies.length}</span>
            </div>
          )}
        </div>

        {/* ================================================================
            PRODUCTION DETAILS
            ================================================================ */}
        {details.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
              <span>Production Details</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
              }}
            >
              {details.map((d) => (
                <div
                  key={d.label}
                  style={{
                    padding: '12px 16px',
                    background: 'var(--color-bg)',
                  }}
                >
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
                    {d.label}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '14px',
                      color: 'var(--color-text)',
                    }}
                  >
                    {d.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            SERIES INFORMATION
            ================================================================ */}
        {(media.parent_series || (media.child_works && media.child_works.length > 0)) && (
          <div style={{ marginBottom: '32px' }}>
            <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
              <span>Series</span>
              {media.child_works && media.child_works.length > 0 && (
                <span>({media.child_works.length} Works)</span>
              )}
            </div>

            {/* Parent Series */}
            {media.parent_series && (
              <Link
                href={`/media/${media.parent_series.wikidata_id || media.parent_series.media_id}`}
                style={{
                  display: 'block',
                  padding: '16px',
                  border: '1px solid var(--color-border)',
                  textDecoration: 'none',
                  color: 'var(--color-text)',
                  marginBottom: '12px',
                }}
                className="hover:opacity-70 transition-opacity"
              >
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
                  Part of
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '18px',
                    fontWeight: 300,
                  }}
                >
                  {media.parent_series.title}
                  {media.series_position?.sequence_number && (
                    <span style={{ color: 'var(--color-accent)', marginLeft: '8px' }}>
                      #{media.series_position.sequence_number}
                    </span>
                  )}
                </p>
              </Link>
            )}

            {/* Child Works */}
            {media.child_works && media.child_works.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1px',
                  background: 'var(--color-border)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {media.child_works
                  .sort((a: any, b: any) => {
                    if (a.season_number && b.season_number) {
                      if (a.season_number !== b.season_number) return a.season_number - b.season_number;
                      if (a.episode_number && b.episode_number) return a.episode_number - b.episode_number;
                    }
                    if (a.sequence_number && b.sequence_number) return a.sequence_number - b.sequence_number;
                    return a.release_year - b.release_year;
                  })
                  .map((work: any) => (
                    <Link
                      key={work.media_id}
                      href={`/media/${work.media_id}`}
                      style={{
                        display: 'block',
                        padding: '12px 16px',
                        background: 'var(--color-bg)',
                        textDecoration: 'none',
                        color: 'var(--color-text)',
                      }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '14px',
                              fontWeight: 300,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {work.title}
                          </p>
                          <p
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--color-gray)',
                            }}
                          >
                            {work.release_year}
                          </p>
                        </div>
                        {work.sequence_number && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: 'var(--color-accent)',
                              flexShrink: 0,
                            }}
                          >
                            #{work.sequence_number}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            WHO'S IN THIS? (Historical Figures)
            ================================================================ */}
        {totalFigures > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
              <span>Who&apos;s in This?</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>({totalFigures} Figures)</span>
                <Link
                  href={`/contribute/portrayal?work=${encodeURIComponent(media.wikidata_id || media.media_id)}`}
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

            <div
              style={{
                display: 'grid',
                gap: '1px',
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
              }}
            >
              {media.portrayals.map((p: any) => {
                const sentimentColor = getSentimentColor(p.sentiment);
                const figPlaceholder = getPlaceholderStyle('figure', p.figure.name, p.figure.historicity_status);

                return (
                  <Link
                    key={p.figure.canonical_id}
                    href={`/figure/${p.figure.canonical_id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      background: 'var(--color-bg)',
                      textDecoration: 'none',
                      color: 'var(--color-text)',
                    }}
                    className="hover:opacity-70 transition-opacity"
                  >
                    {/* Mini Portrait */}
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        flexShrink: 0,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      {isValidImageUrl(p.figure.image_url) ? (
                        <Image
                          src={p.figure.image_url}
                          alt={p.figure.name}
                          fill
                          sizes="44px"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: figPlaceholder.backgroundColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '16px',
                              fontWeight: 300,
                              color: figPlaceholder.textColor,
                              opacity: 0.5,
                            }}
                          >
                            {figPlaceholder.initials}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Name + Role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '16px',
                          fontWeight: 400,
                        }}
                      >
                        {p.figure.name}
                      </p>
                      {p.role && (
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '13px',
                            color: 'var(--color-gray)',
                            fontStyle: 'italic',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.role}
                        </p>
                      )}
                    </div>

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
                        flexShrink: 0,
                      }}
                    >
                      {p.sentiment}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            HISTORICAL ACCURACY
            ================================================================ */}
        {media.historical_inaccuracies && media.historical_inaccuracies.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
              <span>Historical Accuracy Notes</span>
              <span>({media.historical_inaccuracies.length})</span>
            </div>

            <div
              style={{
                border: '1px solid var(--color-border)',
              }}
            >
              {media.historical_inaccuracies.map((note: string, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < media.historical_inaccuracies.length - 1 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: 'var(--color-accent)',
                      flexShrink: 0,
                      marginTop: '3px',
                    }}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '14px',
                      lineHeight: 1.6,
                      color: 'var(--color-text)',
                    }}
                  >
                    {note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            STORY CONTEXT (Locations & Eras)
            ================================================================ */}
        {(locations.length > 0 || eras.length > 0) && (
          <div style={{ marginBottom: '32px' }}>
            <div className="fsg-section-header" style={{ marginBottom: '16px' }}>
              <span>Story Context</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: locations.length > 0 && eras.length > 0 ? '1fr 1fr' : '1fr',
                gap: '24px',
              }}
            >
              {/* Locations */}
              {locations.length > 0 && (
                <div>
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
                    Locations
                  </p>
                  <div style={{ border: '1px solid var(--color-border)' }}>
                    {locations.map((loc, idx) => (
                      <div
                        key={loc.location_id}
                        style={{
                          padding: '10px 16px',
                          borderBottom: idx < locations.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}
                      >
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '14px',
                            color: 'var(--color-text)',
                          }}
                        >
                          {loc.name}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--color-gray)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {loc.location_type}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Eras */}
              {eras.length > 0 && (
                <div>
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
                    Time Periods
                  </p>
                  <div style={{ border: '1px solid var(--color-border)' }}>
                    {eras.map((era, idx) => (
                      <div
                        key={era.era_id}
                        style={{
                          padding: '10px 16px',
                          borderBottom: idx < eras.length - 1 ? '1px solid var(--color-border)' : 'none',
                        }}
                      >
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '14px',
                            color: 'var(--color-text)',
                          }}
                        >
                          {era.name}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--color-gray)',
                          }}
                        >
                          {formatYear(era.start_year)}{'\u2009\u2013\u2009'}{formatYear(era.end_year)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            EXTERNAL LINKS
            ================================================================ */}
        {media.wikidata_id && (
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
                href={`https://www.wikidata.org/wiki/${media.wikidata_id}`}
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
                Wikidata {media.wikidata_id}
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
          <span>{media.wikidata_id || media.media_id}</span>
          <span>Fictotum Archive</span>
        </div>
      </div>
    </div>
  );
}
