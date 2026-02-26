import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-accent)',
              marginBottom: '16px',
            }}
          >
            404
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '36px',
              fontWeight: 300,
              marginBottom: '12px',
              color: 'var(--color-text)',
            }}
          >
            Record Not Found
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              color: 'var(--color-gray)',
              fontStyle: 'italic',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            The archive entry you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '10px 20px',
                border: '1px solid var(--color-text)',
                textDecoration: 'none',
                color: 'var(--color-text)',
              }}
              className="hover:bg-[#1A1A1A] hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/search"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                padding: '10px 20px',
                border: '1px solid var(--color-border)',
                textDecoration: 'none',
                color: 'var(--color-gray)',
              }}
              className="hover:border-[var(--color-text)] hover:color-[var(--color-text)] transition-colors"
            >
              Search Archive
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
