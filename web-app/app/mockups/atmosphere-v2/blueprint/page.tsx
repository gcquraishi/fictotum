'use client';

import Link from 'next/link';
import { ArrowLeft, Ruler, Compass, Maximize2 } from 'lucide-react';

export default function BlueprintPage() {
  return (
    <div className="min-h-screen bg-[#0047AB] text-white font-mono selection:bg-white selection:text-[#0047AB]">
      {/* Blueprint Grid Overlay */}
      <div className="fixed inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, 
             backgroundSize: '20px 20px' 
           }}>
      </div>
      <div className="fixed inset-0 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, 
             backgroundSize: '100px 100px',
             border: '1px solid white'
           }}>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header / Title Block */}
        <header className="p-8 border-b border-white/30 flex justify-between items-start bg-[#0047AB]/80 backdrop-blur-sm">
           <div className="flex gap-8">
             <Link href="/mockups/atmosphere-v2" className="p-2 border border-white hover:bg-white hover:text-[#0047AB] transition-all">
               <ArrowLeft className="w-5 h-5" />
             </Link>
             <div>
               <h1 className="text-4xl font-black uppercase tracking-tighter italic leading-none">THOMAS CROMWELL</h1>
               <div className="flex gap-4 mt-2 text-[10px] font-bold opacity-70">
                 <span>REF_ID: STR_ARCH_1485</span>
                 <span>COORD: 51.5074° N, 0.1278° W</span>
               </div>
             </div>
           </div>
           <div className="text-right hidden md:block">
              <div className="text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Status: Revision_04</div>
              <div className="text-2xl font-black italic">CHRONOS_SCHEMA</div>
           </div>
        </header>

        <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Schematic View */}
           <div className="lg:col-span-8 border-2 border-white p-8 relative min-h-[500px] overflow-hidden group">
              <div className="absolute top-4 right-4 flex gap-2">
                 <button className="p-2 border border-white/50 hover:bg-white hover:text-[#0047AB]"><Maximize2 className="w-4 h-4" /></button>
                 <button className="p-2 border border-white/50 hover:bg-white hover:text-[#0047AB]"><Compass className="w-4 h-4" /></button>
              </div>

              <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 absolute bottom-4 left-4">
                Scale: 1 era = 100 units
              </div>

              {/* Mock Schematic Visualization */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="relative w-64 h-64 border border-white/30 rounded-full flex items-center justify-center">
                    <div className="w-full h-px bg-white/20 absolute rotate-45"></div>
                    <div className="w-full h-px bg-white/20 absolute -rotate-45"></div>
                    
                    {/* Nodes */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-white text-[#0047AB] text-xs font-bold uppercase tracking-tighter">Henry VIII</div>
                    <div className="absolute bottom-1/4 right-0 p-2 bg-white text-[#0047AB] text-xs font-bold uppercase tracking-tighter">Anne Boleyn</div>
                    <div className="absolute left-0 top-1/3 -translate-x-1/2 p-2 bg-white text-[#0047AB] text-xs font-bold uppercase tracking-tighter">Wolsey</div>

                    {/* Dimensions */}
                    <div className="absolute top-1/4 left-1/4 w-px h-12 bg-white after:content-[''] after:absolute after:top-0 after:left-[-4px] after:w-2 after:h-px after:bg-white before:content-[''] before:absolute before:bottom-0 before:left-[-4px] before:w-2 before:h-px before:bg-white flex items-center">
                       <span className="text-[8px] rotate-90 ml-2">DIST: 12.4</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Technical Specs Side Panel */}
           <div className="lg:col-span-4 space-y-8">
              <div className="border border-white/30 p-6 bg-white/5">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                   <Ruler className="w-4 h-4" /> Component Specs
                 </h3>
                 <div className="space-y-4">
                    {[
                      { label: 'Lifespan', value: '1485 - 1540 (55y)' },
                      { label: 'Network Weight', value: '0.928 σ' },
                      { label: 'Media Works', value: 'Wolf Hall (Trilogy)' },
                      { label: 'Role', value: 'Structural Architect' }
                    ].map((spec) => (
                      <div key={spec.label} className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-[10px] uppercase opacity-50">{spec.label}</span>
                        <span className="text-sm font-bold uppercase">{spec.value}</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="border border-white/30 p-6 bg-white/5">
                 <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4">Structural Notes</h3>
                 <p className="text-[11px] leading-relaxed opacity-80">
                   PRIMARY NODE IN THE REFORMATION SCHEMA. 
                   CRITICAL PATHWAY BETWEEN MONARCHY AND ECCLESIASTICAL STRUCTURES.
                   LOAD BEARING CAPACITY: HIGH.
                 </p>
              </div>

              <div className="p-4 border border-dashed border-white/40 text-[9px] uppercase tracking-widest opacity-60">
                 DO NOT REPRODUCE WITHOUT PERMISSION FROM THE ARCHITECT.
              </div>
           </div>
        </main>

        <footer className="p-4 bg-white text-[#0047AB] flex justify-between items-center text-[10px] font-black uppercase tracking-[0.4em]">
           <div>PROJECT: CHRONOSGRAPH_HEAVY_V2</div>
           <div>SHEET: 01_FIGURE_TC</div>
        </footer>
      </div>
    </div>
  );
}
