import Link from 'next/link';
import { ArrowRight, Map, Globe, BookOpen, Clock, LayoutGrid } from 'lucide-react';

export default function MockupsIndex() {
  const mocks = [
    {
      id: 'pathfinder',
      name: 'Direction 1: The Pathfinder',
      desc: 'Utility-first. Solves "How are X and Y connected?" instantly.',
      icon: Map,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'universe',
      name: 'Direction 2: Living Universe',
      desc: 'Immersive. The graph is alive and breathing around you.',
      icon: Globe,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      id: 'curated',
      name: 'Direction 3: Curated Exhibit',
      desc: 'Editorial. Guides you through history like a museum.',
      icon: BookOpen,
      color: 'bg-amber-100 text-amber-600',
    },
    {
      id: 'timeline',
      name: 'Direction 4: The Time Machine',
      desc: 'Chronological. Start from a time, not a person.',
      icon: Clock,
      color: 'bg-emerald-100 text-emerald-600',
    },
    {
      id: 'dashboard',
      name: 'Direction 5: Detective Board',
      desc: 'Investigative. A dense grid of tools for the power user.',
      icon: LayoutGrid,
      color: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Landing Page Concepts</h1>
          <p className="mt-4 text-lg text-gray-600">
            Interactive mockups for 5 distinct design directions.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mocks.map((mock) => (
            <Link 
              key={mock.id} 
              href={`/mockups/${mock.id}`}
              className="block group relative bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${mock.color}`}>
                <mock.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                {mock.name}
              </h3>
              <p className="text-gray-500 mb-4">
                {mock.desc}
              </p>
              <div className="flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                View Mockup <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back to current production app
          </Link>
        </div>
      </div>
    </div>
  );
}
