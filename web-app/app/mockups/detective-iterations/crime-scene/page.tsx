'use client';

import { ArrowLeft, ZoomIn, ZoomOut, Hand } from 'lucide-react';
import Link from 'next/link';

export default function CrimeSceneMockup() {
  return (
    <div className="h-screen w-screen bg-[#d4a373] overflow-hidden relative font-courier">
      {/* Cork Texture Overlay */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
         backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.3'/%3E%3C/svg%3E")`
      }}></div>

      {/* Navigation */}
      <div className="absolute top-0 left-0 z-50 p-4">
         <Link href="/mockups/detective-iterations" className="bg-white px-4 py-2 rounded shadow-md border border-gray-300 font-bold hover:bg-gray-50 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4"/> Back
         </Link>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-2">
         <button className="bg-white p-3 rounded-full shadow-lg border border-gray-300 hover:bg-gray-50"><ZoomIn className="w-6 h-6 text-gray-700"/></button>
         <button className="bg-white p-3 rounded-full shadow-lg border border-gray-300 hover:bg-gray-50"><ZoomOut className="w-6 h-6 text-gray-700"/></button>
         <button className="bg-gray-800 p-3 rounded-full shadow-lg border border-gray-900 hover:bg-gray-700"><Hand className="w-6 h-6 text-white"/></button>
      </div>

      {/* The Infinite Wall Container */}
      <div className="w-[200vw] h-full relative cursor-grab active:cursor-grabbing flex items-center p-20">
         
         {/* Era Markers (Background) */}
         <div className="absolute top-10 left-20 text-4xl font-bold text-amber-900 opacity-30 select-none">ANTIQUITY</div>
         <div className="absolute top-10 left-[800px] text-4xl font-bold text-amber-900 opacity-30 select-none">MIDDLE AGES</div>
         <div className="absolute top-10 left-[1600px] text-4xl font-bold text-amber-900 opacity-30 select-none">MODERN ERA</div>

         {/* Connection String (The Long Red Thread) */}
         <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {/* Thread 1: Caesar to Napoleon */}
            <path d="M 350 400 Q 1000 700 1850 450" fill="none" stroke="#b91c1c" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 5" className="drop-shadow-md"/>
            {/* Pin shadows */}
            <circle cx="350" cy="400" r="6" fill="black" opacity="0.3" />
            <circle cx="1850" cy="450" r="6" fill="black" opacity="0.3" />
         </svg>

         {/* Evidence 1: Julius Caesar (Left/Past) */}
         <div className="absolute left-[300px] top-[350px] w-64 bg-white p-3 pb-8 shadow-xl transform -rotate-3 z-20">
            <div className="w-full h-48 bg-gray-200 mb-3 overflow-hidden grayscale contrast-125 relative">
               <div className="absolute inset-0 flex items-center justify-center text-4xl font-serif text-gray-400">IMG</div>
            </div>
            <div className="font-typewriter text-xl font-bold text-center">Julius Caesar</div>
            <div className="text-xs font-mono text-center text-gray-500">44 BC</div>
            {/* Red Pin */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-700 shadow-inner border border-red-900 z-30"></div>
         </div>

         {/* Evidence 2: Napoleon (Right/Future) */}
         <div className="absolute left-[1800px] top-[400px] w-64 bg-white p-3 pb-8 shadow-xl transform rotate-2 z-20">
            <div className="w-full h-48 bg-gray-200 mb-3 overflow-hidden grayscale contrast-125 relative">
               <div className="absolute inset-0 flex items-center justify-center text-4xl font-serif text-gray-400">IMG</div>
            </div>
            <div className="font-typewriter text-xl font-bold text-center">Napoleon</div>
            <div className="text-xs font-mono text-center text-gray-500">1804 AD</div>
            {/* Red Pin */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-700 shadow-inner border border-red-900 z-30"></div>
         </div>
         
         {/* Note Card */}
         <div className="absolute left-[1000px] top-[550px] w-48 bg-yellow-100 p-4 shadow-md transform rotate-6 font-handwriting text-blue-900 text-lg">
            "Both obsessed with eagles..."
            {/* Tape */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-8 bg-white/40 transform -rotate-2"></div>
         </div>

      </div>
    </div>
  );
}
