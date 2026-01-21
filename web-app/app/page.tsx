import { Suspense } from 'react';
import { getHighDegreeNetwork } from '@/lib/db';
import GraphExplorer from '@/components/GraphExplorer';

export const revalidate = 3600; // Revalidate every hour

export default async function Dashboard() {
  let networkData: any = { nodes: [], links: [] };

  try {
    // Fetch live data from Neo4j
    networkData = await getHighDegreeNetwork(50);
  } catch (error) {
    console.error('Failed to fetch network data from database:', error);
    // Return empty graph - GraphExplorer will handle gracefully
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 text-center">
            ChronosGraph
          </h1>
          <p className="text-center text-gray-600 mt-1">
            Explore historical connections through media portrayals
          </p>
        </div>
      </div>

      {/* Graph-First Hero */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Interactive Graph - The Star */}
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
                nodes={networkData.nodes}
                links={networkData.links}
              />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
