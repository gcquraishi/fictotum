'use client';

import { ArrowLeft, Clock, Maximize2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function DualViewMockup() {
  const [viewMode, setViewMode] = useState<'timeline' | 'evidence'>('evidence');

  return (
    <div className="h-screen bg-gray-100 flex flex-col relative font-sans">
      
      {/* Top Bar */}
      <div className="h-16 bg-white border-b border-gray-200 flex justify-between items-center px-6 z-20 shadow-sm">
         <div className="flex items-center gap-4">
            <Link href="/mockups/detective-iterations"><ArrowLeft className="w-5 h-5 text-gray-500"/></Link>
            <h1 className="font-bold text-gray-800">Investigation: <span className="text-red-600">The Monarchs</span></h1>
         </div>
         <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
               onClick={() => setViewMode('timeline')}
               className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'timeline' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
            >
               Timeline View
            </button>
            <button 
               onClick={() => setViewMode('evidence')}
               className={`px-4 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'evidence' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
            >
               Evidence Board
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow relative overflow-hidden bg-[#e5e5f7] p-8" style={{
         backgroundImage: 'radial-gradient(#444cf7 0.5px, transparent 0.5px), radial-gradient(#444cf7 0.5px, #e5e5f7 0.5px)',
         backgroundSize: '20px 20px',
         backgroundPosition: '0 0, 10px 10px'
      }}>
         
         {/* The Evidence Board (Always visible but changes layout) */}
         <div className={`transition-all duration-700 ease-in-out h-full w-full relative ${viewMode === 'timeline' ? 'scale-90 opacity-50 blur-sm' : 'scale-100 opacity-100'}`}>
            {/* Cluster 1 */}
            <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-white rounded-xl shadow-xl p-4 transform -rotate-2">
               <h3 className="font-bold border-b pb-2 mb-2">The Tudors</h3>
               <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-square bg-gray-200 rounded"></div>
                  <div className="aspect-square bg-gray-200 rounded"></div>
               </div>
               {/* String */}
               <div className="absolute top-1/2 right-0 w-[400px] h-[3px] bg-red-500 origin-left rotate-12 shadow-sm"></div>
            </div>

            {/* Cluster 2 */}
            <div className="absolute bottom-[20%] right-[20%] w-64 h-64 bg-white rounded-xl shadow-xl p-4 transform rotate-3">
               <h3 className="font-bold border-b pb-2 mb-2">Modern Cinema</h3>
               <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-square bg-gray-200 rounded"></div>
                  <div className="aspect-square bg-gray-200 rounded"></div>
               </div>
            </div>
         </div>

         {/* The Timeline Overlay (Slides up) */}
         <div className={`absolute bottom-0 left-0 w-full bg-white border-t-4 border-red-600 shadow-2xl transition-transform duration-500 ease-out z-30 ${viewMode === 'timeline' ? 'translate-y-0' : 'translate-y-[85%]'}`}>
            {/* Handle / Header */}
            <div className="h-12 flex justify-center items-center cursor-pointer hover:bg-gray-50" onClick={() => setViewMode(v => v === 'timeline' ? 'evidence' : 'timeline')}>
               <div className="w-12 h-1 bg-gray-300 rounded-full mb-1"></div>
               <span className="text-xs text-gray-400 uppercase tracking-widest absolute right-8">
                  {viewMode === 'timeline' ? 'Click to Collapse' : 'Expand Timeline'}
               </span>
            </div>

            {/* Timeline Content */}
            <div className="h-64 p-8 flex items-center relative overflow-x-auto">
               <div className="w-full h-1 bg-gray-300 relative min-w-[1000px]">
                  {/* Event 1 */}
                  <div className="absolute left-[10%] top-1/2 -translate-y-1/2">
                     <div className="w-4 h-4 bg-black rounded-full border-4 border-white shadow"></div>
                     <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 text-center text-sm font-bold">1500</div>
                  </div>
                  {/* Event 2 */}
                  <div className="absolute left-[80%] top-1/2 -translate-y-1/2">
                     <div className="w-4 h-4 bg-black rounded-full border-4 border-white shadow"></div>
                     <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 text-center text-sm font-bold">2020</div>
                  </div>
                  
                  {/* Connection Arc (The "Folded Time") */}
                  <svg className="absolute top-[-100px] left-0 w-full h-[100px] pointer-events-none">
                     <path d="M 100 100 Q 450 -50 800 100" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 4" />
                  </svg>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
