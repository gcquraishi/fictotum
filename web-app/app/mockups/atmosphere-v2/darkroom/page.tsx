'use client';

import Link from 'next/link';
import { ArrowLeft, Camera, Eye, Zap } from 'lucide-react';

export default function DarkroomPage() {
  return (
    <div className="min-h-screen bg-black text-red-600 font-mono selection:bg-red-600 selection:text-black cursor-crosshair">
      {/* Red Light Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]"></div>

      {/* Top Navigation */}
      <nav className="border-b border-red-900/50 p-6 flex justify-between items-center relative z-10 bg-black/80 backdrop-blur-md">
        <div className="flex items-center gap-8">
           <Link href="/mockups/atmosphere-v2" className="text-red-900 hover:text-red-500 transition-colors">
             <ArrowLeft className="w-6 h-6" />
           </Link>
           <div className="flex items-center gap-3 group">
             <Camera className="w-6 h-6 group-hover:rotate-12 transition-transform" />
             <h2 className="text-xl font-bold tracking-[0.2em] uppercase">Investigative Darkroom</h2>
           </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.5em] font-black flex items-center gap-4">
          <span className="animate-pulse">● REC</span>
          <span className="opacity-40">1540_EXECUTION_RECORDS</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8 md:p-16 grid grid-cols-1 lg:grid-cols-12 gap-16 relative z-10">
        {/* The "Drying" Image Hero */}
        <div className="lg:col-span-7">
           <div className="relative aspect-[4/5] bg-red-950/20 border border-red-900 overflow-hidden group">
              {/* Developing Effect Overlay */}
              <div className="absolute inset-0 bg-black animate-[reveal_4s_ease-out_forwards]"></div>
              
              <div className="absolute inset-0 flex items-center justify-center flex-col p-12 text-center">
                 <div className="w-full h-full border-2 border-dashed border-red-900/50 flex flex-col items-center justify-center group-hover:border-red-500 transition-colors">
                    <Zap className="w-16 h-16 mb-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <h1 className="text-6xl font-black italic tracking-tighter uppercase text-red-500 mb-4 group-hover:scale-110 transition-transform">
                      Cromwell
                    </h1>
                    <p className="text-xs uppercase tracking-widest opacity-50 group-hover:opacity-100">
                      Subject Developing... 72%
                    </p>
                 </div>
              </div>

              {/* Clothesline Pins Effect */}
              <div className="absolute top-0 left-1/4 -translate-y-1/2 w-4 h-8 bg-red-900 rounded-full"></div>
              <div className="absolute top-0 right-1/4 -translate-y-1/2 w-4 h-8 bg-red-900 rounded-full"></div>
           </div>
        </div>

        {/* Metadata & Analysis */}
        <div className="lg:col-span-5 space-y-12 py-8">
           <section>
              <h3 className="text-xs uppercase tracking-[0.4em] font-black mb-6 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Visual Analysis
              </h3>
              <div className="space-y-6">
                <div className="border-l-2 border-red-900 pl-6 space-y-2">
                   <div className="text-[10px] font-bold text-red-900 uppercase">Profile Characteristics</div>
                   <p className="text-sm leading-relaxed text-red-500/80">
                     HEAVY JAWLINE. PENETRATING GAZE. WEARS THE FUR-COLLARED GOWN OF AN EARL. 
                     THE PORTRAIT BY HOLBEIN SUGGESTS A MAN OF SECRETS.
                   </p>
                </div>
                <div className="border-l-2 border-red-900 pl-6 space-y-2">
                   <div className="text-[10px] font-bold text-red-900 uppercase">Chemical Traces</div>
                   <p className="text-sm leading-relaxed text-red-500/80 italic">
                     "I have seen him weep at the fall of Wolsey, yet he would not stay his hand when the King demanded his own head."
                   </p>
                </div>
              </div>
           </section>

           <section className="bg-red-950/20 p-6 border border-red-900/30 border-dashed">
              <h4 className="text-[10px] uppercase tracking-widest font-black mb-4">Negatives Found</h4>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square bg-red-900/20 border border-red-900 flex items-center justify-center hover:bg-red-600 hover:text-black cursor-pointer transition-all">
                    <span className="text-xs font-bold">FRAME_{i}</span>
                  </div>
                ))}
              </div>
           </section>

           <div className="pt-8 border-t border-red-900/30 flex flex-col gap-2">
              <div className="text-[10px] uppercase font-bold opacity-50">Discovery Path</div>
              <div className="text-xs flex flex-wrap gap-2 uppercase tracking-widest">
                <span>London</span> → <span>The Tower</span> → <span>Tyburn</span>
              </div>
           </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes reveal {
          from { opacity: 1; }
          to { opacity: 0.1; }
        }
      `}</style>
    </div>
  );
}
