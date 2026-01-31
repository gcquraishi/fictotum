'use client';

import Link from 'next/link';
import { ArrowLeft, Moon, Book, Scissors } from 'lucide-react';

export default function TextureIndex() {
  const approaches = [
    {
      id: 'noir',
      name: 'Aesthetic A: Scandi Office',
      desc: 'Light wood, clean lines, floating interfaces. The feeling of modern clarity.',
      icon: Moon,
      color: 'bg-stone-100 text-stone-800',
    },
    {
      id: 'archive',
      name: 'Aesthetic B: Academic Archive',
      desc: 'Marble, brass, leather, and dust. The feeling of deep historical weight.',
      icon: Book,
      color: 'bg-[#f5f5dc] text-stone-800',
    },
    {
      id: 'conspiracy',
      name: 'Aesthetic C: Analog Conspiracy',
      desc: 'Raw cork, torn tape, scrawled marker. The feeling of manic connection.',
      icon: Scissors,
      color: 'bg-orange-100 text-orange-800',
    },
  ];

  return (
    <div className="min-h-screen bg-stone-200 py-12 px-4 font-serif">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12 text-center">
           <Link href="/mockups/fictiography" className="text-stone-500 hover:text-stone-900 inline-flex items-center gap-2 mb-6 text-xs uppercase tracking-widest font-sans"><ArrowLeft className="w-3 h-3"/> Back to Concepts</Link>
           <h1 className="text-5xl font-bold text-stone-900 mb-4 tracking-tight">Texture & Atmosphere.</h1>
           <p className="text-xl text-stone-600 max-w-2xl mx-auto italic">
             "I want the UI to feel very tactile... a rendering of an actual red thread connecting pinned images."
           </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {approaches.map((app) => (
            <Link 
              key={app.id} 
              href={`/mockups/fictiography-texture/${app.id}`}
              className="group relative overflow-hidden rounded shadow-2xl transition-all duration-300 hover:-translate-y-2"
            >
              <div className={`h-full p-8 flex flex-col items-center text-center gap-6 ${app.color}`}>
                 <div className="p-4 rounded-full border-2 border-current opacity-80">
                    <app.icon className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-bold tracking-widest uppercase">{app.name}</h2>
                 <p className="opacity-80 leading-relaxed font-sans text-sm">
                  {app.desc}
                 </p>
                 <div className="mt-4 px-6 py-2 border border-current text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                   Enter Room
                 </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
