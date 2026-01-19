'use client';

import { useState } from 'react';
import FigureSearchInput from '@/components/FigureSearchInput';
import { HistoriographicPath } from '@/lib/types';

interface SelectedFigure {
  id: string;
  name: string;
}

export default function PathQueryInterface() {
  const [fromFigure, setFromFigure] = useState<SelectedFigure | null>(null);
  const [viaFigure, setViaFigure] = useState<SelectedFigure | null>(null);
  const [toFigure, setToFigure] = useState<SelectedFigure | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [pathResult, setPathResult] = useState<HistoriographicPath | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!fromFigure || !viaFigure || !toFigure) {
      setError('Please select all three figures');
      return;
    }

    setIsQuerying(true);
    setError(null);
    setPathResult(null);

    try {
      // Query path FROM -> VIA
      const path1Response = await fetch('/api/pathfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_id: fromFigure.id,
          end_id: viaFigure.id
        })
      });

      if (!path1Response.ok) {
        throw new Error('Failed to find path from start to via');
      }

      const path1Data = await path1Response.json();

      // Query path VIA -> TO
      const path2Response = await fetch('/api/pathfinder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_id: viaFigure.id,
          end_id: toFigure.id
        })
      });

      if (!path2Response.ok) {
        throw new Error('Failed to find path from via to end');
      }

      const path2Data = await path2Response.json();

      // Merge the two paths (removing duplicate via node)
      const mergedPath: HistoriographicPath = {
        start_node: fromFigure.id,
        end_node: toFigure.id,
        path_length: path1Data.path.path_length + path2Data.path.path_length,
        nodes: [
          ...path1Data.path.nodes,
          ...path2Data.path.nodes.slice(1) // Skip first node (duplicate via)
        ],
        relationships: [
          ...path1Data.path.relationships,
          ...path2Data.path.relationships
        ]
      };

      setPathResult(mergedPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find path');
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6">
        {/* Query Description */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Find Historical Paths
          </h2>
          <p className="text-sm text-gray-500">
            Get me from X to Z by way of Y
          </p>
        </div>

        {/* Three-Field Query Interface */}
        <div className="flex flex-col md:flex-row gap-4 items-end">
          {/* From Field */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <FigureSearchInput
              placeholder="Search for starting figure..."
              onSelect={(id, name) => setFromFigure({ id, name })}
              value={fromFigure?.name || ''}
              disabled={isQuerying}
            />
          </div>

          {/* Via Field */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Via
            </label>
            <FigureSearchInput
              placeholder="Search for intermediate figure..."
              onSelect={(id, name) => setViaFigure({ id, name })}
              value={viaFigure?.name || ''}
              disabled={isQuerying}
            />
          </div>

          {/* To Field */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <FigureSearchInput
              placeholder="Search for destination figure..."
              onSelect={(id, name) => setToFigure({ id, name })}
              value={toFigure?.name || ''}
              disabled={isQuerying}
            />
          </div>

          {/* Query Button */}
          <button
            onClick={handleQuery}
            disabled={isQuerying || !fromFigure || !viaFigure || !toFigure}
            className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isQuerying ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Finding...
              </span>
            ) : (
              'Find Path'
            )}
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          Search and select figures from the database
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Path Results */}
        {pathResult && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Path Found ({pathResult.path_length} steps)
            </h3>
            <div className="space-y-3">
              {pathResult.nodes.map((node, index) => (
                <div key={`${node.node_id}-${index}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      node.node_type === 'HistoricalFigure'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{node.name}</p>
                      <p className="text-xs text-gray-500">{node.node_type}</p>
                    </div>
                  </div>
                  {index < pathResult.nodes.length - 1 && pathResult.relationships[index] && (
                    <div className="ml-4 pl-4 border-l-2 border-gray-200 py-2">
                      <p className="text-xs text-gray-600">
                        → {pathResult.relationships[index].rel_type}
                        {pathResult.relationships[index].context &&
                          ` (${pathResult.relationships[index].context})`
                        }
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
