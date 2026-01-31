'use client';

import { ArrowLeft, Search, TrendingUp, Users, Activity, Plus } from 'lucide-react';
import Link from 'next/link';

export default function DashboardMockup() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 font-sans">
      {/* Dashboard Header */}
      <div className="max-w-7xl mx-auto mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white p-2 rounded-lg font-bold text-xl">CG</div>
          <h1 className="text-xl font-bold text-gray-800">Research Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input type="text" placeholder="Quick Search..." className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm w-64 bg-white" />
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus className="w-4 h-4"/> Contribute
          </button>
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <Link href="/mockups" className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5"/></Link>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4 h-[calc(100vh-100px)]">
        
        {/* Main Area: Quick Path (Box 2) */}
        <div className="col-span-8 row-span-2 bg-white rounded-2xl p-8 border border-gray-200 shadow-sm flex flex-col justify-center items-center relative overflow-hidden">
           <div className="absolute top-4 left-4 font-bold text-gray-400 text-xs uppercase tracking-widest">Pathfinder</div>
           <h2 className="text-3xl font-bold mb-8 text-gray-800">Trace a Connection</h2>
           <div className="w-full max-w-lg space-y-4 relative z-10">
              <div className="flex gap-2">
                 <input type="text" placeholder="Start Figure (e.g. Napoleon)" className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-lg" />
              </div>
              <div className="flex gap-2">
                 <input type="text" placeholder="End Figure (e.g. Caesar)" className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 outline-none text-lg" />
              </div>
              <button className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                 Analyze Path
              </button>
           </div>
           {/* Decorative bg elements */}
           <div className="absolute right-[-50px] bottom-[-50px] w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        </div>

        {/* Sidebar: Trending (Box 3) */}
        <div className="col-span-4 row-span-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
           <div className="flex items-center gap-2 mb-4 text-blue-600 font-bold text-xs uppercase tracking-widest">
              <TrendingUp className="w-4 h-4" /> Trending Figures
           </div>
           <ul className="space-y-3">
              {[1,2,3,4].map(i => (
                 <li key={i} className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 rounded-lg -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{i}</div>
                       <span className="font-medium text-gray-700">Julius Caesar</span>
                    </div>
                    <span className="text-xs text-green-500 font-medium">+12%</span>
                 </li>
              ))}
           </ul>
        </div>

        {/* Sidebar: Recent Discoveries (Box 1) */}
        <div className="col-span-4 row-span-1 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm overflow-hidden">
           <div className="flex items-center gap-2 mb-4 text-purple-600 font-bold text-xs uppercase tracking-widest">
              <Activity className="w-4 h-4" /> Live Feed
           </div>
           <div className="space-y-4">
              <div className="text-sm">
                 <span className="font-bold text-gray-900">User_892</span> connected <span className="text-blue-600">Lincoln</span> to <span className="text-blue-600">Washington</span> via 3 films.
                 <div className="text-xs text-gray-400 mt-1">2 mins ago</div>
              </div>
              <div className="text-sm">
                 <span className="font-bold text-gray-900">HistoryBuff</span> added 5 new portrayals for <span className="text-blue-600">Cleopatra</span>.
                 <div className="text-xs text-gray-400 mt-1">15 mins ago</div>
              </div>
           </div>
        </div>

        {/* Bottom Bar: Stats */}
        <div className="col-span-12 h-32 bg-gray-900 rounded-2xl p-6 flex items-center justify-around text-white">
            <div className="text-center">
               <div className="text-3xl font-bold">2,103</div>
               <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total Figures</div>
            </div>
            <div className="w-px h-12 bg-gray-800"></div>
            <div className="text-center">
               <div className="text-3xl font-bold">14,200</div>
               <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Media Works</div>
            </div>
            <div className="w-px h-12 bg-gray-800"></div>
            <div className="text-center">
               <div className="text-3xl font-bold text-green-400">98.2%</div>
               <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Data Accuracy</div>
            </div>
        </div>

      </div>
    </div>
  );
}
