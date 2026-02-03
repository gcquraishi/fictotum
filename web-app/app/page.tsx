'use client';

import { Suspense, useState } from 'react';
import GraphExplorer from '@/components/GraphExplorer';
import LandingPathQuery from '@/components/LandingPathQuery';
import { PathVisualization } from '@/lib/types';
import { CRITICAL_ENTITIES } from '@/lib/constants/entities';

// CHR-6: Single Henry VIII node as landing page entry point
// Henry VIII chosen as starting node because:
// - Extremely well-known historical figure (immediately recognizable)
// - Rich and dramatic life story (six wives, English Reformation, etc.)
// - Extensive media portrayals (films, TV series, documentaries, books, plays)
// - Strong cultural recognition across demographics
// - Visually distinctive (iconic Tudor-era appearance)
const HENRY_VIII_CANONICAL_ID = CRITICAL_ENTITIES.HENRY_VIII;

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
  const [shouldExpandHenry, setShouldExpandHenry] = useState(false);

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

  const handleHenryNameClick = () => {
    setShouldExpandHenry(true);
  };

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Hero Section - Case File Header */}
      <div className="bg-white border-b-2 border-stone-300">
        <div className="container mx-auto px-4 py-6">
          <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2 text-center">
            Historical Network Analysis // Archive_001
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-stone-900 tracking-tighter uppercase text-center">
            Discover Historical Connections
          </h1>
          <p className="text-center text-stone-600 mt-2 text-sm">
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
              <div className="w-full border-t-2 border-stone-300"></div>
            </div>
            <div className="relative flex justify-center">
              <button
                onClick={handleHenryNameClick}
                className="group bg-stone-100 px-4 text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] hover:text-amber-600 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 rounded"
                aria-label="Expand Henry VIII connections in graph below"
              >
                Or explore starting from{' '}
                <span className="underline decoration-amber-600/30 group-hover:decoration-amber-600 transition-all duration-200">
                  Henry VIII
                </span>
              </button>
            </div>
          </div>

          {/* Single-Node Graph - Dossier Sheet */}
          <div className="bg-white border-t-4 border-amber-600 shadow-xl overflow-hidden">
            {/* Path Highlighting Indicator */}
            {highlightedPath && (
              <div className="bg-amber-50 border-b-2 border-amber-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-900 font-mono">
                  <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
                  <span className="font-bold uppercase tracking-wide">Path highlighted in graph below</span>
                  <span className="text-amber-700 font-black">({highlightedPath.pathIds.length} nodes)</span>
                </div>
                <button
                  onClick={() => setHighlightedPath(undefined)}
                  className="text-xs text-amber-700 hover:text-amber-900 font-black uppercase tracking-widest underline"
                >
                  Clear
                </button>
              </div>
            )}

            <Suspense fallback={
              <div className="flex items-center justify-center" style={{ minHeight: '600px' }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
                  <p className="text-stone-500 font-mono text-sm uppercase tracking-widest">Loading graph...</p>
                </div>
              </div>
            }>
              <GraphExplorer
                canonicalId={HENRY_VIII_CANONICAL_ID}
                nodes={initialNodes}
                links={[]}
                highlightedPath={highlightedPath}
                shouldExpandCenter={shouldExpandHenry}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
