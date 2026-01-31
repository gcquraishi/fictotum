'use client';

import { ArrowLeft, BookOpen, ChevronRight, PlayCircle } from 'lucide-react';
import Link from 'next/link';

export default function CuratedMockup() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-serif text-gray-900">
      {/* Editorial Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
          <div className="text-2xl font-bold tracking-tight">The Chronos Review</div>
          <nav className="hidden md:flex gap-8 text-sm font-sans uppercase tracking-widest text-gray-500">
            <Link href="#" className="hover:text-black">Eras</Link>
            <Link href="#" className="hover:text-black">Figures</Link>
            <Link href="#" className="hover:text-black">Essays</Link>
            <Link href="/mockups" className="hover:text-black flex items-center gap-1"><ArrowLeft className="w-3 h-3"/> Mocks</Link>
          </nav>
        </div>
      </header>

      {/* Featured Story (Hero) */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1 space-y-6">
            <div className="text-xs font-sans font-bold text-red-600 uppercase tracking-widest">Featured Connection</div>
            <h1 className="text-5xl md:text-6xl font-serif leading-tight">
              The Six Degrees of <br/><span className="italic text-gray-400">Henry VIII</span>
            </h1>
            <p className="text-xl text-gray-600 font-sans leading-relaxed">
              How a 16th-century monarch connects to modern cinema through a web of 200+ portrayals.
            </p>
            <button className="bg-black text-white px-8 py-4 rounded-none font-sans uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center gap-2">
              Start Exploration <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="order-1 md:order-2">
             <div className="aspect-[4/3] bg-gray-200 relative overflow-hidden shadow-xl">
               {/* Placeholder for a rich historical painting/image */}
               <div className="absolute inset-0 bg-gradient-to-tr from-gray-800 to-gray-400 flex items-center justify-center text-white/20 font-sans text-4xl font-bold">
                 [Hero Image]
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Curated Entry Points */}
      <section className="bg-white py-16 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-serif">Curated Collections</h2>
            <Link href="#" className="font-sans text-sm underline decoration-gray-300 hover:decoration-black underline-offset-4">View Archive</Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="group cursor-pointer">
                <div className="aspect-[3/2] bg-gray-100 mb-4 relative overflow-hidden">
                   <div className="absolute inset-0 bg-gray-200 group-hover:scale-105 transition-transform duration-700"></div>
                   <div className="absolute bottom-4 left-4 bg-white px-3 py-1 text-xs font-sans font-bold uppercase tracking-widest">
                      {i === 1 ? 'Ancient Rome' : i === 2 ? 'The Tudors' : 'Napoleonic Wars'}
                   </div>
                </div>
                <h3 className="text-xl font-serif group-hover:underline decoration-1 underline-offset-4 decoration-gray-300">
                  {i === 1 ? 'From Republic to Empire' : i === 2 ? 'Court Intrigue & Beheadings' : 'Revolution across Europe'}
                </h3>
                <p className="text-gray-500 font-sans text-sm mt-2 leading-relaxed">
                  Trace the media lineage of this defining era through 50+ films and books.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="bg-gray-900 text-white py-20 text-center">
         <div className="container mx-auto px-4">
            <h2 className="text-4xl font-serif mb-6">Ready to find your own path?</h2>
            <button className="border border-white/30 px-8 py-3 hover:bg-white hover:text-black transition-all font-sans uppercase tracking-widest text-sm">
               Open Universal Search
            </button>
         </div>
      </section>
    </div>
  );
}
