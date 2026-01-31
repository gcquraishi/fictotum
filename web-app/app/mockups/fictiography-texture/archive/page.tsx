'use client';

import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function ArchiveMockup() {
  return (
    <div className="h-screen bg-[#f3f0e8] text-[#3c3c3c] font-serif relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Texture: Canvas/Paper */}
      <div className="absolute inset-0 z-0 opacity-50" style={{
         backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.1'/%3E%3C/svg%3E")`
      }}></div>

      {/* Header: Gold Embossed Spine */}
      <div className="absolute top-0 w-full h-16 bg-[#2c1810] z-50 flex items-center justify-between px-8 shadow-xl border-b-4 border-[#8b7355]">
         <div className="text-[#c5a065] font-serif font-bold tracking-widest text-xl uppercase" style={{textShadow: '1px 1px 0px #000'}}>
            Fictiography: Vol. IV
         </div>
         <Link href="/mockups/fictiography-texture" className="text-[#c5a065]/60 hover:text-[#c5a065] flex items-center gap-2 text-xs font-sans uppercase tracking-widest"><ArrowLeft className="w-3 h-3"/> Library Index</Link>
      </div>

      {/* Main Content: Index Cards */}
      <div className="relative z-20 w-full max-w-6xl h-full pt-24 px-8 grid grid-cols-12 gap-8">
         
         {/* Sidebar: Cabinet Drawers */}
         <div className="col-span-3 h-[600px] bg-[#5c4033] rounded-lg shadow-2xl p-4 flex flex-col gap-4 border border-[#3e2b22] relative">
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none rounded-lg"></div>
            
            {['1400-1500', '1500-1600', '1600-1700', '1700-1800'].map((label, i) => (
               <div key={i} className="flex-1 bg-[#4a332a] border border-[#6b4c3e] shadow-inner rounded flex items-center justify-center relative cursor-pointer hover:bg-[#5c4033] transition-colors group">
                  <div className="w-24 h-10 bg-[#e6dcc3] shadow-inner flex items-center justify-center font-typewriter text-xs tracking-widest text-black/70 border border-[#d6cbb3]">
                     {label}
                  </div>
                  {/* Brass Handle */}
                  <div className="absolute bottom-4 w-16 h-4 bg-gradient-to-b from-[#b8860b] to-[#8b6508] rounded-full shadow-lg"></div>
               </div>
            ))}
         </div>

         {/* Center: The Active Card */}
         <div className="col-span-9 h-[600px] bg-white shadow-xl p-12 relative rotate-[0.5deg]">
            {/* Paper Texture */}
            <div className="absolute inset-0 opacity-10 bg-repeat pointer-events-none" style={{backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '20px 20px'}}></div>
            
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-black mb-8 pb-4">
               <div>
                  <h1 className="text-4xl font-bold font-serif mb-2">The Tudor Lineage</h1>
                  <p className="font-sans text-xs uppercase tracking-widest text-gray-500">Ref: HIST-892-ALPHA</p>
               </div>
               <div className="w-24 h-24 border border-gray-300 p-1">
                  <div className="w-full h-full bg-gray-200"></div>
               </div>
            </div>

            {/* Content - Two Columns */}
            <div className="grid grid-cols-2 gap-12 font-serif leading-relaxed text-lg">
               <p>
                  <span className="text-3xl float-left mr-2 font-bold text-[#8b0000]">T</span>he primary connection point appears to be localized around the court of 1536. Multiple sources confirm the overlapping timelines.
               </p>
               <div className="relative">
                  <p className="italic text-gray-600 pl-4 border-l-2 border-gray-300">
                     "See Fig. A for visual representation of the network density during this period."
                  </p>
                  {/* Magnifying Glass Overlay */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full border-8 border-gray-300/50 shadow-2xl backdrop-blur-[1px] flex items-center justify-center overflow-hidden">
                     <div className="absolute inset-0 bg-white/20"></div>
                     {/* Distorted text inside */}
                     <div className="scale-150 font-bold text-black/80 rotate-[-5deg]">DENSITY</div>
                  </div>
               </div>
            </div>

            {/* Red Thread (Subtle, sewn into paper) */}
            <svg className="absolute inset-0 pointer-events-none z-10">
               <path d="M 50 150 C 200 150, 200 400, 500 400" fill="none" stroke="#8b0000" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
            </svg>

         </div>

      </div>
    </div>
  );
}
