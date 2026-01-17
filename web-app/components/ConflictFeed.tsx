'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ConflictingFigure, HistoriographicPath } from '@/lib/types';
import { Search, TrendingUp, AlertTriangle, ArrowRight, Film, BookOpen, Gamepad2, Tv, ExternalLink } from 'lucide-react';
import FigureSearchInput from './FigureSearchInput';

interface ConflictFeedProps {
  conflicts: ConflictingFigure[];
}

const SENTIMENT_COLORS = {
  Heroic: '#22c55e',
  Villainous: '#ef4444',
  Complex: '#eab308',
  Neutral: '#6b7280',
};

const MEDIA_TYPE_ICONS = {
  Book: BookOpen,
  Game: Gamepad2,
  Film: Film,
  TVSeries: Tv,
};

export default function ConflictFeed({ conflicts }: ConflictFeedProps) {
  const [searchStart, setSearchStart] = useState('');
  const [searchStartName, setSearchStartName] = useState('');
  const [searchEnd, setSearchEnd] = useState('');
  const [searchEndName, setSearchEndName] = useState('');
  const [path, setPath] = useState<HistoriographicPath | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handlePathSearch = async () => {
    if (!searchStart.trim() || !searchEnd.trim()) {
      setPathError('Please select both start and end figures');
      return;
    }

    setPathError(null);
    setPath(null);

    startTransition(async () => {
      try {
        const response = await fetch('/api/pathfinder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_id: searchStart.trim(),
            end_id: searchEnd.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to find path');
        }

        const data = await response.json();
        if (data.path) {
          setPath(data.path);
        } else {
          setPathError('No path found between these figures');
        }
      } catch (error) {
        setPathError('Error searching for path. Please try again.');
        console.error('Path search error:', error);
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Six Degrees Search Bar */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700/50 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Six Degrees of Historiography
          </h2>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Discover unexpected connections between historical figures through media portrayals and historical interactions
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Figure
            </label>
            <FigureSearchInput
              placeholder="Search for starting figure..."
              onSelect={(canonicalId, name) => {
                setSearchStart(canonicalId);
                setSearchStartName(name);
              }}
              disabled={isPending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Figure
            </label>
            <FigureSearchInput
              placeholder="Search for ending figure..."
              onSelect={(canonicalId, name) => {
                setSearchEnd(canonicalId);
                setSearchEndName(name);
              }}
              disabled={isPending}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handlePathSearch}
              disabled={isPending || !searchStart || !searchEnd}
              className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isPending ? 'Searching...' : 'Find Path'}
            </button>
          </div>
        </div>

        {/* Path Results */}
        {pathError && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
            {pathError}
          </div>
        )}

        {path && (
          <PathDisplay path={path} />
        )}
      </div>

      {/* Conflict Feed */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-6 h-6 text-orange-400" />
          <h2 className="text-2xl font-bold">Characterization Conflicts</h2>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Historical figures portrayed differently across media works, highlighting narrative disagreements
        </p>

        <div className="space-y-6">
          {conflicts.length > 0 ? (
            conflicts.map((conflict) => (
              <CollisionCard key={conflict.figure.canonical_id} conflict={conflict} />
            ))
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No characterization conflicts found</p>
              <p className="text-sm text-gray-600 mt-2">
                Conflicts are marked when portrayals significantly disagree across media works
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Collision Card Component */
function CollisionCard({ conflict }: { conflict: ConflictingFigure }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden hover:border-orange-600/50 transition-colors">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-b border-gray-700 p-5">
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/figure/${conflict.figure.canonical_id}`}
              className="text-xl font-bold hover:text-orange-400 transition-colors"
            >
              {conflict.figure.name}
            </Link>
            <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-400">
              {conflict.figure.title && <span>{conflict.figure.title}</span>}
              {conflict.figure.era && (
                <>
                  <span>•</span>
                  <span>{conflict.figure.era}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-orange-400 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {conflict.portrayals.length} Conflicting Portrayals
          </div>
        </div>
      </div>

      {/* Side-by-side Portrayal Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
        {conflict.portrayals.map((portrayal, idx) => (
          <PortrayalComparisonCard key={`${portrayal.media.media_id}-${idx}`} portrayal={portrayal} />
        ))}
      </div>

      {/* Conflict Summary */}
      {conflict.portrayals.some(p => p.conflict_notes) && (
        <div className="border-t border-gray-700 p-5 bg-gray-900/50">
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Conflict Analysis</h4>
          <div className="space-y-2">
            {conflict.portrayals
              .filter(p => p.conflict_notes)
              .map((portrayal, idx) => (
                <div key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-orange-400 mt-0.5">•</span>
                  <span>{portrayal.conflict_notes}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* Portrayal Comparison Card */
function PortrayalComparisonCard({ portrayal }: { portrayal: ConflictingFigure['portrayals'][0] }) {
  const MediaIcon = MEDIA_TYPE_ICONS[portrayal.media.media_type] || Film;
  const sentimentColor = SENTIMENT_COLORS[portrayal.sentiment];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start gap-2 mb-3">
        <MediaIcon className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-white truncate">{portrayal.media.title}</h4>
          <p className="text-xs text-gray-500">
            {portrayal.media.release_year} • {portrayal.media.media_type}
          </p>
        </div>
      </div>

      <div
        className="inline-block px-2 py-1 rounded text-xs font-semibold mb-2 border"
        style={{
          backgroundColor: `${sentimentColor}20`,
          borderColor: sentimentColor,
          color: sentimentColor,
        }}
      >
        {portrayal.sentiment}
      </div>

      {portrayal.is_protagonist && (
        <div className="inline-block ml-2 px-2 py-1 bg-purple-900/30 text-purple-400 border border-purple-700 rounded text-xs font-semibold mb-2">
          Lead
        </div>
      )}

      {portrayal.role_description && (
        <p className="text-xs text-gray-400 mt-2 line-clamp-3">
          {portrayal.role_description}
        </p>
      )}

      {portrayal.media.creator && (
        <p className="text-xs text-gray-600 mt-2">
          by {portrayal.media.creator}
        </p>
      )}
    </div>
  );
}

/* Path Display Component */
function PathDisplay({ path }: { path: HistoriographicPath }) {
  return (
    <div className="mt-6 bg-gray-800/50 border border-blue-700/50 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blue-400">
          Path Found: {path.path_length} degree{path.path_length !== 1 ? 's' : ''} of separation
        </h3>
        <div className="text-sm text-gray-400">
          {path.nodes.length} nodes
        </div>
      </div>

      {/* Path Visualization */}
      <div className="space-y-3">
        {path.nodes.map((node, idx) => (
          <div key={`${node.node_id}-${idx}`}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white">{node.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {node.node_type}
                      {node.node_type === 'MediaWork' && node.properties.release_year && (
                        <> • {node.properties.release_year}</>
                      )}
                    </div>
                  </div>
                  {node.node_type === 'MediaWork' && (
                    <div className="text-gray-600">
                      <Film className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Relationship Arrow */}
            {idx < path.relationships.length && (
              <div className="flex items-center gap-2 ml-4 my-2 text-sm text-gray-500">
                <ArrowRight className="w-4 h-4" />
                <span className="text-xs">
                  {path.relationships[idx].rel_type}
                  {path.relationships[idx].context && (
                    <span className="text-gray-600"> ({path.relationships[idx].context})</span>
                  )}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
