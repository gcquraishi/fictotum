'use client';

import { ArrowLeft, GitCommit, GitPullRequest } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function TensionMockup() {
  const [activeNode, setActiveNode] = useState<number | null>(null);

  return (
    <div className="h-screen bg-[#0a0a0a] text-gray-300 font-sans flex overflow-hidden">
      
      {/* Sidebar Navigation */}
      <div className="w-20 border-r border-gray-800 flex flex-col items-center py-8 gap-8 z-30 bg-[#0a0a0a]">
         {/* Logo: Stylized Knot */}
         <Link href="/mockups/fictiography">
            <div className="w-10 h-10 border-2 border-red-600 rotate-45 flex items-center justify-center hover:bg-red-900/20 transition-colors">
               <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            </div>
         </Link>
         
         <div className="flex-grow flex flex-col gap-6">
            <div className="p-3 bg-gray-900 rounded-lg text-red-500 cursor-pointer"><GitCommit className="w-6 h-6"/></div>
            <div className="p-3 hover:bg-gray-900 rounded-lg cursor-pointer"><GitPullRequest className="w-6 h-6"/></div>
         </div>

         <div className="text-xs font-mono rotate-180 py-4 writing-vertical text-gray-600">FICTIOGRAPHY v1.0</div>
      </div>

      {/* Main Split View */}
      <div className="flex-grow flex relative">
         
         {/* Left Panel: Structured List */}
         <div className="w-1/3 border-r border-gray-800 bg-[#0f0f0f] z-20 flex flex-col">
            <div className="p-6 border-b border-gray-800">
               <h2 className="text-xl font-bold text-white tracking-tight">Active Subjects</h2>
               <p className="text-sm text-gray-500 mt-1">Select a node to tension the graph.</p>
            </div>
            <div className="flex-grow overflow-y-auto">
               {[1,2,3,4,5].map(i => (
                  <div 
                     key={i}
                     onClick={() => setActiveNode(i)}
                     className={`p-6 border-b border-gray-800 cursor-pointer transition-all hover:bg-gray-900 flex justify-between items-center group ${activeNode === i ? 'bg-gray-900 border-l-4 border-l-red-600' : 'border-l-4 border-l-transparent'}`}
                  >
                     <div>
                        <div className={`font-bold text-lg ${activeNode === i ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                           Subject {i < 3 ? 'Alpha' : i < 5 ? 'Beta' : 'Gamma'}
                        </div>
                        <div className="text-xs font-mono text-gray-600 mt-1">ID: Q-8921-{i}</div>
                     </div>
                     {activeNode === i && <div className="w-2 h-2 bg-red-600 rounded-full shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse"></div>}
                  </div>
               ))}
            </div>
         </div>

         {/* Right Panel: Chaotic Graph */}
         <div className="flex-grow relative bg-black overflow-hidden cursor-crosshair">
            {/* Grid */}
            <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>

            {/* The Graph */}
            <div className="absolute inset-0 flex items-center justify-center">
               
               {/* Central Hub */}
               <div className={`transition-all duration-500 transform ${activeNode ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                   {/* Connections radiating out */}
                   <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none animate-spin-slow">
                      <line x1="400" y1="400" x2="100" y2="100" stroke="#b91c1c" strokeWidth="1" strokeOpacity="0.6" />
                      <line x1="400" y1="400" x2="700" y2="200" stroke="#b91c1c" strokeWidth="1" strokeOpacity="0.6" />
                      <line x1="400" y1="400" x2="300" y2="700" stroke="#b91c1c" strokeWidth="1" strokeOpacity="0.6" />
                      <line x1="400" y1="400" x2="600" y2="600" stroke="#b91c1c" strokeWidth="1" strokeOpacity="0.6" />
                   </svg>

                   <div className="w-32 h-32 rounded-full border-2 border-red-600 bg-black flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.3)] relative z-10">
                      <div className="text-center">
                         <div className="text-red-500 font-mono text-xs">FOCUS</div>
                         <div className="font-bold text-white text-xl">SUBJ-{activeNode}</div>
                      </div>
                   </div>

                   {/* Satellites */}
                   <div className="absolute top-0 left-0 w-12 h-12 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center text-xs">A</div>
                   <div className="absolute top-20 right-10 w-12 h-12 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center text-xs">B</div>
                   <div className="absolute bottom-10 left-20 w-12 h-12 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center text-xs">C</div>
               </div>

               {!activeNode && (
                  <div className="text-gray-600 font-mono text-sm tracking-widest animate-pulse">
                     WAITING FOR TENSION...
                  </div>
               )}
            </div>
         </div>

      </div>
    </div>
  );
}
