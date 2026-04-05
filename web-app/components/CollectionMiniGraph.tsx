'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GRAPH_PALETTE, getEraColor } from '@/lib/colors';

interface CollectionItem {
  id: string;
  wikidata_id?: string;
  name?: string;
  title?: string;
  type: 'figure' | 'media';
  era?: string;
  media_type?: string;
}

interface CollectionMiniGraphProps {
  items: CollectionItem[];
}

let ForceGraph2D: any = null;
if (typeof window !== 'undefined') {
  ForceGraph2D = require('react-force-graph-2d').default;
}

export default function CollectionMiniGraph({ items }: CollectionMiniGraphProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const forceGraphRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const [width, setWidth] = useState(700);
  const HEIGHT = 380;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setWidth(rect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build graph data from the collection items.
  // For a collection mini-graph we show the items as nodes connected to a
  // virtual "collection hub" node in the center.
  const graphData = (() => {
    if (items.length === 0) return { nodes: [], links: [] };

    const hubNode = {
      id: '__collection_hub__',
      name: 'Collection',
      type: 'hub' as const,
      color: '#1A1A1A',
      size: 10,
    };

    const nodes = [
      hubNode,
      ...items.map((item) => ({
        id: item.id || item.wikidata_id || item.title || item.name || Math.random().toString(),
        name: item.type === 'figure' ? (item.name || '') : (item.title || ''),
        type: item.type,
        era: item.era,
        media_type: item.media_type,
        color: item.type === 'figure'
          ? getEraColor(item.era)
          : GRAPH_PALETTE.MEDIA_NODE_COLOR,
        size: 5,
        _item: item,
      })),
    ];

    const links = items.map((item, idx) => ({
      source: '__collection_hub__',
      target: nodes[idx + 1].id,
      color: GRAPH_PALETTE.LINK_COLOR,
    }));

    return { nodes, links };
  })();

  const handleNodeClick = (node: any) => {
    if (node.id === '__collection_hub__') return;
    const item: CollectionItem = node._item;
    if (!item) return;
    if (item.type === 'figure') {
      router.push(`/figure/${item.id}`);
    } else {
      const navId = item.wikidata_id || item.id;
      router.push(`/media/${navId}`);
    }
  };

  const drawNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const { x, y, color, type, name, size = 5 } = node;
    const r = type === 'hub' ? 10 : (type === 'figure' ? size + 2 : size + 1);

    ctx.beginPath();
    if (type === 'figure') {
      ctx.arc(x, y, r, 0, 2 * Math.PI);
    } else if (type === 'hub') {
      ctx.arc(x, y, r, 0, 2 * Math.PI);
    } else {
      // Media: rounded rectangle
      const hw = r * 1.4;
      const hh = r * 0.9;
      ctx.roundRect(x - hw, y - hh, hw * 2, hh * 2, 3);
    }
    ctx.fillStyle = color || '#666';
    ctx.fill();

    // Label
    const fontSize = Math.max(8, 10 / globalScale);
    ctx.font = `${fontSize}px 'IBM Plex Mono', monospace`;
    ctx.fillStyle = GRAPH_PALETTE.LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(name?.length > 18 ? name.slice(0, 16) + '…' : (name || ''), x, y + r + fontSize + 2);
  };

  if (!mounted || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: `${HEIGHT}px`,
        background: GRAPH_PALETTE.CREAM_BG,
        border: '1px dashed var(--color-border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {ForceGraph2D && (
        <ForceGraph2D
          ref={forceGraphRef}
          graphData={graphData}
          width={width}
          height={HEIGHT}
          backgroundColor={GRAPH_PALETTE.CREAM_BG}
          linkColor={(link: any) => link.color || GRAPH_PALETTE.LINK_COLOR}
          linkWidth={1}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            const r = (node.type === 'hub' ? 10 : 7) + 4;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
            ctx.fill();
          }}
          onNodeClick={handleNodeClick}
          onEngineStop={() => forceGraphRef.current?.zoomToFit(400, 40)}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.4}
          d3Force="charge"
          enableZoomInteraction
          cooldownTicks={100}
        />
      )}
    </div>
  );
}
