'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Activity, Database, AlertTriangle, TrendingUp, Download, RefreshCw } from 'lucide-react';

interface HealthMetrics {
  timestamp: string;
  database: {
    total_nodes: number;
    total_relationships: number;
    nodes_by_label: Record<string, number>;
    relationships_by_type: Record<string, number>;
  };
  data_quality: {
    orphaned_nodes: number;
    orphaned_nodes_list: Array<{ label: string; count: number }>;
    figures_without_era: number;
    figures_without_wikidata: number;
    media_without_wikidata: number;
    figures_without_portrayals: number;
  };
  indexes: {
    total_indexes: number;
    online_indexes: number;
    index_usage: Array<{
      name: string;
      read_count: number;
      entity_type: string;
      properties: string[];
    }>;
  };
  performance: {
    avg_query_time_ms: number | null;
    slow_queries_count: number;
  };
}

export default function HealthDashboardPage() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  const fetchHealthMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/health');
      if (!response.ok) {
        throw new Error('Failed to fetch health metrics');
      }
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const response = await fetch('/api/admin/health?format=csv');
      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fictotum-health-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getHealthScore = (): number => {
    if (!metrics) return 0;

    let score = 100;

    // Deduct points for data quality issues
    const orphanedRatio = metrics.data_quality.orphaned_nodes / metrics.database.total_nodes;
    score -= orphanedRatio * 20; // Up to -20 points for orphaned nodes

    const figuresWithoutEraRatio =
      metrics.data_quality.figures_without_era / (metrics.database.nodes_by_label['HistoricalFigure'] || 1);
    score -= figuresWithoutEraRatio * 10; // Up to -10 points for missing era

    const figuresWithoutWikidataRatio =
      metrics.data_quality.figures_without_wikidata / (metrics.database.nodes_by_label['HistoricalFigure'] || 1);
    score -= figuresWithoutWikidataRatio * 15; // Up to -15 points for missing Wikidata

    const figuresWithoutPortrayalsRatio =
      metrics.data_quality.figures_without_portrayals / (metrics.database.nodes_by_label['HistoricalFigure'] || 1);
    score -= figuresWithoutPortrayalsRatio * 10; // Up to -10 points for no portrayals

    return Math.max(0, Math.min(100, Math.round(score)));
  };

  const getHealthColor = (score: number): string => {
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthLabel = (score: number): string => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'FAIR';
    return 'NEEDS ATTENTION';
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
            <Activity className="w-4 h-4" />
            Database Health // Admin Access
          </div>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-xs text-zinc-600">
              Updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <button
            onClick={fetchHealthMetrics}
            className="text-zinc-500 hover:text-yellow-500 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={downloadCSV}
            className="text-zinc-500 hover:text-yellow-500 transition-colors"
            disabled={loading || !metrics}
          >
            <Download className="w-4 h-4" />
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
            Database Health
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl">
            Real-time monitoring of Neo4j Aura instance c78564a4. Tracking node counts, relationship integrity, data
            quality, and index performance.
          </p>
        </header>

        {loading && !metrics && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-yellow-500 mx-auto mb-4 animate-pulse" />
            <div className="text-yellow-500 text-lg">Loading health metrics...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-6 mb-6">
            <div className="text-red-500 font-bold uppercase text-sm mb-2">Error</div>
            <div className="text-red-300 text-sm">{error}</div>
          </div>
        )}

        {metrics && (
          <div className="space-y-8 relative z-10">
            {/* Health Score Card */}
            <div className="bg-zinc-950 border border-zinc-700 p-8">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Overall Health Score</div>
                  <div className={`text-6xl font-black ${getHealthColor(getHealthScore())}`}>
                    {getHealthScore()}
                    <span className="text-2xl">/100</span>
                  </div>
                  <div className={`text-sm font-bold mt-2 ${getHealthColor(getHealthScore())}`}>
                    {getHealthLabel(getHealthScore())}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Database Instance</div>
                  <div className="text-2xl font-bold text-zinc-300">Neo4j Aura</div>
                  <div className="text-sm text-zinc-600 font-mono">c78564a4</div>
                </div>
              </div>
            </div>

            {/* Database Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Nodes"
                value={metrics.database.total_nodes.toLocaleString()}
                icon={<Database className="w-6 h-6" />}
                color="text-blue-500"
              />
              <StatCard
                title="Total Relationships"
                value={metrics.database.total_relationships.toLocaleString()}
                icon={<TrendingUp className="w-6 h-6" />}
                color="text-green-500"
              />
              <StatCard
                title="Total Indexes"
                value={metrics.indexes.total_indexes.toString()}
                subtitle={`${metrics.indexes.online_indexes} online`}
                icon={<Activity className="w-6 h-6" />}
                color="text-purple-500"
              />
              <StatCard
                title="Orphaned Nodes"
                value={metrics.data_quality.orphaned_nodes.toString()}
                subtitle={`${((metrics.data_quality.orphaned_nodes / metrics.database.total_nodes) * 100).toFixed(1)}% of total`}
                icon={<AlertTriangle className="w-6 h-6" />}
                color={metrics.data_quality.orphaned_nodes > 10 ? 'text-red-500' : 'text-zinc-500'}
              />
            </div>

            {/* Nodes by Label */}
            <div className="bg-zinc-950 border border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Nodes by Label</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(metrics.database.nodes_by_label).map(([label, count]) => (
                  <div key={label} className="bg-zinc-900 border border-zinc-800 p-4">
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-2xl font-bold text-white">{count.toLocaleString()}</div>
                    <div className="text-xs text-zinc-600 mt-1">
                      {((count / metrics.database.total_nodes) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationships by Type */}
            <div className="bg-zinc-950 border border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Relationships by Type</h2>
              <div className="space-y-3">
                {Object.entries(metrics.database.relationships_by_type)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-zinc-300">{type}</div>
                        <div className="text-xs text-zinc-600 mt-1">
                          {((count / metrics.database.total_relationships) * 100).toFixed(1)}% of total
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-white">{count.toLocaleString()}</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Data Quality Issues */}
            <div className="bg-zinc-950 border border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Data Quality Issues
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <QualityIssue
                  title="Figures Without Era"
                  count={metrics.data_quality.figures_without_era}
                  total={metrics.database.nodes_by_label['HistoricalFigure'] || 0}
                />
                <QualityIssue
                  title="Figures Without Wikidata"
                  count={metrics.data_quality.figures_without_wikidata}
                  total={metrics.database.nodes_by_label['HistoricalFigure'] || 0}
                />
                <QualityIssue
                  title="Media Without Wikidata"
                  count={metrics.data_quality.media_without_wikidata}
                  total={metrics.database.nodes_by_label['MediaWork'] || 0}
                />
                <QualityIssue
                  title="Figures Without Portrayals"
                  count={metrics.data_quality.figures_without_portrayals}
                  total={metrics.database.nodes_by_label['HistoricalFigure'] || 0}
                />
              </div>

              {metrics.data_quality.orphaned_nodes_list.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <div className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Orphaned Nodes by Label</div>
                  <div className="space-y-2">
                    {metrics.data_quality.orphaned_nodes_list.map(item => (
                      <div key={item.label} className="flex justify-between items-center text-sm">
                        <span className="text-zinc-400">{item.label}</span>
                        <span className="text-zinc-300 font-bold">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Index Usage */}
            <div className="bg-zinc-950 border border-zinc-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Index Usage (Top 20)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-zinc-800">
                    <tr>
                      <th className="text-left text-zinc-500 uppercase tracking-wider text-xs pb-3 font-bold">Index Name</th>
                      <th className="text-left text-zinc-500 uppercase tracking-wider text-xs pb-3 font-bold">Entity Type</th>
                      <th className="text-left text-zinc-500 uppercase tracking-wider text-xs pb-3 font-bold">Properties</th>
                      <th className="text-right text-zinc-500 uppercase tracking-wider text-xs pb-3 font-bold">Read Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.indexes.index_usage.map((index, i) => (
                      <tr key={index.name} className="border-b border-zinc-800/50">
                        <td className="py-3 text-zinc-300 font-mono text-xs">{index.name}</td>
                        <td className="py-3 text-zinc-400 text-xs">{index.entity_type}</td>
                        <td className="py-3 text-zinc-400 text-xs">{index.properties.join(', ')}</td>
                        <td className="py-3 text-right text-white font-bold">{index.read_count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wider">{title}</div>
        <div className={color}>{icon}</div>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      {subtitle && <div className="text-xs text-zinc-600">{subtitle}</div>}
    </div>
  );
}

interface QualityIssueProps {
  title: string;
  count: number;
  total: number;
}

function QualityIssue({ title, count, total }: QualityIssueProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  const isGood = percentage < 10;
  const isFair = percentage < 30;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4">
      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">{title}</div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold ${isGood ? 'text-green-500' : isFair ? 'text-yellow-500' : 'text-red-500'}`}
        >
          {count}
        </span>
        <span className="text-sm text-zinc-600">/ {total.toLocaleString()}</span>
      </div>
      <div className="mt-2">
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full ${isGood ? 'bg-green-500' : isFair ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
        <div className="text-xs text-zinc-600 mt-1">{percentage.toFixed(1)}%</div>
      </div>
    </div>
  );
}
