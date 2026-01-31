'use client';

import { ArrowLeft, Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function CaseFilesMockup() {
  const [activeTab, setActiveTab] = useState('french-rev');

  return (
    <div className="min-h-screen bg-[#3e2723] text-gray-900 font-sans relative overflow-hidden">
      {/* Wood Texture */}
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{
         backgroundImage: `repeating-linear-gradient(45deg, #3e2723 0, #3e2723 10px, #4e342e 10px, #4e342e 20px)`
      }}></div>

      {/* Nav */}
      <div className="absolute top-4 left-4 z-50">
         <Link href="/mockups/detective-iterations" className="text-white/70 hover:text-white flex items-center gap-2 font-bold"><ArrowLeft className="w-5 h-5"/> Back</Link>
      </div>

      {/* Desk Surface */}
      <div className="relative z-10 container mx-auto px-4 py-12 h-screen flex flex-col items-center justify-center">
         
         {/* The File Stack (Tabs) */}
         <div className="w-full max-w-5xl flex items-end pl-8 space-x-2">
            <button 
               onClick={() => setActiveTab('rome')}
               className={`px-8 py-3 rounded-t-lg font-bold text-lg border-t border-l border-r border-yellow-200 shadow-lg transform transition-transform ${activeTab === 'rome' ? 'bg-[#f5f5dc] translate-y-2 z-20' : 'bg-[#e0e0c0] hover:bg-[#ebebcf] z-10 text-gray-600'}`}
            >
               CASE 001: ROME
            </button>
            <button 
               onClick={() => setActiveTab('french-rev')}
               className={`px-8 py-3 rounded-t-lg font-bold text-lg border-t border-l border-r border-yellow-200 shadow-lg transform transition-transform ${activeTab === 'french-rev' ? 'bg-[#f5f5dc] translate-y-2 z-20' : 'bg-[#e0e0c0] hover:bg-[#ebebcf] z-10 text-gray-600'}`}
            >
               CASE 089: REVOLUTION
            </button>
            <button className="px-4 py-3 bg-gray-800 rounded-t-lg text-white font-bold text-sm hover:bg-gray-700 opacity-90 z-0 flex items-center gap-2">
               <Plus className="w-4 h-4"/> NEW CASE
            </button>
         </div>

         {/* The Open File Folder */}
         <div className="w-full max-w-5xl bg-[#f5f5dc] h-[600px] rounded-r-lg rounded-b-lg shadow-2xl relative p-12 border border-yellow-100 z-20">
             {/* Folder Tab Label */}
             <div className="absolute -top-8 right-0 bg-[#f5f5dc] px-8 py-2 rounded-t-lg border-t border-r border-yellow-200 font-typewriter text-red-800 font-bold tracking-widest text-xl shadow-none z-20">
                CONFIDENTIAL
             </div>

             <div className="h-full border-2 border-dashed border-gray-300 rounded p-8 relative">
                {/* Content based on tab */}
                {activeTab === 'french-rev' ? (
                   <>
                      <h1 className="font-typewriter text-4xl font-bold mb-2 underline decoration-red-500 decoration-4 underline-offset-4">The Terror</h1>
                      <p className="font-mono text-gray-500 mb-8">1789 - 1799 • Paris, France</p>

                      <div className="grid grid-cols-3 gap-8">
                         {/* Robespierre Photo */}
                         <div className="bg-white p-2 pb-6 shadow-md transform -rotate-1 relative group cursor-pointer hover:scale-105 transition-transform">
                            <div className="bg-gray-200 h-32 w-full mb-2"></div>
                            <div className="font-typewriter font-bold text-center">Robespierre</div>
                            {/* Pin */}
                            <div className="absolute -top-2 left-1/2 w-4 h-4 bg-red-600 rounded-full shadow-md z-30"></div>
                            {/* String going off-screen to the 'Rome' tab */}
                            <div className="absolute top-0 left-1/2 w-[600px] h-[2px] bg-red-600 origin-left -rotate-45 pointer-events-none z-0"></div>
                            <div className="absolute -top-20 -left-20 bg-white px-2 py-1 text-xs font-bold text-red-600 border border-red-600 rotate-0 shadow-sm">
                               LINKS TO CASE 001
                            </div>
                         </div>

                         {/* Danton Photo */}
                         <div className="bg-white p-2 pb-6 shadow-md transform rotate-2 relative">
                            <div className="bg-gray-200 h-32 w-full mb-2"></div>
                            <div className="font-typewriter font-bold text-center">Danton</div>
                            <div className="absolute -top-2 left-1/2 w-4 h-4 bg-gray-400 rounded-full shadow-md"></div>
                         </div>
                      </div>
                   </>
                ) : (
                   <div className="flex items-center justify-center h-full text-gray-400 font-typewriter text-2xl">
                      [FILE CLOSED - CLICK TAB TO OPEN]
                   </div>
                )}
             </div>
         </div>

      </div>
    </div>
  );
}
