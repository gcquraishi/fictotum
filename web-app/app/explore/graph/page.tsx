'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Network, X } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import GraphExplorer from '@/components/GraphExplorer';

export default function GraphPage() {
  return (
    <Suspense fallback={<GraphLoading />}>
      <GraphContent />
    </Suspense>
  );
}

function GraphLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
        <p className="text-brand-text">Loading graph...</p>
      </div>
    </div>
  );
}

function GraphContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('id'));

  const handleSearch = (id: string, type: 'figure' | 'media') => {
    setSelectedId(id);
    router.push(`/explore/graph?id=${id}&type=${type}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Network className="w-8 h-8 text-brand-accent" />
            <h1 className="text-3xl font-bold text-brand-primary">
              Explore Graph Network
            </h1>
          </div>
          <p className="text-brand-text/70">
            Visualize connections between historical figures and media works
          </p>
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg border border-brand-primary/20 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-primary mb-4">
              Search for a Figure or Media Work
            </h2>
            <SearchInput />
            <p className="text-sm text-brand-text/60 mt-4">
              Click on any figure or media work in search results to view its network graph
            </p>
          </div>
        </div>

        {/* Graph Viewer */}
        {selectedId ? (
          <div className="bg-white p-6 rounded-lg border border-brand-primary/20 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-brand-primary">
                Network Graph
              </h2>
              <button
                onClick={() => {
                  setSelectedId(null);
                  router.push('/explore/graph', { scroll: false });
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-brand-text hover:bg-brand-bg rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
            <GraphExplorer canonicalId={selectedId} />
          </div>
        ) : (
          <div className="bg-brand-bg rounded-lg border border-brand-primary/30 p-12 text-center">
            <Network className="w-16 h-16 text-brand-primary/30 mx-auto mb-4" />
            <p className="text-lg font-medium text-brand-text/70">
              Search for a figure or media work to see their network graph
            </p>
            <p className="text-sm text-brand-text/50 mt-2">
              Visualize how historical figures and media are connected through portrayals
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 What you'll see:</strong> A force-directed graph showing how the selected figure or
            media work connects to other figures, media works, and portrayals. Blue nodes are figures, colored
            nodes are media works (green = heroic, red = villainous, yellow = complex).
          </p>
        </div>
      </div>
    </div>
  );
}
