'use client';

import Link from 'next/link';
import { ArrowLeft, Scissors, FolderOpen, Layers, Layout, MousePointer2 } from 'lucide-react';

export default function DetectiveIterationsIndex() {
  const mocks = [
    {
      id: 'crime-scene',
      name: 'Iteration 1: The Crime Scene Wall',
      desc: 'Infinite linear corkboard. Long strings stretch across time.',
      icon: Scissors,
      color: 'bg-red-100 text-red-700',
    },
    {
      id: 'case-files',
      name: 'Iteration 2: The Case File Stack',
      desc: 'Era-based folders on a wooden desk. Cross-file pinning.',
      icon: FolderOpen,
      color: 'bg-yellow-100 text-yellow-700',
    },
    {
      id: 'ribbon',
      name: 'Iteration 3: The Ribbon Timeline',
      desc: '3D cork path. Connections "jump" over the spiral of time.',
      icon: Layers,
      color: 'bg-orange-100 text-orange-700',
    },
    {
      id: 'dual-view',
      name: 'Iteration 4: Dual-View Investigation',
      desc: 'Timeline ruler + Evidence board. Time folds to show connections.',
      icon: Layout,
      color: 'bg-stone-100 text-stone-700',
    },
    {
      id: 'thread-first',
      name: 'Iteration 5: Thread-First Navigator',
      desc: 'Pulling a string drags history to you. Physics-based.',
      icon: MousePointer2,
      color: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-100 py-12 px-4 font-serif">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
           <Link href="/mockups" className="text-stone-500 hover:text-stone-800 flex items-center gap-2 mb-4 text-sm font-sans uppercase tracking-widest"><ArrowLeft className="w-4 h-4"/> Back to Concepts</Link>
           <h1 className="text-4xl font-bold text-stone-900">The "Tactile Detective" Iterations</h1>
           <p className="mt-4 text-xl text-stone-600 italic border-l-4 border-red-700 pl-4">
             "Solving the linear time vs. complex graph problem with a red thread aesthetic."
           </p>
        </div>

        <div className="grid gap-8">
          {mocks.map((mock) => (
            <Link 
              key={mock.id} 
              href={`/mockups/detective-iterations/${mock.id}`}
              className="block group relative bg-white p-8 shadow-lg hover:shadow-xl transition-all border-l-8 border-transparent hover:border-red-700 paper-texture"
            >
              <div className="flex items-start gap-6">
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${mock.color} shadow-inner`}>
                   <mock.icon className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-red-700 transition-colors">
                      {mock.name}
                    </h3>
                    <p className="text-gray-600 text-lg">
                      {mock.desc}
                    </p>
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      <style jsx global>{`
        .paper-texture {
           background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.05'/%3E%3C/svg%3E");
        }
      `}</style>
    </div>
  );
}
