'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import FigureSearchInput from '@/components/FigureSearchInput';

interface PathNode {
  node_id: string;
  node_type: string;
  name: string;
}

interface PathLink {
  from_node: string;
  to_node: string;
  rel_type: string;
  context: string;
}

interface PathResult {
  start_node: string;
  end_node: string;
  path_length: number;
  nodes: PathNode[];
  relationships: PathLink[];
}

interface LandingPathQueryProps {
  onPathFound?: (path: PathResult | null) => void;
}

export default function LandingPathQuery({ onPathFound }: LandingPathQueryProps) {
  const [startId, setStartId] = useState('');
  const [startName, setStartName] = useState('');
  const [endId, setEndId] = useState('');
  const [endName, setEndName] = useState('');
  const [path, setPath] = useState<PathResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearchPath = async () => {
    if (!startId.trim() || !endId.trim()) {
      setError('Please select both figures');
      return;
    }

    if (startId === endId) {
      setError('Please select different figures');
      return;
    }

    setError(null);
    setPath(null);
    onPathFound?.(null); // Clear any previous path highlighting
    setIsLoading(true);

    try {
      const response = await fetch('/api/pathfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_id: startId,
          end_id: endId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find path');
      }

      if (!data.path) {
        setError('No connection found between these figures');
        return;
      }

      setPath(data.path);
      onPathFound?.(data.path); // Notify parent component for graph highlighting
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find path';
      setError(message);
      onPathFound?.(null); // Clear highlighting on error
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Query Inputs */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Find Connections Between Historical Figures
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Start Figure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Figure
            </label>
            <FigureSearchInput
              onSelect={(id, name) => {
                setStartId(id);
                setStartName(name);
                setPath(null);
                setError(null);
              }}
              placeholder="e.g., Napoleon Bonaparte"
            />
            {startName && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {startName}</p>
            )}
          </div>

          {/* End Figure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Figure
            </label>
            <FigureSearchInput
              onSelect={(id, name) => {
                setEndId(id);
                setEndName(name);
                setPath(null);
                setError(null);
              }}
              placeholder="e.g., Julius Caesar"
            />
            {endName && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {endName}</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSearchPath}
          disabled={isLoading || !startId || !endId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Finding Path...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" />
              Find Connection
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Path Results */}
      {path && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-gray-900">
              Connection Found!
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {path.path_length} {path.path_length === 1 ? 'degree' : 'degrees'} of separation
            </p>
          </div>

          <div className="space-y-3">
            {path.nodes.map((node, idx) => (
              <div key={node.node_id}>
                {/* Node */}
                <div className="flex items-center">
                  <div className={`px-4 py-2 rounded-md font-medium text-sm ${
                    node.node_type === 'HistoricalFigure'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-orange-100 text-orange-900'
                  }`}>
                    {node.name}
                  </div>
                </div>

                {/* Relationship Context */}
                {idx < path.relationships.length && (
                  <div className="ml-4 my-2 pl-4 border-l-2 border-gray-200">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                      {path.relationships[idx].rel_type}
                    </p>
                    <p className="text-sm text-gray-700">
                      {path.relationships[idx].context}
                    </p>
                  </div>
                )}

                {/* Arrow */}
                {idx < path.nodes.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="text-gray-400 text-lg">↓</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpful Hint */}
      {!path && !error && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong className="font-semibold">💡 Try this:</strong> Search for two famous historical
            figures and discover how they're connected through shared media portrayals.
          </p>
        </div>
      )}
    </div>
  );
}
