import { getSession } from './neo4j';
import { HistoricalFigure, FigureProfile, Portrayal, SentimentDistribution, GraphNode, GraphLink, SeriesRelationship, SeriesMetadata, CharacterAppearance } from './types';

export async function searchFigures(query: string): Promise<HistoricalFigure[]> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure)
       WHERE toLower(f.name) CONTAINS toLower($query)
       RETURN f
       LIMIT 10`,
      { query }
    );

    return result.records.map(record => {
      const node = record.get('f');
      return {
        canonical_id: node.properties.canonical_id,
        name: node.properties.name,
        is_fictional: node.properties.is_fictional || false,
        historicity_status: node.properties.historicity_status || (node.properties.is_fictional ? 'Fictional' : 'Historical'),
        era: node.properties.era,
      };
    });
  } finally {
    await session.close();
  }
}

export async function getFigureById(canonicalId: string): Promise<FigureProfile | null> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $canonicalId})
       OPTIONAL MATCH (f)-[r:APPEARS_IN]->(m:MediaWork)
       RETURN f, collect({media: m, sentiment: r.sentiment})[0..100] as portrayals`,
      { canonicalId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const figureNode = record.get('f');
    const portrayalsData = record.get('portrayals');

    const portrayals: Portrayal[] = portrayalsData
      .filter((p: any) => p.media !== null)
      .map((p: any) => ({
        media: {
          title: p.media.properties.title,
          release_year: p.media.properties.release_year?.toNumber?.() ?? Number(p.media.properties.release_year),
          wikidata_id: p.media.properties.wikidata_id,
        },
        sentiment: p.sentiment || 'Complex',
      }));

    return {
      canonical_id: figureNode.properties.canonical_id,
      name: figureNode.properties.name,
      is_fictional: figureNode.properties.is_fictional || false,
      historicity_status: figureNode.properties.historicity_status || (figureNode.properties.is_fictional ? 'Fictional' : 'Historical'),
      era: figureNode.properties.era,
      portrayals,
    };
  } finally {
    await session.close();
  }
}

export function calculateSentimentDistribution(portrayals: Portrayal[]): SentimentDistribution {
  const total = portrayals.length;
  if (total === 0) {
    return { Heroic: 0, Villainous: 0, Complex: 0 };
  }

  const counts = portrayals.reduce(
    (acc, p) => {
      acc[p.sentiment] = (acc[p.sentiment] || 0) + 1;
      return acc;
    },
    { Heroic: 0, Villainous: 0, Complex: 0 } as SentimentDistribution
  );

  return {
    Heroic: Math.round((counts.Heroic / total) * 100),
    Villainous: Math.round((counts.Villainous / total) * 100),
    Complex: Math.round((counts.Complex / total) * 100),
  };
}

