'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Hide navbar on password gate page
  if (pathname === '/password') return null;

  return (
    <header
      className="flex justify-between items-center sticky top-0 z-50 bg-white"
      style={{
        padding: '24px 40px',
        borderBottom: '1px solid var(--color-border)',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <Link
        href="/"
        className="hover:opacity-70 transition-opacity"
        style={{
          fontSize: '14px',
          letterSpacing: '1px',
          textTransform: 'uppercase' as const,
          textDecoration: 'none',
          color: 'var(--color-text)',
        }}
      >
        Fictotum
      </Link>

      {/* Search Trigger (desktop) */}
      <Link
        href="/search"
        className="hidden md:block hover:opacity-70 transition-opacity"
        style={{
          fontSize: '12px',
          textTransform: 'uppercase' as const,
          border: '1px solid var(--color-border)',
          padding: '8px 16px',
          color: 'var(--color-gray)',
          textDecoration: 'none',
          fontFamily: 'var(--font-mono)',
        }}
      >
        Search Figures or Works...
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center">
        <Link
          href="/contribute"
          style={{
            fontSize: '12px',
            textTransform: 'uppercase' as const,
            textDecoration: 'none',
            color: 'var(--color-text)',
            marginLeft: '24px',
            letterSpacing: '1px',
            fontFamily: 'var(--font-mono)',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          Contribute
        </Link>
        <Link
          href="/explore/graph"
          style={{
            fontSize: '12px',
            textTransform: 'uppercase' as const,
            textDecoration: 'none',
            color: 'var(--color-text)',
            marginLeft: '24px',
            letterSpacing: '1px',
            fontFamily: 'var(--font-mono)',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          Graph
        </Link>
        <Link
          href="/explore/timeline"
          style={{
            fontSize: '12px',
            textTransform: 'uppercase' as const,
            textDecoration: 'none',
            color: 'var(--color-text)',
            marginLeft: '24px',
            letterSpacing: '1px',
            fontFamily: 'var(--font-mono)',
          }}
          className="hover:opacity-70 transition-opacity"
        >
          Timeline
        </Link>
        {session ? (
          <button
            onClick={() => signOut()}
            style={{
              fontSize: '12px',
              textTransform: 'uppercase' as const,
              color: 'var(--color-text)',
              marginLeft: '24px',
              letterSpacing: '1px',
              fontFamily: 'var(--font-mono)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            Sign Out
          </button>
        ) : (
          <Link
            href="/api/auth/signin"
            style={{
              fontSize: '12px',
              textTransform: 'uppercase' as const,
              textDecoration: 'none',
              color: 'var(--color-text)',
              marginLeft: '24px',
              letterSpacing: '1px',
              fontFamily: 'var(--font-mono)',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            Sign In
          </Link>
        )}
      </nav>

      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden"
        style={{
          fontSize: '12px',
          textTransform: 'uppercase' as const,
          letterSpacing: '1px',
          fontFamily: 'var(--font-mono)',
          background: 'none',
          border: '1px solid var(--color-border)',
          padding: '6px 12px',
          cursor: 'pointer',
          color: 'var(--color-text)',
        }}
      >
        {mobileMenuOpen ? 'Close' : 'Menu'}
      </button>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="md:hidden absolute top-full left-0 right-0 bg-white z-50"
          style={{
            borderBottom: '1px solid var(--color-border)',
            padding: '24px 40px',
          }}
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '12px',
                textTransform: 'uppercase' as const,
                textDecoration: 'none',
                color: 'var(--color-text)',
                letterSpacing: '1px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Search
            </Link>
            <Link
              href="/contribute"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '12px',
                textTransform: 'uppercase' as const,
                textDecoration: 'none',
                color: 'var(--color-text)',
                letterSpacing: '1px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Contribute
            </Link>
            <Link
              href="/explore/graph"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '12px',
                textTransform: 'uppercase' as const,
                textDecoration: 'none',
                color: 'var(--color-text)',
                letterSpacing: '1px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Graph
            </Link>
            <Link
              href="/explore/timeline"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                fontSize: '12px',
                textTransform: 'uppercase' as const,
                textDecoration: 'none',
                color: 'var(--color-text)',
                letterSpacing: '1px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Timeline
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
