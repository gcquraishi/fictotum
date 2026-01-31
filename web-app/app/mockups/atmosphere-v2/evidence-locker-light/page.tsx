'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldAlert, FileText, Fingerprint, Database, Clipboard } from 'lucide-react';

export default function EvidenceLockerLightPage() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-mono selection:bg-amber-200 selection:text-amber-900">
      {/* Top Bar - "The Case File Header" */}
      <div className="border-b-2 border-stone-300 bg-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
           <Link href="/mockups/atmosphere-v2" className="text-stone-400 hover:text-amber-700 transition-colors">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div className="text-xs tracking-[0.2em] text-stone-900 uppercase font-black flex items-center gap-2">
             <Clipboard className="w-4 h-4 text-amber-600" />
             Evidence Archive // Document View
           </div>
        </div>
        <div className="text-[10px] font-bold text-stone-400 bg-stone-50 px-2 py-1 border border-stone-200">
          CLASSIFIED: LEVEL_4_ACCESS
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - "The Filing Cabinet" */}
        <div className="w-64 border-r border-stone-300 min-h-[calc(100vh-60px)] p-6 bg-stone-200/50 hidden md:block">
           <div className="mb-8">
             <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 italic">Active Folder</div>
             <div className="p-4 border-2 border-stone-400 bg-[#f3e5ab] text-stone-900 text-sm font-black shadow-sm transform -rotate-1">
               CASE_FILE: TUDOR_NETWORK
             </div>
           </div>

           <nav className="space-y-1">
             {['Overview', 'Interrogations', 'Property Logs', 'Visual Links'].map((item, i) => (
               <div key={item} className={`px-4 py-3 text-xs uppercase tracking-wider border-r-2 text-right cursor-pointer hover:bg-white transition-colors ${i === 0 ? 'border-amber-600 text-amber-800 bg-white font-black' : 'border-transparent text-stone-400'}`}>
                 {item}
               </div>
             ))}
           </nav>
           
           <div className="mt-20 p-4 border border-dashed border-stone-400 rounded opacity-60">
              <div className="text-[9px] font-black uppercase mb-2">Notice</div>
              <p className="text-[10px] leading-tight">All physical evidence must be returned to the locker by 18:00 HRS.</p>
           </div>
        </div>

        {/* Main Content - "The Paper Dossier" */}
        <div className="flex-1 p-8 md:p-16 bg-[#F9F9F7] relative overflow-hidden">
          {/* Subtle Paper Texture/Pattern */}
          <div className="absolute inset-0 opacity-40 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#d1d5db 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}>
          </div>

          <header className="relative z-10 mb-16 flex justify-between items-start border-b border-stone-300 pb-8">
            <div>
              <div className="text-[10px] font-black text-amber-700 uppercase tracking-[0.3em] mb-2">Subject Dossier // 1485-A</div>
              <h1 className="text-6xl font-bold text-stone-900 mb-4 tracking-tighter uppercase">Thomas Cromwell</h1>
              <div className="flex gap-3">
                 <span className="px-2 py-1 bg-stone-900 text-white text-[10px] font-bold uppercase tracking-widest">DECEASED</span>
                 <span className="px-2 py-1 border border-stone-300 text-stone-500 text-[10px] font-bold uppercase tracking-widest">Case_Linked: 042</span>
              </div>
            </div>
            <div className="hidden lg:block">
               <div className="w-32 h-40 bg-stone-200 border-4 border-white shadow-md rotate-3 flex items-center justify-center text-stone-400 italic text-[10px] text-center p-4">
                 [ATTACHED PORTRAIT: HOLBEIN_1532]
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
             {/* Main Column */}
             <div className="lg:col-span-2 space-y-12">
                <div className="bg-white border-t-4 border-amber-600 shadow-xl p-8 relative">
                   <div className="absolute top-4 right-8 opacity-10">
                     <Fingerprint className="w-20 h-20 text-stone-900" />
                   </div>
                   
                   <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <FileText className="w-4 h-4 text-amber-600" /> 
                     Official Summary
                   </h3>
                   
                   <p className="text-stone-700 text-lg leading-relaxed font-sans border-l-4 border-stone-100 pl-8 italic">
                     "A man of great wit and deep policy... he was the hammer that broke the old world to forge the new." 
                   </p>
                   
                   <div className="mt-8 text-stone-600 leading-loose">
                     Subject rose from Putney origins. Architect of the <span className="bg-amber-100 px-1 border-b border-amber-400 text-amber-900 cursor-help">Act of Supremacy</span>. 
                     Key relationship noted with Henry VIII (Node_001). 
                     Investigative findings suggest a pattern of systemic administrative overhaul. 
                     Execution carried out July 28, 1540.
                   </div>
                </div>

                {/* Network / Associated Files */}
                <div>
                  <h3 className="text-xs font-black text-stone-500 uppercase tracking-widest mb-6 border-b border-stone-200 pb-2 flex justify-between">
                    Associated Entities <span>[LINK_LEVEL_1]</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {[
                      { name: 'Henry VIII', status: 'PATRON' },
                      { name: 'Anne Boleyn', status: 'REMOVED' },
                      { name: 'Cardinal Wolsey', status: 'MENTOR' },
                      { name: 'Thomas More', status: 'OPPOSITION' }
                    ].map((entity) => (
                      <div key={entity.name} className="bg-white border border-stone-300 p-4 hover:border-amber-600 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                        <div className="text-[9px] font-black text-stone-400 uppercase mb-1">{entity.status}</div>
                        <div className="text-sm font-bold text-stone-900 uppercase group-hover:text-amber-700">{entity.name}</div>
                        <div className="mt-4 flex justify-end">
                           <span className="text-[8px] font-bold text-stone-300 uppercase">View File →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
             </div>

             {/* Metadata / Technical Column */}
             <div className="space-y-8">
               <div className="bg-stone-100 border-2 border-stone-200 p-6">
                  <div className="flex items-center gap-2 text-xs font-black text-stone-900 uppercase tracking-widest mb-6">
                    <Database className="w-4 h-4 text-amber-600" />
                    Source Verification
                  </div>
                  <div className="space-y-4">
                    {[
                      { source: 'WIKIDATA_Q1234', conf: '99%' },
                      { source: 'BRITISH_MUSEUM', conf: '100%' },
                      { source: 'TUDOR_DOCS_V4', conf: '82%' }
                    ].map((s) => (
                      <div key={s.source} className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-stone-500 uppercase">{s.source}</span>
                        <span className="text-green-600 bg-green-50 px-2 border border-green-100">{s.conf}</span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="p-6 bg-[#f3e5ab]/30 border-2 border-[#f3e5ab] relative">
                 <div className="absolute top-0 right-0 px-2 py-1 bg-amber-600 text-white text-[8px] font-black uppercase">Urgent</div>
                 <h4 className="text-[10px] font-black uppercase mb-4">Investigator Note</h4>
                 <p className="text-xs text-stone-600 leading-relaxed italic">
                   "Check the financial ledgers from 1535. There is a discrepancy in the dissolution records that Cromwell personally signed."
                 </p>
                 <div className="mt-4 text-[9px] font-bold text-stone-400 text-right uppercase">— Agent_77</div>
               </div>

               <div className="flex flex-col gap-4 opacity-40 grayscale hover:grayscale-0 transition-all">
                  <div className="h-20 border-2 border-stone-300 border-dashed flex items-center justify-center italic text-xs">
                    [Place Signature Here]
                  </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
