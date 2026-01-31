'use client';

import Link from 'next/link';
import { ArrowLeft, Map, Compass, Navigation } from 'lucide-react';

export default function CartographerPage() {
  return (
    <div className="min-h-screen bg-[#D2B48C] text-[#4A3728] font-serif selection:bg-[#4A3728] selection:text-[#D2B48C] cursor-default">
      {/* Texture Overlay (Parchment/Canvas) */}
      <div className="fixed inset-0 opacity-15 pointer-events-none mix-blend-multiply" 
           style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/natural-paper.png')` }}>
      </div>
      
      {/* Navigation Header */}
      <header className="p-8 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-12">
           <Link href="/mockups/atmosphere-v2" className="text-[#4A3728]/60 hover:text-[#4A3728] transition-colors flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold">
             <ArrowLeft className="w-4 h-4" /> Back to Base
           </Link>
           <div className="flex items-center gap-4">
             <Compass className="w-8 h-8 opacity-60" />
             <h1 className="text-2xl font-bold tracking-widest uppercase italic">Mappa Chronos</h1>
           </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.4em] font-black border-b-2 border-[#4A3728] pb-1">
          Sector: Tudor_England
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-12 px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* Main Map Content */}
          <div className="lg:col-span-8">
            <div className="relative aspect-video bg-[#C1A078]/30 border-2 border-[#4A3728]/20 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden p-8 flex flex-col items-center justify-center">
               {/* Watercolor Wash Effect */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-700/5 rounded-full blur-3xl"></div>
               <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-900/5 rounded-full blur-3xl"></div>

               <div className="relative text-center">
                  <span className="text-[10px] uppercase tracking-[0.5em] font-black mb-4 block opacity-60">Discovery in Progress</span>
                  <h2 className="text-6xl font-bold italic tracking-tighter mb-2">Thomas Cromwell</h2>
                  <p className="text-sm tracking-widest uppercase font-bold opacity-60">Lord Privy Seal // Earl of Essex</p>
                  
                  <div className="mt-12 flex justify-center gap-12">
                    <div className="text-center">
                      <div className="text-2xl font-bold italic">1485</div>
                      <div className="text-[9px] uppercase tracking-widest font-black opacity-40">Origin</div>
                    </div>
                    <div className="h-8 w-px bg-[#4A3728]/20 mt-2"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold italic">1540</div>
                      <div className="text-[9px] uppercase tracking-widest font-black opacity-40">Horizon</div>
                    </div>
                  </div>
               </div>

               {/* Map Flourishes */}
               <div className="absolute top-4 right-4 text-[10px] uppercase tracking-widest font-black italic opacity-20">Hic Sunt Dracones</div>
               <div className="absolute bottom-4 left-4 w-12 h-12">
                 <Navigation className="w-full h-full opacity-10 rotate-45" />
               </div>
            </div>

            <div className="mt-12 space-y-6">
              <h3 className="text-xs uppercase tracking-[0.3em] font-black flex items-center gap-2">
                <Map className="w-4 h-4" /> Expedition Logs
              </h3>
              <p className="text-lg leading-relaxed max-w-2xl italic opacity-80">
                The terrain of the 16th century is treacherous. Cromwell navigated the swamp of 
                court politics by building bridges where others saw only chasms. From the 
                streets of Putney to the scaffold at Tyburn, the path is marked by 
                monumental shifts in the English soul.
              </p>
            </div>
          </div>

          {/* Map Legend / Sidebar */}
          <div className="lg:col-span-4 space-y-12">
             <div className="p-8 border-2 border-[#4A3728]/10 bg-[#C1A078]/10 space-y-8">
                <h4 className="text-xs uppercase tracking-[0.4em] font-black border-b border-[#4A3728]/20 pb-4">Map Legend</h4>
                
                <div className="space-y-6">
                   {[
                     { label: 'Royal Ties', color: 'bg-[#4A3728]', desc: 'Direct service to the Crown.' },
                     { label: 'Media Echo', color: 'bg-[#D2B48C] border border-[#4A3728]/30', desc: 'Resonance in screen and ink.' },
                     { label: 'Era Boundary', color: 'bg-emerald-700/20', desc: 'The edge of the Renaissance.' }
                   ].map((item) => (
                     <div key={item.label} className="flex gap-4">
                        <div className={`w-4 h-4 mt-1 shrink-0 ${item.color}`}></div>
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-widest">{item.label}</div>
                          <div className="text-[10px] italic opacity-60 leading-tight">{item.desc}</div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="text-center italic opacity-40 py-8 border-y border-[#4A3728]/10">
                <p className="text-sm">"The map is not the territory, but it is all we have of the past."</p>
             </div>
          </div>
        </div>
      </main>

      <footer className="mt-20 p-8 border-t border-[#4A3728]/10 flex justify-between items-center text-[10px] font-black uppercase tracking-[0.5em] opacity-40">
        <div>ChronosGraph Cartography Dept.</div>
        <div>MMXXVI</div>
      </footer>
    </div>
  );
}
