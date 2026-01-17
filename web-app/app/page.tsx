import { Suspense } from 'react';
import { getConflictingPortrayals } from '@/lib/db';
import SearchInput from '@/components/SearchInput';
import ConflictFeed from '@/components/ConflictFeed';

export default async function Dashboard() {
  const conflicts = await getConflictingPortrayals();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              ChronosGraph
            </h1>
            <p className="text-xl text-gray-400">
              Explore how historical figures are portrayed across fiction and history
            </p>
          </div>

          {/* Search Section */}
          <div className="mb-12">
            <Suspense fallback={<div className="h-14 bg-gray-800 rounded-lg animate-pulse" />}>
              <SearchInput />
            </Suspense>
          </div>

          {/* Conflict Feed and Pathfinding */}
          <Suspense fallback={<div className="h-96 bg-gray-800 rounded-lg animate-pulse" />}>
            <ConflictFeed conflicts={conflicts} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}