export async function getAllFigures(): Promise<HistoricalFigure[]> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure)
       RETURN f
       LIMIT 100`
    );

    return result.records.map(record => {
      const node = record.get('f');
      return {
        canonical_id: node.properties.canonical_id,
        name: node.properties.name,
        is_fictional: node.properties.is_fictional || false,
        historicity_status: node.properties.historicity_status || (node.properties.is_fictional ? 'Fictional' : 'Historical'),
        era: node.properties.era,
      };
    });
  } finally {
    await session.close();
  }
}

export async function getMediaById(wikidataId: string) {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork {wikidata_id: $wikidataId})
       OPTIONAL MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m)
       OPTIONAL MATCH (m)-[pr:PART_OF]->(parent:MediaWork)
       OPTIONAL MATCH (child:MediaWork)-[cr:PART_OF]->(m)
       RETURN m,
              collect(DISTINCT {figure: f, sentiment: r.sentiment, role: r.role_description})[0..50] as portrayals,
              parent,
              pr,
              collect(DISTINCT {
                media_id: child.media_id,
                wikidata_id: child.wikidata_id,
                title: child.title,
                release_year: child.release_year,
                sequence_number: cr.sequence_number,
                season_number: cr.season_number,
                episode_number: cr.episode_number,
                is_main_series: cr.is_main_series,
                relationship_type: cr.relationship_type
              })[0..100] as children`,
      { wikidataId }
    );

    if (result.records.length === 0) return null;

    const record = result.records[0];
    const mediaNode = record.get('m');
    const portrayals = record.get('portrayals').filter((p: any) => p.figure !== null);
    const parentNode = record.get('parent');
    const parentRel = record.get('pr');
    const childrenData = record.get('children').filter((c: any) => c.media_id !== null || c.wikidata_id !== null);

    return {
      wikidata_id: mediaNode.properties.wikidata_id,
      media_id: mediaNode.properties.media_id,
      title: mediaNode.properties.title,
      release_year: mediaNode.properties.release_year?.toNumber?.() ?? Number(mediaNode.properties.release_year),
      media_type: mediaNode.properties.media_type,
      creator: mediaNode.properties.creator,
      publisher: mediaNode.properties.publisher,
      translator: mediaNode.properties.translator,
      channel: mediaNode.properties.channel,
      production_studio: mediaNode.properties.production_studio,
      portrayals: portrayals.map((p: any) => ({
        figure: {
          canonical_id: p.figure.properties.canonical_id,
          name: p.figure.properties.name,
          is_fictional: p.figure.properties.is_fictional,
          historicity_status: p.figure.properties.historicity_status || (p.figure.properties.is_fictional ? 'Fictional' : 'Historical'),
        },
        sentiment: p.sentiment,
        role: p.role
      })),
      parent_series: parentNode ? {
        media_id: parentNode.properties.media_id,
        wikidata_id: parentNode.properties.wikidata_id,
        title: parentNode.properties.title,
        release_year: parentNode.properties.release_year?.toNumber?.() ?? Number(parentNode.properties.release_year),
        media_type: parentNode.properties.media_type,
      } : undefined,
      series_position: parentRel ? {
        sequence_number: parentRel.properties.sequence_number,
        season_number: parentRel.properties.season_number,
        episode_number: parentRel.properties.episode_number,
        relationship_type: parentRel.properties.relationship_type,
      } : undefined,
      child_works: childrenData.map((c: any) => ({
        media_id: c.media_id || c.wikidata_id,
        title: c.title,
        release_year: c.release_year?.toNumber?.() ?? Number(c.release_year),
        sequence_number: c.sequence_number,
        season_number: c.season_number,
        episode_number: c.episode_number,
        is_main_series: c.is_main_series || false,
        relationship_type: c.relationship_type,
      })),
    };
  } finally {
    await session.close();
  }
}

export async function getMediaGraphData(wikidataId: string): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork {wikidata_id: $wikidataId})<-[r:APPEARS_IN]-(f:HistoricalFigure)
       RETURN m, r, f`,
      { wikidataId }
    );

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    if (result.records.length > 0) {
      const mediaNode = result.records[0].get('m');
      const mediaId = `media-${wikidataId}`;
      nodes.push({
        id: mediaId,
        name: mediaNode.properties.title,
        type: 'media',
        sentiment: 'Complex'
      });
      nodeIds.add(mediaId);
    }

    result.records.forEach(record => {
      const figureNode = record.get('f');
      const relationship = record.get('r');
      const figureId = `figure-${figureNode.properties.canonical_id}`;

      if (!nodeIds.has(figureId)) {
        nodes.push({
          id: figureId,
          name: figureNode.properties.name,
          type: 'figure',
        });
        nodeIds.add(figureId);
      }

      links.push({
        source: `media-${wikidataId}`,
        target: figureId,
        sentiment: relationship.properties.sentiment || 'Complex',
      });
    });

    return { nodes, links };
  } finally {
    await session.close();
  }
}

export async function getConflictingPortrayals() {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
       WHERE r.conflict_flag = true
       WITH f, collect({
         media: m,
         sentiment: r.sentiment,
         role_description: r.role_description,
         conflict_notes: r.conflict_notes,
         is_protagonist: r.is_protagonist
       })[0..100] as conflicting_portrayals
       WHERE size(conflicting_portrayals) > 0
       RETURN f, conflicting_portrayals
       ORDER BY f.name
       LIMIT 20`
    );

    return result.records.map(record => {
      const figureNode = record.get('f');
      const portrayals = record.get('conflicting_portrayals');

      return {
        figure: {
          canonical_id: figureNode.properties.canonical_id,
          name: figureNode.properties.name,
          era: figureNode.properties.era,
          title: figureNode.properties.title,
          historicity_status: figureNode.properties.historicity_status || 'Historical',
        },
        portrayals: portrayals.map((p: any) => ({
          media: {
            media_id: p.media.properties.media_id,
            title: p.media.properties.title,
            release_year: p.media.properties.release_year?.toNumber?.() ?? Number(p.media.properties.release_year),
            media_type: p.media.properties.media_type,
            creator: p.media.properties.creator,
            wikidata_id: p.media.properties.wikidata_id,
          },
          sentiment: p.sentiment,
          role_description: p.role_description,
          conflict_notes: p.conflict_notes,
          is_protagonist: p.is_protagonist || false,
        })),
      };
    });
  } finally {
    await session.close();
  }
}

