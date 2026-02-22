'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface SearchResult {
  type: 'figure' | 'media' | 'series' | 'creator' | 'actor';
  id: string;
  label: string;
  meta: string | null;
  url: string;
}

const categoryLabels: Record<string, string> = {
  figure: 'Figures',
  media: 'Works',
  series: 'Series',
  creator: 'Creators',
  actor: 'Actors',
};

const navLinkStyle = {
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  textDecoration: 'none',
  color: 'var(--color-text)',
  marginLeft: '24px',
  letterSpacing: '1px',
  fontFamily: 'var(--font-mono)',
};

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hide navbar on password gate page
  if (pathname === '/password') return null;

  // Close search on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchTerm('');
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close search on route change
  useEffect(() => {
    setSearchOpen(false);
    setSearchTerm('');
    setResults([]);
  }, [pathname]);

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  // Debounced search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/universal?q=${encodeURIComponent(searchTerm)}`);
        const data = await response.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    router.push(result.url);
    setSearchOpen(false);
    setSearchTerm('');
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchTerm('');
      setResults([]);
    } else if (e.key === 'Enter' && searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm('');
      setResults([]);
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = [];
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

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

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center">
        {/* Search — magnifying glass that expands to inline input */}
        <div ref={searchRef} style={{ position: 'relative', marginLeft: '24px' }}>
          {searchOpen ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                style={{
                  width: '220px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                  background: 'var(--color-bg)',
                  letterSpacing: '0.5px',
                }}
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchTerm(''); setResults([]); }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-gray)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
                className="hover:opacity-70 transition-opacity"
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text)',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
              }}
              className="hover:opacity-70 transition-opacity"
              aria-label="Search"
              title="Search (Ctrl+K)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}

          {/* Search Results Dropdown */}
          {searchOpen && (searchTerm.length >= 2) && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '360px',
                background: '#fff',
                border: '1px solid var(--color-border)',
                maxHeight: '400px',
                overflowY: 'auto',
                zIndex: 100,
              }}
            >
              {loading ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-gray)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-gray)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}>
                  No results
                </div>
              ) : (
                Object.entries(groupedResults).map(([type, items]) => (
                  <div key={type}>
                    <div style={{
                      padding: '6px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
                      color: 'var(--color-gray)',
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                      {categoryLabels[type] || type}
                    </div>
                    {items.map((result) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          textAlign: 'left',
                          background: 'none',
                          border: 'none',
                          borderBottom: '1px solid #f0f0f0',
                          cursor: 'pointer',
                        }}
                        className="hover:bg-[#fafafa] transition-colors"
                      >
                        <div style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '14px',
                          color: 'var(--color-text)',
                        }}>
                          {result.label}
                        </div>
                        {result.meta && (
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: 'var(--color-gray)',
                            marginTop: '1px',
                          }}>
                            {result.meta}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Link href="/search" style={navLinkStyle} className="hover:opacity-70 transition-opacity">
          Search
        </Link>
        <Link href="/contribute" style={navLinkStyle} className="hover:opacity-70 transition-opacity">
          Contribute
        </Link>
        <Link href="/explore/graph" style={navLinkStyle} className="hover:opacity-70 transition-opacity">
          Graph
        </Link>
        <Link href="/explore/timeline" style={navLinkStyle} className="hover:opacity-70 transition-opacity">
          Timeline
        </Link>
        {session ? (
          <button
            onClick={() => signOut()}
            style={{
              ...navLinkStyle,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            className="hover:opacity-70 transition-opacity"
          >
            Sign Out
          </button>
        ) : (
          <Link href="/api/auth/signin" style={navLinkStyle} className="hover:opacity-70 transition-opacity">
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
