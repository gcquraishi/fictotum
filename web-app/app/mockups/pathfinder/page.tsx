'use client';

import LandingPathQuery from '@/components/LandingPathQuery';
import { Network, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PathfinderMockup() {
  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Background Decor (Abstract Network) */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <svg width="100%" height="100%">
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="black" strokeWidth="0.5" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Simulated connection lines */}
          <path d="M100,100 Q400,300 800,100 T1200,400" fill="none" stroke="black" strokeWidth="2" />
          <path d="M0,500 Q300,400 600,600 T1000,300" fill="none" stroke="black" strokeWidth="2" />
          <circle cx="100" cy="100" r="4" fill="black" />
          <circle cx="800" cy="100" r="4" fill="black" />
          <circle cx="600" cy="600" r="4" fill="black" />
        </svg>
      </div>

      {/* Navigation */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <Network className="w-8 h-8 text-blue-600" />
          <span>ChronosGraph</span>
        </div>
        <Link href="/mockups" className="text-gray-500 hover:text-gray-900 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Mockups
        </Link>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 h-screen flex flex-col justify-center items-center">
        <div className="w-full max-w-2xl text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Connect the Dots.
          </h1>
          <p className="text-xl text-gray-600">
            Discover the hidden media relationships between any two historical figures.
          </p>
        </div>

        {/* The Core Interaction */}
        <div className="w-full max-w-3xl bg-white p-2 rounded-2xl shadow-2xl border border-gray-100">
          <div className="bg-gray-50 rounded-xl p-8">
            <LandingPathQuery />
          </div>
        </div>

        {/* Social Proof / Examples */}
        <div className="mt-12 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          <span>Try:</span>
          <button className="bg-white border border-gray-200 px-3 py-1 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors">
            Napoleon → Caesar
          </button>
          <button className="bg-white border border-gray-200 px-3 py-1 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors">
            Cleopatra → Elizabeth I
          </button>
          <button className="bg-white border border-gray-200 px-3 py-1 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors">
            JFK → Lincoln
          </button>
        </div>
      </div>
    </div>
  );
}