export async function getLandingGraphData(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const session = await getSession();
  try {
    // Find 20 figures with conflict flags and all their media connections
    const result = await session.run(
      `MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
       WHERE r.conflict_flag = true
       WITH DISTINCT f
       LIMIT 20
       MATCH (f)-[r2:APPEARS_IN]->(m2:MediaWork)
       OPTIONAL MATCH (f)-[i:INTERACTED_WITH]-(other:HistoricalFigure)
       RETURN f,
              collect(DISTINCT {media: m2, sentiment: r2.sentiment})[0..100] as media_connections,
              collect(DISTINCT other)[0..20] as connected_figures`
    );

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    result.records.forEach(record => {
      const figureNode = record.get('f');
      const mediaConnections = record.get('media_connections');
      const connectedFigures = record.get('connected_figures').filter((f: any) => f !== null);

      const figureId = `figure-${figureNode.properties.canonical_id}`;

      // Add figure node if not already added
      if (!nodeIds.has(figureId)) {
        nodes.push({
          id: figureId,
          name: figureNode.properties.name,
          type: 'figure',
        });
        nodeIds.add(figureId);
      }

      // Add media nodes and links
      mediaConnections.forEach((conn: any) => {
        if (conn.media) {
          const mediaId = `media-${conn.media.properties.wikidata_id}`;

          if (!nodeIds.has(mediaId)) {
            nodes.push({
              id: mediaId,
              name: conn.media.properties.title,
              type: 'media',
              sentiment: conn.sentiment || 'Complex',
            });
            nodeIds.add(mediaId);
          }

          links.push({
            source: figureId,
            target: mediaId,
            sentiment: conn.sentiment || 'Complex',
          });
        }
      });

      // Add connected figures and interaction links
      connectedFigures.forEach((otherFigure: any) => {
        const otherId = `figure-${otherFigure.properties.canonical_id}`;

        if (!nodeIds.has(otherId)) {
          nodes.push({
            id: otherId,
            name: otherFigure.properties.name,
            type: 'figure',
          });
          nodeIds.add(otherId);
        }

        // Add interaction link (avoid duplicates by checking both directions)
        const linkExists = links.some(
          link =>
            (link.source === figureId && link.target === otherId) ||
            (link.source === otherId && link.target === figureId)
        );

        if (!linkExists) {
          links.push({
            source: figureId,
            target: otherId,
            sentiment: 'Complex',
          });
        }
      });
    });

    return { nodes, links };
  } finally {
    await session.close();
  }
}

