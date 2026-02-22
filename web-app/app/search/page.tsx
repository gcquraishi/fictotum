export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import Link from 'next/link';
import { searchFigures, searchMedia, getSearchFilterOptions } from '@/lib/db';
import SearchInput from '@/components/SearchInput';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string; era?: string; type?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const tab = params.tab || 'figures';
  const eraFilter = params.era || '';
  const typeFilter = params.type || '';

  const hasFilters = !!(eraFilter || typeFilter);
  const shouldSearch = !!(query || hasFilters);

  const [figureResults, mediaResults, filterOptions] = await Promise.all([
    shouldSearch ? searchFigures(query, { era: eraFilter || undefined }) : Promise.resolve([]),
    shouldSearch ? searchMedia(query, { mediaType: typeFilter || undefined }) : Promise.resolve([]),
    getSearchFilterOptions(),
  ]);

  const results = tab === 'works' ? mediaResults : figureResults;
  const activeFilters = tab === 'works' ? typeFilter : eraFilter;

  // Build filter URL helper
  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (overrides.tab ?? params.tab) p.set('tab', overrides.tab ?? params.tab ?? 'figures');
    if (overrides.era !== undefined ? overrides.era : eraFilter) p.set('era', overrides.era !== undefined ? overrides.era : eraFilter);
    if (overrides.type !== undefined ? overrides.type : typeFilter) p.set('type', overrides.type !== undefined ? overrides.type : typeFilter);
    return `/search?${p.toString()}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Search Hero */}
      <div
        style={{
          padding: '60px 40px',
          borderBottom: '1px solid var(--color-border-bold)',
          textAlign: 'center',
          background: '#f9f9f9',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <Suspense
            fallback={
              <div
                style={{
                  width: '100%',
                  padding: '24px',
                  border: '2px solid var(--color-border-bold)',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '32px',
                  textAlign: 'center',
                  background: '#fff',
                }}
              >
                Loading...
              </div>
            }
          >
            <SearchInput />
          </Suspense>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: '32px',
            gap: '40px',
          }}
        >
          <Link
            href={buildUrl({ tab: 'figures', type: '' })}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: tab === 'figures' ? 'var(--color-text)' : 'var(--color-gray)',
              paddingBottom: '6px',
              borderBottom: tab === 'figures' ? '2px solid var(--color-accent)' : '2px solid transparent',
              textDecoration: 'none',
            }}
          >
            Figures ({figureResults.length})
          </Link>
          <Link
            href={buildUrl({ tab: 'works', era: '' })}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: tab === 'works' ? 'var(--color-text)' : 'var(--color-gray)',
              paddingBottom: '6px',
              borderBottom: tab === 'works' ? '2px solid var(--color-accent)' : '2px solid transparent',
              textDecoration: 'none',
            }}
          >
            Works ({mediaResults.length})
          </Link>
        </div>
      </div>

      {/* Content Wrapper */}
      <div
        style={{
          flex: 1,
          maxWidth: '960px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Results Area */}
        <main style={{ padding: '40px 60px' }}>
          {shouldSearch && (
            <>
              {/* Filter Chips */}
              {tab === 'figures' && filterOptions.eras.length > 0 && (
                <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <Link
                    href={buildUrl({ era: '' })}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '4px 10px',
                      border: '1px solid var(--color-border)',
                      textDecoration: 'none',
                      color: !eraFilter ? 'var(--color-bg)' : 'var(--color-gray)',
                      background: !eraFilter ? 'var(--color-text)' : 'transparent',
                    }}
                  >
                    All Eras
                  </Link>
                  {filterOptions.eras.map((era) => (
                    <Link
                      key={era}
                      href={buildUrl({ era })}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '4px 10px',
                        border: '1px solid var(--color-border)',
                        textDecoration: 'none',
                        color: eraFilter === era ? 'var(--color-bg)' : 'var(--color-gray)',
                        background: eraFilter === era ? 'var(--color-text)' : 'transparent',
                      }}
                    >
                      {era}
                    </Link>
                  ))}
                </div>
              )}

              {tab === 'works' && filterOptions.mediaTypes.length > 0 && (
                <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <Link
                    href={buildUrl({ type: '' })}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '4px 10px',
                      border: '1px solid var(--color-border)',
                      textDecoration: 'none',
                      color: !typeFilter ? 'var(--color-bg)' : 'var(--color-gray)',
                      background: !typeFilter ? 'var(--color-text)' : 'transparent',
                    }}
                  >
                    All Types
                  </Link>
                  {filterOptions.mediaTypes.map((mt) => (
                    <Link
                      key={mt}
                      href={buildUrl({ type: mt })}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        padding: '4px 10px',
                        border: '1px solid var(--color-border)',
                        textDecoration: 'none',
                        color: typeFilter === mt ? 'var(--color-bg)' : 'var(--color-gray)',
                        background: typeFilter === mt ? 'var(--color-text)' : 'transparent',
                      }}
                    >
                      {mt}
                    </Link>
                  ))}
                </div>
              )}

              {/* Active Filter Indicator */}
              {activeFilters && (
                <div style={{
                  marginBottom: '16px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-gray)',
                }}>
                  Filtered by: <strong style={{ color: 'var(--color-text)' }}>{activeFilters}</strong>
                  {' '}
                  <Link
                    href={buildUrl({ era: '', type: '' })}
                    style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                  >
                    Clear
                  </Link>
                </div>
              )}

              {/* Results Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '32px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-gray)',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '12px',
                }}
              >
                <span>
                  {results.length} result{results.length !== 1 ? 's' : ''}{query ? <> for &ldquo;{query}&rdquo;</> : ''}
                </span>
                <span>Sorted by: Name</span>
              </div>

              {/* Figures Results */}
              {tab === 'figures' && (
                <>
                  {figureResults.length > 0 ? (
                    figureResults.map((figure) => (
                      <Link
                        key={figure.canonical_id}
                        href={`/figure/${figure.canonical_id}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '100px 1fr 120px',
                          padding: '24px 0',
                          borderBottom: '1px solid var(--color-border)',
                          alignItems: 'baseline',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background 0.1s',
                        }}
                        className="hover:bg-[#fafafa]"
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-accent)',
                            fontSize: '16px',
                          }}
                        >
                          {figure.era ? figure.era.split(' ')[0] : ''}
                        </span>
                        <div>
                          <h3
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '24px',
                              fontWeight: 400,
                              marginBottom: '4px',
                            }}
                          >
                            {figure.name}
                          </h3>
                          <p
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '14px',
                              color: 'var(--color-gray)',
                              fontStyle: 'italic',
                            }}
                          >
                            {figure.era || 'Historical Figure'}
                          </p>
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-gray)',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {figure.historicity_status}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: 'var(--color-gray)', fontStyle: 'italic' }}>
                        No figures found{query ? <> matching &ldquo;{query}&rdquo;</> : ''}{eraFilter && ` in ${eraFilter}`}
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gray)', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {eraFilter ? 'Try clearing the era filter' : 'Try a different search term'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Works Results */}
              {tab === 'works' && (
                <>
                  {mediaResults.length > 0 ? (
                    mediaResults.map((work) => (
                      <Link
                        key={work.wikidata_id || work.media_id}
                        href={`/media/${work.wikidata_id || work.media_id}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '80px 1fr 120px',
                          padding: '24px 0',
                          borderBottom: '1px solid var(--color-border)',
                          alignItems: 'baseline',
                          textDecoration: 'none',
                          color: 'inherit',
                          transition: 'background 0.1s',
                        }}
                        className="hover:bg-[#fafafa]"
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-accent)',
                            fontSize: '14px',
                          }}
                        >
                          {work.release_year || ''}
                        </span>
                        <div>
                          <h3
                            style={{
                              fontFamily: 'var(--font-serif)',
                              fontSize: '24px',
                              fontWeight: 400,
                              marginBottom: '4px',
                            }}
                          >
                            {work.title}
                          </h3>
                          {work.creator && (
                            <p
                              style={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '14px',
                                color: 'var(--color-gray)',
                                fontStyle: 'italic',
                              }}
                            >
                              {work.creator}
                            </p>
                          )}
                        </div>
                        <div
                          style={{
                            textAlign: 'right',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: 'var(--color-gray)',
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {work.media_type}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: '80px 0' }}>
                      <p style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 300, color: 'var(--color-gray)', fontStyle: 'italic' }}>
                        No works found{query ? <> matching &ldquo;{query}&rdquo;</> : ''}{typeFilter && ` of type ${typeFilter}`}
                      </p>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--color-gray)', marginTop: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        {typeFilter ? 'Try clearing the type filter' : 'Try a different search term'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!shouldSearch && (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: 'var(--color-gray)',
                  fontStyle: 'italic',
                }}
              >
                Search the archive of historical figures and media works
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-gray)',
                  marginTop: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                Enter a name, era, or keyword above
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border-bold)',
          padding: '40px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--color-gray)',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        &copy; 2026 Fictotum Archive
      </footer>
    </div>
  );
}
