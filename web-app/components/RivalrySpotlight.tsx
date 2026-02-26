'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Swords, ArrowRight } from 'lucide-react';

interface FeaturedRivalry {
  figure1: {
    canonicalId: string;
    name: string;
    title?: string;
  };
  figure2: {
    canonicalId: string;
    name: string;
    title?: string;
  };
  sharedWorks: number;
  sampleWorks: string[];
  sentimentComparison: {
    figure1Positive: number;
    figure2Positive: number;
  };
}

/**
 * RivalrySpotlight Component
 *
 * Featured rivalry card showing two figures who appear together frequently.
 * Part of the "Conflict Engine" design direction.
 *
 * Visual Design:
 * - Side-by-side figure cards
 * - Shared portrayal count
 * - Sentiment comparison
 * - "Explore this rivalry" CTA
 * - Evidence Locker aesthetic
 */
export default function RivalrySpotlight() {
  const [rivalry, setRivalry] = useState<FeaturedRivalry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/rivalries/featured');
        if (!response.ok) {
          throw new Error('Failed to fetch rivalry data');
        }
        const result = await response.json();
        setRivalry(result.featured);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
        </div>
      </div>
    );
  }

  if (error || !rivalry) {
    return (
      <div className="bg-white border-2 border-stone-300 p-6">
        <div className="text-center py-12">
          <Swords className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500 text-xs font-mono uppercase tracking-widest">
            {error || 'No rivalry data available'}
          </p>
        </div>
      </div>
    );
  }

  // Determine sentiment comparison result
  const f1Positive = rivalry.sentimentComparison.figure1Positive;
  const f2Positive = rivalry.sentimentComparison.figure2Positive;

  let comparisonInsight: string;
  if (f1Positive === f2Positive) {
    comparisonInsight = 'Both figures are portrayed equally across shared works. Their narrative roles appear balanced.';
  } else if (f1Positive > f2Positive) {
    comparisonInsight = `${rivalry.figure1.name} portrayed more heroically across shared works. Sentiment divergence suggests contrasting narrative roles.`;
  } else {
    comparisonInsight = `${rivalry.figure2.name} portrayed more heroically across shared works. Sentiment divergence suggests contrasting narrative roles.`;
  }

  return (
    <div className="bg-white border-t-4 border-amber-600 shadow-xl">
      {/* Header */}
      <div className="bg-amber-600 text-white px-4 py-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
          <span>■</span> Featured Rivalry
        </h2>
      </div>

      <div className="p-6">
        {/* Figures Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Figure 1 */}
          <Link
            href={`/figure/${rivalry.figure1.canonicalId}`}
            className="group bg-stone-50 border-2 border-stone-300 p-4 hover:border-amber-600 transition-all"
          >
            {/* Placeholder for portrait */}
            <div
              className="aspect-square bg-stone-200 border-2 border-stone-300 mb-3 flex items-center justify-center"
              role="img"
              aria-label={`Portrait placeholder for ${rivalry.figure1.name}`}
            >
              <div className="text-6xl font-black text-stone-400 font-mono" aria-hidden="true">
                {rivalry.figure1.name.charAt(0)}
              </div>
            </div>

            <div className="text-sm font-bold text-stone-900 mb-1 group-hover:text-amber-700 transition-colors">
              {rivalry.figure1.name}
            </div>

            {rivalry.figure1.title && (
              <div className="text-[10px] text-stone-500 uppercase tracking-wider font-mono mb-2">
                {rivalry.figure1.title}
              </div>
            )}

            {/* Sentiment Bar */}
            <div className="h-2 bg-stone-200 border border-stone-300">
              <div
                className="h-full bg-amber-600 transition-all"
                style={{ width: `${rivalry.sentimentComparison.figure1Positive}%` }}
              />
            </div>
            <div className="text-[10px] text-stone-600 font-mono mt-1">
              {rivalry.sentimentComparison.figure1Positive}% Heroic
            </div>
          </Link>

          {/* Figure 2 */}
          <Link
            href={`/figure/${rivalry.figure2.canonicalId}`}
            className="group bg-stone-50 border-2 border-stone-300 p-4 hover:border-amber-600 transition-all"
          >
            {/* Placeholder for portrait */}
            <div
              className="aspect-square bg-stone-200 border-2 border-stone-300 mb-3 flex items-center justify-center"
              role="img"
              aria-label={`Portrait placeholder for ${rivalry.figure2.name}`}
            >
              <div className="text-6xl font-black text-stone-400 font-mono" aria-hidden="true">
                {rivalry.figure2.name.charAt(0)}
              </div>
            </div>

            <div className="text-sm font-bold text-stone-900 mb-1 group-hover:text-amber-700 transition-colors">
              {rivalry.figure2.name}
            </div>

            {rivalry.figure2.title && (
              <div className="text-[10px] text-stone-500 uppercase tracking-wider font-mono mb-2">
                {rivalry.figure2.title}
              </div>
            )}

            {/* Sentiment Bar */}
            <div className="h-2 bg-stone-200 border border-stone-300">
              <div
                className="h-full bg-amber-600 transition-all"
                style={{ width: `${rivalry.sentimentComparison.figure2Positive}%` }}
              />
            </div>
            <div className="text-[10px] text-stone-600 font-mono mt-1">
              {rivalry.sentimentComparison.figure2Positive}% Heroic
            </div>
          </Link>
        </div>

        {/* VS Divider with Shared Works Count */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-stone-300"></div>
          </div>
          <div className="relative flex justify-center">
            <div className="bg-white px-4 flex items-center gap-2">
              <Swords className="w-4 h-4 text-amber-600" />
              <span className="text-2xl font-black text-amber-600 font-mono">
                {rivalry.sharedWorks}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-stone-600">
                Shared Portrayals
              </span>
            </div>
          </div>
        </div>

        {/* Sample Works */}
        <div className="bg-stone-50 border-2 border-stone-200 p-4 mb-4">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-2">
            Featured Works
          </div>
          <ul className="space-y-1">
            {rivalry.sampleWorks.slice(0, 3).map((work, idx) => (
              <li key={idx} className="text-xs text-stone-700 font-mono flex items-start gap-2">
                <span className="text-amber-600 flex-shrink-0">•</span>
                <span className="line-clamp-1">{work}</span>
              </li>
            ))}
          </ul>
          {rivalry.sharedWorks > 3 && (
            <div className="text-[10px] text-stone-500 font-mono mt-2">
              + {rivalry.sharedWorks - 3} more
            </div>
          )}
        </div>

        {/* Insight */}
        <div className="bg-amber-50 border-2 border-amber-200 p-3 mb-4">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1">
            Analysis
          </div>
          <p className="text-xs text-amber-900 font-mono leading-relaxed">
            {comparisonInsight}
          </p>
        </div>

        {/* CTA Button */}
        <Link
          href={`/figure/${rivalry.figure1.canonicalId}`}
          className="w-full bg-amber-600 text-white py-3 px-4 font-black text-sm uppercase tracking-wider hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 group"
        >
          <span>View {rivalry.figure1.name}</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
