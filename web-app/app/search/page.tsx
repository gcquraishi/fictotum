import { Suspense } from 'react';
import Link from 'next/link';
import { searchFigures } from '@/lib/db';
import SearchInput from '@/components/SearchInput';
import HistoricityBadge from '@/components/HistoricityBadge';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const results = query ? await searchFigures(query) : [];

  return (
    <div className="min-h-screen bg-stone-100 text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back to Dashboard */}
          <Link href="/" className="text-amber-600 hover:text-amber-700 mb-6 inline-block font-mono text-sm uppercase tracking-wide font-bold">
            ← Back to Dashboard
          </Link>

          {/* Search */}
          <div className="mb-8">
            <Suspense fallback={<div className="h-14 bg-white border-2 border-stone-300 animate-pulse" />}>
              <SearchInput />
            </Suspense>
          </div>

          {/* Results */}
          {query && (
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-4 uppercase tracking-tight">
                Search results for &quot;{query}&quot; <span className="text-amber-600 font-mono">({results.length})</span>
              </h2>

              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((figure) => (
                    <Link
                      key={figure.canonical_id}
                      href={`/figure/${figure.canonical_id}`}
                      className="block p-4 bg-white border border-stone-300 hover:border-amber-600 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-stone-900 uppercase tracking-tight">{figure.name}</h3>
                          {figure.era && (
                            <p className="text-sm text-stone-600 font-mono">{figure.era}</p>
                          )}
                        </div>
                        <HistoricityBadge status={figure.historicity_status} isFictional={figure.is_fictional} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white border-2 border-stone-300 shadow-sm">
                  <p className="text-stone-500 font-mono uppercase tracking-wide">No figures found matching &quot;{query}&quot;</p>
                  <p className="text-sm mt-2 text-stone-400">Try a different search term</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
