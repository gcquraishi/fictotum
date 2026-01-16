import { Search } from 'lucide-react';
import Link from 'next/link';
import { getAllFigures } from '@/lib/db';

export default async function Dashboard() {
  const figures = await getAllFigures();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
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
            <form action="/search" method="GET" className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search for historical figures (e.g., Nero, Jesus, Vespasian)..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            </form>
          </div>

          {/* Featured Figures */}
          <div>
            <h2 className="text-2xl font-semibold mb-6">Featured Figures</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {figures.map((figure) => (
                <Link
                  key={figure.canonical_id}
                  href={`/figure/${figure.canonical_id}`}
                  className="p-6 bg-gray-800 border border-gray-700 rounded-lg hover:border-blue-500 transition-all hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{figure.name}</h3>
                    {figure.is_fictional && (
                      <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                        Fictional
                      </span>
                    )}
                  </div>
                  {figure.era && (
                    <p className="text-sm text-gray-400">{figure.era}</p>
                  )}
                </Link>
              ))}
            </div>

            {figures.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No figures found in the database yet.</p>
                <p className="text-sm mt-2">Check your Neo4j connection settings.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
