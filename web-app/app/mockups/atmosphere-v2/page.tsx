'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert, BookOpen, Ruler, Camera, Map, Clipboard } from 'lucide-react';

const options = [
  {
    id: 'evidence-locker',
    name: 'The Evidence Locker',
    desc: 'Industrial & Systematic. Brushed steel, fluorescent shadows, and dot-matrix data.',
    icon: ShieldAlert,
    theme: 'bg-zinc-800 text-zinc-100 border-zinc-600',
    accent: 'text-yellow-400'
  },
  {
    id: 'evidence-locker-light',
    name: 'Evidence Locker (Light)',
    desc: 'Bureaucratic Dossier. Manila folders, clean paper, and stamped ink.',
    icon: Clipboard,
    theme: 'bg-stone-100 text-stone-800 border-stone-300',
    accent: 'text-amber-600'
  },
  {
    id: 'illuminated-manuscript',
    name: 'The Illuminated Manuscript',
    desc: 'Artisan & Sacred. Vellum, claret ink, and gold leaf blooming from data nodes.',
    icon: BookOpen,
    theme: 'bg-[#F4F1EA] text-[#3D0C11] border-[#D4AF37]',
    accent: 'text-[#D4AF37]'
  },
  {
    id: 'blueprint',
    name: 'The Blueprint',
    desc: 'Technical & Schematic. Drafting blue, coordinate grids, and the engineering of time.',
    icon: Ruler,
    theme: 'bg-[#0047AB] text-white border-blue-400',
    accent: 'text-blue-200'
  },
  {
    id: 'darkroom',
    name: 'The Darkroom',
    desc: 'Atmospheric & Developing. Investigative noir under a red-light glow.',
    icon: Camera,
    theme: 'bg-black text-red-600 border-red-900',
    accent: 'text-red-500'
  },
  {
    id: 'cartographer',
    name: 'The Cartographer',
    desc: 'Expansive & Navigational. Weathered canvas, watercolor washes, and the Fog of War.',
    icon: Map,
    theme: 'bg-[#D2B48C] text-[#4A3728] border-[#8B4513]',
    accent: 'text-[#8B4513]'
  }
];

export default function AtmosphereV2Index() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-300 p-8 md:p-16 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 border-l-4 border-stone-600 pl-8">
          <Link href="/mockups/fictiography-texture" className="flex items-center gap-2 text-stone-500 hover:text-white transition-colors mb-4 uppercase tracking-[0.2em] text-xs font-bold">
            <ArrowLeft className="w-4 h-4" />
            Previous Iterations
          </Link>
          <h1 className="text-6xl font-black tracking-tighter text-white mb-2 italic uppercase">Atmosphere V2</h1>
          <p className="text-xl text-stone-400 max-w-2xl font-light">
            Pushing the tactile boundaries of the ChronosGraph interface. 
            From industrial systematicism to ancient artisanry.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {options.map((opt) => (
            <Link 
              key={opt.id}
              href={`/mockups/atmosphere-v2/${opt.id}`}
              className={`group relative p-8 border-2 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] ${opt.theme}`}
            >
              <div className="flex justify-between items-start mb-12">
                <opt.icon className={`w-12 h-12 ${opt.accent}`} strokeWidth={1} />
                <span className="text-[10px] uppercase tracking-[0.3em] opacity-50">Direction_{opt.id.slice(0,3)}</span>
              </div>
              
              <h2 className="text-3xl font-bold mb-4 leading-tight tracking-tight uppercase italic">{opt.name}</h2>
              <p className="text-sm leading-relaxed opacity-80 font-medium">
                {opt.desc}
              </p>
              
              <div className={`mt-8 pt-6 border-t border-current border-opacity-20 flex items-center justify-between text-[10px] font-black uppercase tracking-widest ${opt.accent}`}>
                Explore Environment
                <span className="group-hover:translate-x-2 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>

        <footer className="mt-24 border-t border-stone-800 pt-8 flex justify-between items-center text-[10px] uppercase tracking-[0.4em] text-stone-600">
          <div>ChronosGraph Design Lab</div>
          <div>Project: heavy-big // 2026</div>
        </footer>
      </div>
    </div>
  );
}
