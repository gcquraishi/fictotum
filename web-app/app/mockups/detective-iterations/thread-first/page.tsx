'use client';

import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function ThreadFirstMockup() {
  const [pulled, setPulled] = useState(false);

  return (
    <div className="h-screen bg-[#fffcf5] font-sans relative overflow-hidden">
      {/* Texture */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}}></div>

      <div className="absolute top-4 left-4 z-50">
         <Link href="/mockups/detective-iterations" className="text-gray-500 hover:text-black flex items-center gap-2 font-bold"><ArrowLeft className="w-5 h-5"/> Back</Link>
      </div>

      <div className="container mx-auto h-full flex items-center justify-center">
         
         <div className="relative w-full max-w-4xl h-[600px] border border-gray-200 bg-white shadow-2xl rounded-xl overflow-hidden p-8">
            <h2 className="text-2xl font-bold mb-8 text-gray-800 border-b pb-4 flex justify-between">
               <span>Interactive Canvas</span>
               <button 
                  onClick={() => setPulled(!pulled)}
                  className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full flex items-center gap-2 hover:bg-blue-200 transition-colors"
               >
                  <RefreshCw className="w-4 h-4"/> {pulled ? 'Release Thread' : 'Pull Thread'}
               </button>
            </h2>

            {/* The "Anchor" Node (You are here) */}
            <div className="absolute right-[100px] top-1/2 -translate-y-1/2 w-48 bg-white border-2 border-blue-500 p-4 shadow-lg z-20">
               <div className="w-full h-32 bg-gray-100 mb-2"></div>
               <div className="font-bold text-center">Wolf Hall (2009)</div>
               {/* Anchor Point */}
               <div className="absolute top-1/2 left-0 w-3 h-3 bg-red-600 rounded-full -translate-x-1/2 border border-white"></div>
            </div>

            {/* The "Target" Node (The Past) */}
            <div 
               className={`absolute top-1/2 -translate-y-1/2 w-48 bg-white border border-gray-300 p-4 shadow-md transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) z-10 ${pulled ? 'left-[calc(100%-400px)] rotate-3' : 'left-[50px] -rotate-3'}`}
            >
               <div className="w-full h-32 bg-sepia-100 mb-2 opacity-80"></div>
               <div className="font-bold text-center text-gray-700">Thomas Cromwell (1530)</div>
               {/* Anchor Point */}
               <div className="absolute top-1/2 right-0 w-3 h-3 bg-red-600 rounded-full translate-x-1/2 border border-white"></div>
            </div>

            {/* The String */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
               {/* This path coordinates need to match the positions above. 
                   Right node anchor: right: 100px -> x = containerWidth - 100 - 192(width) = ~600 (simplified)
                   Target node anchor: dynamic
               */}
               <path 
                  d={pulled 
                     ? "M 550 300 C 600 300, 650 300, 750 300" // Straight/Tight when pulled
                     : "M 250 300 C 350 300, 450 500, 750 300" // Loose/Draped when far
                  } 
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth={pulled ? 3 : 2}
                  className="transition-all duration-1000"
                  strokeDasharray={pulled ? "none" : "5 5"}
               />
            </svg>

            {/* Date Markers showing the "Warp" */}
            <div className={`absolute bottom-8 left-8 transition-opacity duration-500 ${pulled ? 'opacity-0' : 'opacity-100'}`}>
               <div className="text-4xl font-bold text-gray-200">1530 AD</div>
            </div>
            <div className="absolute bottom-8 right-8">
               <div className="text-4xl font-bold text-gray-200">2009 AD</div>
            </div>
            
            {/* Warped date hint */}
            <div className={`absolute bottom-20 right-[300px] text-red-400 font-mono text-xs transition-opacity duration-500 ${pulled ? 'opacity-100' : 'opacity-0'}`}>
               TIME WARPED: 479 YEARS BRIDGED
            </div>

         </div>
      </div>
    </div>
  );
}
