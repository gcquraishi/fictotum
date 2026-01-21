'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { GraphNode, GraphLink, PathVisualization } from '@/lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface GraphExplorerProps {
  canonicalId?: string;
  nodes?: GraphNode[];
  links?: GraphLink[];
  highlightedPath?: PathVisualization;
}

interface ExtendedGraphLink extends GraphLink {
  featured?: boolean;
}

interface ForceGraphLink extends Omit<ExtendedGraphLink, 'source' | 'target'> {
  source: string | { id: string };
  target: string | { id: string };
}

// Error Boundary for ForceGraph2D rendering errors
class ForceGraphErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ForceGraph rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 border-2 border-red-300 rounded-lg">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Graph Rendering Error</h3>
            <p className="text-sm text-gray-600 mb-4">
              Failed to render the graph visualization. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SENTIMENT_COLORS = {
  Heroic: '#22c55e',
  Villainous: '#ef4444',
  Complex: '#eab308',
};

// Bacon node colors - distinctive styling
const BACON_COLOR = '#dc2626'; // Red for Bacon nodes
const BACON_SIZE = 1.5; // Scale multiplier for Bacon nodes

// Node sizing multipliers
const EXPANDED_SIZE_MULTIPLIER = 1.3; // Size increase when node is expanded
const HIGHLIGHTED_SIZE_MULTIPLIER = 1.2; // Size increase when node is highlighted
const CENTER_NODE_SIZE_MULTIPLIER = 1.5; // Size increase for center node (Phase 1 Bloom)
const NODE_GLOW_RADIUS_MULTIPLIER = 2.5; // Glow effect radius multiplier

// Center node styling
const CENTER_NODE_GLOW_COLOR = '#f59e0b'; // Amber/gold glow for center node

// Depth tracking configuration (Task 1.7)
const MAX_DEPTH = 7; // Maximum hop distance before warning user

// Helper function to check if a node is a Bacon (person, not media work about Bacon)
const isBaconNode = (nodeId: string): boolean => {
  return (nodeId.includes('bacon') && !nodeId.startsWith('media-'));
};

