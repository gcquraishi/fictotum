'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, PenTool, Wind } from 'lucide-react';

export default function IlluminatedManuscriptPage() {
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#3D0C11] font-serif selection:bg-[#D4AF37] selection:text-white">
      {/* Ornate Header */}
      <div className="border-b-4 border-double border-[#D4AF37] bg-[#FDFBF7] p-6 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
           <Link href="/mockups/atmosphere-v2" className="text-[#3D0C11]/50 hover:text-[#D4AF37] transition-colors">
             <ArrowLeft className="w-6 h-6" />
           </Link>
           <div className="flex items-center gap-3">
             <BookOpen className="w-8 h-8 text-[#D4AF37]" strokeWidth={1.5} />
             <h2 className="text-2xl font-bold tracking-tight uppercase">Scriptorium Chronos</h2>
           </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-60">
          Anno Domini MMXXVI
        </div>
      </div>

      <main className="max-w-4xl mx-auto py-20 px-8 relative">
        {/* Decorative Corner Elements (CSS) */}
        <div className="absolute top-10 left-0 w-20 h-20 border-t-2 border-l-2 border-[#D4AF37]/30"></div>
        <div className="absolute top-10 right-0 w-20 h-20 border-t-2 border-r-2 border-[#D4AF37]/30"></div>

        <article className="relative">
          <div className="text-center mb-16">
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#D4AF37] font-black block mb-4">Historical Figure Entry</span>
            <h1 className="text-7xl font-bold tracking-tighter mb-4 italic">Thomas Cromwell</h1>
            <div className="w-24 h-1 bg-[#D4AF37] mx-auto"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
            {/* Illuminated Initial */}
            <div className="md:col-span-1 text-8xl font-black text-[#D4AF37] leading-none select-none relative">
              T
              <div className="absolute -inset-2 border border-[#D4AF37]/20 rounded-sm -z-10 bg-[#FDFBF7] shadow-inner"></div>
            </div>

            <div className="md:col-span-11">
              <p className="text-2xl leading-[1.6] text-[#4A2B2E] mb-8 first-letter:float-left first-letter:mr-3">
                homas Cromwell, the Earl of Essex, was a man of remarkable industry and ruthless intellect. 
                Born unto a humble blacksmith in Putney, he ascended to the right hand of King Henry VIII, 
                weaving the very fabric of the English Reformation with a pen sharper than any sword.
              </p>

              <div className="space-y-12">
                {/* Connections section */}
                <section>
                  <h3 className="text-xs uppercase tracking-[0.4em] font-black text-[#D4AF37] mb-8 flex items-center gap-3">
                    <PenTool className="w-4 h-4" /> Threads of Influence
                  </h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      { name: 'King Henry VIII', role: 'The Royal Patron', note: 'Bound by decree and the break with Rome.' },
                      { name: 'Cardinal Wolsey', role: 'The Fallen Mentor', note: 'Served faithfully until the Cardinals eclipse.' },
                      { name: 'Anne Boleyn', role: 'The Tragic Queen', note: 'A bond of utility that ended in the Tower.' }
                    ].map((conn) => (
                      <div key={conn.name} className="group relative p-6 bg-[#FDFBF7] border border-[#D4AF37]/20 hover:border-[#D4AF37] transition-all cursor-pointer">
                        <div className="flex justify-between items-start">
                           <div>
                             <h4 className="text-xl font-bold italic mb-1">{conn.name}</h4>
                             <p className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-bold">{conn.role}</p>
                           </div>
                           <Wind className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity text-[#D4AF37]" />
                        </div>
                        <p className="mt-4 text-sm opacity-70 font-sans italic">{conn.note}</p>
                        
                        {/* Decorative Flourish */}
                        <div className="absolute bottom-0 right-0 w-8 h-8 opacity-10">
                           <svg viewBox="0 0 100 100" className="fill-current"><path d="M0,100 Q50,50 100,100" stroke="currentColor" fill="none"/></svg>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </article>

        <footer className="mt-32 pt-8 border-t border-[#D4AF37]/20 text-center text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">
          Manuscript Digitized via ChronosGraph // MCMXC - MMXXVI
        </footer>
      </main>
    </div>
  );
}
