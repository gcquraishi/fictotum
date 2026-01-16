import { Search } from 'lucide-react';
import Link from 'next/link';
import { searchFigures } from '@/lib/db';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || '';
  const results = query ? await searchFigures(query) : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back to Dashboard */}
          <Link href="/" className="text-blue-400 hover:text-blue-300 mb-6 inline-block">
            ← Back to Dashboard
          </Link>

          {/* Search */}
          <div className="mb-8">
            <form action="/search" method="GET" className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Search for historical figures..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </form>
          </div>

          {/* Results */}
          {query && (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                Search results for &quot;{query}&quot; ({results.length})
              </h2>

              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((figure) => (
                    <Link
                      key={figure.canonical_id}
                      href={`/figure/${figure.canonical_id}`}
                      className="block p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{figure.name}</h3>
                          {figure.era && (
                            <p className="text-sm text-gray-400">{figure.era}</p>
                          )}
                        </div>
                        {figure.is_fictional && (
                          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                            Fictional
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No figures found matching &quot;{query}&quot;</p>
                  <p className="text-sm mt-2">Try a different search term</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
