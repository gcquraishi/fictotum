'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { GraphNode, GraphLink, PathVisualization } from '@/lib/types';
import { devLog, devWarn, devError } from '@/utils/devLog';

// CHR-22: Import directly instead of dynamic to enable ref forwarding
// We'll handle SSR with a client-side mount check instead
let ForceGraph2D: any = null;
if (typeof window !== 'undefined') {
  ForceGraph2D = require('react-force-graph-2d').default;
}

interface GraphExplorerProps {
  canonicalId?: string;
  nodes?: GraphNode[];
  links?: GraphLink[];
  highlightedPath?: PathVisualization;
  shouldExpandCenter?: boolean;
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
    // Only log in development to avoid console pollution
    if (process.env.NODE_ENV === 'development') {
      console.error('ForceGraph rendering error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-stone-100 border-2 border-red-300 rounded-lg">
          <div className="text-center p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Graph Rendering Error</h3>
            <p className="text-sm text-gray-600 mb-4">
              Failed to render the graph visualization. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
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

// High-degree node protection - limit neighbors to prevent layout chaos
const MAX_NEIGHBORS = 12; // Maximum neighbors to show when expanding a node (prevents "Rome" explosion)

// Helper function to check if a node is a Bacon (person, not media work about Bacon)
const isBaconNode = (nodeId: string): boolean => {
  return (nodeId.includes('bacon') && !nodeId.startsWith('media-'));
};

export default function GraphExplorer({ canonicalId, nodes: initialNodes, links: initialLinks, highlightedPath, shouldExpandCenter }: GraphExplorerProps) {
  const router = useRouter();
  // CHR-22: Track client-side mount to avoid SSR issues with ForceGraph2D
  const [mounted, setMounted] = useState(false);
  // CHR-22: Responsive dimensions - fits above fold on 13" MacBook
  const [dimensions, setDimensions] = useState({ width: 1200, height: 600 });
  const [dimensionsReady, setDimensionsReady] = useState(false);
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
  // CHR-22: Now using useRef since we removed dynamic import
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
  // Track the currently expanded node (only one at a time)
  const [currentlyExpandedNode, setCurrentlyExpandedNode] = useState<string | null>(centerNodeId);
  // Track the ordered exploration path for visual highlighting
  const [explorationPath, setExplorationPath] = useState<string[]>(
    centerNodeId ? [centerNodeId] : []
  );

  // Phase 2: Navigation History Stack (Task 2.1)
  const [navigationHistory, setNavigationHistory] = useState<string[]>(
    centerNodeId ? [centerNodeId] : []
  );
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Phase 3.1.3: Keyboard shortcuts help panel
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Visual feedback for keyboard shortcuts
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  // Camera control helper - smoothly centers camera on a node
  const centerCameraOnNode = (node: GraphNode & { x?: number; y?: number }) => {
    if (!forceGraphRef.current || typeof node.x !== 'number' || typeof node.y !== 'number') {
      devWarn('Cannot center camera: missing ref or node coordinates', { node });
      return;
    }

    try {
      // Use 1000ms duration for smooth pan (as specified in plan)
      forceGraphRef.current.centerAt?.(node.x, node.y, 1000);
      devLog('Camera centered on node:', { id: node.id, name: node.name, x: node.x, y: node.y });
    } catch (error) {
      devError('Error centering camera:', error);
    }
  };

  // Collapse helper - recursively removes a node and all its descendants (Task 1.8)
  // Smart collapse: preserves nodes that are part of the exploration path (visited centers)
  const collapseNode = (nodeId: string, preserveNodeIds: Set<string> = visitedCenters) => {
    const isInPath = preserveNodeIds.has(nodeId);
    const toRemove = new Set<string>();

    // If the node itself is in the exploration path, don't remove it - only its side branches
    if (!isInPath) {
      toRemove.add(nodeId);
    }

    const queue = [nodeId];

    // BFS to find all descendants, but skip nodes in the exploration path
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = nodeChildren.get(current);

      if (children) {
        children.forEach(childId => {
          // Skip if this child was clicked/centered (part of exploration path)
          if (preserveNodeIds.has(childId)) {
            devLog(`  Preserving ${childId} - part of exploration path`);
            return;
          }

          if (!toRemove.has(childId)) {
            toRemove.add(childId);
            queue.push(childId);
          }
        });
      }
    }

    if (isInPath) {
      devLog(`Smart collapsing ${nodeId} (in path) - removing ${toRemove.size} side branches, keeping node itself:`, Array.from(toRemove));
    } else {
      devLog(`Collapsing ${nodeId} - removing ${toRemove.size} nodes (preserving exploration path):`, Array.from(toRemove));
    }

    // CRITICAL: Remove nodes from graph state to prevent memory bloat
    // When users explore 20+ nodes deep, we must actually DELETE collapsed nodes from memory,
    // not just hide them. Otherwise the graph will balloon to 200+ nodes and cause performance issues.
    // This ensures the graph stays lean (~50-100 nodes max) regardless of exploration depth.
    setNodes(prevNodes => {
      const beforeCount = prevNodes.length;
      const afterNodes = prevNodes.filter(n => !toRemove.has(n.id));
      const afterCount = afterNodes.length;
      devLog(`🧹 State cleanup: ${beforeCount} nodes → ${afterCount} nodes (removed ${beforeCount - afterCount})`);
      return afterNodes;
    });

    // Remove links connected to removed nodes
    setLinks(prevLinks => prevLinks.filter(l => {
      const source = typeof l.source === 'object' ? l.source.id : l.source;
      const target = typeof l.target === 'object' ? l.target.id : l.target;
      return !toRemove.has(source) && !toRemove.has(target);
    }));

    // Clean up tracking state
    // IMPORTANT: Always remove the collapsed node from expandedNodes (even if in path)
    // so it can be re-expanded later
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodeId); // Remove the collapsed node itself
      toRemove.forEach(id => newSet.delete(id)); // Remove its children
      return newSet;
    });

    setNodeDepths(prev => {
      const newMap = new Map(prev);
      toRemove.forEach(id => newMap.delete(id));
      return newMap;
    });

    setNodeChildren(prev => {
      const newMap = new Map(prev);
      newMap.delete(nodeId); // Remove the collapsed node's children tracking
      toRemove.forEach(id => newMap.delete(id)); // Remove children's tracking
      return newMap;
    });

