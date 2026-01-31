'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import {
  Search,
  Menu,
  X,
  ChevronDown,
  Plus,
  TrendingUp,
  User,
  Settings,
  LogOut,
  GitBranch,
  Network,
  BookMarked
} from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const analyzeRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (analyzeRef.current && !analyzeRef.current.contains(event.target as Node)) {
        setAnalyzeOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, []);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b-2 border-stone-300 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2 text-lg font-black text-stone-900 hover:text-amber-600 transition-colors uppercase tracking-tight">
            <Network className="w-5 h-5" />
            <span>ChronosGraph</span>
            <span className="text-stone-400 font-bold">//</span>
            <span className="text-xs text-amber-700 tracking-wider">Evidence Archive</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Search */}
            <Link
              href="/search"
              className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </Link>

            {/* Contribute */}
            <Link
              href="/contribute"
              className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
            >
              <Plus className="w-4 h-4" />
              <span>Contribute</span>
            </Link>

            {/* Analyze Dropdown */}
            <div className="relative" ref={analyzeRef}>
              <button
                onClick={() => setAnalyzeOpen(!analyzeOpen)}
                className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Analyze</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${analyzeOpen ? 'rotate-180' : ''}`} />
              </button>

              {analyzeOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border-2 border-stone-300 shadow-xl py-2">
                  <Link
                    href="/explore/pathfinder"
                    className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                    onClick={() => setAnalyzeOpen(false)}
                  >
                    <GitBranch className="w-4 h-4 text-amber-600" />
                    <span>Pathfinder</span>
                  </Link>
                  <Link
                    href="/explore/graph"
                    className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                    onClick={() => setAnalyzeOpen(false)}
                  >
                    <Network className="w-4 h-4 text-amber-600" />
                    <span>Graph Explorer</span>
                  </Link>
                  <Link
                    href="/series"
                    className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                    onClick={() => setAnalyzeOpen(false)}
                  >
                    <BookMarked className="w-4 h-4 text-amber-600" />
                    <span>Browse Series</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Account Dropdown (Conditional) */}
            {session && (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                >
                  <User className="w-4 h-4" />
                  <span>Account</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border-2 border-stone-300 shadow-xl py-2">
                    <div className="px-4 py-2 border-b-2 border-stone-200">
                      <p className="text-xs font-black text-stone-900 uppercase tracking-wider">{session.user?.name}</p>
                      <p className="text-[10px] text-stone-500 font-mono mt-1">{session.user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                      onClick={() => setAccountOpen(false)}
                    >
                      <User className="w-4 h-4 text-amber-600" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Settings className="w-4 h-4 text-amber-600" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-amber-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Sign In Button (if not authenticated) */}
            {!session && (
              <Link
                href="/api/auth/signin"
                className="px-4 py-2 bg-amber-600 text-white font-black uppercase text-xs tracking-widest hover:bg-amber-700 transition-colors shadow-sm"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-brand-text hover:text-brand-accent transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t-2 border-stone-300 py-4 space-y-2">
            {/* Search */}
            <Link
              href="/search"
              className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search className="w-4 h-4 text-amber-600" />
              <span>Search</span>
            </Link>

            {/* Contribute */}
            <Link
              href="/contribute"
              className="flex items-center gap-3 px-4 py-2 text-stone-700 hover:bg-amber-50 transition-colors border-l-2 border-transparent hover:border-amber-600 font-mono text-sm uppercase tracking-wide"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Contribute</span>
            </Link>

            {/* Analyze Section */}
            <div className="px-4 py-2">
              <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2">Analyze</p>
              <div className="space-y-1 pl-4">
                <Link
                  href="/explore/pathfinder"
                  className="flex items-center gap-3 py-2 text-stone-700 hover:text-amber-600 transition-colors font-mono text-sm uppercase tracking-wide"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GitBranch className="w-4 h-4 text-amber-600" />
                  <span>Pathfinder</span>
                </Link>
                <Link
                  href="/explore/graph"
                  className="flex items-center gap-3 py-2 text-stone-700 hover:text-amber-600 transition-colors font-mono text-sm uppercase tracking-wide"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Network className="w-4 h-4 text-amber-600" />
                  <span>Graph Explorer</span>
                </Link>
                <Link
                  href="/series"
                  className="flex items-center gap-3 py-2 text-stone-700 hover:text-amber-600 transition-colors font-mono text-sm uppercase tracking-wide"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BookMarked className="w-4 h-4 text-amber-600" />
                  <span>Browse Series</span>
                </Link>
              </div>
            </div>

            {/* Account Section (Conditional) */}
            {session && (
              <div className="px-4 py-2 border-t-2 border-stone-300">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.2em] mb-2">Account</p>
                <div className="space-y-1 pl-4">
                  <p className="text-xs font-black text-stone-900 uppercase tracking-wider py-1">{session.user?.name}</p>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-amber-600 transition-colors font-mono text-sm uppercase tracking-wide"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4 text-amber-600" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 py-2 text-stone-700 hover:text-amber-600 transition-colors font-mono text-sm uppercase tracking-wide"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4 text-amber-600" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-3 py-2 text-amber-700 hover:text-amber-800 transition-colors font-mono text-sm uppercase tracking-wide"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sign In (if not authenticated) */}
            {!session && (
              <div className="px-4 py-2">
                <Link
                  href="/api/auth/signin"
                  className="block w-full px-4 py-2 bg-amber-600 text-white font-black uppercase text-xs tracking-widest hover:bg-amber-700 transition-colors text-center shadow-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
