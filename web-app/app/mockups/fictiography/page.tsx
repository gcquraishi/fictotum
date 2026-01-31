'use client';

import Link from 'next/link';
import { ArrowLeft, Layers, Zap, Eye } from 'lucide-react';

export default function FictiographyIndex() {
  const approaches = [
    {
      id: 'stratum',
      name: 'Concept A: The Stratum',
      desc: 'Vertical Depth. Lift nodes from the timeline floor into the chaotic network air.',
      icon: Layers,
      color: 'bg-stone-100 text-stone-800',
    },
    {
      id: 'tension',
      name: 'Concept B: The Tension',
      desc: 'Physics-Based. Taut strings connect a structured list to a chaotic graph.',
      icon: Zap,
      color: 'bg-zinc-900 text-red-500',
    },
    {
      id: 'overlay',
      name: 'Concept C: The Overlay',
      desc: 'Augmented Reality. Toggle a "messy" conspiracy layer over the orderly official record.',
      icon: Eye,
      color: 'bg-amber-50 text-amber-900',
    },
  ];

  return (
    <div className="min-h-screen bg-white py-12 px-4 font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
           <Link href="/mockups/detective-iterations" className="text-gray-400 hover:text-gray-900 inline-flex items-center gap-2 mb-6 text-xs uppercase tracking-widest"><ArrowLeft className="w-3 h-3"/> Back to Iterations</Link>
           <h1 className="text-6xl font-serif font-bold text-gray-900 mb-4 tracking-tight">Fictiography.</h1>
           <p className="text-xl text-gray-500 max-w-2xl mx-auto">
             Three final visions blending linear time with messy networks.
           </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {approaches.map((app) => (
            <Link 
              key={app.id} 
              href={`/mockups/fictiography/${app.id}`}
              className={`group relative overflow-hidden rounded-2xl border border-gray-200 hover:border-gray-400 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${app.color === 'bg-zinc-900 text-red-500' ? 'bg-zinc-900 border-zinc-700' : 'bg-white'}`}
            >
              <div className={`h-48 p-8 flex flex-col justify-between ${app.color}`}>
                 <app.icon className="w-10 h-10 mb-4" />
                 <h2 className="text-2xl font-bold">{app.name}</h2>
              </div>
              <div className="p-8 bg-white h-40">
                <p className="text-gray-600 leading-relaxed">
                  {app.desc}
                </p>
                <div className="mt-6 flex items-center text-sm font-bold uppercase tracking-widest text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                   View Prototype →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
