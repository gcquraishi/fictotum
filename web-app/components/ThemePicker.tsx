'use client';

import React from 'react';
import Link from 'next/link';
import { Sword, Crown, Zap, Compass, Church, Beaker, Sparkles } from 'lucide-react';

interface Theme {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  searchQuery: string; // Used for search URL parameter
}

/**
 * ThemePicker Component
 *
 * Grid of clickable theme cards for cold-open user discovery.
 * Part of the "Discovery Engine" design direction.
 *
 * Visual Design:
 * - 6 theme cards in responsive grid
 * - Icons representing each theme
 * - Links to filtered explore views
 * - Evidence Locker aesthetic
 *
 * Themes:
 * - War & Conflict
 * - Royal Drama
 * - Revolution
 * - Exploration & Discovery
 * - Religion & Faith
 * - Science & Innovation
 */
export default function ThemePicker() {
  const themes: Theme[] = [
    {
      id: 'war',
      label: 'War & Conflict',
      icon: <Sword className="w-8 h-8" />,
      description: 'Military leaders, battles, and wartime narratives',
      color: 'border-stone-700 hover:bg-stone-50',
      searchQuery: 'war',
    },
    {
      id: 'royalty',
      label: 'Royal Drama',
      icon: <Crown className="w-8 h-8" />,
      description: 'Kings, queens, courts, and dynastic intrigue',
      color: 'border-amber-600 hover:bg-amber-50',
      searchQuery: 'royal',
    },
    {
      id: 'revolution',
      label: 'Revolution',
      icon: <Zap className="w-8 h-8" />,
      description: 'Uprisings, rebellions, and social movements',
      color: 'border-stone-600 hover:bg-stone-50',
      searchQuery: 'revolution',
    },
    {
      id: 'exploration',
      label: 'Exploration',
      icon: <Compass className="w-8 h-8" />,
      description: 'Explorers, discoverers, and adventurers',
      color: 'border-stone-500 hover:bg-stone-50',
      searchQuery: 'explorer',
    },
    {
      id: 'religion',
      label: 'Religion & Faith',
      icon: <Church className="w-8 h-8" />,
      description: 'Religious leaders, reformers, and spiritual figures',
      color: 'border-stone-600 hover:bg-stone-50',
      searchQuery: 'religion',
    },
    {
      id: 'science',
      label: 'Science & Innovation',
      icon: <Beaker className="w-8 h-8" />,
      description: 'Scientists, inventors, and visionaries',
      color: 'border-stone-500 hover:bg-stone-50',
      searchQuery: 'science',
    },
  ];

  return (
    <div className="bg-white border-t-4 border-amber-600 shadow-xl">
      {/* Header */}
      <div className="bg-amber-600 text-white px-6 py-3">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-2">
          <span>■</span> Explore by Theme
        </h2>
      </div>

      <div className="p-6">
        <div className="text-center mb-6">
          <p className="text-stone-600 text-sm font-mono">
            What interests you? Select a theme to begin exploration.
          </p>
        </div>

        {/* Theme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {themes.map((theme) => (
            <Link
              key={theme.id}
              href={`/search?q=${encodeURIComponent(theme.searchQuery)}`}
              className={`
                group block bg-white border-2 ${theme.color}
                p-6 transition-all hover:shadow-md
              `}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 text-amber-600 group-hover:text-amber-700 transition-colors">
                  {theme.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-stone-900 uppercase tracking-tight mb-2 group-hover:text-amber-700 transition-colors">
                    {theme.label}
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {theme.description}
                  </p>
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="mt-4 flex items-center justify-end">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 group-hover:text-amber-700 transition-colors">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Browse All Option */}
        <div className="mt-6 pt-6 border-t-2 border-stone-200">
          <Link
            href="/search"
            className="group flex items-center justify-center gap-2 bg-stone-50 border-2 border-stone-300 hover:border-amber-600 py-4 px-6 transition-all"
          >
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-black uppercase tracking-wider text-stone-900 group-hover:text-amber-700 transition-colors">
              Browse All Figures
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
