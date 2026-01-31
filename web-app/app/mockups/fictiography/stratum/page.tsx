'use client';

import { ArrowLeft, Search, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function StratumMockup() {
  const [lifted, setLifted] = useState(false);

  return (
    <div className="h-screen bg-[#Fdfdf8] text-stone-800 font-serif relative overflow-hidden flex flex-col">
      {/* Texture */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")`}}></div>

      {/* Navbar - Scientific/Clean */}
      <nav className="h-20 border-b border-stone-200 flex justify-between items-center px-8 z-50 bg-[#Fdfdf8]/90 backdrop-blur">
         <div className="flex items-center gap-12">
            {/* Logo: Serif F with unraveling thread */}
            <div className="text-3xl font-bold flex items-end leading-none relative group cursor-pointer">
               Fictiography
               <div className="absolute -bottom-4 left-2 w-px h-8 bg-red-600 group-hover:h-12 transition-all duration-500"></div>
            </div>
            <div className="hidden md:flex gap-6 text-xs font-sans font-bold tracking-widest text-stone-400">
               <span className="text-stone-900 border-b-2 border-red-600 pb-5">TIMELINE</span>
               <span className="hover:text-stone-900 cursor-pointer">ATLAS</span>
               <span className="hover:text-stone-900 cursor-pointer">JOURNAL</span>
            </div>
         </div>
         <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
                <Search className="w-4 h-4 text-stone-500"/>
             </div>
             <Link href="/mockups/fictiography" className="text-stone-400 hover:text-stone-900"><ArrowLeft className="w-5 h-5"/></Link>
         </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow relative">
         
         {/* The "Atmosphere" (Network Space) */}
         <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Connection Arc (Only visible when lifted) */}
            <svg className={`w-full h-full transition-opacity duration-700 ${lifted ? 'opacity-100' : 'opacity-0'}`}>
               <path d="M 300 500 C 300 200, 900 200, 900 500" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 4" />
               <circle cx="600" cy="220" r="4" fill="#dc2626" />
               <text x="600" y="200" textAnchor="middle" className="font-sans text-xs fill-red-600 font-bold tracking-widest">SHARED MEDIA: WOLF HALL</text>
            </svg>
         </div>

         {/* The "Ground" (Timeline) */}
         <div className="absolute bottom-0 w-full h-1/2 border-t border-stone-200 bg-gradient-to-b from-stone-50 to-stone-100 z-0">
             <div className="absolute top-0 w-full flex justify-between px-20 -translate-y-1/2">
                {[1500, 1600, 1700, 1800, 1900, 2000].map(year => (
                   <div key={year} className="flex flex-col items-center gap-2">
                      <div className="w-px h-4 bg-stone-300"></div>
                      <div className="font-mono text-xs text-stone-400">{year}</div>
                   </div>
                ))}
             </div>
         </div>

         {/* Interactive Nodes */}
         
         {/* Node 1: Henry VIII */}
         <div 
            onClick={() => setLifted(!lifted)}
            className={`absolute left-[300px] w-48 bg-white p-3 shadow-lg border border-stone-200 cursor-pointer transition-all duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) z-20 group ${lifted ? 'bottom-[400px] rotate-3 scale-110 shadow-2xl' : 'bottom-[100px] hover:-translate-y-2'}`}
         >
            <div className="w-full h-32 bg-stone-200 mb-2 grayscale group-hover:grayscale-0 transition-all relative">
               {/* Thread Anchor */}
               <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rounded-full border border-white transition-opacity ${lifted ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>
            <div className="font-bold text-center font-serif text-lg">Henry VIII</div>
            <div className="text-center font-sans text-xs text-stone-500 tracking-widest mt-1">1509 - 1547</div>
            
            {!lifted && (
               <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-sans font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Click to Pull Thread
               </div>
            )}
         </div>

         {/* Node 2: Thomas Cromwell */}
         <div 
            className={`absolute left-[900px] w-48 bg-white p-3 shadow-lg border border-stone-200 transition-all duration-700 delay-100 cubic-bezier(0.34, 1.56, 0.64, 1) z-20 ${lifted ? 'bottom-[400px] -rotate-2 scale-110 shadow-2xl' : 'bottom-[100px]'}`}
         >
            <div className="w-full h-32 bg-stone-200 mb-2 grayscale relative">
               {/* Thread Anchor */}
               <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rounded-full border border-white transition-opacity ${lifted ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>
            <div className="font-bold text-center font-serif text-lg">Thomas Cromwell</div>
            <div className="text-center font-sans text-xs text-stone-500 tracking-widest mt-1">1485 - 1540</div>
         </div>

      </div>
    </div>
  );
}
