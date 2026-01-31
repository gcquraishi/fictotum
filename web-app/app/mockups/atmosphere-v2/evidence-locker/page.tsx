'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert, FileText, Fingerprint, Database } from 'lucide-react';

export default function EvidenceLockerPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-300 font-mono selection:bg-yellow-500 selection:text-black">
      {/* Top Bar */}
      <div className="border-b border-zinc-700 bg-zinc-950 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
           <Link href="/mockups/atmosphere-v2" className="text-zinc-500 hover:text-yellow-500 transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div className="text-xs tracking-[0.2em] text-yellow-500 uppercase font-bold flex items-center gap-2">
             <ShieldAlert className="w-4 h-4" />
             Evidence Locker // Secure Access
           </div>
        </div>
        <div className="text-xs text-zinc-600">
          SESSION_ID: 8X-2991-A
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-700 min-h-[calc(100vh-60px)] p-6 bg-zinc-900 hidden md:block">
           <div className="mb-8">
             <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Current Case</div>
             <div className="p-4 border border-yellow-500/30 bg-yellow-500/5 text-yellow-100 text-sm font-bold shadow-[0_0_15px_rgba(234,179,8,0.1)]">
               CASE #192: TUDOR_NETWORK
             </div>
           </div>

           <nav className="space-y-1">
             {['Evidence Board', 'Timeline Logs', 'Entity Graph', 'Witness Reports'].map((item, i) => (
               <div key={item} className={`px-4 py-3 text-xs uppercase tracking-wider border-l-2 cursor-pointer hover:bg-zinc-800 transition-colors ${i === 0 ? 'border-yellow-500 text-white bg-zinc-800' : 'border-transparent text-zinc-500'}`}>
                 {item}
               </div>
             ))}
           </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 md:p-12 bg-[#121214] relative overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>

          <header className="relative z-10 mb-12 flex justify-between items-end">
            <div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-2 tracking-tighter uppercase text-stone-200">Thomas Cromwell</h1>
              <div className="flex gap-4 text-xs font-bold tracking-widest text-zinc-500">
                 <span className="px-2 py-1 border border-zinc-700 rounded text-yellow-500">SUSPECT_ID: TC-1485</span>
                 <span className="px-2 py-1 border border-zinc-700 rounded">STATUS: DECEASED (1540)</span>
              </div>
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-6xl font-black text-zinc-800">98%</div>
              <div className="text-xs tracking-widest text-zinc-600 uppercase">Certainty Score</div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
             {/* Main Evidence Card */}
             <div className="lg:col-span-2 space-y-8">
                <div className="bg-zinc-950 border border-zinc-700 p-6 relative group hover:border-zinc-500 transition-colors">
                   <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100">
                     <Fingerprint className="w-12 h-12 text-zinc-800 group-hover:text-yellow-500/20 transition-colors" />
                   </div>
                   <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <FileText className="w-4 h-4" /> 
                     Primary Dossier
                   </h3>
                   <p className="text-zinc-300 leading-relaxed max-w-2xl border-l-2 border-zinc-800 pl-4">
                     Subject rose from humble origins (Putney) to become Earl of Essex. Key architect of the English Reformation. 
                     Known associates include <span className="text-yellow-500 cursor-pointer hover:underline">Henry VIII</span>, 
                     <span className="text-yellow-500 cursor-pointer hover:underline">Cardinal Wolsey</span>, and 
                     <span className="text-yellow-500 cursor-pointer hover:underline">Anne Boleyn</span>. 
                     Executed for treason and heresy.
                   </p>
                </div>

                {/* Connection Grid */}
                <div>
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Known Associates</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Henry VIII', 'Anne Boleyn', 'Thomas More', 'Hans Holbein'].map((name) => (
                      <div key={name} className="aspect-square bg-zinc-900 border border-zinc-700 flex flex-col items-center justify-center p-4 text-center hover:bg-zinc-800 hover:border-yellow-500/50 cursor-pointer transition-all">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 mb-3 border-2 border-zinc-700 grayscale hover:grayscale-0"></div>
                        <div className="text-xs font-bold text-zinc-300 uppercase">{name}</div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>

             {/* Right Column: Metadata */}
             <div className="space-y-6">
               <div className="bg-zinc-900 border border-zinc-800 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
                    <Database className="w-4 h-4" />
                    Data Sources
                  </div>
                  <ul className="space-y-3">
                    {['Wikidata (Q1234)', 'British Museum API', 'User Contribution'].map((source) => (
                      <li key={source} className="flex justify-between items-center text-xs border-b border-zinc-800 pb-2 last:border-0">
                        <span className="text-zinc-400">{source}</span>
                        <span className="text-green-500">VERIFIED</span>
                      </li>
                    ))}
                  </ul>
               </div>

               <div className="p-4 bg-yellow-500/10 border border-yellow-500/20">
                 <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-2">System Alert</div>
                 <p className="text-xs text-yellow-200/70">
                   Conflicting birth date detected in 2 secondary sources. Flagged for review.
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
