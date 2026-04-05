'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, AlertTriangle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface DuplicatePair {
  figure1: FigureData;
  figure2: FigureData;
  similarity: {
    combined: number;
    lexical: number;
    phonetic: number;
    confidence: 'high' | 'medium' | 'low';
  };
  year_match: boolean;
}

interface FigureData {
  canonical_id: string;
  name: string;
  wikidata_id: string | null;
  birth_year: number | null;
  death_year: number | null;
  era: string | null;
  portrayals_count: number;
}

interface MediaAppearance {
  title: string;
  media_type: string;
  release_year: number | null;
  role: string | null;
}

export default function DuplicatesPage() {
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.7);
  const [minConfidence, setMinConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  const [expandedPair, setExpandedPair] = useState<number | null>(null);
  const [mediaCache, setMediaCache] = useState<Record<string, MediaAppearance[]>>({});
  const [totalScanned, setTotalScanned] = useState(0);

  useEffect(() => {
    fetchDuplicates();
  }, [threshold, minConfidence]);

  const fetchDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/audit/duplicates?threshold=${threshold}&min_confidence=${minConfidence}&limit=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch duplicates');
      }

      const data = await response.json();
      setDuplicates(data.duplicates || []);
      setTotalScanned(data.total_scanned || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaAppearances = async (canonicalId: string): Promise<MediaAppearance[]> => {
    // Check cache first
    if (mediaCache[canonicalId]) {
      return mediaCache[canonicalId];
    }

    try {
      // Query Neo4j for media appearances
      const response = await fetch(`/api/figures/${canonicalId}/appearances`);
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      const appearances = data.appearances || [];

      // Update cache
      setMediaCache(prev => ({ ...prev, [canonicalId]: appearances }));
      return appearances;
    } catch (err) {
      console.error('Failed to fetch media appearances:', err);
      return [];
    }
  };

  const toggleExpandPair = async (index: number) => {
    if (expandedPair === index) {
      setExpandedPair(null);
    } else {
      setExpandedPair(index);
      // Pre-fetch media appearances for both figures
      const pair = duplicates[index];
      await Promise.all([
        fetchMediaAppearances(pair.figure1.canonical_id),
        fetchMediaAppearances(pair.figure2.canonical_id),
      ]);
    }
  };

  const handleMerge = async (pair: DuplicatePair, primaryId: string) => {
    const secondaryId = primaryId === pair.figure1.canonical_id
      ? pair.figure2.canonical_id
      : pair.figure1.canonical_id;

    const confirmMessage = `Merge ${secondaryId} into ${primaryId}?\n\nThis will:\n- Transfer all relationships to ${primaryId}\n- Merge properties (keeping non-null values)\n- Soft-delete ${secondaryId}\n- Create audit trail\n\nThis action cannot be easily undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch('/api/audit/duplicates/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_id: primaryId,
          secondary_id: secondaryId,
          dry_run: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Merge failed');
      }

      alert('Merge completed successfully!');
      // Refresh the list
      fetchDuplicates();
    } catch (err) {
      alert(`Merge failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDismiss = async (pair: DuplicatePair) => {
    const note = prompt('Optional: Add a note explaining why these are not duplicates');

    try {
      const response = await fetch('/api/audit/duplicates/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figure1_id: pair.figure1.canonical_id,
          figure2_id: pair.figure2.canonical_id,
          note: note || 'Dismissed by admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Dismiss failed');
      }

      // Remove from list
      setDuplicates(prev => prev.filter(p =>
        !(p.figure1.canonical_id === pair.figure1.canonical_id &&
          p.figure2.canonical_id === pair.figure2.canonical_id)
      ));
    } catch (err) {
      alert(`Dismiss failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-red-500 border-red-500/30 bg-red-500/5';
      case 'medium': return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5';
      case 'low': return 'text-blue-500 border-blue-500/30 bg-blue-500/5';
      default: return 'text-zinc-500 border-zinc-500/30 bg-zinc-500/5';
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
            <ShieldAlert className="w-4 h-4" />
            Duplicate Detection // Admin Access
          </div>
        </div>
        <div className="text-xs text-zinc-600">
          SCANNED: {totalScanned} figures
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-700 min-h-[calc(100vh-60px)] p-6 bg-zinc-900 hidden md:block">
          <div className="mb-8">
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Filters</div>

            {/* Threshold Control */}
            <div className="mb-6">
              <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2">
                Similarity Threshold
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-500"
              />
              <div className="text-xs text-zinc-500 mt-1 text-right">{(threshold * 100).toFixed(0)}%</div>
            </div>

            {/* Confidence Filter */}
            <div>
              <label className="text-xs text-zinc-400 uppercase tracking-wider block mb-2">
                Min Confidence
              </label>
              <select
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value as 'high' | 'medium' | 'low')}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs p-2 rounded"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="p-4 border border-yellow-500/30 bg-yellow-500/5 text-yellow-100 text-sm">
            <div className="font-bold mb-2 text-xs uppercase tracking-wider">Found</div>
            <div className="text-3xl font-black">{duplicates.length}</div>
            <div className="text-xs text-yellow-500/70 mt-1">potential duplicates</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 md:p-12 bg-[#121214] relative overflow-hidden">
          {/* Background Grid */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />

          <header className="relative z-10 mb-12">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tighter uppercase text-stone-200">
              Duplicate Detection
            </h1>
            <p className="text-zinc-500 text-sm max-w-2xl">
              Automated detection using enhanced similarity scoring (70% lexical Levenshtein, 30% phonetic Double Metaphone).
              Review potential duplicates and merge or dismiss as appropriate.
            </p>
          </header>

          {loading && (
            <div className="text-center py-12">
              <div className="text-yellow-500 text-lg">Scanning database...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-6 mb-6">
              <div className="text-red-500 font-bold uppercase text-sm mb-2">Error</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          )}

          {!loading && !error && duplicates.length === 0 && (
            <div className="bg-zinc-900 border border-zinc-700 p-12 text-center">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <div className="text-xl font-bold text-zinc-300 mb-2">No duplicates found</div>
              <div className="text-sm text-zinc-500">Try lowering the threshold or minimum confidence level.</div>
            </div>
          )}

          {!loading && !error && duplicates.length > 0 && (
            <div className="space-y-6 relative z-10">
              {duplicates.map((pair, index) => (
                <div
                  key={`${pair.figure1.canonical_id}-${pair.figure2.canonical_id}`}
                  className="bg-zinc-950 border border-zinc-700 hover:border-zinc-500 transition-colors"
                >
                  {/* Header */}
                  <div
                    className="p-6 cursor-pointer flex justify-between items-center"
                    onClick={() => toggleExpandPair(index)}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`px-3 py-1 border rounded text-xs font-bold uppercase ${getConfidenceColor(pair.similarity.confidence)}`}>
                        {pair.similarity.confidence} ({(pair.similarity.combined * 100).toFixed(1)}%)
                      </div>
                      <div>
                        <div className="text-zinc-300 font-bold">
                          {pair.figure1.name} <span className="text-zinc-600 mx-2">/</span> {pair.figure2.name}
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">
                          Lexical: {(pair.similarity.lexical * 100).toFixed(0)}% •
                          Phonetic: {(pair.similarity.phonetic * 100).toFixed(0)}%
                          {pair.year_match && <span className="ml-2 text-green-500">✓ Year Match</span>}
                        </div>
                      </div>
                    </div>
                    {expandedPair === index ? (
                      <ChevronUp className="w-5 h-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>

                  {/* Expanded Details */}
                  {expandedPair === index && (
                    <div className="border-t border-zinc-700 p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
                        {/* Figure 1 */}
                        <FigureCard
                          figure={pair.figure1}
                          appearances={mediaCache[pair.figure1.canonical_id] || []}
                          onSelectAsPrimary={() => handleMerge(pair, pair.figure1.canonical_id)}
                        />

                        {/* Figure 2 */}
                        <FigureCard
                          figure={pair.figure2}
                          appearances={mediaCache[pair.figure2.canonical_id] || []}
                          onSelectAsPrimary={() => handleMerge(pair, pair.figure2.canonical_id)}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-6 border-t border-zinc-800">
                        <button
                          onClick={() => handleDismiss(pair)}
                          className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Not a Duplicate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FigureCardProps {
  figure: FigureData;
  appearances: MediaAppearance[];
  onSelectAsPrimary: () => void;
}

function FigureCard({ figure, appearances, onSelectAsPrimary }: FigureCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">{figure.name}</h3>
          <div className="text-xs text-zinc-500 space-y-1">
            <div>ID: {figure.canonical_id}</div>
            {figure.wikidata_id && (
              <div className="text-green-500">
                Wikidata: {figure.wikidata_id}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={onSelectAsPrimary}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Keep This
        </button>
      </div>

      <div className="space-y-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <div className="text-zinc-600 uppercase tracking-wider mb-1">Birth Year</div>
            <div className="text-zinc-300">{figure.birth_year || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-zinc-600 uppercase tracking-wider mb-1">Death Year</div>
            <div className="text-zinc-300">{figure.death_year || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-zinc-600 uppercase tracking-wider mb-1">Era</div>
            <div className="text-zinc-300">{figure.era || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-zinc-600 uppercase tracking-wider mb-1">Portrayals</div>
            <div className="text-zinc-300 font-bold">{figure.portrayals_count}</div>
          </div>
        </div>

        {/* Media Appearances */}
        {appearances.length > 0 && (
          <div>
            <div className="text-zinc-600 uppercase tracking-wider text-xs mb-2">Media Appearances</div>
            <ul className="space-y-2">
              {appearances.slice(0, 5).map((app, i) => (
                <li key={i} className="text-xs text-zinc-400 border-l-2 border-zinc-800 pl-3">
                  {app.title} ({app.release_year || 'Unknown'})
                  {app.role && <span className="text-zinc-600 ml-2">• {app.role}</span>}
                </li>
              ))}
              {appearances.length > 5 && (
                <li className="text-xs text-zinc-600 pl-3">
                  +{appearances.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
