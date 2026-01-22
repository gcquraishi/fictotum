import { Suspense } from 'react';
import GraphExplorer from '@/components/GraphExplorer';

export const revalidate = 3600; // Revalidate every hour

// CHR-6: Single Henry VIII node as landing page entry point
// Henry VIII chosen as starting node because:
// - Extremely well-known historical figure (immediately recognizable)
// - Rich and dramatic life story (six wives, English Reformation, etc.)
// - Extensive media portrayals (films, TV series, documentaries, books, plays)
// - Strong cultural recognition across demographics
// - Visually distinctive (iconic Tudor-era appearance)
const HENRY_VIII_CANONICAL_ID = 'Q38370'; // Wikidata Q-ID from Neo4j

export default async function LandingPage() {
  // Single-node initial state for progressive disclosure onboarding
  // User sees only Henry VIII on first load, clicks to bloom connections
  const initialNodes = [{
    id: `figure-${HENRY_VIII_CANONICAL_ID}`,
    name: 'Henry VIII',
    type: 'figure' as const,
  }];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - Emphasizes Discovery */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            Discover Historical Connections
          </h1>
          <p className="text-center text-gray-600 mt-1">
            Start with Henry VIII and explore how historical figures connect through media portrayals
          </p>
          <p className="text-center text-sm text-gray-500 mt-2 italic">
            Click to explore connections →
          </p>
        </div>
      </div>

      {/* Single-Node Graph - Progressive Disclosure */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
