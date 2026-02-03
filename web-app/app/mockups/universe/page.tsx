'use client';

import { Suspense, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Search, Mic, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CRITICAL_ENTITIES } from '@/lib/constants/entities';

// Use a mocked graph for the visual, but keep it interactive-looking
const GraphExplorer = dynamic(() => import('@/components/GraphExplorer'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black flex items-center justify-center text-blue-400 font-mono">INITIALIZING NEURAL LINK...</div>
});

export default function UniverseMockup() {
  // Dummy nodes for the "Living Universe" effect
  const nodes = Array.from({ length: 50 }, (_, i) => ({
    id: `node-${i}`,
    name: i % 2 === 0 ? `Figure ${i}` : `Media ${i}`,
    type: i % 2 === 0 ? 'figure' : 'media',
    val: Math.random() * 20 + 5
  }));
  
  const links = Array.from({ length: 80 }, (_, i) => ({
    source: `node-${Math.floor(Math.random() * 50)}`,
    target: `node-${Math.floor(Math.random() * 50)}`
  }));

  return (
    <div className="h-screen w-screen bg-black relative overflow-hidden text-white font-sans">
      {/* Background Graph (Simulated Immersive) */}
      <div className="absolute inset-0 z-0 opacity-60">
        <Suspense>
           <GraphExplorer canonicalId={CRITICAL_ENTITIES.HENRY_VIII} />
           {/* In a real implementation, we'd pass 'nodes' and 'links' to force a specific large cluster */}
        </Suspense>
      </div>
      
      {/* Overlay Gradient for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 z-10 pointer-events-none"></div>

      {/* Top Nav (Minimal) */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-20">
        <div className="text-2xl font-bold tracking-widest uppercase text-white/80">Chronos<span className="text-blue-500">Graph</span></div>
        <div className="flex gap-6 text-sm font-medium tracking-wide text-white/60">
           <Link href="/mockups" className="hover:text-white flex items-center gap-2"><ArrowLeft className="w-4 h-4"/> Back</Link>
           <button className="hover:text-white">ABOUT</button>
           <button className="hover:text-white">LOGIN</button>
        </div>
      </div>

      {/* Bottom Center Search (Floating Glass) */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-xl z-20 px-4">
        <div className="glass-panel backdrop-blur-md bg-white/10 border border-white/20 rounded-full p-2 flex items-center shadow-2xl shadow-blue-900/20 transition-all hover:bg-white/15">
          <Search className="w-6 h-6 text-white/50 ml-4" />
          <input 
            type="text" 
            placeholder="Search the universe..." 
            className="bg-transparent border-none outline-none text-white placeholder-white/50 flex-grow px-4 h-12 text-lg"
          />
          <button className="p-3 bg-blue-600 hover:bg-blue-500 rounded-full transition-colors">
            <Mic className="w-5 h-5 text-white" />
          </button>
        </div>
        <p className="text-center text-white/30 text-xs mt-4 uppercase tracking-[0.2em]">
          3,482 Nodes • 12,901 Connections • Live
        </p>
      </div>

      {/* Floating HUD Elements (The "Wow" Factor) */}
      <div className="absolute right-8 top-1/2 transform -translate-y-1/2 z-20 hidden md:block">
         <div className="space-y-4">
            {[1,2,3].map(i => (
               <div key={i} className="w-2 h-2 rounded-full bg-white/20 hover:bg-blue-500 hover:scale-150 transition-all cursor-pointer"></div>
            ))}
         </div>
      </div>
    </div>
  );
}