    setVisitedCenters(prev => {
      const newSet = new Set(prev);
      toRemove.forEach(id => newSet.delete(id));
      return newSet;
    });
  };

  // Task 2.2: Back navigation with re-expand
  const navigateBack = async () => {
    if (historyIndex === 0) {
      devWarn('⚠️ Already at the beginning of history');
      return;
    }

    const newIndex = historyIndex - 1;
    const previousNodeId = navigationHistory[newIndex];

    if (!previousNodeId) {
      devError('❌ Invalid history state: no node at index', newIndex);
      return;
    }

    devLog(`⬅️ Navigating back to: ${previousNodeId} (${newIndex + 1}/${navigationHistory.length})`);

    // Update history index
    setHistoryIndex(newIndex);

    // Find the node in current graph state
    const previousNode = nodes.find(n => n.id === previousNodeId);

    if (!previousNode) {
      devWarn(`⚠️ Node ${previousNodeId} not in current graph, will need to re-expand`);
      // TODO: Re-expand from parent if needed (for now, just log)
      return;
    }

    // Center camera on previous node
    setCenterNodeId(previousNodeId);
    centerCameraOnNode(previousNode);

    // Collapse all nodes AFTER the target index in history (clean up forward nodes)
    const nodesToCollapse = navigationHistory.slice(newIndex + 1);
    if (nodesToCollapse.length > 0) {
      devLog(`🧹 Collapsing ${nodesToCollapse.length} forward nodes:`, nodesToCollapse);

      // For each forward node, find and remove its neighbors from the current graph
      nodesToCollapse.forEach(nodeId => {
        // Find all nodes connected to this forward node by looking at current links
        const connectedNodeIds = new Set<string>();
        links.forEach(link => {
          const source = typeof link.source === 'object' ? link.source.id : link.source;
          const target = typeof link.target === 'object' ? link.target.id : link.target;

          if (source === nodeId && target !== nodeId) {
            connectedNodeIds.add(target);
          } else if (target === nodeId && source !== nodeId) {
            connectedNodeIds.add(source);
          }
        });

        // Don't remove nodes that are part of the remaining history path
        const historyPathIds = new Set(navigationHistory.slice(0, newIndex + 1));
        const childrenToRemove = Array.from(connectedNodeIds).filter(id => !historyPathIds.has(id));

        if (childrenToRemove.length > 0) {
          devLog(`  Removing ${childrenToRemove.length} neighbors of ${nodeId}:`, childrenToRemove);

          // Remove children from nodes array
          setNodes(prev => prev.filter(n => !childrenToRemove.includes(n.id)));

          // Remove children's links
          setLinks(prev => prev.filter(l => {
            const source = typeof l.source === 'object' ? l.source.id : l.source;
            const target = typeof l.target === 'object' ? l.target.id : l.target;
            return !childrenToRemove.includes(source) && !childrenToRemove.includes(target);
          }));

          // Mark as collapsed
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(nodeId);
            childrenToRemove.forEach(id => newSet.delete(id));
            return newSet;
          });
        }
      });
    }

    // Re-expand the previous node ONLY if its children are actually missing from graph
    // (not just because it was marked as unexpanded during collapse)
    const hasChildrenOnGraph = nodeChildren.has(previousNodeId) &&
      Array.from(nodeChildren.get(previousNodeId) || []).some(childId =>
        nodes.some(n => n.id === childId)
      );

    if (!hasChildrenOnGraph) {
      devLog(`Re-expanding previous node (children missing): ${previousNodeId}`);

      // Determine node type and call appropriate expansion API
      if (previousNodeId.startsWith('figure-')) {
        const canonicalIdToExpand = previousNodeId.replace('figure-', '');
        try {
          setLoadingNodes((prev) => new Set(prev).add(previousNodeId));

          const response = await fetch(`/api/graph/expand/${canonicalIdToExpand}?type=figure`);
          if (!response.ok) throw new Error('Failed to re-expand figure node');

          const data = await response.json();
          setExpandedNodes((prev) => new Set(prev).add(previousNodeId));
          setCurrentlyExpandedNode(previousNodeId);

          // Add neighbors back to graph (same logic as handleNodeClick)
          const parentDepth = nodeDepths.get(previousNodeId) ?? 0;
          const newDepth = parentDepth + 1;

          setNodes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));
            const limitedNodes = newNodes.slice(0, MAX_NEIGHBORS);

            if (newNodes.length > MAX_NEIGHBORS) {
              devWarn(`⚠️ High-degree node: showing ${MAX_NEIGHBORS} of ${newNodes.length} neighbors`);
            }

            return [...prev, ...limitedNodes];
          });

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

          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(previousNodeId);
            return newSet;
          });
        } catch (err: any) {
          devError('Error re-expanding figure node:', err);
          setError(`Failed to navigate back: ${err.message}`);
          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(previousNodeId);
            return newSet;
          });
        }
      } else if (previousNodeId.startsWith('media-')) {
        const wikidataId = previousNodeId.replace('media-', '');
        try {
          setLoadingNodes((prev) => new Set(prev).add(previousNodeId));

          const response = await fetch(`/api/graph/expand/${wikidataId}?type=media`);
          if (!response.ok) throw new Error('Failed to re-expand media node');

          const data = await response.json();
          setExpandedNodes((prev) => new Set(prev).add(previousNodeId));
          setCurrentlyExpandedNode(previousNodeId);

          // Add neighbors back to graph
          const parentDepth = nodeDepths.get(previousNodeId) ?? 0;
          const newDepth = parentDepth + 1;

          setNodes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));
            const limitedNodes = newNodes.slice(0, MAX_NEIGHBORS);

            if (newNodes.length > MAX_NEIGHBORS) {
              devWarn(`⚠️ High-degree node: showing ${MAX_NEIGHBORS} of ${newNodes.length} neighbors`);
            }

            return [...prev, ...limitedNodes];
          });

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

          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(previousNodeId);
            return newSet;
          });
        } catch (err: any) {
          devError('Error re-expanding media node:', err);
          setError(`Failed to navigate back: ${err.message}`);
          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(previousNodeId);
            return newSet;
          });
        }
      }
    } else {
      // Node's children are already on graph, just mark as expanded and update current
      devLog(`Previous node already has children on graph, skipping re-expand`);
      setExpandedNodes((prev) => new Set(prev).add(previousNodeId));
      setCurrentlyExpandedNode(previousNodeId);
    }
  };

  // Task 3.1.2: Forward navigation
  const navigateForward = async () => {
    if (historyIndex >= navigationHistory.length - 1) {
      devWarn('⚠️ Already at the most recent position');
      return;
    }

    const newIndex = historyIndex + 1;
    const nextNodeId = navigationHistory[newIndex];

    if (!nextNodeId) {
      devError('❌ Invalid history state: no node at index', newIndex);
      return;
    }

    devLog(`➡️ Navigating forward to: ${nextNodeId} (${newIndex + 1}/${navigationHistory.length})`);

    // Update history index
    setHistoryIndex(newIndex);

    // Find the node in current graph state
    const nextNode = nodes.find(n => n.id === nextNodeId);

    if (!nextNode) {
      devWarn(`⚠️ Node ${nextNodeId} not in current graph, will need to re-expand`);
      return;
    }

    // Center camera on next node
    setCenterNodeId(nextNodeId);
    centerCameraOnNode(nextNode);

    // Re-expand the next node ONLY if its children are actually missing from graph
    const hasChildrenOnGraph = nodeChildren.has(nextNodeId) &&
      Array.from(nodeChildren.get(nextNodeId) || []).some(childId =>
        nodes.some(n => n.id === childId)
      );

    if (!hasChildrenOnGraph) {
      devLog(`Re-expanding forward node (children missing): ${nextNodeId}`);

      // Determine node type and call appropriate expansion API
      if (nextNodeId.startsWith('figure-')) {
        const canonicalIdToExpand = nextNodeId.replace('figure-', '');
        try {
          setLoadingNodes((prev) => new Set(prev).add(nextNodeId));

          const response = await fetch(`/api/graph/expand/${canonicalIdToExpand}?type=figure`);
          if (!response.ok) throw new Error('Failed to re-expand figure node');

          const data = await response.json();
          setExpandedNodes((prev) => new Set(prev).add(nextNodeId));
          setCurrentlyExpandedNode(nextNodeId);

          // Add neighbors back to graph
          const parentDepth = nodeDepths.get(nextNodeId) ?? 0;
          const newDepth = parentDepth + 1;

          setNodes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));
            const limitedNodes = newNodes.slice(0, MAX_NEIGHBORS);

            if (newNodes.length > MAX_NEIGHBORS) {
              devWarn(`⚠️ High-degree node: showing ${MAX_NEIGHBORS} of ${newNodes.length} neighbors`);
            }

            return [...prev, ...limitedNodes];
          });

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

          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(nextNodeId);
            return newSet;
          });
        } catch (err: any) {
          devError('Error re-expanding figure node:', err);
          setError(`Failed to navigate forward: ${err.message}`);
          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(nextNodeId);
            return newSet;
          });
        }
      } else if (nextNodeId.startsWith('media-')) {
        const wikidataId = nextNodeId.replace('media-', '');
        try {
          setLoadingNodes((prev) => new Set(prev).add(nextNodeId));

          const response = await fetch(`/api/graph/expand/${wikidataId}?type=media`);
          if (!response.ok) throw new Error('Failed to re-expand media node');

          const data = await response.json();
          setExpandedNodes((prev) => new Set(prev).add(nextNodeId));
          setCurrentlyExpandedNode(nextNodeId);

          // Add neighbors back to graph
          const parentDepth = nodeDepths.get(nextNodeId) ?? 0;
          const newDepth = parentDepth + 1;

          setNodes(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));
            const limitedNodes = newNodes.slice(0, MAX_NEIGHBORS);

            if (newNodes.length > MAX_NEIGHBORS) {
              devWarn(`⚠️ High-degree node: showing ${MAX_NEIGHBORS} of ${newNodes.length} neighbors`);
            }

            return [...prev, ...limitedNodes];
          });

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

          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(nextNodeId);
            return newSet;
          });
        } catch (err: any) {
          devError('Error re-expanding media node:', err);
          setError(`Failed to navigate forward: ${err.message}`);
          setLoadingNodes((prev) => {
            const newSet = new Set(prev);
            newSet.delete(nextNodeId);
            return newSet;
          });
        }
      }
    } else {
      // Node's children are already on graph, just mark as expanded and update current
      devLog(`Forward node already has children on graph, skipping re-expand`);
      setExpandedNodes((prev) => new Set(prev).add(nextNodeId));
      setCurrentlyExpandedNode(nextNodeId);
    }
  };

  // Task 2.4: Reset view to starting state
  const resetView = async () => {
    const startingNodeId = canonicalId ? `figure-${canonicalId}` : null;

    if (!startingNodeId || !canonicalId) {
      devWarn('⚠️ Cannot reset: no starting node');
      return;
    }

    devLog(`🔄 Resetting view to starting node: ${startingNodeId}`);

    // Reset navigation history to starting node only
    setNavigationHistory([startingNodeId]);
    setHistoryIndex(0);

    // Reset exploration path
    setExplorationPath([startingNodeId]);

    // Clear all expanded nodes
    setExpandedNodes(new Set());
    setCurrentlyExpandedNode(null);

    // Reset visited centers to starting node only
    setVisitedCenters(new Set([startingNodeId]));

    // Reset node depths
    setNodeDepths(new Map([[startingNodeId, 0]]));

    // Clear node children tracking
    setNodeChildren(new Map());

    // Find the starting node from current nodes
    const startingNode = nodes.find(n => n.id === startingNodeId);
    if (!startingNode) {
      devWarn('⚠️ Starting node not found in current graph');
      return;
    }

    // Clear graph to just starting node
    setNodes([startingNode]);
    setLinks([]);

    // Re-fetch starting node's neighbors from API to get fresh initial state
    try {
      setLoadingNodes((prev) => new Set(prev).add(startingNodeId));

      const response = await fetch(`/api/graph/expand/${canonicalId}?type=figure`);
      if (!response.ok) {
        throw new Error('Failed to fetch neighbors');
      }

      const data = await response.json();

      // Add neighbors (limited to MAX_NEIGHBORS)
      const newNodes = data.nodes.slice(0, MAX_NEIGHBORS);
      setNodes([startingNode, ...newNodes]);
      setLinks(data.links);

      // Mark starting node as expanded with its fresh neighbors
      setExpandedNodes(new Set([startingNodeId]));
      setCurrentlyExpandedNode(startingNodeId);

      // Set depth for new neighbors
      const newDepths = new Map([[startingNodeId, 0]]);
      newNodes.forEach((n: GraphNode) => newDepths.set(n.id, 1));
      setNodeDepths(newDepths);

      // Track children for collapse logic
      setNodeChildren(prev => {
        const updated = new Map(prev);
        updated.set(startingNodeId, new Set(newNodes.map((n: GraphNode) => n.id)));
        return updated;
      });

      devLog(`✅ View reset complete - showing ${newNodes.length} initial neighbors`);
    } catch (err) {
      devError('Error resetting view:', err);
    } finally {
      setLoadingNodes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(startingNodeId);
        return newSet;
      });
    }

    // Center camera on starting node
    setCenterNodeId(startingNodeId);
    if (startingNode) {
      centerCameraOnNode(startingNode);
    }
  };

  // Initialize depth tracking and expansion state for starting node (Task 1.6)
  useEffect(() => {
    if (centerNodeId && nodeDepths.size === 0) {
      setNodeDepths(new Map([[centerNodeId, 0]]));
      // Mark starting node as expanded so it can be collapsed later
      setExpandedNodes((prev) => new Set(prev).add(centerNodeId));
      devLog('Initialized starting node - depth 0, marked as expanded:', centerNodeId);
    }
  }, [centerNodeId, nodeDepths.size]);

  // Track initial neighbors of starting node for collapse functionality
  useEffect(() => {
    if (centerNodeId && nodes.length > 0 && links.length > 0 && nodeChildren.size === 0) {
      // Find all nodes connected to the starting node
      const connectedNodeIds = new Set<string>();

      links.forEach((link: ForceGraphLink) => {
        const source = typeof link.source === 'object' ? link.source.id : link.source;
        const target = typeof link.target === 'object' ? link.target.id : link.target;

        if (source === centerNodeId && target !== centerNodeId) {
          connectedNodeIds.add(target);
        } else if (target === centerNodeId && source !== centerNodeId) {
          connectedNodeIds.add(source);
        }
      });

      if (connectedNodeIds.size > 0) {
        // Track these as children of the starting node
        setNodeChildren(new Map([[centerNodeId, connectedNodeIds]]));

        // Set depth for these initial neighbors
        setNodeDepths((prev) => {
          const updated = new Map(prev);
          connectedNodeIds.forEach(id => {
            if (!updated.has(id)) {
              updated.set(id, 1); // Initial neighbors are 1 hop away
            }
          });
          return updated;
        });

        devLog(`Tracked ${connectedNodeIds.size} initial neighbors of starting node:`, Array.from(connectedNodeIds));
      }
    }
  }, [centerNodeId, nodes.length, links.length, nodeChildren.size]);

  // Phase 3.1.3: Keyboard shortcuts
  useEffect(() => {
    if (!isBloomMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Close help panel with Escape
      if (e.key === 'Escape' && showKeyboardHelp) {
        setShowKeyboardHelp(false);
        return;
      }

      // Toggle help panel with ? or H
      if ((e.key === '?' || e.key.toLowerCase() === 'h') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowKeyboardHelp(prev => !prev);
        return;
      }

      // Back navigation: B or Left Arrow
      if ((e.key === 'b' || e.key === 'B' || e.key === 'ArrowLeft') && historyIndex > 0) {
        e.preventDefault();
        setActiveShortcut('back');
        setTimeout(() => setActiveShortcut(null), 300);
        navigateBack();
        return;
      }

      // Forward navigation: F or Right Arrow
      if ((e.key === 'f' || e.key === 'F' || e.key === 'ArrowRight') && historyIndex < navigationHistory.length - 1) {
        e.preventDefault();
        setActiveShortcut('forward');
        setTimeout(() => setActiveShortcut(null), 300);
        navigateForward();
        return;
      }

      // Reset view: R
      if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setActiveShortcut('reset');
        setTimeout(() => setActiveShortcut(null), 300);
        resetView();
        return;
      }

      // Collapse currently expanded node: Escape
      if (e.key === 'Escape' && currentlyExpandedNode && !showKeyboardHelp) {
        e.preventDefault();
        setActiveShortcut('collapse');
        setTimeout(() => setActiveShortcut(null), 300);
        collapseNode(currentlyExpandedNode);
        setCurrentlyExpandedNode(null);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isBloomMode,
    historyIndex,
    navigationHistory.length,
    currentlyExpandedNode,
    showKeyboardHelp,
    navigateBack,
    navigateForward,
    resetView
  ]);

  // CHR-22: Set mounted flag on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // CHR-22: Auto-zoom to fit after graph loads and instance is ready
  useEffect(() => {
    if (forceGraphRef.current && nodes.length > 0 && !isLoading && mounted) {
      console.log('🎯 Graph ready, attempting auto-zoom. Nodes:', nodes.length);
      // Delay to ensure layout has settled
      const zoomTimer = setTimeout(() => {
        try {
          const padding = 100;
          console.log('🔍 Calling zoomToFit with padding:', padding);
          forceGraphRef.current.zoomToFit?.(400, padding);
          console.log('✅ zoomToFit completed successfully');
        } catch (e) {
          console.error('❌ zoomToFit failed:', e);
        }
      }, 1000); // Wait 1 second for layout to settle

      return () => clearTimeout(zoomTimer);
    }
  }, [nodes.length, isLoading, mounted]);

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

  // Handle responsive dimensions - wait for container to be ready
  useEffect(() => {
    let hasSetDimensions = false;

    const updateDimensions = () => {
      if (containerRef.current && !hasSetDimensions) {
        // Get the actual inner dimensions of the container (clientWidth excludes borders)
        const containerWidth = containerRef.current.clientWidth;
        const containerOffsetWidth = containerRef.current.offsetWidth;

        // If container has width, use it; otherwise use a sensible default
        const width = containerWidth > 0 ? Math.max(containerWidth - 4, 800) : 1200;

        // CHR-22: Responsive height - fits above fold on 13" MacBook
        // Mobile: min(50vh, 450px) | Desktop: min(60vh, 600px)
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
        const height = isMobile
          ? Math.min(viewportHeight * 0.5, 450)  // Mobile: 50vh max 450px
          : Math.min(viewportHeight * 0.6, 600); // Desktop: 60vh max 600px

        setDimensions({ width, height });
        setDimensionsReady(true);
        hasSetDimensions = true;

        console.log('✅ GraphExplorer dimensions set:', {
          width,
          height,
          containerWidth,
          containerOffsetWidth,
          usedDefault: containerWidth === 0
        });
      }
    };

    // Try immediately
    updateDimensions();

    // Also try with delays in case container isn't ready immediately
    const timer1 = setTimeout(updateDimensions, 100);
    const timer2 = setTimeout(updateDimensions, 300);

    // Fallback: force dimensions ready after 500ms even if container measurement failed
    const fallbackTimer = setTimeout(() => {
      if (!hasSetDimensions) {
        console.log('⚠️ Fallback: forcing dimensions ready with defaults');
        // CHR-22: Use responsive fallback height
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
        const height = isMobile
          ? Math.min(viewportHeight * 0.5, 450)
          : Math.min(viewportHeight * 0.6, 600);
        setDimensions({ width: 1200, height });
        setDimensionsReady(true);
        hasSetDimensions = true;
      }
    }, 500);

    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(fallbackTimer);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Development-only: Validate canonicalId exists in database
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development' || !canonicalId || !mounted) {
      return;
    }

    let cancelled = false;

    async function validateEntity() {
      try {
        const response = await fetch(`/api/entities/validate?id=${canonicalId}`);

        if (cancelled) return;

        if (!response.ok) {
          devError(`❌ Entity validation API error for ${canonicalId}: ${response.status}`);
          return;
        }

        const data = await response.json();

        if (!data.exists) {
          const errorMsg = `Invalid canonicalId: "${canonicalId}" not found in database. Check lib/constants/entities.ts or docs/seed-entities.md for correct IDs.`;
          devError(`❌ ${errorMsg}`);
          console.error('\n🔍 Entity Validation Failed\n');
          console.error(`  Canonical ID: ${canonicalId}`);
          console.error(`  Entity Type: Unknown (not found)`);
          console.error('\n💡 Troubleshooting:\n');
          console.error('  1. Check if entity exists in Neo4j database');
          console.error('  2. Verify canonical_id is correct in CRITICAL_ENTITIES');
          console.error('  3. Run: npm run validate:entities');
          console.error('  4. See docs/seed-entities.md for registry\n');

          throw new Error(errorMsg);
        }

        devLog(`✅ Entity validated: ${data.name} (${data.entityType})`);
      } catch (error) {
        if (!cancelled) {
          devError('Entity validation error:', error);
        }
      }
    }

    validateEntity();

    return () => {
      cancelled = true;
    };
  }, [canonicalId, mounted]);

  // Handle external expansion trigger (e.g., from landing page)
  useEffect(() => {
    if (shouldExpandCenter && centerNodeId && !expandedNodes.has(centerNodeId) && mounted) {
      devLog('📍 External trigger: expanding center node', centerNodeId);
      // Find the center node and simulate a click
      const centerNode = nodes.find(n => n.id === centerNodeId);
      if (centerNode) {
        handleNodeClick(centerNode);
      }
    }
  }, [shouldExpandCenter, centerNodeId, mounted]);

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

  // Memoize exploration path edges for O(1) lookup performance
  const explorationPathEdges = useMemo(() => {
    const edges = new Set<string>();
    if (isBloomMode && explorationPath.length > 1) {
      for (let i = 0; i < explorationPath.length - 1; i++) {
        const a = explorationPath[i];
        const b = explorationPath[i + 1];
        // Store both directions for bidirectional matching
        edges.add(`${a}-${b}`);
        edges.add(`${b}-${a}`);
      }
    }
    return edges;
  }, [isBloomMode, explorationPath]);

  // Clone links and mark highlighted path links as featured
  const graphLinks = visibleLinks.map((link: ForceGraphLink) => {
    const source = typeof link.source === 'object' ? link.source.id : link.source;
    const target = typeof link.target === 'object' ? link.target.id : link.target;

    // Check if this link is part of the highlighted path (from highlightedPath prop)
    const isHighlighted = highlightedPath?.pathLinks.some(
      pathLink =>
        (pathLink.source === source && pathLink.target === target) ||
        (pathLink.source === target && pathLink.target === source) // Handle bidirectional
    ) || false;

    // Check if this link is part of the exploration path (O(1) lookup via memoized Set)
    const isExplorationPath = explorationPathEdges.has(`${source}-${target}`);

    return {
      source,
      target,
      sentiment: link.sentiment,
      featured: link.featured || isHighlighted || isExplorationPath,
      relationshipType: link.relationshipType,
    };
  });

  // Handle node click
  const handleNodeClick = async (node: GraphNode & { x?: number; y?: number }) => {
    // Check if clicking an already-expanded node (to collapse it)
    const isClickingExpandedNode = expandedNodes.has(node.id);

    // Phase 1: Camera centering on click (Tasks 1.2 & 1.3) - only in bloom mode
    if (isBloomMode) {
      setCenterNodeId(node.id);
      centerCameraOnNode(node);

      // Track this node as part of exploration path (for smart collapse)
      // Create updated set NOW before collapsing, to avoid state timing issues
      const updatedVisitedCenters = new Set(visitedCenters).add(node.id);
      setVisitedCenters(updatedVisitedCenters);

      // Add to ordered exploration path for visual highlighting
      // Handle "jumping back" to a node already in the path
      setExplorationPath((prev) => {
        const indexInPath = prev.indexOf(node.id);

        if (indexInPath === prev.length - 1) {
          // Already the last node, don't duplicate
          return prev;
        }

        if (indexInPath >= 0) {
          // Node is earlier in the path - truncate to create "jump back" effect
          devLog(`📍 Jumping back to node ${indexInPath + 1} of ${prev.length} in path`);
          return prev.slice(0, indexInPath + 1);
        }

        // New node - add to end of path
        return [...prev, node.id];
      });

      // Task 2.1: Update navigation history for back button support
      // Only add to history when expanding a node (not collapsing)
      if (!isClickingExpandedNode) {
        setNavigationHistory((prev) => {
          // If we're not at the end of history (user went back), truncate forward history
          const truncated = historyIndex < prev.length - 1 ? prev.slice(0, historyIndex + 1) : prev;

          // Add new node to history
          const updated = [...truncated, node.id];
          devLog(`📚 Navigation history updated: ${updated.length} steps`);
          return updated;
        });

        // Move history index forward
        setHistoryIndex((prev) => prev + 1);
      }

      // Check depth before expansion (Task 1.7)
      const currentDepth = nodeDepths.get(node.id) ?? 0;
      const potentialDepth = currentDepth + 1;

      if (potentialDepth >= MAX_DEPTH) {
        devWarn(
          `⚠️ Approaching depth limit (${potentialDepth}/${MAX_DEPTH} hops). Consider collapsing distant nodes.`
        );
        // TODO: Add user-facing toast notification in Phase 2
      }

      devLog('Node clicked:', {
        id: node.id,
        name: node.name,
        currentDepth,
        potentialNewNodeDepth: potentialDepth,
        isCurrentlyExpanded: isClickingExpandedNode
      });

      // Auto-collapse the previously expanded node (if different from current)
      // Pass the updated visited centers to ensure the newly clicked node is preserved
      if (currentlyExpandedNode && currentlyExpandedNode !== node.id) {
        devLog(`Auto-collapsing previous node: ${currentlyExpandedNode}`);
        collapseNode(currentlyExpandedNode, updatedVisitedCenters);
      }
    }

    // Handle media node expansion
    if (node.type === 'media' && typeof node.id === 'string' && node.id.startsWith('media-')) {
      const wikidataId = node.id.replace('media-', '');

      // If clicking an already-expanded node, collapse it manually
      if (isClickingExpandedNode) {
        collapseNode(node.id);
        setCurrentlyExpandedNode(null);
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
        setCurrentlyExpandedNode(node.id); // Mark as currently expanded

        // Calculate depth for new nodes (Task 1.6)
        const parentDepth = nodeDepths.get(node.id) ?? 0;
        const newDepth = parentDepth + 1;

        // Compute new nodes using setState callback to get latest state (prevents duplicates)
        let computedNewNodes: GraphNode[] = [];
        let computedChildIds: Set<string> = new Set();

        setNodes(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));

          // Limit to MAX_NEIGHBORS to prevent layout chaos (e.g., "Rome" with 20+ connections)
          computedNewNodes = newNodes.slice(0, MAX_NEIGHBORS);
          computedChildIds = new Set(computedNewNodes.map(n => n.id));

          if (newNodes.length > MAX_NEIGHBORS) {
            devWarn(`⚠️ High-degree node: showing ${MAX_NEIGHBORS} of ${newNodes.length} neighbors`);
          }
          devLog(`Added ${computedNewNodes.length} nodes at depth ${newDepth}:`, computedNewNodes.map((n: GraphNode) => n.name));
          return [...prev, ...computedNewNodes];
        });

        // Use computed values for other state updates (not nested, but uses latest data)
        setNodeDepths(prev => {
          const updated = new Map(prev);
          computedNewNodes.forEach((n: GraphNode) => {
            if (!updated.has(n.id)) {
              updated.set(n.id, newDepth);
            }
          });
          return updated;
        });

        setNodeChildren(prev => {
          const updated = new Map(prev);
          updated.set(node.id, computedChildIds);
          return updated;
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
        devError('Error expanding node:', err);
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

      // If clicking an already-expanded node, collapse it manually
      if (isClickingExpandedNode) {
        collapseNode(node.id);
        setCurrentlyExpandedNode(null);
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
        setCurrentlyExpandedNode(node.id); // Mark as currently expanded

        // Calculate depth for new nodes (Task 1.6)
        const parentDepth = nodeDepths.get(node.id) ?? 0;
        const newDepth = parentDepth + 1;

        // Compute new nodes using setState callback to get latest state (prevents duplicates)
        let computedNewNodes: GraphNode[] = [];
        let computedChildIds: Set<string> = new Set();

        setNodes(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNodes = data.nodes.filter((n: GraphNode) => !existingIds.has(n.id));

          // Limit to MAX_NEIGHBORS to prevent layout chaos (e.g., "Rome" with 20+ connections)
          computedNewNodes = newNodes.slice(0, MAX_NEIGHBORS);
          computedChildIds = new Set(computedNewNodes.map(n => n.id));

          if (newNodes.length > MAX_NEIGHBORS) {
            devWarn(`⚠️ High-degree node: showing ${MAX_NEIGHBORS} of ${newNodes.length} neighbors`);
          }
          devLog(`Added ${computedNewNodes.length} nodes at depth ${newDepth}:`, computedNewNodes.map((n: GraphNode) => n.name));
          return [...prev, ...computedNewNodes];
        });

        // Use computed values for other state updates (not nested, but uses latest data)
        setNodeDepths(prev => {
          const updated = new Map(prev);
          computedNewNodes.forEach((n: GraphNode) => {
            if (!updated.has(n.id)) {
              updated.set(n.id, newDepth);
            }
          });
          return updated;
        });

        setNodeChildren(prev => {
          const updated = new Map(prev);
          updated.set(node.id, computedChildIds);
          return updated;
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
        devError('Error expanding node:', err);
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

  // Loading skeleton - show until both data AND dimensions are ready
  if (isLoading || isPending || !dimensionsReady) {
    return (
      <div className="bg-stone-100 border border-stone-300 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
        <div className="mb-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse"></div>
            <span className="text-stone-500">
              {!dimensionsReady ? 'Initializing canvas...' : 'Loading graph data...'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg overflow-hidden" style={{ height: 600 }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mb-4"></div>
              <p className="text-gray-400">
                {!dimensionsReady ? 'Preparing visualization...' : 'Loading graph data...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-stone-100 border border-stone-300 rounded-lg p-6">
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
      <div className="bg-stone-100 border border-stone-300 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Graph Explorer</h2>
        <p className="text-stone-500 text-center py-8">No graph data available</p>
      </div>
    );
  }

  // Helper: Truncate node names for breadcrumbs
  const truncateNodeName = (nodeId: string, maxLength: number = 20): string => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 'Unknown';

    const name = node.name;
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Helper: Navigate to a specific point in history via breadcrumb click
  // Task 3.1.2: Truncate forward history when jumping to middle position
  const navigateToHistoryIndex = async (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= navigationHistory.length) {
      devWarn('⚠️ Invalid breadcrumb index:', targetIndex);
      return;
    }

    if (targetIndex === historyIndex) {
      devLog('Already at this point in history');
      return;
    }

    const targetNodeId = navigationHistory[targetIndex];
    devLog(`🔗 Breadcrumb navigation: jumping to index ${targetIndex} (${targetNodeId})`);

    // Truncate navigation history to remove forward entries (standard browser behavior)
    // This prevents forward button from working after breadcrumb jump
    const truncatedHistory = navigationHistory.slice(0, targetIndex + 1);
    setNavigationHistory(truncatedHistory);

    // Update history index
    setHistoryIndex(targetIndex);

    // Find the target node
    const targetNode = nodes.find(n => n.id === targetNodeId);
    if (!targetNode) {
      devWarn(`⚠️ Node ${targetNodeId} not in current graph`);
      return;
    }

    // Center camera on target node
    setCenterNodeId(targetNodeId);
    centerCameraOnNode(targetNode);

    // Collapse all nodes AFTER the target index (now using truncated history)
    const nodesToCollapse = navigationHistory.slice(targetIndex + 1);
    if (nodesToCollapse.length > 0) {
      devLog(`🧹 Collapsing ${nodesToCollapse.length} forward nodes:`, nodesToCollapse);

      nodesToCollapse.forEach(nodeId => {
        const connectedNodeIds = new Set<string>();
        links.forEach(link => {
          const source = typeof link.source === 'object' ? link.source.id : link.source;
          const target = typeof link.target === 'object' ? link.target.id : link.target;

          if (source === nodeId && target !== nodeId) {
            connectedNodeIds.add(target);
          } else if (target === nodeId && source !== nodeId) {
            connectedNodeIds.add(source);
          }
        });

        const historyPathIds = new Set(truncatedHistory);
        const childrenToRemove = Array.from(connectedNodeIds).filter(id => !historyPathIds.has(id));

        if (childrenToRemove.length > 0) {
          setNodes(prev => prev.filter(n => !childrenToRemove.includes(n.id)));
          setLinks(prev => prev.filter(l => {
            const source = typeof l.source === 'object' ? l.source.id : l.source;
            const target = typeof l.target === 'object' ? l.target.id : l.target;
            return !childrenToRemove.includes(source) && !childrenToRemove.includes(target);
          }));
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(nodeId);
            childrenToRemove.forEach(id => newSet.delete(id));
            return newSet;
          });
        }
      });
    }

    // Mark target node as expanded if it has children
    const hasChildrenOnGraph = nodeChildren.has(targetNodeId) &&
      Array.from(nodeChildren.get(targetNodeId) || []).some(childId =>
        nodes.some(n => n.id === childId)
      );

    if (hasChildrenOnGraph) {
      setExpandedNodes((prev) => new Set(prev).add(targetNodeId));
      setCurrentlyExpandedNode(targetNodeId);
    }
  };

  return (
    <div className="relative">
      {/* Error Banner */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 shadow-lg flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Phase 3.1.1: Breadcrumb Trail */}
      {isBloomMode && navigationHistory.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-lg border border-stone-300 shadow-lg p-3 overflow-x-auto">
          <nav aria-label="Exploration breadcrumb" className="flex items-center gap-2 flex-nowrap min-w-0">
            {navigationHistory.slice(0, historyIndex + 1).map((nodeId, index) => {
              const isLast = index === historyIndex;
              const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

              // On mobile, show only last 3 breadcrumbs with ellipsis
              if (isMobile && navigationHistory.length > 3 && index < historyIndex - 2) {
                if (index === 0) {
                  return (
                    <React.Fragment key={nodeId}>
                      <button
                        onClick={() => navigateToHistoryIndex(index)}
                        className="text-sm font-mono text-stone-600 hover:text-amber-600 hover:underline transition-colors whitespace-nowrap flex-shrink-0"
                        title={truncateNodeName(nodeId, 100)}
                      >
                        {truncateNodeName(nodeId, 15)}
                      </button>
                      <span className="text-stone-400 flex-shrink-0" aria-hidden="true">›</span>
                      <span className="text-stone-400 text-sm flex-shrink-0">...</span>
                      <span className="text-stone-400 flex-shrink-0" aria-hidden="true">›</span>
                    </React.Fragment>
                  );
                }
                return null;
              }

              return (
                <React.Fragment key={nodeId}>
                  {isLast ? (
                    <span
                      className="text-sm font-mono font-semibold text-amber-600 whitespace-nowrap flex-shrink-0"
                      aria-current="location"
                      title={truncateNodeName(nodeId, 100)}
                    >
                      {truncateNodeName(nodeId, 20)}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => navigateToHistoryIndex(index)}
                        className="text-sm font-mono text-stone-600 hover:text-amber-600 hover:underline transition-colors whitespace-nowrap flex-shrink-0"
                        title={truncateNodeName(nodeId, 100)}
                      >
                        {truncateNodeName(nodeId, 20)}
                      </button>
                      <span className="text-stone-400 flex-shrink-0" aria-hidden="true">›</span>
                    </>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      )}

      {/* Task 2.3 & 2.4 & 3.1.2 & 3.1.3: Navigation Controls - Top Left (moved down to avoid overlap with breadcrumbs) */}
      {isBloomMode && (
        <div className="absolute top-20 left-4 z-10 flex gap-2">
          <button
            onClick={navigateBack}
            disabled={historyIndex === 0}
            className={`px-3 py-2 rounded-lg text-sm font-medium font-mono shadow-lg transition-all flex items-center gap-2 ${
              activeShortcut === 'back' ? 'ring-2 ring-amber-400 ring-offset-1' : ''
            } ${
              historyIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-300 hover:border-amber-400'
            }`}
            title={historyIndex === 0 ? 'At beginning of exploration' : 'Go back in exploration history (B or ←)'}
            aria-label="Navigate back"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <button
            onClick={navigateForward}
            disabled={historyIndex >= navigationHistory.length - 1}
            className={`px-3 py-2 rounded-lg text-sm font-medium font-mono shadow-lg transition-all flex items-center gap-2 ${
              activeShortcut === 'forward' ? 'ring-2 ring-amber-400 ring-offset-1' : ''
            } ${
              historyIndex >= navigationHistory.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-300 hover:border-amber-400'
            }`}
            title={historyIndex >= navigationHistory.length - 1 ? 'At most recent position' : 'Go forward in exploration history (F or →)'}
            aria-label="Navigate forward"
          >
            <span className="hidden sm:inline">Forward</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <button
            onClick={resetView}
            className={`px-3 py-2 rounded-lg text-sm font-medium font-mono shadow-lg transition-all flex items-center gap-2 ${
              activeShortcut === 'reset' ? 'ring-2 ring-amber-400 ring-offset-1' : ''
            } bg-white text-stone-700 hover:bg-stone-100 border border-stone-300 hover:border-amber-400`}
            title="Reset to starting view (R)"
            aria-label="Reset view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Reset</span>
          </button>
          {/* Phase 3.1.3: Keyboard shortcuts help button */}
          <button
            onClick={() => setShowKeyboardHelp(prev => !prev)}
            className={`px-3 py-2 rounded-lg text-sm font-medium font-mono shadow-lg transition-all flex items-center gap-2 ${
              showKeyboardHelp
                ? 'bg-amber-100 text-amber-800 border border-amber-400'
                : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-300 hover:border-amber-400'
            }`}
            title="Show keyboard shortcuts (? or H)"
            aria-label="Toggle keyboard shortcuts help"
            aria-expanded={showKeyboardHelp}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Help</span>
          </button>
        </div>
      )}

      {/* Inline Legend - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-stone-300 shadow-lg p-4">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-600"></div>
            <span className="text-stone-700">Historical Figure</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-stone-700">Media Work</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-stone-300 text-xs text-stone-500 italic">
          Drag to pan • Scroll to zoom • Click nodes
        </div>
      </div>

      {/* Phase 3.1.3: Keyboard Shortcuts Help Panel */}
      {showKeyboardHelp && (
        <>
          {/* Overlay backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setShowKeyboardHelp(false)}
            aria-hidden="true"
          />

          {/* Help panel modal */}
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-lg shadow-2xl border-2 border-stone-300 max-w-md w-full mx-4"
            role="dialog"
            aria-labelledby="keyboard-shortcuts-title"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-300">
              <h3
                id="keyboard-shortcuts-title"
                className="text-lg font-bold font-mono text-stone-800"
              >
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-stone-400 hover:text-stone-600 transition-colors p-1"
                aria-label="Close keyboard shortcuts help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Navigation section */}
              <div>
                <h4 className="text-sm font-bold font-mono text-stone-700 mb-3">Navigation</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">←</kbd>
                      <span className="text-sm text-stone-500">or</span>
                      <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">B</kbd>
                    </div>
                    <span className="text-sm text-stone-700">Go back in history</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">→</kbd>
                      <span className="text-sm text-stone-500">or</span>
                      <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">F</kbd>
                    </div>
                    <span className="text-sm text-stone-700">Go forward in history</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">R</kbd>
                    <span className="text-sm text-stone-700">Reset to starting node</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">Esc</kbd>
                    <span className="text-sm text-stone-700">Collapse selected node</span>
                  </div>
                </div>
              </div>

              {/* Help section */}
              <div>
                <h4 className="text-sm font-bold font-mono text-stone-700 mb-3">Help</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">?</kbd>
                      <span className="text-sm text-stone-500">or</span>
                      <kbd className="px-2 py-1 bg-stone-100 border border-stone-300 rounded text-xs font-mono text-stone-700">H</kbd>
                    </div>
                    <span className="text-sm text-stone-700">Toggle this help panel</span>
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <div className="pt-4 border-t border-stone-200">
                <p className="text-xs text-stone-500 italic">
                  Shortcuts are disabled when typing in input fields
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Full-Bleed Graph */}
      <ForceGraphErrorBoundary>
        <div ref={containerRef} className="bg-stone-100 rounded-lg border border-stone-300 w-full relative" style={{ height: `${dimensions.height}px`, overflow: 'hidden', cursor: 'grab' }}>
          {mounted && ForceGraph2D && (
          <div style={{ width: '100%', height: '100%' }}>
          <ForceGraph2D
          ref={forceGraphRef}
          key={`${showAllEdges}-${showAcademicWorks}-${showReferenceWorks}-${visibleLinks.length}`}
          graphData={{ nodes: visibleNodes, links: graphLinks }}
          width={dimensions.width}
          height={dimensions.height}
          nodeLabel={(node: any) => {
            if (node.type === 'media' && node.seriesMetadata?.isPartOfSeries) {
              const workCountText = node.seriesMetadata.workCount
                ? ` (${node.seriesMetadata.workCount} works)`
                : '';
              return `${node.name}\n\nPart of: ${node.seriesMetadata.seriesTitle}${workCountText}`;
            }
            return node.name || '';
          }}
          nodeColor={(node: any) => {
            if (isBaconNode(node.id)) return BACON_COLOR;
            if (node.type === 'figure') return '#3b82f6'; // Blue for figures
            return '#f97316'; // Orange for media works
          }}
          nodeRelSize={12}  // CHR-22: Increased from 7 for better visibility and legibility
          linkColor={(link: any) => link.featured ? '#3b82f6' : '#d1d5db'}
          linkWidth={(link: any) => link.featured ? 3 : 1.5}
          linkLabel={(link: any) => {
            const relType = link.relationshipType || 'connected';
            return `${relType} (${link.sentiment})`;
          }}
          backgroundColor="#f9fafb"
          onNodeClick={handleNodeClick as any}
          // CHR-22: Tighter force simulation for compact initial view (user can zoom out to explore)
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.3}
          cooldownTicks={200}
          d3Force={{
            charge: { strength: -3000, distanceMax: 800 },   // Reduced repulsion for tighter clustering
            link: { distance: 200, strength: 0.9 },          // Shorter links, stronger pull
            center: { strength: 0.15 },                      // Stronger centering
            collision: { radius: 60, strength: 0.5 }         // Tighter packing allowed
          }}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
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
                  : (node.type === 'figure' ? '#3b82f6' : '#f97316'); // Blue for figures, orange for media

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
                const color = node.type === 'figure' ? '#3b82f6' : '#f97316'; // Blue for figures, orange for media
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

              // Draw series badge for media nodes that are part of a series
              if (node.type === 'media' && node.seriesMetadata?.isPartOfSeries) {
                const badgeSize = 8 / globalScale;
                const badgeX = node.x + nodeSize - badgeSize / 2;
                const badgeY = node.y - nodeSize + badgeSize / 2;

                // Badge background (dark with amber border)
                ctx.fillStyle = '#292524'; // stone-800
                ctx.strokeStyle = '#f59e0b'; // amber-500
                ctx.lineWidth = 1.5 / globalScale;
                ctx.beginPath();
                ctx.arc(badgeX, badgeY, badgeSize, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.stroke();

                // Chain link icon (simplified)
                ctx.strokeStyle = '#fbbf24'; // amber-400
                ctx.lineWidth = 1.2 / globalScale;
                ctx.lineCap = 'round';

                // Draw two small circles connected (chain link representation)
                const linkSize = badgeSize * 0.3;
                ctx.beginPath();
                ctx.arc(badgeX - linkSize, badgeY, linkSize, 0, 2 * Math.PI, false);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(badgeX + linkSize, badgeY, linkSize, 0, 2 * Math.PI, false);
                ctx.stroke();

                // Connection line between circles
                ctx.beginPath();
                ctx.moveTo(badgeX - linkSize, badgeY);
                ctx.lineTo(badgeX + linkSize, badgeY);
                ctx.stroke();
              }
            } catch (e) {
              // Silently fail if canvas rendering has issues (only log in development)
              if (process.env.NODE_ENV === 'development') {
                console.warn('Canvas rendering error:', e);
              }
            }
          }}
        />
          </div>
          )}
        </div>
      </ForceGraphErrorBoundary>
    </div>
  );
}