export default function GraphExplorer({ canonicalId, nodes: initialNodes, links: initialLinks, highlightedPath }: GraphExplorerProps) {
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [nodes, setNodes] = useState<GraphNode[]>(initialNodes || []);
  const [links, setLinks] = useState<ForceGraphLink[]>(initialLinks || []);
  const [isLoading, setIsLoading] = useState(!initialNodes && !initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [showAllEdges, setShowAllEdges] = useState(true);
  const [showAcademicWorks, setShowAcademicWorks] = useState(false);
  const [showReferenceWorks, setShowReferenceWorks] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Feature flag for Bloom Exploration mode (Task 1.13)
  const isBloomMode = process.env.NEXT_PUBLIC_BLOOM_MODE === 'true';

  // Phase 1: Bloom Exploration - Camera control and center node tracking
  const forceGraphRef = useRef<any>(null);
  const [centerNodeId, setCenterNodeId] = useState<string | null>(
    canonicalId ? `figure-${canonicalId}` : null
  );
  const [nodeDepths, setNodeDepths] = useState<Map<string, number>>(new Map());
  // Track parent-child relationships for collapse functionality (Task 1.8)
  const [nodeChildren, setNodeChildren] = useState<Map<string, Set<string>>>(new Map());
  // Track nodes that have been clicked/centered (the exploration path)
  const [visitedCenters, setVisitedCenters] = useState<Set<string>>(
    new Set(centerNodeId ? [centerNodeId] : [])
  );

  // Camera control helper - smoothly centers camera on a node
  const centerCameraOnNode = (node: any) => {
    if (!forceGraphRef.current || typeof node.x !== 'number' || typeof node.y !== 'number') {
      console.warn('Cannot center camera: missing ref or node coordinates', { node });
      return;
    }

    try {
      // Use 1000ms duration for smooth pan (as specified in plan)
      forceGraphRef.current.centerAt(node.x, node.y, 1000);
      console.log('Camera centered on node:', { id: node.id, name: node.name, x: node.x, y: node.y });
    } catch (error) {
      console.error('Error centering camera:', error);
    }
  };

  // Collapse helper - recursively removes a node and all its descendants (Task 1.8)
  // Smart collapse: preserves nodes that are part of the exploration path (visited centers)
  const collapseNode = (nodeId: string) => {
    const toRemove = new Set<string>([nodeId]);
    const queue = [nodeId];

    // BFS to find all descendants, but skip nodes in the exploration path
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = nodeChildren.get(current);

      if (children) {
        children.forEach(childId => {
          // Skip if this child was clicked/centered (part of exploration path)
          if (visitedCenters.has(childId)) {
            console.log(`  Preserving ${childId} - part of exploration path`);
            return;
          }

          if (!toRemove.has(childId)) {
            toRemove.add(childId);
            queue.push(childId);
          }
        });
      }
    }

    console.log(`Collapsing node ${nodeId} - removing ${toRemove.size} nodes (preserving exploration path):`, Array.from(toRemove));

    // Remove nodes from graph state
    setNodes(prevNodes => prevNodes.filter(n => !toRemove.has(n.id)));

    // Remove links connected to removed nodes
    setLinks(prevLinks => prevLinks.filter(l => {
      const source = typeof l.source === 'object' ? l.source.id : l.source;
      const target = typeof l.target === 'object' ? l.target.id : l.target;
      return !toRemove.has(source) && !toRemove.has(target);
    }));

    // Clean up tracking state
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      toRemove.forEach(id => newSet.delete(id));
      return newSet;
    });

    setNodeDepths(prev => {
      const newMap = new Map(prev);
      toRemove.forEach(id => newMap.delete(id));
      return newMap;
    });

    setNodeChildren(prev => {
      const newMap = new Map(prev);
      toRemove.forEach(id => newMap.delete(id));
      return newMap;
    });

    setVisitedCenters(prev => {
      const newSet = new Set(prev);
      toRemove.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  // Initialize depth tracking for starting node (Task 1.6)
  useEffect(() => {
    if (centerNodeId && nodeDepths.size === 0) {
      setNodeDepths(new Map([[centerNodeId, 0]]));
      console.log('Initialized depth tracking - center node at depth 0:', centerNodeId);
    }
  }, [centerNodeId, nodeDepths.size]);

  // Fetch graph data on mount if not provided
  useEffect(() => {
    if (initialNodes && initialLinks) {
      setNodes(initialNodes);
      setLinks(initialLinks);
      setIsLoading(false);
      return;
    }

    if (!canonicalId) {
      setError('No canonical ID or graph data provided');
      setIsLoading(false);
      return;
    }

    const fetchGraphData = async () => {
      setIsLoading(true);
      setError(null);

      startTransition(async () => {
        try {
          const response = await fetch(`/api/graph/${canonicalId}`);

          if (!response.ok) {
            throw new Error('Failed to fetch graph data');
          }

          const data = await response.json();
          setNodes(data.nodes || []);
          setLinks(data.links || []);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          setNodes([]);
          setLinks([]);
        } finally {
          setIsLoading(false);
        }
      });
    };

    fetchGraphData();
  }, [canonicalId, initialNodes, initialLinks]);

  // Handle responsive dimensions
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

  // Filter nodes based on media category
  const visibleNodes = nodes.filter((node: GraphNode) => {
    // Always show figure nodes
    if (node.type === 'figure') return true;

    // For media nodes, check category filters
    if (node.type === 'media') {
      // Default to 'primary' if no category specified
      const category = node.mediaCategory || 'primary';

      if (category === 'primary') return true;
      if (category === 'academic') return showAcademicWorks;
      if (category === 'reference') return showReferenceWorks;
    }

    return true;
  });

  // Create a set of visible node IDs for link filtering
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

  // Filter links based on featured path, expanded nodes, and visible nodes
  const visibleLinks = links.filter((link: ForceGraphLink) => {
    // Handle both string IDs and object references (force-graph modifies links after first render)
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;

    // Check if this is a featured path link
    const isFeatured = !!link.featured;

    // Only show links where both nodes are visible (but allow featured links through)
    const bothNodesVisible = visibleNodeIds.has(source) && visibleNodeIds.has(target);
    if (!bothNodesVisible && !isFeatured) {
      return false;
    }

    // Always show featured links
    if (isFeatured) return true;

    // Show non-featured links if all edges are shown
    if (showAllEdges) return true;

    // Show links connected to expanded nodes
    if (expandedNodes.has(source) || expandedNodes.has(target)) {
      return true;
    }

    return false;
  });

  // Clone links and mark highlighted path links as featured
  const graphLinks = visibleLinks.map((link: ForceGraphLink) => {
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;

    // Check if this link is part of the highlighted path
    const isHighlighted = highlightedPath?.pathLinks.some(
      pathLink =>
        (pathLink.source === source && pathLink.target === target) ||
        (pathLink.source === target && pathLink.target === source) // Handle bidirectional
    ) || false;

    return {
      source,
      target,
      sentiment: link.sentiment,
      featured: link.featured || isHighlighted,
      relationshipType: link.relationshipType,
    };
  });

  // Handle node click
  const handleNodeClick = async (node: any) => {
    // Phase 1: Camera centering on click (Tasks 1.2 & 1.3) - only in bloom mode
    if (isBloomMode) {
      setCenterNodeId(node.id);
      centerCameraOnNode(node);

      // Track this node as part of exploration path (for smart collapse)
      setVisitedCenters((prev) => new Set(prev).add(node.id));

      // Check depth before expansion (Task 1.7)
      const currentDepth = nodeDepths.get(node.id) ?? 0;
      const potentialDepth = currentDepth + 1;

      if (potentialDepth >= MAX_DEPTH) {
        console.warn(
          `⚠️ Approaching depth limit (${potentialDepth}/${MAX_DEPTH} hops). Consider collapsing distant nodes.`
        );
      }

      console.log('Node clicked:', {
        id: node.id,
        name: node.name,
        currentDepth,
        potentialNewNodeDepth: potentialDepth
      });
    }

    // Handle media node expansion
    if (node.type === 'media' && typeof node.id === 'string' && node.id.startsWith('media-')) {
      const wikidataId = node.id.replace('media-', '');

      // If already expanded, collapse it (Task 1.8)
      if (expandedNodes.has(node.id)) {
        collapseNode(node.id);
        return;
      }

      // Otherwise, fetch and expand neighbors
      try {
        setLoadingNodes((prev) => new Set(prev).add(node.id));

        const response = await fetch(`/api/graph/expand/${wikidataId}?type=media`);
        if (!response.ok) {
          throw new Error('Failed to fetch neighbors');
        }

        const data = await response.json();

        setExpandedNodes((prev) => new Set(prev).add(node.id));

        // Calculate depth for new nodes (Task 1.6)
        const parentDepth = nodeDepths.get(node.id) ?? 0;
        const newDepth = parentDepth + 1;

        // Merge new nodes (avoiding duplicates)
        setNodes((prevNodes) => {
          const existingIds = new Set(prevNodes.map(n => n.id));
          const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));

          // Track depths for new nodes
          setNodeDepths((prevDepths) => {
            const updatedDepths = new Map(prevDepths);
            newNodes.forEach((n: GraphNode) => {
              if (!updatedDepths.has(n.id)) {
                updatedDepths.set(n.id, newDepth);
              }
            });
            console.log(`Added ${newNodes.length} nodes at depth ${newDepth}:`, newNodes.map((n: GraphNode) => n.name));
            return updatedDepths;
          });

          // Track parent-child relationships for collapse (Task 1.8)
          setNodeChildren((prevChildren) => {
            const updatedChildren = new Map(prevChildren);
            const childIds = new Set(newNodes.map((n: GraphNode) => n.id));
            updatedChildren.set(node.id, childIds);
            return updatedChildren;
          });

          return [...prevNodes, ...newNodes];
        });

        // Merge new links (avoiding duplicates)
        setLinks((prevLinks) => {
          const existingLinks = new Set(
            prevLinks.flatMap(l => {
              const source = typeof l.source === 'object' ? l.source.id : l.source;
              const target = typeof l.target === 'object' ? l.target.id : l.target;
              return [`${source}-${target}`, `${target}-${source}`];
            })
          );
          const newLinks = data.links.filter((l: GraphLink) =>
            !existingLinks.has(`${l.source}-${l.target}`) && !existingLinks.has(`${l.target}-${l.source}`)
          );
          return [...prevLinks, ...newLinks];
        });
      } catch (err) {
        console.error('Error expanding node:', err);
        // Revert expansion state on error
        setExpandedNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(node.id);
          return newSet;
        });
      } finally {
        setLoadingNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(node.id);
          return newSet;
        });
      }
      return;
    }

    // Handle figure node expansion (Task 1.4 - expand in place instead of navigate)
    if (node.type === 'figure' && typeof node.id === 'string' && node.id.startsWith('figure-')) {
      const canonicalId = node.id.replace('figure-', '');

      // In non-bloom mode, navigate to figure page (old behavior)
      if (!isBloomMode) {
        router.push(`/figure/${canonicalId}`);
        return;
      }

      // If already expanded, collapse it (Task 1.8)
      if (expandedNodes.has(node.id)) {
        collapseNode(node.id);
        return;
      }

      // Otherwise, fetch and expand neighbors
      try {
        setLoadingNodes((prev) => new Set(prev).add(node.id));

        const response = await fetch(`/api/graph/expand/${canonicalId}?type=figure`);
        if (!response.ok) {
          throw new Error('Failed to fetch neighbors');
        }

        const data = await response.json();

        setExpandedNodes((prev) => new Set(prev).add(node.id));

        // Calculate depth for new nodes (Task 1.6)
        const parentDepth = nodeDepths.get(node.id) ?? 0;
        const newDepth = parentDepth + 1;

        // Merge new nodes (avoiding duplicates)
        setNodes((prevNodes) => {
          const existingIds = new Set(prevNodes.map(n => n.id));
          const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));

          // Track depths for new nodes
          setNodeDepths((prevDepths) => {
            const updatedDepths = new Map(prevDepths);
            newNodes.forEach((n: GraphNode) => {
              if (!updatedDepths.has(n.id)) {
                updatedDepths.set(n.id, newDepth);
              }
            });
            console.log(`Added ${newNodes.length} nodes at depth ${newDepth}:`, newNodes.map((n: GraphNode) => n.name));
            return updatedDepths;
          });

          // Track parent-child relationships for collapse (Task 1.8)
          setNodeChildren((prevChildren) => {
            const updatedChildren = new Map(prevChildren);
            const childIds = new Set(newNodes.map((n: GraphNode) => n.id));
            updatedChildren.set(node.id, childIds);
            return updatedChildren;
          });

          return [...prevNodes, ...newNodes];
        });

        // Merge new links (avoiding duplicates)
        setLinks((prevLinks) => {
          const existingLinks = new Set(
            prevLinks.flatMap(l => {
              const source = typeof l.source === 'object' ? l.source.id : l.source;
              const target = typeof l.target === 'object' ? l.target.id : l.target;
              return [`${source}-${target}`, `${target}-${source}`];
            })
          );
          const newLinks = data.links.filter((l: GraphLink) =>
            !existingLinks.has(`${l.source}-${l.target}`) && !existingLinks.has(`${l.target}-${l.source}`)
          );
          return [...prevLinks, ...newLinks];
        });
      } catch (err) {
        console.error('Error expanding node:', err);
        // Revert expansion state on error
        setExpandedNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(node.id);
          return newSet;
        });
      } finally {
        setLoadingNodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(node.id);
          return newSet;
        });
      }
      return;
    }
  };

  // Loading skeleton
  if (isLoading || isPending) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
        <div className="mb-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse"></div>
            <span className="text-gray-500">Loading...</span>
          </div>
        </div>
        <div className="bg-white rounded-lg overflow-hidden" style={{ height: dimensions.height }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-400">Loading graph data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (nodes.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
        <p className="text-gray-500 text-center py-8">No graph data available</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Minimal Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAllEdges(!showAllEdges)}
            className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition-all ${
              showAllEdges
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            title={showAllEdges ? 'Hide non-path connections' : 'Show all connections'}
          >
            {showAllEdges ? 'Hide Extra' : 'Show All'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAcademicWorks(!showAcademicWorks)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition-all ${
              showAcademicWorks
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            title={showAcademicWorks ? 'Hide academic works (biographies, essays, documentaries)' : 'Show academic works'}
          >
            📚 Academic
          </button>
          <button
            onClick={() => setShowReferenceWorks(!showReferenceWorks)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg transition-all ${
              showReferenceWorks
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
            title={showReferenceWorks ? 'Hide reference materials (encyclopedias, databases)' : 'Show reference materials'}
          >
            📖 Reference
          </button>
        </div>
      </div>

      {/* Inline Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg p-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BACON_COLOR }}></div>
            <span className="text-gray-800 font-semibold">The Bacons</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
            <span className="text-gray-700">Historical Figure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }}></div>
            <span className="text-gray-700">Heroic Media</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
            <span className="text-gray-700">Complex Media</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 italic">
          Drag to pan • Scroll to zoom • Click nodes
        </div>
      </div>

      {/* Full-Bleed Graph */}
      <ForceGraphErrorBoundary>
        <div ref={containerRef} className="bg-gray-50 overflow-hidden cursor-grab active:cursor-grabbing" style={{ minHeight: dimensions.height }}>
          <ForceGraph2D
          ref={forceGraphRef}
          key={`${showAllEdges}-${showAcademicWorks}-${showReferenceWorks}-${visibleLinks.length}`}
          graphData={{ nodes: visibleNodes, links: graphLinks }}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel="name"
          nodeColor={(node: any) => {
            if (isBaconNode(node.id)) return BACON_COLOR;
            if (node.type === 'figure') return '#3b82f6';
            return SENTIMENT_COLORS[node.sentiment as keyof typeof SENTIMENT_COLORS] || '#9ca3af';
          }}
          nodeRelSize={7}
          linkColor={(link: any) => link.featured ? '#3b82f6' : '#d1d5db'}
          linkWidth={(link: any) => link.featured ? 3 : 1.5}
          linkLabel={(link: any) => {
            const relType = link.relationshipType || 'connected';
            return `${relType} (${link.sentiment})`;
          }}
          backgroundColor="#f9fafb"
          onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            try {
              const label = node?.name || '';
              if (!label || !ctx || typeof node.x !== 'number' || typeof node.y !== 'number') return;

              const fontSize = 12 / globalScale;
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              // Determine node size
              const baseSize = isBaconNode(node.id) ? 8 : 6;
              const isHighlighted = highlightedPath?.pathIds.includes(node.id) || false;
              const isLoading = loadingNodes.has(node.id);
              const isCenterNode = isBloomMode && centerNodeId === node.id;

              // Apply size multipliers (center node gets special treatment)
              let nodeSize = baseSize;
              if (isCenterNode) {
                nodeSize *= CENTER_NODE_SIZE_MULTIPLIER;
              } else if (expandedNodes.has(node.id)) {
                nodeSize *= EXPANDED_SIZE_MULTIPLIER;
              }
              if (isHighlighted) {
                nodeSize *= HIGHLIGHTED_SIZE_MULTIPLIER;
              }

              // Draw node with glow effect for Bacon nodes, highlighted nodes, loading nodes, or center node
              if (isBaconNode(node.id) || isHighlighted || isLoading || isCenterNode) {
                // Determine color based on node type
                const nodeColor = isBaconNode(node.id)
                  ? BACON_COLOR
                  : (node.type === 'figure' ? '#3b82f6' : (SENTIMENT_COLORS[node.sentiment as keyof typeof SENTIMENT_COLORS] || '#9ca3af'));

                // Determine border color (center node gets gold border)
                let borderColor = '#1e40af';
                if (isCenterNode) {
                  borderColor = CENTER_NODE_GLOW_COLOR;
                } else if (isLoading) {
                  borderColor = '#f59e0b';
                } else if (isBaconNode(node.id)) {
                  borderColor = '#7f1d1d';
                }

                // Glow effect (center node gets stronger gold glow)
                if (isCenterNode) {
                  ctx.fillStyle = CENTER_NODE_GLOW_COLOR;
                  ctx.globalAlpha = 0.4;
                } else {
                  ctx.fillStyle = nodeColor;
                  ctx.globalAlpha = isLoading ? 0.1 : 0.3;
                }
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize * NODE_GLOW_RADIUS_MULTIPLIER, 0, 2 * Math.PI, false);
                ctx.fill();

                // Main node
                ctx.globalAlpha = 1;
                ctx.fillStyle = nodeColor;
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                ctx.fill();

                // Border
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = isLoading ? 3 / globalScale : 2 / globalScale;
                ctx.stroke();
              } else {
                // Regular nodes
                const color = node.type === 'figure' ? '#3b82f6' : (SENTIMENT_COLORS[node.sentiment as keyof typeof SENTIMENT_COLORS] || '#9ca3af');
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
                ctx.fill();
              }

              // Draw label
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#1f2937';
              ctx.font = `bold ${fontSize}px Sans-Serif`;
              ctx.fillText(label, node.x, node.y + nodeSize + 12);
            } catch (e) {
              // Silently fail if canvas rendering has issues
              console.warn('Canvas rendering error:', e);
            }
          }}
        />
        </div>
      </ForceGraphErrorBoundary>
    </div>
  );
}
