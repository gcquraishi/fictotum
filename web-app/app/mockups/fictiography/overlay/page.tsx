'use client';

import { ArrowLeft, Search, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function OverlayMockup() {
  const [showConspiracy, setShowConspiracy] = useState(false);

  return (
    <div className="h-screen bg-[#F0EAD6] text-gray-900 font-sans relative overflow-hidden flex flex-col">
      
      {/* Navbar: Standard Museum Style */}
      <div className="h-16 bg-white border-b border-gray-300 flex justify-between items-center px-6 z-40 shadow-sm relative">
         <div className="flex items-center gap-4">
            <Link href="/mockups/fictiography"><ArrowLeft className="w-5 h-5 text-gray-500"/></Link>
            
            {/* Logo: Magnifying Glass over Timeline */}
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-amber-900">
               <div className="relative w-8 h-8 flex items-center justify-center">
                  <div className="absolute w-full h-px bg-amber-900"></div>
                  <div className="w-4 h-4 rounded-full border-2 border-amber-900 bg-white/50 backdrop-blur-sm z-10 scale-125"></div>
                  <div className="absolute bottom-1 right-1 w-2 h-px bg-amber-900 rotate-45 origin-top-left translate-y-2 translate-x-1"></div>
               </div>
               Fictiography
            </div>
         </div>

         {/* The Magic Toggle */}
         <button 
            onClick={() => setShowConspiracy(!showConspiracy)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all border ${showConspiracy ? 'bg-red-600 text-white border-red-700 shadow-inner' : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'}`}
         >
            {showConspiracy ? <Eye className="w-4 h-4"/> : <EyeOff className="w-4 h-4"/>}
            {showConspiracy ? 'CONSPIRACY REVEALED' : 'Reveal Connections'}
         </button>
      </div>

      {/* Main Content */}
      <div className="flex-grow relative p-12 overflow-hidden">
         
         {/* Layer 1: The Official Record (Orderly Grid) */}
         <div className={`absolute inset-0 p-12 grid grid-cols-4 gap-8 transition-all duration-700 ${showConspiracy ? 'opacity-30 blur-sm scale-95 grayscale' : 'opacity-100 scale-100'}`}>
            {[1,2,3,4,5,6,7,8].map(i => (
               <div key={i} className="bg-white p-4 border border-gray-200 shadow-sm rounded flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-gray-100 mb-4"></div>
                  <div className="font-bold text-gray-800">Historical Figure {i}</div>
                  <div className="text-xs text-gray-400">1850 - 1900</div>
               </div>
            ))}
         </div>

         {/* Layer 2: The Conspiracy (Messy Overlay) */}
         <div className={`absolute inset-0 pointer-events-none transition-all duration-500 ${showConspiracy ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
            
            {/* Handwriting Notes */}
            <div className="absolute top-[20%] left-[25%] transform -rotate-12 font-handwriting text-2xl text-red-700 font-bold" style={{fontFamily: 'Comic Sans MS, cursive'}}>
               THEY KNEW EACH OTHER!
            </div>
            
            <div className="absolute bottom-[30%] right-[30%] transform rotate-6 font-handwriting text-xl text-blue-800 font-bold" style={{fontFamily: 'Comic Sans MS, cursive'}}>
               Same actor in 'The Crown'??
            </div>

            {/* Red Strings */}
            <svg className="absolute inset-0 w-full h-full">
               <path d="M 300 300 Q 600 100 900 300" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
               <path d="M 300 300 Q 400 600 500 300" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
               
               {/* Pins */}
               <circle cx="300" cy="300" r="8" fill="#b91c1c" />
               <circle cx="900" cy="300" r="8" fill="#b91c1c" />
               <circle cx="500" cy="300" r="8" fill="#b91c1c" />
            </svg>

            {/* Photos Taped on Top */}
            <div className="absolute top-[40%] left-[45%] bg-white p-2 shadow-2xl transform rotate-3 border border-gray-300">
               <div className="w-32 h-24 bg-gray-800"></div>
               <div className="text-center font-mono text-xs mt-1">EVIDENCE #89</div>
               {/* Tape */}
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-yellow-100/80 rotate-2"></div>
            </div>

         </div>

      </div>
    </div>
  );
}
