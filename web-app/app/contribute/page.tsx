import Link from 'next/link';

export default function ContributePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 40px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '42px',
            fontWeight: 300,
            marginBottom: '8px',
          }}
        >
          Contribute
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '17px',
            color: 'var(--color-gray)',
            fontStyle: 'italic',
            marginBottom: '48px',
          }}
        >
          Help build the archive by adding portrayals, works, and historical figures.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Hero Action: Add a Portrayal */}
          <Link
            href="/contribute/portrayal"
            style={{
              padding: '32px',
              border: '2px solid var(--color-text)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
            className="hover:bg-[#1A1A1A] hover:text-white transition-colors group"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                    color: 'var(--color-accent)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Recommended
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '24px',
                    fontWeight: 400,
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Add a Portrayal
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '15px',
                    color: 'var(--color-gray)',
                    fontStyle: 'italic',
                  }}
                >
                  Log a historical figure&apos;s appearance in a film, book, TV series, or other media work.
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '20px',
                  color: 'var(--color-gray)',
                  marginTop: '8px',
                }}
              >
                &rarr;
              </span>
            </div>
          </Link>

          {/* Secondary Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Link
              href="/contribute/work"
              style={{
                padding: '24px',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
              className="hover:border-[#1A1A1A] transition-colors"
            >
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 400,
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Add a Work
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  color: 'var(--color-gray)',
                  fontStyle: 'italic',
                }}
              >
                Add a new film, book, TV series, or other media work to the archive.
              </span>
            </Link>

            <Link
              href="/contribute/import"
              style={{
                padding: '24px',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
              className="hover:border-[#1A1A1A] transition-colors"
            >
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '20px',
                  fontWeight: 400,
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Import Creator&apos;s Works
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  color: 'var(--color-gray)',
                  fontStyle: 'italic',
                }}
              >
                Bulk import works by a creator from Wikidata.
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
