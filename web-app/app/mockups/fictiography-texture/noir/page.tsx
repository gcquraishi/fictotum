'use client';

import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';

export default function ScandiMockup() {
  return (
    <div className="h-screen bg-[#f5f5f4] text-slate-800 font-mono relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* Ambient Light / Gradient */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-white via-transparent to-[#e7e5e4] opacity-60"></div>

      {/* Nav Link */}
      <div className="absolute top-8 left-8 z-50">
         <Link href="/mockups/fictiography-texture" className="text-slate-400 hover:text-slate-900 flex items-center gap-2 uppercase tracking-widest text-xs transition-colors"><ArrowLeft className="w-4 h-4"/> Return</Link>
      </div>

      {/* Logo: Minimal Stamp */}
      <div className="absolute top-8 right-8 border-2 border-slate-900 p-3 transform -rotate-0 opacity-90 z-20">
         <div className="text-slate-900 font-black text-xl tracking-tighter uppercase font-sans leading-none">
            FICTIOGRAPHY
         </div>
         <div className="text-slate-500 text-[9px] font-bold tracking-[0.2em] text-center mt-1 uppercase">Confidential</div>
      </div>


      {/* Main Desk Surface */}
      <div className="relative z-20 w-full max-w-5xl h-[700px] p-12 flex gap-12">
         
         {/* Left: The Clean Report */}
         <div className="w-1/3 h-full bg-white shadow-2xl shadow-stone-200 transform -rotate-1 p-8 relative border border-stone-100">
             <div className="absolute top-0 left-0 w-full h-2 bg-stone-100"></div>
             <div className="mt-2 font-mono text-slate-600">
                <h2 className="text-2xl font-bold mb-6 text-slate-900 border-b-2 border-stone-100 pb-2">Subject: Cromwell</h2>
                <p className="text-sm leading-relaxed mb-6">
                   Evidence suggests a direct link to the Boleyn affair. Cross-reference with the French accounts required immediately.
                </p>
                <div className="pt-4 mt-8 bg-stone-50 p-4 rounded border border-stone-100">
                   <div className="text-[10px] uppercase tracking-widest mb-2 text-slate-400 font-bold">Attachment 01</div>
                   <div className="w-full h-32 bg-stone-200 mix-blend-multiply grayscale opacity-50"></div>
                </div>
             </div>
             {/* Clip - Minimal Silver */}
             <div className="absolute -top-3 right-8 w-8 h-12 border-2 border-stone-300 rounded-full z-30 bg-white"></div>
         </div>

         {/* Right: The Evidence Spread */}
         <div className="flex-grow h-full relative">
            
            {/* Photo 1 */}
            <div className="absolute top-10 left-10 w-48 p-3 bg-white shadow-lg shadow-stone-200/50 transform rotate-2 border border-stone-100">
               <div className="w-full h-32 bg-stone-300 mb-3 grayscale opacity-80"></div>
               <div className="font-mono text-slate-500 text-[10px] text-center uppercase tracking-wider">Figure A: Henry VIII</div>
               {/* Pin - Matte Black */}
               <div className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-slate-800 shadow-sm z-30 ring-2 ring-white"></div>
            </div>

            {/* Photo 2 */}
            <div className="absolute bottom-32 right-10 w-48 p-3 bg-white shadow-lg shadow-stone-200/50 transform -rotate-1 border border-stone-100">
               <div className="w-full h-32 bg-stone-300 mb-3 grayscale opacity-80"></div>
               <div className="font-mono text-slate-500 text-[10px] text-center uppercase tracking-wider">Figure B: Anne Boleyn</div>
               {/* Pin - Matte Black */}
               <div className="absolute -top-1.5 left-1/2 w-3 h-3 rounded-full bg-slate-800 shadow-sm z-30 ring-2 ring-white"></div>
            </div>

            {/* The Red String - Cleaner, straighter, brighter */}
            <svg className="absolute inset-0 pointer-events-none z-40 overflow-visible">
               <path 
                  d="M 130 60 L 450 460" 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  className="opacity-80"
               />
               {/* Pinpoints on line ends (optional visual anchor) */}
               <circle cx="130" cy="60" r="2" fill="#ef4444" />
               <circle cx="450" cy="460" r="2" fill="#ef4444" />
            </svg>

            {/* Search Tool - Floating Glass Card */}
            <div className="absolute bottom-10 left-0 w-80 bg-white/80 backdrop-blur-md border border-slate-200 p-4 shadow-xl shadow-stone-200/50 rounded-lg">
               <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                 <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">System Access</div>
                 <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
               </div>
               
               <div className="flex items-center gap-3">
                  <span className="text-slate-300"><Search className="w-4 h-4"/></span>
                  <input type="text" placeholder="Search database..." className="bg-transparent border-none outline-none text-slate-800 font-mono text-sm w-full placeholder-slate-300"/>
               </div>
            </div>

         </div>

      </div>
    </div>
  );
}