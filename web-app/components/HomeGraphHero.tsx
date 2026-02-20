'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraphNode, GraphLink } from '@/lib/types';
import { getEraColor, GRAPH_PALETTE } from '@/lib/colors';

let ForceGraph2D: any = null;
if (typeof window !== 'undefined') {
  ForceGraph2D = require('react-force-graph-2d').default;
}

interface HomeGraphHeroProps {
  /** List of canonical_ids to randomly pick from */
  figureIds: string[];
}

export default function HomeGraphHero({ figureIds }: HomeGraphHeroProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const forceGraphRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1100, height: 480 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedFigureName, setSelectedFigureName] = useState<string>('');

  // Pick a random figure on mount
  const selectedId = useMemo(() => {
    if (figureIds.length === 0) return null;
    const idx = Math.floor(Math.random() * figureIds.length);
    return figureIds[idx];
  }, [figureIds]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Responsive dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: 480 });
      }
    };

    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mounted]);

  // Fetch graph data
  useEffect(() => {
    if (!selectedId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/graph/${selectedId}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setNodes(data.nodes || []);
        setLinks(data.links || []);

        // Find the center figure name
        const centerNode = (data.nodes || []).find(
          (n: GraphNode) => n.id === `figure-${selectedId}` || n.id === selectedId
        );
        if (centerNode) setSelectedFigureName(centerNode.name);
      } catch (_e) {
        setNodes([]);
        setLinks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedId]);

  // After data loads, zoom to fit
  useEffect(() => {
    if (nodes.length > 0 && forceGraphRef.current) {
      setTimeout(() => {
        forceGraphRef.current?.zoomToFit?.(400, 100);
      }, 800);
    }
  }, [nodes]);

  const handleNodeClick = (node: any) => {
    const nodeId = node.id as string;
    if (nodeId.startsWith('figure-')) {
      const canonicalId = nodeId.replace('figure-', '');
      router.push(`/figure/${canonicalId}`);
    } else if (nodeId.startsWith('media-')) {
      const mediaId = nodeId.replace('media-', '');
      router.push(`/media/${mediaId}`);
    }
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'figure') return getEraColor(node.temporal?.era);
    return GRAPH_PALETTE.MEDIA_NODE_COLOR;
  };

  const getNodeSize = (node: GraphNode) => {
    const id = node.id as string;
    // Center node is larger
    if (id === `figure-${selectedId}` || id === selectedId) return 8;
    return node.type === 'figure' ? 5 : 4;
  };

  if (!mounted || !ForceGraph2D) {
    return (
      <div
        ref={containerRef}
        style={{
          height: '480px',
          background: 'var(--color-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)',
          }}
        >
          Loading graph...
        </span>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Graph */}
      <div style={{ height: '480px', overflow: 'hidden' }}>
        {isLoading ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                color: 'var(--color-gray)',
              }}
            >
              Loading graph...
            </span>
          </div>
        ) : (
          <ForceGraph2D
            ref={forceGraphRef}
            graphData={{ nodes, links }}
            width={dimensions.width}
            height={480}
            nodeRelSize={1}
            nodeVal={(node: GraphNode) => getNodeSize(node)}
            nodeColor={(node: GraphNode) => getNodeColor(node)}
            nodeLabel={() => ''}
            linkColor={() => GRAPH_PALETTE.LINK_COLOR}
            linkWidth={1}
            onNodeClick={handleNodeClick}
            onNodeHover={(node: GraphNode | null) => setHoveredNode(node?.id || null)}
            enableZoomInteraction={false}
            enablePanInteraction={false}
            cooldownTicks={100}
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              // Draw label for center node and hovered nodes
              const isCenterNode =
                node.id === `figure-${selectedId}` || node.id === selectedId;
              const isHovered = node.id === hoveredNode;

              if (!isCenterNode && !isHovered) return;

              const label = node.name;
              const fontSize = isCenterNode ? 13 / globalScale : 11 / globalScale;
              ctx.font = `${isCenterNode ? '600' : '400'} ${fontSize}px "IBM Plex Mono", monospace`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';

              const textWidth = ctx.measureText(label).width;
              const padding = 3 / globalScale;
              const yOffset = (isCenterNode ? 10 : 7) / globalScale;

              // Halo effect for readability
              ctx.strokeStyle = GRAPH_PALETTE.CREAM_BG;
              ctx.lineWidth = 3 / globalScale;
              ctx.lineJoin = 'round';
              ctx.strokeText(label, node.x, node.y + yOffset);

              // Text
              ctx.fillStyle = isCenterNode ? '#8B2635' : GRAPH_PALETTE.LABEL_COLOR;
              ctx.fillText(label, node.x, node.y + yOffset);
            }}
          />
        )}
      </div>

      {/* Overlay text */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '32px',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: 'var(--color-gray)',
            marginBottom: '8px',
          }}
        >
          Fictotum Archive
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '42px',
            fontWeight: 300,
            lineHeight: 1.15,
            marginBottom: '8px',
          }}
        >
          How History<br />Becomes Fiction
        </h1>
        {selectedFigureName && (
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '15px',
              color: 'var(--color-gray)',
              fontStyle: 'italic',
            }}
          >
            Exploring the world of {selectedFigureName}
          </p>
        )}
      </div>

      {/* Click hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '24px',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'var(--color-gray)',
          }}
        >
          Click any node to explore
        </span>
      </div>
    </div>
  );
}
