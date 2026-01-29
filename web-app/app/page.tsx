'use client';

import { Suspense, useState } from 'react';
import GraphExplorer from '@/components/GraphExplorer';
import LandingPathQuery from '@/components/LandingPathQuery';
import { PathVisualization } from '@/lib/types';

// CHR-6: Single Henry VIII node as landing page entry point
// Henry VIII chosen as starting node because:
// - Extremely well-known historical figure (immediately recognizable)
// - Rich and dramatic life story (six wives, English Reformation, etc.)
// - Extensive media portrayals (films, TV series, documentaries, books, plays)
// - Strong cultural recognition across demographics
// - Visually distinctive (iconic Tudor-era appearance)
const HENRY_VIII_CANONICAL_ID = 'Q38370'; // Wikidata Q-ID from Neo4j

interface PathNode {
  node_id: string;
  node_type: string;
  name: string;
}

interface PathRelationship {
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
  relationships: PathRelationship[];
}

// Helper function to convert path result to PathVisualization format
function convertPathToVisualization(path: PathResult): PathVisualization {
  // Extract node IDs (use full node ID format: figure-Q12345 or media-Q67890)
  const pathIds = path.nodes.map(node => {
    const prefix = node.node_type === 'HistoricalFigure' ? 'figure-' : 'media-';
    return prefix + node.node_id;
  });

  // Create path links from consecutive nodes
  const pathLinks: { source: string; target: string }[] = [];
  for (let i = 0; i < pathIds.length - 1; i++) {
    pathLinks.push({
      source: pathIds[i],
      target: pathIds[i + 1],
    });
  }

  return { pathIds, pathLinks };
}

export default function LandingPage() {
  const [highlightedPath, setHighlightedPath] = useState<PathVisualization | undefined>(undefined);

  // Single-node initial state for progressive disclosure onboarding
  // User sees only Henry VIII on first load, clicks to bloom connections
  const initialNodes = [{
    id: `figure-${HENRY_VIII_CANONICAL_ID}`,
    name: 'Henry VIII',
    type: 'figure' as const,
  }];

  const handlePathFound = (path: PathResult | null) => {
    if (path) {
      setHighlightedPath(convertPathToVisualization(path));
    } else {
      setHighlightedPath(undefined);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Emphasizes Discovery */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Discover Historical Connections
          </h1>
          <p className="text-center text-gray-600 mt-1">
            Explore how historical figures connect through media portrayals
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Path Query Interface */}
          <LandingPathQuery onPathFound={handlePathFound} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-4 text-sm text-gray-500 font-medium">
                Or explore starting from Henry VIII
              </span>
            </div>
          </div>

          {/* Single-Node Graph - Progressive Disclosure */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Path Highlighting Indicator */}
            {highlightedPath && (
              <div className="bg-blue-50 border-b border-blue-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                  <span className="font-medium">Path highlighted in graph below</span>
                  <span className="text-blue-700">({highlightedPath.pathIds.length} nodes)</span>
                </div>
                <button
                  onClick={() => setHighlightedPath(undefined)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-medium underline"
                >
                  Clear highlighting
                </button>
              </div>
            )}

            <Suspense fallback={
              <div className="flex items-center justify-center" style={{ minHeight: '600px' }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading graph...</p>
                </div>
              </div>
            }>
              <GraphExplorer
                canonicalId={HENRY_VIII_CANONICAL_ID}
                nodes={initialNodes}
                links={[]}
                highlightedPath={highlightedPath}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
