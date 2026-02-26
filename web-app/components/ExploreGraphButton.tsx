'use client';

import { Network } from 'lucide-react';

/**
 * ExploreGraphButton - Client component for smooth scroll to graph section
 *
 * Design: Evidence Locker aesthetic with amber CTA styling
 * Behavior: Smooth scrolls to #graph-explorer-section with visual feedback
 * Accessibility: Keyboard accessible, clear focus states, descriptive ARIA labels
 */
export default function ExploreGraphButton() {
  const scrollToGraph = () => {
    const graphSection = document.getElementById('graph-explorer-section');
    if (graphSection) {
      graphSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });

      // Provide visual feedback with a brief highlight animation
      graphSection.classList.add('ring-4', 'ring-amber-400', 'ring-opacity-50');
      setTimeout(() => {
        graphSection.classList.remove('ring-4', 'ring-amber-400', 'ring-opacity-50');
      }, 1500);
    }
  };

  return (
    <button
      onClick={scrollToGraph}
      className="group inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] border-2 bg-amber-600 border-amber-700 text-white hover:bg-amber-700 hover:border-amber-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 active:translate-y-0 active:shadow-md"
      aria-label="Scroll to graph visualization to explore connections"
      title="Jump to interactive network graph"
    >
      <Network className="w-4 h-4 transition-transform group-hover:rotate-12 group-active:scale-90" aria-hidden="true" />
      <span>Explore Connections</span>
    </button>
  );
}
