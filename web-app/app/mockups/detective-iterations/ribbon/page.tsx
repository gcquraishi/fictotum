'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function RibbonMockup() {
  return (
    <div className="h-screen bg-gray-900 overflow-hidden relative perspective-1000">
      {/* Nav */}
      <div className="absolute top-4 left-4 z-50">
         <Link href="/mockups/detective-iterations" className="text-white hover:text-gray-300 flex items-center gap-2 font-bold"><ArrowLeft className="w-5 h-5"/> Back</Link>
      </div>

      {/* The 3D Container */}
      <div className="w-full h-full flex items-center justify-center transform-style-3d rotate-x-10">
         
         {/* The Cork Ribbon */}
         <div className="w-[600px] h-[2000px] bg-[#d4a373] relative transform-style-3d rotate-x-45 translate-z-[-500px] shadow-2xl border-x-8 border-[#a87f56]">
            {/* Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`}}></div>
            
            {/* Timeline Markers on the Ribbon */}
            <div className="absolute top-[100px] left-[-60px] text-white font-mono text-xl text-right w-12">2020</div>
            <div className="absolute top-[500px] left-[-60px] text-white font-mono text-xl text-right w-12 opacity-80">1950</div>
            <div className="absolute top-[900px] left-[-60px] text-white font-mono text-xl text-right w-12 opacity-60">1800</div>
            <div className="absolute top-[1300px] left-[-60px] text-white font-mono text-xl text-right w-12 opacity-40">1500</div>

            {/* Item 1: Modern Film (Close) */}
            <div className="absolute top-[200px] left-[100px] w-40 bg-white p-2 shadow-lg transform translate-z-[20px] hover:translate-z-[50px] transition-transform">
               <div className="h-24 bg-blue-100 mb-2"></div>
               <div className="text-xs font-bold text-center">Wolf Hall (TV)</div>
               <div className="absolute -top-1 left-1/2 w-2 h-2 bg-red-600 rounded-full"></div>
            </div>

            {/* Item 2: The Book (Further Back) */}
            <div className="absolute top-[1350px] right-[100px] w-40 bg-white p-2 shadow-lg transform translate-z-[20px]">
               <div className="h-24 bg-sepia-100 mb-2 bg-yellow-50"></div>
               <div className="text-xs font-bold text-center">Thomas Cromwell</div>
               <div className="absolute -top-1 left-1/2 w-2 h-2 bg-red-600 rounded-full"></div>
            </div>

            {/* The 3D Connection String */}
            {/* In a real 3D engine this would be a cylinder mesh. Here we fake it with a transformed div */}
            <div className="absolute top-[200px] left-[170px] w-[2px] h-[1200px] bg-red-600 origin-top transform rotate-z-[15deg] translate-z-[40px] shadow-xl"></div>
         </div>

         {/* Foreground Fog */}
         <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>

      </div>
    </div>
  );
}
