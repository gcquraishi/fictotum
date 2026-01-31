'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ConspiracyMockup() {
  return (
    <div className="h-screen w-screen overflow-hidden relative font-sans">
      
      {/* Background: High-Res Cork */}
      <div className="absolute inset-0 bg-[#d4a373]" style={{
         backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`
      }}></div>

      {/* Nav: Taped Note */}
      <div className="absolute top-8 left-8 z-50 transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
         <Link href="/mockups/fictiography-texture" className="bg-[#fef9c3] px-6 py-4 shadow-lg flex items-center gap-2 font-handwriting text-xl text-blue-900 border border-yellow-200">
            <ArrowLeft className="w-5 h-5"/> GO BACK
         </Link>
         <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-6 bg-white/40 rotate-2"></div>
      </div>

      {/* Main Board Container */}
      <div className="w-full h-full relative">

         {/* Centerpiece: The "Logo" */}
         <div className="absolute top-10 right-10 transform rotate-2">
             <div className="bg-black text-white px-8 py-2 font-black text-4xl uppercase tracking-tighter" style={{clipPath: 'polygon(0 0, 100% 2%, 98% 100%, 2% 98%)'}}>
                FICTIOGRAPHY
             </div>
             {/* Duct Tape */}
             <div className="absolute -top-4 -left-4 w-16 h-8 bg-gray-400 opacity-90 rotate-[-15deg] shadow-sm"></div>
             <div className="absolute -bottom-4 -right-4 w-16 h-8 bg-gray-400 opacity-90 rotate-[-15deg] shadow-sm"></div>
         </div>

         {/* Item 1: Polaroid */}
         <div className="absolute top-[20%] left-[20%] w-56 bg-white p-3 pb-12 shadow-2xl transform -rotate-6 transition-transform hover:scale-105 hover:z-50 cursor-grab active:cursor-grabbing">
            <div className="w-full h-40 bg-gray-800 mb-2 contrast-125 grayscale relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/20 to-transparent"></div>
            </div>
            <div className="font-handwriting text-center text-xl text-gray-800 rotate-[-2deg]">The King</div>
            {/* Pushpin */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-full shadow-md z-30 border border-red-800"></div>
         </div>

         {/* Item 2: Newspaper Clipping */}
         <div className="absolute bottom-[20%] right-[30%] w-72 bg-[#e8e4d9] p-4 shadow-xl transform rotate-3 hover:z-50 hover:scale-105 transition-transform cursor-grab">
            <h3 className="font-serif font-black text-2xl mb-2 leading-none border-b border-black pb-1">SCANDAL AT COURT</h3>
            <p className="font-serif text-[10px] text-justify leading-tight opacity-80 columns-2 gap-2">
               Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
            </p>
            {/* Pushpin */}
            <div className="absolute -top-2 right-2 w-4 h-4 bg-green-700 rounded-full shadow-md z-30 border border-green-900"></div>
         </div>

         {/* Item 3: Post-It Note */}
         <div className="absolute top-[40%] right-[20%] w-48 h-48 bg-yellow-300 p-6 shadow-lg transform rotate-12 flex items-center justify-center">
            <p className="font-handwriting text-2xl text-blue-900 font-bold text-center leading-tight">
               CHECK THE DATES ON THIS!!
            </p>
            {/* Pushpin */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full shadow-md z-30 border border-blue-800"></div>
         </div>

         {/* THE YARN */}
         <svg className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible drop-shadow-xl">
            {/* Thread 1 */}
            <path 
               d="M 380 220 Q 800 400 950 600" 
               fill="none" 
               stroke="#b91c1c" 
               strokeWidth="4" 
               strokeLinecap="round"
            />
            {/* Thread 2 */}
            <path 
               d="M 380 220 Q 500 100 1100 350" 
               fill="none" 
               stroke="#b91c1c" 
               strokeWidth="4" 
               strokeLinecap="round"
            />
         </svg>

      </div>
    </div>
  );
}
