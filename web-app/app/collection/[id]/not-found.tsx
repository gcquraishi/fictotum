import Link from 'next/link';
import { BookMarked } from 'lucide-react';

export default function CollectionNotFound() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '400px' }}>
        <BookMarked size={40} style={{ color: 'var(--color-border)', margin: '0 auto 16px' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gray)', marginBottom: '12px' }}>
          404
        </p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: '28px', color: 'var(--color-text)', marginBottom: '16px' }}>
          Collection Not Found
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '16px', color: 'var(--color-gray)', marginBottom: '32px' }}>
          This collection does not exist or may have been deleted.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/collection"
            style={{
              padding: '8px 20px',
              background: 'var(--color-text)',
              color: 'var(--color-bg)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textDecoration: 'none',
            }}
          >
            All Collections
          </Link>
          <Link
            href="/"
            style={{
              padding: '8px 20px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-gray)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              textDecoration: 'none',
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
