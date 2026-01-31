'use client';

import { ArrowLeft, Clock, Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function TimelineMockup() {
  const [year, setYear] = useState(1500);

  return (
    <div className="h-screen bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 z-20">
        <div className="font-mono text-lg tracking-tight flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-500" /> 
          CHRONOS<span className="text-slate-500">::TIMELINE</span>
        </div>
        <div className="flex items-center gap-4">
           <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
             <input type="text" placeholder="Jump to..." className="bg-slate-800 border border-slate-700 rounded-full pl-10 pr-4 py-1 text-sm focus:border-emerald-500 outline-none w-64" />
           </div>
           <Link href="/mockups" className="text-slate-500 hover:text-white"><ArrowLeft className="w-5 h-5"/></Link>
        </div>
      </div>

      {/* Main Content Area (Graph would be here) */}
      <div className="flex-grow relative bg-slate-950">
        {/* Placeholder for filtered graph */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
           <div className="text-9xl font-bold text-emerald-900 select-none">{year}</div>
        </div>
        
        {/* Grid lines simulating timeline view */}
        <div className="absolute inset-0 flex justify-around pointer-events-none opacity-10">
           <div className="border-r border-slate-500 h-full"></div>
           <div className="border-r border-slate-500 h-full"></div>
           <div className="border-r border-slate-500 h-full"></div>
           <div className="border-r border-slate-500 h-full"></div>
        </div>

        {/* Dynamic Nodes (Mock) */}
        <div className="absolute inset-0">
           {Array.from({length: 12}).map((_, i) => (
              <div 
                key={i}
                className="absolute w-32 p-3 bg-slate-900 border border-slate-700 rounded shadow-lg hover:border-emerald-500 cursor-pointer transition-colors"
                style={{
                  top: `${Math.random() * 80 + 10}%`,
                  left: `${Math.random() * 80 + 10}%`,
                }}
              >
                 <div className="text-xs text-emerald-500 font-mono mb-1">{year + Math.floor(Math.random()*20 - 10)}</div>
                 <div className="text-sm font-bold text-white">Historical Event {i}</div>
              </div>
           ))}
        </div>
      </div>

      {/* Bottom Timeline Control */}
      <div className="h-24 bg-slate-900 border-t border-slate-800 relative select-none">
         {/* Ticks */}
         <div className="absolute top-0 left-0 w-full h-4 flex justify-between px-12 pt-2">
            {[1000, 1200, 1400, 1600, 1800, 2000].map(y => (
               <div key={y} className="text-[10px] text-slate-500 font-mono relative">
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2">|</span>
                  <span className="mt-2 block">{y}</span>
               </div>
            ))}
         </div>

         {/* Scrubber */}
         <div className="absolute inset-0 flex items-center justify-center px-12">
            <input 
              type="range" 
              min="1000" 
              max="2025" 
              value={year} 
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
         </div>

         {/* Selected Year Display */}
         <div className="absolute top-[-3rem] left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full font-mono font-bold shadow-lg shadow-emerald-900/50">
            AD {year}
         </div>
         
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
             <button className="p-1 hover:bg-slate-800 rounded" onClick={() => setYear(y => y-10)}><ChevronLeft className="w-4 h-4 text-slate-400"/></button>
             <button className="text-xs text-slate-400 uppercase tracking-widest pt-1">Drag to Travel</button>
             <button className="p-1 hover:bg-slate-800 rounded" onClick={() => setYear(y => y+10)}><ChevronRight className="w-4 h-4 text-slate-400"/></button>
         </div>
      </div>
    </div>
  );
}
