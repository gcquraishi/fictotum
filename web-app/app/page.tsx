'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GraphNode {
  id: string;
  name: string;
  type: 'figure' | 'media';
  canonical_id?: string;
  wikidata_id?: string;
  is_fictional?: boolean;
  media_type?: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  sentiment?: string;
}

interface Stats {
  figures: number;
  works: number;
  portrayals: number;
  topPortrayed: { name: string; canonical_id: string; count: number }[];
  latestAdditions: { name: string; canonical_id: string; date: string }[];
}

export default function LandingPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [graphLoaded, setGraphLoaded] = useState(false);
  const simulationRef = useRef<any>(null);
  const router = useRouter();

  // Node type color map
  const NODE_COLORS: Record<string, string> = {
    historical:  '#2C2C2C',
    fictional:   '#5D4E6D',
    Book:        '#6B4423',
    Film:        '#8B2635',
    TVSeries:    '#4A5D5E',
    'Video Game':'#3E5641',
    Game:        '#8B6914',
    default:     '#666666',
  };

  // Node type icon map (typographic symbols)
  const NODE_ICONS: Record<string, string> = {
    historical:   '\u2022',  // •
    fictional:    '\u25C7',  // ◇
    Book:         '\u25AA',  // ▪
    Film:         '\u25B8',  // ▸
    TVSeries:     '\u25AB',  // ▫
    'Video Game': '\u2666',  // ♦
    Game:         '\u25A3',  // ▣
    default:      '\u2015',  // ―
  };

  function getNodeColor(d: GraphNode): string {
    if (d.type === 'figure') {
      return d.is_fictional ? NODE_COLORS.fictional : NODE_COLORS.historical;
    }
    return NODE_COLORS[d.media_type || ''] || NODE_COLORS.default;
  }

  function getNodeIcon(d: GraphNode): string {
    if (d.type === 'figure') {
      return d.is_fictional ? NODE_ICONS.fictional : NODE_ICONS.historical;
    }
    return NODE_ICONS[d.media_type || ''] || NODE_ICONS.default;
  }

  function getNodeUrl(d: GraphNode): string {
    if (d.type === 'figure' && d.canonical_id) {
      return `/figure/${d.canonical_id}`;
    }
    if (d.type === 'media' && d.wikidata_id) {
      return `/media/${d.wikidata_id}`;
    }
    return '#';
  }

  // Fetch stats
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats({ figures: 0, works: 0, portrayals: 0, topPortrayed: [], latestAdditions: [] }));
  }, []);

  // D3.js Force-Directed Graph
  useEffect(() => {
    if (graphLoaded) return;

    let d3Module: any;
    let cleanup = false;

    const initGraph = async () => {
      d3Module = await import('d3');
      if (cleanup) return;

      // Fetch real graph data, fallback to generated data
      let nodes: GraphNode[] = [];
      let links: GraphLink[] = [];

      try {
        const res = await fetch('/api/graph/landing');
        if (res.ok) {
          const data = await res.json();
          nodes = data.nodes || [];
          links = data.links || [];
        }
      } catch {
        // Fallback: generate demo nodes
      }

      // If no real data, generate placeholder nodes
      if (nodes.length === 0) {
        nodes = Array.from({ length: 60 }, (_, i) => ({
          id: `node-${i}`,
          name: `Entity ${i}`,
          type: i % 3 === 0 ? 'figure' as const : 'media' as const,
        }));
        for (let i = 0; i < 50; i++) {
          links.push({
            source: `node-${Math.floor(Math.random() * 60)}`,
            target: `node-${Math.floor(Math.random() * 60)}`,
          });
        }
      }

      if (cleanup || !containerRef.current || !svgRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const svg = d3Module.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .attr('viewBox', [0, 0, width, height]);

      // Clear previous content
      svg.selectAll('*').remove();

      // Compute node degree from links for sizing and label visibility
      const degreeMap = new Map<string, number>();
      links.forEach((link: any) => {
        const sid = typeof link.source === 'string' ? link.source : link.source.id;
        const tid = typeof link.target === 'string' ? link.target : link.target.id;
        degreeMap.set(sid, (degreeMap.get(sid) || 0) + 1);
        degreeMap.set(tid, (degreeMap.get(tid) || 0) + 1);
      });

      // Size nodes by actual connectivity
      const nodesWithRadius = nodes.map((n: any) => {
        const degree = degreeMap.get(n.id) || 1;
        const r = n.type === 'figure'
          ? Math.min(4 + degree * 1.5, 18)
          : Math.min(3 + degree * 0.8, 10);
        return { ...n, r, degree };
      });

      // Hub nodes: high-degree figures always show labels
      const HUB_DEGREE = 6;

      // Build neighbor lookup for click highlighting
      const neighborMap = new Map<string, Set<string>>();
      links.forEach((link: any) => {
        const sid = typeof link.source === 'string' ? link.source : link.source.id;
        const tid = typeof link.target === 'string' ? link.target : link.target.id;
        if (!neighborMap.has(sid)) neighborMap.set(sid, new Set());
        if (!neighborMap.has(tid)) neighborMap.set(tid, new Set());
        neighborMap.get(sid)!.add(tid);
        neighborMap.get(tid)!.add(sid);
      });

      const simulation = d3Module.forceSimulation(nodesWithRadius)
        .force('link', d3Module.forceLink(links).id((d: any) => d.id).distance(100))
        .force('charge', d3Module.forceManyBody().strength(-150))
        .force('center', d3Module.forceCenter(width / 2, height / 2))
        .force('collide', d3Module.forceCollide().radius((d: any) => d.r + 14));

      simulationRef.current = simulation;

      // Zoomable container wrapping all graph content
      const graphContainer = svg.append('g').attr('class', 'graph-container');

      const zoom = d3Module.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event: any) => {
          graphContainer.attr('transform', event.transform);
        });
      svg.call(zoom);
      // Double-click resets to default view instead of D3's default 2x zoom-in
      svg.on('dblclick.zoom', () => {
        svg.transition().duration(400).call(zoom.transform, d3Module.zoomIdentity);
      });

      // SVG layers in z-order: links, nodes, labels
      const linkGroup = graphContainer.append('g').attr('class', 'links');
      const nodeGroup = graphContainer.append('g').attr('class', 'nodes');
      const labelGroup = graphContainer.append('g').attr('class', 'labels');

      const linkElements = linkGroup.selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#D0D0D0')
        .attr('stroke-opacity', 0.4)
        .attr('stroke-width', 1);

      const nodeElements = nodeGroup.selectAll('circle')
        .data(nodesWithRadius)
        .join('circle')
        .attr('r', (d: any) => d.r)
        .attr('fill', (d: any) => getNodeColor(d))
        .attr('opacity', (d: any) => d.degree >= HUB_DEGREE ? 0.7 : 0.3)
        .style('cursor', 'pointer');

      // Labels: truncate long names, always visible for hubs
      const truncate = (s: string, max: number) =>
        s.length > max ? s.slice(0, max - 1) + '\u2026' : s;

      const labelElements = labelGroup.selectAll('text')
        .data(nodesWithRadius)
        .join('text')
        .text((d: any) => getNodeIcon(d) + ' ' + truncate(d.name, 20))
        .attr('font-size', (d: any) => d.type === 'figure' ? '11px' : '9px')
        .attr('font-family', (d: any) =>
          d.type === 'figure' ? 'Georgia, serif' : 'var(--font-mono, monospace)')
        .attr('fill', '#1A1A1A')
        .attr('text-anchor', 'middle')
        .attr('dy', (d: any) => -(d.r + 5))
        .attr('opacity', (d: any) => d.degree >= HUB_DEGREE ? 0.85 : 0)
        .style('user-select', 'none')
        .style('pointer-events', 'auto')
        .style('cursor', 'pointer');

      // -- Selection state --
      let selectedNodeId: string | null = null;

      function resetHighlight() {
        selectedNodeId = null;
        nodeElements.transition().duration(200)
          .attr('opacity', (d: any) => d.degree >= HUB_DEGREE ? 0.7 : 0.3)
          .attr('r', (d: any) => d.r);
        linkElements.transition().duration(200)
          .attr('stroke-opacity', 0.4)
          .attr('stroke', '#D0D0D0');
        labelElements.transition().duration(200)
          .attr('opacity', (d: any) => d.degree >= HUB_DEGREE ? 0.85 : 0);
      }

      function selectNode(d: any) {
        if (selectedNodeId === d.id) {
          resetHighlight();
          return;
        }
        selectedNodeId = d.id;
        const neighbors = neighborMap.get(d.id) || new Set<string>();

        nodeElements.transition().duration(200)
          .attr('opacity', (n: any) =>
            n.id === d.id ? 1 : neighbors.has(n.id) ? 0.8 : 0.06)
          .attr('r', (n: any) => n.id === d.id ? n.r * 1.3 : n.r);

        linkElements.transition().duration(200)
          .attr('stroke-opacity', (l: any) => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return (sid === d.id || tid === d.id) ? 0.7 : 0.03;
          })
          .attr('stroke', (l: any) => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return (sid === d.id || tid === d.id) ? '#8B2635' : '#D0D0D0';
          });

        labelElements.transition().duration(200)
          .attr('opacity', (n: any) =>
            n.id === d.id || neighbors.has(n.id) ? 1 : 0);
      }

      // Click background to deselect
      svg.on('click', () => {
        resetHighlight();
      });

      // -- Hover --
      nodeElements
        .on('mouseover', function (this: SVGCircleElement, _event: any, d: any) {
          if (selectedNodeId) return;
          d3Module.select(this).transition().duration(150)
            .attr('opacity', 1)
            .attr('r', d.r * 1.2);
          // Show this node's label
          labelElements.filter((t: any) => t.id === d.id)
            .transition().duration(150).attr('opacity', 1);
        })
        .on('mouseout', function (this: SVGCircleElement, _event: any, d: any) {
          if (selectedNodeId) return;
          d3Module.select(this).transition().duration(150)
            .attr('opacity', d.degree >= HUB_DEGREE ? 0.7 : 0.3)
            .attr('r', d.r);
          labelElements.filter((t: any) => t.id === d.id)
            .transition().duration(150)
            .attr('opacity', d.degree >= HUB_DEGREE ? 0.85 : 0);
        });

      // -- Drag with click detection --
      let hasDragged = false;

      nodeElements.call(d3Module.drag()
        .on('start', (event: any) => {
          event.sourceEvent.stopPropagation();
          hasDragged = false;
          event.subject.fx = event.subject.x;
          event.subject.fy = event.subject.y;
        })
        .on('drag', (event: any) => {
          if (!hasDragged) {
            hasDragged = true;
            if (!event.active) simulation.alphaTarget(0.3).restart();
          }
          event.subject.fx = event.x;
          event.subject.fy = event.y;
        })
        .on('end', (event: any) => {
          if (!event.active) simulation.alphaTarget(0);
          event.subject.fx = null;
          event.subject.fy = null;
        })
      );

      // Click circle to explore connections (only fires if not dragged)
      nodeElements.on('click', function (_event: any, d: any) {
        _event.stopPropagation();
        if (hasDragged) return;
        selectNode(d);
      });

      // Click label to navigate to detail page
      labelElements.on('click', (event: any, d: any) => {
        event.stopPropagation();
        const url = getNodeUrl(d);
        if (url !== '#') {
          router.push(url);
        }
      });

      // -- Tick: update positions for nodes, links, and labels --
      simulation.on('tick', () => {
        linkElements
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        nodeElements
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);

        labelElements
          .attr('x', (d: any) => d.x)
          .attr('y', (d: any) => d.y);
      });

      // Resize handler
      const handleResize = () => {
        if (!containerRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        svg.attr('width', newWidth).attr('height', newHeight)
          .attr('viewBox', [0, 0, newWidth, newHeight]);
        simulation.force('center', d3Module.forceCenter(newWidth / 2, newHeight / 2));
        simulation.alpha(0.3).restart();
      };

      window.addEventListener('resize', handleResize);
      setGraphLoaded(true);

      return () => {
        window.removeEventListener('resize', handleResize);
        simulation.stop();
      };
    };

    initGraph();

    return () => {
      cleanup = true;
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [graphLoaded]);

  return (
    <div>
      {/* Hero Graph Section - Full Viewport */}
      <div
        style={{
          height: '85vh',
          width: '100%',
          backgroundColor: '#f9f9f9',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderBottom: '2px solid var(--color-border-bold)',
        }}
      >
        {/* Interactive Graph Container */}
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <svg ref={svgRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />
        </div>

        {/* Top-left title badge */}
        <div
          style={{
            position: 'absolute',
            top: '32px',
            left: '40px',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 300,
              color: 'var(--color-text)',
              background: 'rgba(254,254,254,0.85)',
              padding: '12px 20px',
              borderLeft: '4px solid var(--color-accent)',
              lineHeight: 1.3,
            }}
          >
            The Intersection<br />of History &amp; Fiction
          </h1>
        </div>

        {/* Bottom bar with stats and hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 40px',
            background: 'rgba(254,254,254,0.85)',
            borderTop: '1px solid var(--color-border)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-accent)',
            }}
          >
            {stats ? stats.portrayals.toLocaleString() : '...'} Portrayals Mapped
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--color-gray)',
              letterSpacing: '2px',
            }}
          >
            Click circle to explore &middot; Click name to view details &middot; Scroll to zoom
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          maxWidth: '1200px',
          margin: '60px auto',
          gap: '40px',
          padding: '0 40px',
          textAlign: 'center',
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '56px',
              fontWeight: 300,
              marginBottom: '12px',
              fontFeatureSettings: '"onum"',
            }}
          >
            {stats ? stats.portrayals.toLocaleString() : '...'}
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)',
            }}
          >
            Total Entities
          </span>
        </div>
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '56px',
              fontWeight: 300,
              marginBottom: '12px',
              fontFeatureSettings: '"onum"',
            }}
          >
            {stats ? stats.figures.toLocaleString() : '...'}
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)',
            }}
          >
            Historical Figures
          </span>
        </div>
        <div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '56px',
              fontWeight: 300,
              marginBottom: '12px',
              fontFeatureSettings: '"onum"',
            }}
          >
            {stats ? stats.works.toLocaleString() : '...'}
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              color: 'var(--color-gray)',
            }}
          >
            Media Works
          </span>
        </div>
      </section>

      {/* Explore Buttons */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto 80px',
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
        }}
      >
        {[
          { label: 'By Era', sub: 'Ancient to Modern', href: '/browse/eras' },
          { label: 'By Medium', sub: 'Film, TV, Novels', href: '/search' },
          { label: 'By Sentiment', sub: 'Heroic vs Villainous', href: '/search' },
          { label: 'Network View', sub: 'Visual Connections', href: '/explore/graph' },
        ].map((btn) => (
          <Link
            key={btn.label}
            href={btn.href}
            style={{
              padding: '32px',
              border: '1px solid var(--color-border)',
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              textDecoration: 'none',
              color: 'var(--color-text)',
              transition: 'all 0.2s',
              display: 'block',
            }}
            className="hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A]"
          >
            {btn.label}
            <span
              style={{
                display: 'block',
                marginTop: '8px',
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                color: 'var(--color-gray)',
                textTransform: 'none',
                fontStyle: 'italic',
              }}
            >
              {btn.sub}
            </span>
          </Link>
        ))}
      </div>

      {/* Lists Section */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto 60px',
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '80px',
          borderTop: '1px solid var(--color-border)',
          paddingTop: '60px',
        }}
      >
        {/* Top Portrayed Figures */}
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-gray)',
              marginBottom: '24px',
              borderBottom: '1px solid var(--color-text)',
              paddingBottom: '8px',
            }}
          >
            Top Portrayed Figures
          </h3>
          <ul style={{ listStyle: 'none' }}>
            {(stats?.topPortrayed ?? []).map((figure) => (
              <li
                key={figure.canonical_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid #f0f0f0',
                  alignItems: 'baseline',
                }}
              >
                <Link
                  href={`/figure/${figure.canonical_id}`}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '20px',
                    fontWeight: 400,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                  className="hover:text-[#8B2635]"
                >
                  {figure.name}
                </Link>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    color: 'var(--color-accent)',
                  }}
                >
                  {figure.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Latest Additions */}
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--color-gray)',
              marginBottom: '24px',
              borderBottom: '1px solid var(--color-text)',
              paddingBottom: '8px',
            }}
          >
            Latest Additions
          </h3>
          <ul style={{ listStyle: 'none' }}>
            {(stats?.latestAdditions ?? []).map((figure) => (
              <li
                key={figure.canonical_id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid #f0f0f0',
                  alignItems: 'baseline',
                }}
              >
                <Link
                  href={`/figure/${figure.canonical_id}`}
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '20px',
                    fontWeight: 400,
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                  className="hover:text-[#8B2635]"
                >
                  {figure.name}
                </Link>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    color: 'var(--color-accent)',
                  }}
                >
                  {figure.date}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Departments Section */}
      <section
        style={{
          padding: '80px 40px',
          background: 'var(--color-dept-bg)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '40px',
          }}
        >
          {[
            { title: 'Contribute', desc: 'Submit new portrayals or historical data to the archive for verification.', href: '/contribute' },
            { title: 'Methodology', desc: 'How we define historical fiction and classify portrayals within the graph.', href: '#' },
            { title: 'API Access', desc: 'Documentation for researchers and data scientists to query our Neo4j database.', href: '#' },
            { title: 'About Fictotum', desc: 'The mission and vision of the curated archive of historical intersections.', href: '#' },
          ].map((dept) => (
            <Link
              key={dept.title}
              href={dept.href}
              style={{
                padding: '32px',
                border: '1px solid var(--color-border)',
                background: '#fff',
                textDecoration: 'none',
                color: 'inherit',
                display: 'block',
              }}
              className="hover:border-[#1A1A1A] transition-colors"
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: '16px',
                  display: 'block',
                  borderBottom: '1px solid var(--color-border)',
                  paddingBottom: '8px',
                }}
              >
                {dept.title}
              </span>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '18px',
                  color: 'var(--color-gray)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                {dept.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border-bold)',
          padding: '40px',
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          color: 'var(--color-gray)',
        }}
      >
        <div>&copy; 2026 Fictotum Archive</div>
        <div>A Project Mapping History & Fiction</div>
      </footer>
    </div>
  );
}

