export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import Link from 'next/link';
import { searchFigures } from '@/lib/db';
import SearchInput from '@/components/SearchInput';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const results = query ? await searchFigures(query) : [];

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
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-text)',
              paddingBottom: '6px',
              borderBottom: '2px solid var(--color-accent)',
            }}
          >
            Figures ({results.length})
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-gray)',
              paddingBottom: '6px',
              borderBottom: '2px solid transparent',
            }}
          >
            Works
          </span>
        </div>
      </div>

      {/* Content Wrapper */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          maxWidth: '1440px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        {/* Sidebar Filters */}
        <aside
          style={{
            width: '280px',
            borderRight: '1px solid var(--color-border)',
            padding: '40px',
            flexShrink: 0,
          }}
          className="hidden md:block"
        >
          {/* Era Filter */}
          <div style={{ marginBottom: '40px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
                display: 'block',
                color: 'var(--color-gray)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '4px',
              }}
            >
              Era
            </span>
            {['Ancient', 'Medieval', 'Renaissance', 'Modern'].map((era) => (
              <label
                key={era}
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" style={{ marginRight: '10px' }} />
                {era}
              </label>
            ))}
          </div>

          {/* Medium Filter */}
          <div style={{ marginBottom: '40px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
                display: 'block',
                color: 'var(--color-gray)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '4px',
              }}
            >
              Medium
            </span>
            {['Novel', 'Film', 'Television'].map((medium) => (
              <label
                key={medium}
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" style={{ marginRight: '10px' }} />
                {medium}
              </label>
            ))}
          </div>

          {/* Sentiment Filter */}
          <div style={{ marginBottom: '40px' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px',
                display: 'block',
                color: 'var(--color-gray)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: '4px',
              }}
            >
              Sentiment
            </span>
            {['Heroic', 'Neutral', 'Villainous'].map((sentiment) => (
              <label
                key={sentiment}
                style={{
                  display: 'block',
                  marginBottom: '10px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                <input type="checkbox" style={{ marginRight: '10px' }} />
                {sentiment}
              </label>
            ))}
          </div>
        </aside>

        {/* Results Area */}
        <main style={{ flex: 1, padding: '40px 60px' }}>
          {query && (
            <>
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
                  Showing 1-{results.length} of {results.length} Results for &ldquo;{query}&rdquo;
                </span>
                <span>Sorted by: Relevance</span>
              </div>

              {/* Result Items */}
              {results.length > 0 ? (
                results.map((figure) => (
                  <Link
                    key={figure.canonical_id}
                    href={`/figure/${figure.canonical_id}`}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '100px 1fr 120px',
                      padding: '32px 0',
                      borderBottom: '1px solid var(--color-border)',
                      alignItems: 'baseline',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background 0.1s',
                    }}
                    className="hover:bg-[#fafafa]"
                  >
                    {/* Year */}
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-accent)',
                        fontSize: '16px',
                      }}
                    >
                      {figure.era ? figure.era.split(' ')[0] : ''}
                    </span>

                    {/* Info */}
                    <div>
                      <h3
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '28px',
                          fontWeight: 400,
                          marginBottom: '8px',
                        }}
                      >
                        {figure.name}
                      </h3>
                      <p
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '16px',
                          color: 'var(--color-gray)',
                          fontStyle: 'italic',
                          lineHeight: 1.5,
                        }}
                      >
                        {figure.era || 'Historical Figure'}
                      </p>
                    </div>

                    {/* Meta */}
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
                <div
                  style={{
                    textAlign: 'center',
                    padding: '80px 0',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '24px',
                      fontWeight: 300,
                      color: 'var(--color-gray)',
                      fontStyle: 'italic',
                    }}
                  >
                    No figures found matching &ldquo;{query}&rdquo;
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
                    Try a different search term
                  </p>
                </div>
              )}
            </>
          )}

          {!query && (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 0',
              }}
            >
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
        &copy; 2026 Fictotum Archive &mdash; Search Interface
      </footer>
    </div>
  );
}