export async function findShortestPath(startId: string, endId: string) {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (start:HistoricalFigure {canonical_id: $startId}),
             (end:HistoricalFigure {canonical_id: $endId})
       MATCH path = shortestPath(
         (start)-[*..10]-(end)
       )
       WHERE ALL(rel IN relationships(path)
         WHERE type(rel) IN ['INTERACTED_WITH', 'APPEARS_IN'])
       RETURN path,
              nodes(path) as path_nodes,
              relationships(path) as path_rels,
              length(path) as path_length
       LIMIT 1`,
      { startId, endId }
    );

    const record = result.records[0];
    if (!record) return null;

    const pathNodes = record.get('path_nodes');
    const pathRels = record.get('path_rels');
    const pathLength = record.get('path_length');

    const nodes = pathNodes.map((node: any) => {
      const labels = node.labels;
      const nodeType = labels[0] || 'Unknown';
      const props = node.properties;

      return {
        node_type: nodeType,
        node_id: props.canonical_id || props.media_id || props.char_id,
        name: props.name || props.title || 'Unknown',
        properties: props,
      };
    });

    const relationships = pathRels.map((rel: any, idx: number) => ({
      rel_type: rel.type,
      from_node: nodes[idx].node_id,
      to_node: nodes[idx + 1].node_id,
      context: rel.properties.context || rel.properties.sentiment,
    }));

    return {
      start_node: startId,
      end_node: endId,
      path_length: pathLength,
      nodes,
      relationships,
    };
  } finally {
    await session.close();
  }
}

export async function getGraphData(canonicalId: string): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const session = await getSession();
  try {
    // 1. Fetch Media Appearances
    const mediaResult = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $canonicalId})-[r:APPEARS_IN]->(m:MediaWork)
       RETURN f, r, m`,
      { canonicalId }
    );

    // 2. Fetch Social Interactions (Human-to-Human)
    const socialResult = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $canonicalId})-[r:INTERACTED_WITH]-(h:HistoricalFigure)
       RETURN f, r, h`,
      { canonicalId }
    );

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // Helper to add the central figure if not present
    // (We do this from the first result that has it, or explicit check)
    // Actually, let's just use the first record from either result if available.
    // Ideally we should just fetch the figure first.
    
    // Let's assume the figure exists if we are asking for it.
    // We'll grab the name from the first result of either query.
    let centralFigureName = "";
    
    if (mediaResult.records.length > 0) {
      centralFigureName = mediaResult.records[0].get('f').properties.name;
    } else if (socialResult.records.length > 0) {
      centralFigureName = socialResult.records[0].get('f').properties.name;
    } else {
        // Fallback or fetch specifically if needed, but likely no graph if no connections
        // We can do a quick check to get the name if both are empty
        const figureCheck = await session.run(`MATCH (f:HistoricalFigure {canonical_id: $canonicalId}) RETURN f`, {canonicalId});
        if (figureCheck.records.length > 0) {
            centralFigureName = figureCheck.records[0].get('f').properties.name;
        }
    }

    if (centralFigureName) {
        const figureId = `figure-${canonicalId}`;
        nodes.push({
            id: figureId,
            name: centralFigureName,
            type: 'figure',
        });
        nodeIds.add(figureId);
    }

    // Process Media Links
    mediaResult.records.forEach(record => {
      const mediaNode = record.get('m');
      const relationship = record.get('r');
      const wikidataId = mediaNode.properties.wikidata_id;
      const mediaId = `media-${wikidataId}`;

      if (!nodeIds.has(mediaId)) {
        nodes.push({
          id: mediaId,
          name: mediaNode.properties.title,
          type: 'media',
          sentiment: relationship.properties.sentiment || 'Complex',
        });
        nodeIds.add(mediaId);
      }

      links.push({
        source: `figure-${canonicalId}`,
        target: mediaId,
        sentiment: relationship.properties.sentiment || 'Complex',
        relationshipType: 'APPEARS_IN',
      });
    });

    // Process Social Links
    socialResult.records.forEach(record => {
      const otherFigure = record.get('h');
      const otherId = `figure-${otherFigure.properties.canonical_id}`;
      
      if (!nodeIds.has(otherId)) {
        nodes.push({
          id: otherId,
          name: otherFigure.properties.name,
          type: 'figure', // It's another figure
          // Optional: we could distinguish 'central' vs 'other' via ID or another property
        });
        nodeIds.add(otherId);
      }
      
      links.push({
        source: `figure-${canonicalId}`,
        target: otherId,
        sentiment: 'Complex', // Default for interactions for now
        relationshipType: 'INTERACTED_WITH',
      });
    });

    return { nodes, links };
  } finally {
    await session.close();
  }
}

export async function getNodeNeighbors(
  nodeId: string,
  nodeType: 'figure' | 'media'
): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const session = await getSession();
  try {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    if (nodeType === 'media') {
      // For media nodes, fetch all figures that appear in this media
      const result = await session.run(
        `MATCH (m:MediaWork {wikidata_id: $nodeId})<-[r:APPEARS_IN]-(f:HistoricalFigure)
         RETURN f, r
         LIMIT 50`,
        { nodeId }
      );

      result.records.forEach(record => {
        const figureNode = record.get('f');
        const relationship = record.get('r');
        const figureId = `figure-${figureNode.properties.canonical_id}`;

        if (!nodeIds.has(figureId)) {
          nodes.push({
            id: figureId,
            name: figureNode.properties.name,
            type: 'figure',
          });
          nodeIds.add(figureId);
        }

        links.push({
          source: figureId,
          target: `media-${nodeId}`,
          sentiment: relationship.properties.sentiment || 'Complex',
          relationshipType: 'APPEARS_IN',
        });
      });
    } else {
      // For figure nodes, fetch connected media works and other figures
      const mediaResult = await session.run(
        `MATCH (f:HistoricalFigure {canonical_id: $nodeId})-[r:APPEARS_IN]->(m:MediaWork)
         RETURN m, r
         LIMIT 50`,
        { nodeId }
      );

      mediaResult.records.forEach(record => {
        const mediaNode = record.get('m');
        const relationship = record.get('r');
        const wikidataId = mediaNode.properties.wikidata_id;
        const mediaId = `media-${wikidataId}`;

        if (!nodeIds.has(mediaId)) {
          nodes.push({
            id: mediaId,
            name: mediaNode.properties.title,
            type: 'media',
            sentiment: relationship.properties.sentiment || 'Complex',
          });
          nodeIds.add(mediaId);
        }

        links.push({
          source: `figure-${nodeId}`,
          target: mediaId,
          sentiment: relationship.properties.sentiment || 'Complex',
          relationshipType: 'APPEARS_IN',
        });
      });

      // Also fetch social interactions
      const socialResult = await session.run(
        `MATCH (f:HistoricalFigure {canonical_id: $nodeId})-[r:INTERACTED_WITH]-(h:HistoricalFigure)
         RETURN h, r
         LIMIT 50`,
        { nodeId }
      );

      socialResult.records.forEach(record => {
        const otherFigure = record.get('h');
        const relationship = record.get('r');
        const otherId = `figure-${otherFigure.properties.canonical_id}`;

        if (!nodeIds.has(otherId)) {
          nodes.push({
            id: otherId,
            name: otherFigure.properties.name,
            type: 'figure',
          });
          nodeIds.add(otherId);
        }

        links.push({
          source: `figure-${nodeId}`,
          target: otherId,
          sentiment: 'Complex',
          relationshipType: 'INTERACTED_WITH',
        });
      });
    }

    return { nodes, links };
  } finally {
    await session.close();
  }
}

export async function getHighDegreeNetwork(limit: number = 50): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const session = await getSession();
  try {
    // Query most connected figures (by degree centrality)
    const result = await session.run(
      `MATCH (f:HistoricalFigure)
       WITH f, COUNT { (f)--() } as degree
       WHERE degree > 0
       ORDER BY degree DESC
       LIMIT $limit
       MATCH (f)-[r:APPEARS_IN|INTERACTED_WITH]-(connected)
       RETURN f, r, connected, type(r) as relType
       LIMIT 500`,
      { limit }
    );

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    result.records.forEach(record => {
      const figureNode = record.get('f');
      const relationship = record.get('r');
      const connectedNode = record.get('connected');
      const relType = record.get('relType');

      const figureId = `figure-${figureNode.properties.canonical_id}`;

      // Add figure node if not already present
      if (!nodeIds.has(figureId)) {
        nodes.push({
          id: figureId,
          name: figureNode.properties.name,
          type: 'figure',
        });
        nodeIds.add(figureId);
      }

      // Determine connected node type and ID
      let connectedId: string;
      let connectedType: 'figure' | 'media';

      if (connectedNode.labels.includes('MediaWork')) {
        connectedId = `media-${connectedNode.properties.wikidata_id}`;
        connectedType = 'media';

        if (!nodeIds.has(connectedId)) {
          nodes.push({
            id: connectedId,
            name: connectedNode.properties.title,
            type: 'media',
            sentiment: relationship.properties.sentiment || 'Complex',
          });
          nodeIds.add(connectedId);
        }
      } else {
        connectedId = `figure-${connectedNode.properties.canonical_id}`;
        connectedType = 'figure';

        if (!nodeIds.has(connectedId)) {
          nodes.push({
            id: connectedId,
            name: connectedNode.properties.name,
            type: 'figure',
          });
          nodeIds.add(connectedId);
        }
      }

      // Add link
      links.push({
        source: figureId,
        target: connectedId,
        sentiment: relationship.properties.sentiment || 'Complex',
        relationshipType: relType,
      });
    });

    return { nodes, links };
  } finally {
    await session.close();
  }
}

export async function getMediaSeriesHierarchy(wikidataId: string) {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork {wikidata_id: $wikidataId})
       OPTIONAL MATCH (m)-[pr:PART_OF]->(parent:MediaWork)
       OPTIONAL MATCH (child:MediaWork)-[cr:PART_OF]->(m)
       RETURN m,
              parent,
              pr,
              collect({
                media_id: child.media_id,
                wikidata_id: child.wikidata_id,
                title: child.title,
                release_year: child.release_year,
                sequence_number: cr.sequence_number,
                season_number: cr.season_number,
                episode_number: cr.episode_number,
                is_main_series: cr.is_main_series,
                relationship_type: cr.relationship_type
              })[0..100] as children`,
      { wikidataId }
    );

    if (result.records.length === 0) return null;

    const record = result.records[0];
    const mediaNode = record.get('m');
    const parentNode = record.get('parent');
    const parentRel = record.get('pr');
    const childrenData = record.get('children').filter((c: any) => c.media_id !== null);

    return {
      media: {
        media_id: mediaNode.properties.media_id,
        wikidata_id: mediaNode.properties.wikidata_id,
        title: mediaNode.properties.title,
        release_year: mediaNode.properties.release_year?.toNumber?.() ?? Number(mediaNode.properties.release_year),
        media_type: mediaNode.properties.media_type,
      },
      parent: parentNode ? {
        media_id: parentNode.properties.media_id,
        wikidata_id: parentNode.properties.wikidata_id,
        title: parentNode.properties.title,
        release_year: parentNode.properties.release_year?.toNumber?.() ?? Number(parentNode.properties.release_year),
        media_type: parentNode.properties.media_type,
      } : null,
      series_position: parentRel ? {
        sequence_number: parentRel.properties.sequence_number,
        season_number: parentRel.properties.season_number,
        episode_number: parentRel.properties.episode_number,
        relationship_type: parentRel.properties.relationship_type,
      } : null,
      children: childrenData.map((c: any) => ({
        media_id: c.media_id || c.wikidata_id,
        title: c.title,
        release_year: c.release_year?.toNumber?.() ?? Number(c.release_year),
        sequence_number: c.sequence_number,
        season_number: c.season_number,
        episode_number: c.episode_number,
        is_main_series: c.is_main_series || false,
        relationship_type: c.relationship_type,
      })),
    };
  } finally {
    await session.close();
  }
}

