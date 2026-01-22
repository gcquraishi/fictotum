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
  Film,
  Users,
  Eye,
  GitBranch,
  Network,
  BookMarked
} from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const contributeRef = useRef<HTMLDivElement>(null);
  const analyzeRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contributeRef.current && !contributeRef.current.contains(event.target as Node)) {
        setContributeOpen(false);
      }
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
    <nav className="sticky top-0 z-50 bg-white border-b border-brand-primary/20 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-brand-primary hover:text-brand-accent transition-colors">
            <Network className="w-6 h-6" />
            <span>ChronosGraph</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Search */}
            <Link
              href="/search"
              className="flex items-center gap-2 px-4 py-2 text-brand-text hover:text-brand-accent transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </Link>

            {/* Contribute Dropdown */}
            <div className="relative" ref={contributeRef}>
              <button
                onClick={() => setContributeOpen(!contributeOpen)}
                className="flex items-center gap-2 px-4 py-2 text-brand-text hover:text-brand-accent transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Contribute</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${contributeOpen ? 'rotate-180' : ''}`} />
              </button>

              {contributeOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-brand-primary/20 rounded-lg shadow-xl py-2">
                  <Link
                    href="/contribute/media"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setContributeOpen(false)}
                  >
                    <Film className="w-4 h-4" />
                    <span>Add Media Work</span>
                  </Link>
                  <Link
                    href="/contribute/figure"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setContributeOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    <span>Add Figure</span>
                  </Link>
                  <Link
                    href="/contribute/appearance"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setContributeOpen(false)}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Add Appearance</span>
                  </Link>
                  <Link
                    href="/contribute/creator"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setContributeOpen(false)}
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Add by Creator</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Analyze Dropdown */}
            <div className="relative" ref={analyzeRef}>
              <button
                onClick={() => setAnalyzeOpen(!analyzeOpen)}
                className="flex items-center gap-2 px-4 py-2 text-brand-text hover:text-brand-accent transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Analyze</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${analyzeOpen ? 'rotate-180' : ''}`} />
              </button>

              {analyzeOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-brand-primary/20 rounded-lg shadow-xl py-2">
                  <Link
                    href="/explore/pathfinder"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setAnalyzeOpen(false)}
                  >
                    <GitBranch className="w-4 h-4" />
                    <span>Pathfinder</span>
                  </Link>
                  <Link
                    href="/explore/graph"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setAnalyzeOpen(false)}
                  >
                    <Network className="w-4 h-4" />
                    <span>Graph Explorer</span>
                  </Link>
                  <Link
                    href="/series"
                    className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                    onClick={() => setAnalyzeOpen(false)}
                  >
                    <BookMarked className="w-4 h-4" />
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
                  className="flex items-center gap-2 px-4 py-2 text-brand-text hover:text-brand-accent transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Account</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>

                {accountOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-brand-primary/20 rounded-lg shadow-xl py-2">
                    <div className="px-4 py-2 border-b border-brand-primary/10">
                      <p className="text-sm font-medium text-brand-text">{session.user?.name}</p>
                      <p className="text-xs text-brand-text/60">{session.user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                      onClick={() => setAccountOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors"
                      onClick={() => setAccountOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={() => {
                        setAccountOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-brand-accent hover:bg-brand-accent/5 transition-colors"
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
                className="px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:bg-brand-accent/90 transition-colors shadow-sm"
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
          <div className="md:hidden border-t border-brand-primary/20 py-4 space-y-2">
            {/* Search */}
            <Link
              href="/search"
              className="flex items-center gap-3 px-4 py-2 text-brand-text hover:bg-brand-primary/5 transition-colors rounded"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </Link>

            {/* Contribute Section */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-brand-text/60 uppercase tracking-wider mb-2">Contribute</p>
              <div className="space-y-1 pl-4">
                <Link
                  href="/contribute/media"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Film className="w-4 h-4" />
                  <span>Add Media Work</span>
                </Link>
                <Link
                  href="/contribute/figure"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="w-4 h-4" />
                  <span>Add Figure</span>
                </Link>
                <Link
                  href="/contribute/appearance"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Eye className="w-4 h-4" />
                  <span>Add Appearance</span>
                </Link>
                <Link
                  href="/contribute/creator"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GitBranch className="w-4 h-4" />
                  <span>Add by Creator</span>
                </Link>
              </div>
            </div>

            {/* Analyze Section */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-brand-text/60 uppercase tracking-wider mb-2">Analyze</p>
              <div className="space-y-1 pl-4">
                <Link
                  href="/explore/pathfinder"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <GitBranch className="w-4 h-4" />
                  <span>Pathfinder</span>
                </Link>
                <Link
                  href="/explore/graph"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Network className="w-4 h-4" />
                  <span>Graph Explorer</span>
                </Link>
                <Link
                  href="/series"
                  className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BookMarked className="w-4 h-4" />
                  <span>Browse Series</span>
                </Link>
              </div>
            </div>

            {/* Account Section (Conditional) */}
            {session && (
              <div className="px-4 py-2 border-t border-brand-primary/20">
                <p className="text-xs font-semibold text-brand-text/60 uppercase tracking-wider mb-2">Account</p>
                <div className="space-y-1 pl-4">
                  <p className="text-sm font-medium text-brand-text py-1">{session.user?.name}</p>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 py-2 text-brand-text hover:text-brand-accent transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-3 py-2 text-brand-accent hover:text-brand-accent/80 transition-colors"
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
                  className="block w-full px-4 py-2 bg-brand-accent text-white font-semibold rounded-lg hover:bg-brand-accent/90 transition-colors text-center shadow-sm"
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
