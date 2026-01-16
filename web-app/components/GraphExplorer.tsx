'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { GraphNode, GraphLink } from '@/lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface GraphExplorerProps {
  nodes: GraphNode[];
  links: GraphLink[];
}

const SENTIMENT_COLORS = {
  Heroic: '#22c55e',
  Villainous: '#ef4444',
  Complex: '#eab308',
};

export default function GraphExplorer({ nodes, links }: GraphExplorerProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.max(600, window.innerHeight - 400);
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (nodes.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
        <p className="text-gray-400 text-center py-8">No graph data available</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-gray-400">Historical Figure</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-400">Heroic</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Villainous</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-400">Complex</span>
        </div>
      </div>
      <div ref={containerRef} className="bg-gray-900 rounded-lg overflow-hidden">
        <ForceGraph2D
          graphData={{ nodes, links }}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeColor={(node: any) => {
            if (node.type === 'figure') return '#3b82f6';
            return SENTIMENT_COLORS[node.sentiment as keyof typeof SENTIMENT_COLORS];
          }}
          nodeRelSize={6}
          linkColor={() => '#4b5563'}
          linkWidth={2}
          backgroundColor="#111827"
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw node
            ctx.fillStyle = node.type === 'figure' ? '#3b82f6' : SENTIMENT_COLORS[node.sentiment as keyof typeof SENTIMENT_COLORS];
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
            ctx.fill();

            // Draw label
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, node.x, node.y + 12);
          }}
        />
      </div>
    </div>
  );
}