export async function getSeriesWorks(seriesWikidataId: string): Promise<SeriesRelationship[]> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (series:MediaWork {wikidata_id: $seriesWikidataId})
       MATCH (child:MediaWork)-[r:PART_OF]->(series)
       RETURN child, r
       ORDER BY r.season_number, r.sequence_number, r.episode_number, child.release_year`,
      { seriesWikidataId }
    );

    return result.records.map(record => {
      const childNode = record.get('child');
      const rel = record.get('r');
      return {
        media_id: childNode.properties.media_id || childNode.properties.wikidata_id,
        title: childNode.properties.title,
        release_year: childNode.properties.release_year?.toNumber?.() ?? Number(childNode.properties.release_year),
        sequence_number: rel.properties.sequence_number,
        season_number: rel.properties.season_number,
        episode_number: rel.properties.episode_number,
        is_main_series: rel.properties.is_main_series || false,
        relationship_type: rel.properties.relationship_type,
      };
    });
  } finally {
    await session.close();
  }
}

export async function getMediaParentSeries(wikidataId: string) {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork {wikidata_id: $wikidataId})-[r:PART_OF]->(parent:MediaWork)
       RETURN parent, r`,
      { wikidataId }
    );

    if (result.records.length === 0) return null;

    const record = result.records[0];
    const parentNode = record.get('parent');
    const rel = record.get('r');

    return {
      parent: {
        media_id: parentNode.properties.media_id,
        wikidata_id: parentNode.properties.wikidata_id,
        title: parentNode.properties.title,
        release_year: parentNode.properties.release_year?.toNumber?.() ?? Number(parentNode.properties.release_year),
        media_type: parentNode.properties.media_type,
      },
      relationship: {
        sequence_number: rel.properties.sequence_number,
        season_number: rel.properties.season_number,
        episode_number: rel.properties.episode_number,
        relationship_type: rel.properties.relationship_type,
      },
    };
  } finally {
    await session.close();
  }
}

