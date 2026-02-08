'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface GraphNode {
  id: string;
  name: string;
  type: 'figure' | 'media';
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

      // Assign radius based on node characteristics
      const nodesWithRadius = nodes.map((n: any, i: number) => ({
        ...n,
        r: n.type === 'figure' ? (i % 5 === 0 ? 12 : 8) : 4,
      }));

      const simulation = d3Module.forceSimulation(nodesWithRadius)
        .force('link', d3Module.forceLink(links).id((d: any) => d.id).distance(100))
        .force('charge', d3Module.forceManyBody().strength(-150))
        .force('center', d3Module.forceCenter(width / 2, height / 2))
        .force('collide', d3Module.forceCollide().radius((d: any) => d.r + 5));

      simulationRef.current = simulation;

      const linkGroup = svg.append('g')
        .attr('stroke', '#E0E0E0')
        .attr('stroke-opacity', 0.6);

      const linkElements = linkGroup.selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke-width', 1);

      const nodeGroup = svg.append('g');

      const nodeElements = nodeGroup.selectAll('circle')
        .data(nodesWithRadius)
        .join('circle')
        .attr('r', (d: any) => d.r)
        .attr('fill', (d: any) => d.type === 'figure' ? '#1A1A1A' : '#8B2635')
        .attr('opacity', 0.3)
        .style('cursor', 'grab')
        .call(drag(d3Module, simulation) as any);

      // Hover interactions
      nodeElements.on('mouseover', function (this: SVGCircleElement) {
        d3Module.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 1)
          .attr('r', (d: any) => d.r * 1.5);
      }).on('mouseout', function (this: SVGCircleElement) {
        d3Module.select(this)
          .transition()
          .duration(200)
          .attr('opacity', 0.3)
          .attr('r', (d: any) => d.r);
      });

      simulation.on('tick', () => {
        linkElements
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        nodeElements
          .attr('cx', (d: any) => d.x)
          .attr('cy', (d: any) => d.y);
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
          <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Hero Overlay */}
        <div
          style={{
            position: 'absolute',
            textAlign: 'center',
            zIndex: 10,
            pointerEvents: 'none',
            maxWidth: '800px',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '84px',
              fontWeight: 300,
              letterSpacing: '-3px',
              lineHeight: 1,
              color: 'var(--color-text)',
              background: 'rgba(254,254,254,0.9)',
              padding: '30px 40px',
              border: '1px solid var(--color-border)',
            }}
          >
            The Intersection of History & Fiction
          </h1>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginTop: '24px',
              color: 'var(--color-accent)',
              background: '#fff',
              padding: '8px 16px',
              display: 'inline-block',
            }}
          >
            Exploring {stats ? stats.portrayals.toLocaleString() : '...'} Portrayals Across Time
          </span>
        </div>

        {/* Bottom hint */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--color-gray)',
            letterSpacing: '2px',
          }}
        >
          [ INTERACTIVE FORCE-DIRECTED GRAPH &mdash; DRAG TO EXPLORE ]
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

// D3 Drag behavior
function drag(d3: any, simulation: any) {
  function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: any) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}
