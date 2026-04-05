'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, Users, Search, GitBranch, Target, Eye, MousePointer } from 'lucide-react';

interface AnalyticsStats {
  timestamp: string;
  time_range: string;
  overview: {
    total_events: number;
    unique_sessions: number;
    page_views: number;
    search_queries: number;
    contributions: number;
  };
  top_pages: Array<{ path: string; views: number }>;
  top_searches: Array<{ query: string; count: number; avg_results: number }>;
  graph_interactions: {
    expand: number;
    collapse: number;
    navigate: number;
  };
  contribution_funnel: {
    started: number;
    completed: number;
    completion_rate: number;
  };
  popular_eras: Array<{ era: string; count: number }>;
  popular_media_types: Array<{ media_type: string; count: number }>;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1d' | '7d' | '30d'>('7d');

  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analytics/stats?range=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300 font-mono selection:bg-yellow-500 selection:text-black">
      {/* Top Bar */}
      <div className="border-b border-zinc-700 bg-zinc-950 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-yellow-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="text-xs tracking-[0.2em] text-yellow-500 uppercase font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics // Admin Access
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('1d')}
            className={`px-3 py-1 text-xs rounded ${
              timeRange === '1d' ? 'bg-yellow-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1 text-xs rounded ${
              timeRange === '7d' ? 'bg-yellow-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1 text-xs rounded ${
              timeRange === '30d' ? 'bg-yellow-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      <div className="p-8 md:p-12 bg-[#121214] relative overflow-hidden min-h-[calc(100vh-60px)]">
        {/* Background Grid */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <header className="relative z-10 mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tighter uppercase text-stone-200">
            Analytics Dashboard
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl">
            Privacy-first analytics. No third-party trackers, no personal data collection. GDPR/CCPA compliant.
          </p>
        </header>

        {loading && (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
            <div className="text-yellow-500 text-lg">Loading analytics...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-6 mb-6">
            <div className="text-red-500 font-bold uppercase text-sm mb-2">Error</div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        )}

        {stats && (
          <div className="space-y-8 relative z-10">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <MetricCard
                title="Total Events"
                value={stats.overview.total_events.toLocaleString()}
                icon={<BarChart3 className="w-6 h-6" />}
                color="text-blue-500"
              />
              <MetricCard
                title="Unique Sessions"
                value={stats.overview.unique_sessions.toLocaleString()}
                icon={<Users className="w-6 h-6" />}
                color="text-green-500"
              />
              <MetricCard
                title="Page Views"
                value={stats.overview.page_views.toLocaleString()}
                icon={<Eye className="w-6 h-6" />}
                color="text-purple-500"
              />
              <MetricCard
                title="Searches"
                value={stats.overview.search_queries.toLocaleString()}
                icon={<Search className="w-6 h-6" />}
                color="text-yellow-500"
              />
              <MetricCard
                title="Contributions"
                value={stats.overview.contributions.toLocaleString()}
                icon={<Target className="w-6 h-6" />}
                color="text-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Pages */}
              <div className="bg-zinc-950 border border-zinc-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-500" />
                  Top Pages
                </h2>
                {stats.top_pages.length === 0 ? (
                  <div className="text-zinc-600 text-sm">No page views in this time range</div>
                ) : (
                  <div className="space-y-3">
                    {stats.top_pages.map((page, i) => (
                      <div key={i} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3">
                        <div className="text-sm text-zinc-400 font-mono truncate flex-1 mr-4">{page.path}</div>
                        <div className="text-white font-bold">{page.views}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Searches */}
              <div className="bg-zinc-950 border border-zinc-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-5 h-5 text-yellow-500" />
                  Top Searches
                </h2>
                {stats.top_searches.length === 0 ? (
                  <div className="text-zinc-600 text-sm">No searches in this time range</div>
                ) : (
                  <div className="space-y-3">
                    {stats.top_searches.map((search, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 p-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm text-zinc-300 font-medium">{search.query}</div>
                          <div className="text-white font-bold">{search.count}</div>
                        </div>
                        <div className="text-xs text-zinc-600">Avg results: {search.avg_results}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Graph Interactions */}
            <div className="bg-zinc-950 border border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-blue-500" />
                Graph Interactions
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Expand</div>
                  <div className="text-3xl font-bold text-green-500">{stats.graph_interactions.expand}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Collapse</div>
                  <div className="text-3xl font-bold text-red-500">{stats.graph_interactions.collapse}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Navigate</div>
                  <div className="text-3xl font-bold text-blue-500">{stats.graph_interactions.navigate}</div>
                </div>
              </div>
            </div>

            {/* Contribution Funnel */}
            <div className="bg-zinc-950 border border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                Contribution Funnel
              </h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Started</div>
                  <div className="text-3xl font-bold text-blue-500">{stats.contribution_funnel.started}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Completed</div>
                  <div className="text-3xl font-bold text-green-500">{stats.contribution_funnel.completed}</div>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 text-center">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Completion Rate</div>
                  <div className="text-3xl font-bold text-yellow-500">{stats.contribution_funnel.completion_rate}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Popular Eras */}
              <div className="bg-zinc-950 border border-zinc-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Popular Eras
                </h2>
                {stats.popular_eras.length === 0 ? (
                  <div className="text-zinc-600 text-sm">No era filters in this time range</div>
                ) : (
                  <div className="space-y-2">
                    {stats.popular_eras.map((era, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-400">{era.era}</span>
                        <span className="text-white font-bold">{era.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Media Types */}
              <div className="bg-zinc-950 border border-zinc-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                  <MousePointer className="w-5 h-5 text-purple-500" />
                  Popular Media Types
                </h2>
                {stats.popular_media_types.length === 0 ? (
                  <div className="text-zinc-600 text-sm">No media type filters in this time range</div>
                ) : (
                  <div className="space-y-2">
                    {stats.popular_media_types.map((type, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-400">{type.media_type}</span>
                        <span className="text-white font-bold">{type.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function MetricCard({ title, value, icon, color }: MetricCardProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wider">{title}</div>
        <div className={color}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