export async function getSeriesMetadata(seriesWikidataId: string): Promise<SeriesMetadata | null> {
  const session = await getSession();
  try {
    // Fetch series and all its works
    const seriesResult = await session.run(
      `MATCH (series:MediaWork {wikidata_id: $seriesWikidataId})
       OPTIONAL MATCH (work:MediaWork)-[r:PART_OF]->(series)
       OPTIONAL MATCH (fig:HistoricalFigure)-[app:APPEARS_IN]->(work)
       RETURN series,
              collect(DISTINCT {
                work: work,
                relationship: r
              })[0..500] as works,
              collect(DISTINCT {
                figure: fig,
                work_index: r.sequence_number
              })[0..1000] as character_appearances`,
      { seriesWikidataId }
    );

    if (seriesResult.records.length === 0) return null;

    const record = seriesResult.records[0];
    const seriesNode = record.get('series');
    const worksData = record.get('works').filter((w: any) => w.work !== null);
    const characterAppearancesData = record.get('character_appearances').filter((c: any) => c.figure !== null);

    // Build works array
    const works: SeriesRelationship[] = worksData.map((w: any) => ({
      media_id: w.work.properties.media_id || w.work.properties.wikidata_id,
      title: w.work.properties.title,
      release_year: w.work.properties.release_year?.toNumber?.() ?? Number(w.work.properties.release_year),
      sequence_number: w.relationship?.properties?.sequence_number,
      season_number: w.relationship?.properties?.season_number,
      episode_number: w.relationship?.properties?.episode_number,
      is_main_series: w.relationship?.properties?.is_main_series || false,
      relationship_type: w.relationship?.properties?.relationship_type,
    }));

    // Build character roster with appearance matrix
    const characterMap = new Map<string, CharacterAppearance>();
    const workIndexMap = new Map<string, number>();

    // Build work index map for matrix
    works.forEach((work, idx) => {
      workIndexMap.set(work.media_id, idx);
    });

    // Process character appearances
    characterAppearancesData.forEach((ca: any) => {
      const canonicalId = ca.figure.properties.canonical_id;
      const name = ca.figure.properties.name;
      const workIdx = ca.work_index !== null ? ca.work_index : 0;

      if (!characterMap.has(canonicalId)) {
        characterMap.set(canonicalId, {
          canonical_id: canonicalId,
          name: name,
          appearances: 0,
          works: [],
        });
      }

      const char = characterMap.get(canonicalId)!;
      char.appearances += 1;
      if (!char.works.includes(workIdx)) {
        char.works.push(workIdx);
      }
    });

    const roster = Array.from(characterMap.values()).sort((a, b) => b.appearances - a.appearances);

    // Build character matrix (Map of canonical_id to work indices)
    const matrix: Record<string, number[]> = {};
    characterMap.forEach((char, canonicalId) => {
      matrix[canonicalId] = char.works.sort((a, b) => a - b);
    });

    // Calculate statistics
    const years = works.map(w => w.release_year).filter(y => y);
    const yearRange: [number, number] = years.length > 0
      ? [Math.min(...years), Math.max(...years)]
      : [0, 0];

    const totalCharacters = characterMap.size;
    const avgCharactersPerWork = works.length > 0
      ? Math.round((totalCharacters / works.length) * 100) / 100
      : 0;

    // Count unique interactions (figures appearing together in works)
    let totalInteractions = 0;
    const figurePairs = new Set<string>();
    works.forEach((work, workIdx) => {
      const figuresInWork = roster.filter(r => r.works.includes(workIdx));
      for (let i = 0; i < figuresInWork.length; i++) {
        for (let j = i + 1; j < figuresInWork.length; j++) {
          const pair = [figuresInWork[i].canonical_id, figuresInWork[j].canonical_id]
            .sort()
            .join('|');
          if (!figurePairs.has(pair)) {
            figurePairs.add(pair);
            totalInteractions += 1;
          }
        }
      }
    });

    return {
      series: {
        title: seriesNode.properties.title,
        release_year: seriesNode.properties.release_year?.toNumber?.() ?? Number(seriesNode.properties.release_year),
        wikidata_id: seriesNode.properties.wikidata_id,
        media_id: seriesNode.properties.media_id,
        media_type: seriesNode.properties.media_type,
        creator: seriesNode.properties.creator,
        publisher: seriesNode.properties.publisher,
        translator: seriesNode.properties.translator,
        channel: seriesNode.properties.channel,
        production_studio: seriesNode.properties.production_studio,
      },
      works,
      characters: {
        total: totalCharacters,
        roster,
        matrix,
      },
      stats: {
        yearRange,
        avgCharactersPerWork,
        totalInteractions,
      },
    };
  } finally {
    await session.close();
  }
}
