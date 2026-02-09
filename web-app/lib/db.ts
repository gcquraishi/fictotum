import { getSession } from './neo4j';
import neo4j from 'neo4j-driver';
import { HistoricalFigure, FigureProfile, Portrayal, SentimentDistribution, GraphNode, GraphLink, SeriesRelationship, SeriesMetadata, CharacterAppearance, Location, LocationWithStats, Era, EraWithStats, LocationWorks, EraWorks, DiscoveryBrowseResult, TemporalCoverageData, TimeBucket, PeriodDetail } from './types';

// Helper function to extract temporal metadata from Neo4j nodes
function extractTemporalMetadata(node: any, nodeType: 'figure' | 'media'): GraphNode['temporal'] {
  const props = node.properties;

  if (nodeType === 'figure') {
    const birth_year = props.birth_year ? neo4j.int(props.birth_year).toNumber() : undefined;
    const death_year = props.death_year ? neo4j.int(props.death_year).toNumber() : undefined;

    if (birth_year || death_year || props.era) {
      return {
        birth_year,
        death_year,
        era: props.era,
        precision: (birth_year && death_year) ? 'exact' : 'decade'
      };
    }
  } else if (nodeType === 'media') {
    const release_year = props.release_year ? neo4j.int(props.release_year).toNumber() : undefined;
    const setting_year = props.setting_year ? neo4j.int(props.setting_year).toNumber() : undefined;
    const setting_year_end = props.setting_year_end ? neo4j.int(props.setting_year_end).toNumber() : undefined;

    if (release_year || setting_year) {
      return {
        release_year,
        setting_year,
        setting_year_end,
        precision: release_year ? 'exact' : 'unknown'
      };
    }
  }

  return undefined;
}

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
       RETURN f, collect({
         media: m,
         sentiment: r.sentiment,
         sentiment_tags: r.sentiment_tags,
         tag_metadata: r.tag_metadata
       })[0..100] as portrayals`,
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
      .map((p: any) => {
        // Hybrid format support: use sentiment_tags if available, otherwise fall back to legacy sentiment
        const sentimentTags = p.sentiment_tags || (p.sentiment ? [p.sentiment.toLowerCase()] : ['complex']);
        const legacySentiment = sentimentTags[0] || 'complex';

        return {
          media: {
            title: p.media.properties.title,
            release_year: p.media.properties.release_year?.toNumber?.() ?? Number(p.media.properties.release_year),
            wikidata_id: p.media.properties.wikidata_id,
            media_type: p.media.properties.media_type,
          },
          sentiment: legacySentiment, // Legacy field for backward compatibility
          sentiment_tags: sentimentTags,
          tag_metadata: p.tag_metadata || undefined,
        };
      });

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
      setting_year: mediaNode.properties.setting_year?.toNumber?.() ?? (mediaNode.properties.setting_year ? Number(mediaNode.properties.setting_year) : undefined),
      setting_year_end: mediaNode.properties.setting_year_end?.toNumber?.() ?? (mediaNode.properties.setting_year_end ? Number(mediaNode.properties.setting_year_end) : undefined),
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
          canonical_id: figureNode.properties.canonical_id,
          is_fictional: figureNode.properties.is_fictional || false,
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
              wikidata_id: conn.media.properties.wikidata_id,
              media_type: conn.media.properties.media_type,
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
            canonical_id: otherFigure.properties.canonical_id,
            is_fictional: otherFigure.properties.is_fictional || false,
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
            temporal: extractTemporalMetadata(figureNode, 'figure'),
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

      // Collect media node IDs for batch series lookup
      const mediaNodeIds: string[] = [];

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
            temporal: extractTemporalMetadata(mediaNode, 'media'),
          });
          nodeIds.add(mediaId);
          mediaNodeIds.push(wikidataId);
        }

        links.push({
          source: `figure-${nodeId}`,
          target: mediaId,
          sentiment: relationship.properties.sentiment || 'Complex',
          relationshipType: 'APPEARS_IN',
        });
      });

      // Batch lookup series relationships for all media nodes
      if (mediaNodeIds.length > 0) {
        const seriesResult = await session.run(
          `UNWIND $mediaIds AS mediaId
           MATCH (m:MediaWork {wikidata_id: mediaId})-[:PART_OF]->(series:MediaWork)
           RETURN mediaId, series.wikidata_id AS seriesId, series.title AS seriesTitle,
                  COUNT { (series)<-[:PART_OF]-() } AS workCount`,
          { mediaIds: mediaNodeIds }
        );

        // Apply series metadata to nodes
        seriesResult.records.forEach(record => {
          const mediaId = `media-${record.get('mediaId')}`;
          const seriesId = record.get('seriesId');
          const seriesTitle = record.get('seriesTitle');
          const workCount = record.get('workCount')?.toNumber?.() || record.get('workCount');

          const node = nodes.find(n => n.id === mediaId);
          if (node) {
            node.seriesMetadata = {
              seriesId,
              seriesTitle,
              isPartOfSeries: true,
              workCount,
            };
          }
        });
      }

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
            temporal: extractTemporalMetadata(otherFigure, 'figure'),
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
      { limit: neo4j.int(limit) }
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

// Location & Era Discovery Functions

export async function getLocationsWithStats(): Promise<LocationWithStats[]> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (l:Location)
       OPTIONAL MATCH (m:MediaWork)-[:SET_IN]->(l)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN]->(l)
       WITH l, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count
       ORDER BY work_count DESC
       RETURN l, work_count, figure_count
       LIMIT 100`
    );

    return result.records.map(record => {
      const node = record.get('l');
      const workCount = record.get('work_count');
      const figureCount = record.get('figure_count');
      return {
        location_id: node.properties.location_id,
        name: node.properties.name,
        location_type: node.properties.location_type,
        wikidata_id: node.properties.wikidata_id,
        parent_location: node.properties.parent_location,
        coordinates: node.properties.coordinates,
        description: node.properties.description,
        work_count: workCount?.toNumber?.() ?? Number(workCount),
        figure_count: figureCount?.toNumber?.() ?? Number(figureCount),
      };
    });
  } finally {
    await session.close();
  }
}

export async function getWorksInLocation(
  locationId: string,
  limit: number = 50,
  skip: number = 0
): Promise<LocationWorks | null> {
  const session = await getSession();
  try {
    // First query: Get location and work count
    const countResult = await session.run(
      `MATCH (l:Location {location_id: $locationId})
       OPTIONAL MATCH (m:MediaWork)-[r:SET_IN]->(l)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN]->(l)
       RETURN l, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count,
              [m.release_year | m in COLLECT(m) WHERE m IS NOT NULL] as years`,
      { locationId }
    );

    if (countResult.records.length === 0) {
      // Location not found - return null instead of throwing
      return null;
    }

    const countRecord = countResult.records[0];
    const locationNode = countRecord.get('l');

    // Second query: Get paginated works
    const worksResult = await session.run(
      `MATCH (l:Location {location_id: $locationId})
       OPTIONAL MATCH (m:MediaWork)-[r:SET_IN]->(l)
       WITH m ORDER BY m.release_year DESC, m.title ASC
       SKIP $skip LIMIT $limit
       RETURN collect(m) as paginated_works`,
      { locationId, skip: neo4j.int(skip), limit: neo4j.int(limit) }
    );

    // Third query: Get all figures
    const figuresResult = await session.run(
      `MATCH (l:Location {location_id: $locationId})
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN]->(l)
       RETURN collect(DISTINCT f) as figures`,
      { locationId }
    );

    const worksData = worksResult.records[0]?.get('paginated_works')?.filter((w: any) => w !== null) || [];
    const figuresData = figuresResult.records[0]?.get('figures')?.filter((f: any) => f !== null) || [];
    const years = countRecord.get('years')?.filter((y: any) => y !== null) || [];

    const timeSpan: [number, number] = years.length > 0
      ? [Math.min(...years.map((y: any) => y.toNumber?.() ?? Number(y))), Math.max(...years.map((y: any) => y.toNumber?.() ?? Number(y)))]
      : [0, 0];

    const workCount = countRecord.get('work_count')?.toNumber?.() ?? Number(countRecord.get('work_count'));
    const figureCount = countRecord.get('figure_count')?.toNumber?.() ?? Number(countRecord.get('figure_count'));

    return {
      location: {
        location_id: locationNode.properties.location_id,
        name: locationNode.properties.name,
        location_type: locationNode.properties.location_type,
        wikidata_id: locationNode.properties.wikidata_id,
        parent_location: locationNode.properties.parent_location,
        coordinates: locationNode.properties.coordinates,
        description: locationNode.properties.description,
      },
      works: worksData.map((w: any) => ({
        title: w.properties.title,
        release_year: w.properties.release_year?.toNumber?.() ?? Number(w.properties.release_year),
        wikidata_id: w.properties.wikidata_id,
        media_id: w.properties.media_id,
        media_type: w.properties.media_type,
        creator: w.properties.creator,
      })),
      figures: figuresData.map((f: any) => ({
        canonical_id: f.properties.canonical_id,
        name: f.properties.name,
        is_fictional: f.properties.is_fictional || false,
        historicity_status: f.properties.historicity_status,
        era: f.properties.era,
      })),
      stats: {
        work_count: workCount,
        figure_count: figureCount,
        time_span: timeSpan,
      },
    };
  } finally {
    await session.close();
  }
}

export async function getErasWithStats(): Promise<EraWithStats[]> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (e:Era)
       OPTIONAL MATCH (m:MediaWork)-[:SET_IN_ERA]->(e)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN_ERA]->(e)
       WITH e, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count
       ORDER BY work_count DESC, e.start_year DESC
       RETURN e, work_count, figure_count
       LIMIT 100`
    );

    return result.records.map(record => {
      const node = record.get('e');
      const workCount = record.get('work_count');
      const figureCount = record.get('figure_count');
      return {
        era_id: node.properties.era_id,
        name: node.properties.name,
        start_year: node.properties.start_year?.toNumber?.() ?? Number(node.properties.start_year),
        end_year: node.properties.end_year?.toNumber?.() ?? Number(node.properties.end_year),
        era_type: node.properties.era_type,
        wikidata_id: node.properties.wikidata_id,
        parent_era: node.properties.parent_era,
        description: node.properties.description,
        work_count: workCount?.toNumber?.() ?? Number(workCount),
        figure_count: figureCount?.toNumber?.() ?? Number(figureCount),
      };
    });
  } finally {
    await session.close();
  }
}

export async function getWorksInEra(
  eraId: string,
  limit: number = 50
): Promise<EraWorks | null> {
  const session = await getSession();
  try {
    // First query: Get era and counts for all works
    const countResult = await session.run(
      `MATCH (e:Era {era_id: $eraId})
       OPTIONAL MATCH (m:MediaWork)-[r:SET_IN_ERA]->(e)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN_ERA]->(e)
       RETURN e, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count,
              collect(DISTINCT m.release_year) as all_years`,
      { eraId }
    );

    if (countResult.records.length === 0) {
      // Era not found - return null instead of throwing
      return null;
    }

    const countRecord = countResult.records[0];
    const eraNode = countRecord.get('e');

    // Second query: Get paginated works
    const worksResult = await session.run(
      `MATCH (e:Era {era_id: $eraId})
       OPTIONAL MATCH (m:MediaWork)-[r:SET_IN_ERA]->(e)
       WITH m ORDER BY m.release_year DESC, m.title ASC
       LIMIT $limit
       RETURN collect(m) as paginated_works`,
      { eraId, limit: neo4j.int(limit) }
    );

    // Third query: Get all figures
    const figuresResult = await session.run(
      `MATCH (e:Era {era_id: $eraId})
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN_ERA]->(e)
       RETURN collect(DISTINCT f) as figures`,
      { eraId }
    );

    // Fourth query: Get timeline aggregation
    const timelineResult = await session.run(
      `MATCH (e:Era {era_id: $eraId})
       OPTIONAL MATCH (m:MediaWork)-[r:SET_IN_ERA]->(e)
       WITH DISTINCT m.release_year as year, count(m) as count
       WHERE year IS NOT NULL
       RETURN year, count ORDER BY year ASC`,
      { eraId }
    );

    const worksData = worksResult.records[0]?.get('paginated_works')?.filter((w: any) => w !== null) || [];
    const figuresData = figuresResult.records[0]?.get('figures')?.filter((f: any) => f !== null) || [];
    const allYears = countRecord.get('all_years')?.filter((y: any) => y !== null) || [];

    const timeline = timelineResult.records.map((record: any) => ({
      year: record.get('year')?.toNumber?.() ?? Number(record.get('year')),
      work_count: record.get('count')?.toNumber?.() ?? Number(record.get('count')),
    }));

    const yearRange: [number, number] = allYears.length > 0
      ? [
          Math.min(...allYears.map((y: any) => y.toNumber?.() ?? Number(y))),
          Math.max(...allYears.map((y: any) => y.toNumber?.() ?? Number(y)))
        ]
      : [
          eraNode.properties.start_year?.toNumber?.() ?? Number(eraNode.properties.start_year),
          eraNode.properties.end_year?.toNumber?.() ?? Number(eraNode.properties.end_year)
        ];

    const workCount = countRecord.get('work_count')?.toNumber?.() ?? Number(countRecord.get('work_count'));
    const figureCount = countRecord.get('figure_count')?.toNumber?.() ?? Number(countRecord.get('figure_count'));

    return {
      era: {
        era_id: eraNode.properties.era_id,
        name: eraNode.properties.name,
        start_year: eraNode.properties.start_year?.toNumber?.() ?? Number(eraNode.properties.start_year),
        end_year: eraNode.properties.end_year?.toNumber?.() ?? Number(eraNode.properties.end_year),
        era_type: eraNode.properties.era_type,
        wikidata_id: eraNode.properties.wikidata_id,
        parent_era: eraNode.properties.parent_era,
        description: eraNode.properties.description,
      },
      works: worksData.map((w: any) => ({
        title: w.properties.title,
        release_year: w.properties.release_year?.toNumber?.() ?? Number(w.properties.release_year),
        wikidata_id: w.properties.wikidata_id,
        media_id: w.properties.media_id,
        media_type: w.properties.media_type,
        creator: w.properties.creator,
      })),
      figures: figuresData.map((f: any) => ({
        canonical_id: f.properties.canonical_id,
        name: f.properties.name,
        is_fictional: f.properties.is_fictional || false,
        historicity_status: f.properties.historicity_status,
        era: f.properties.era,
      })),
      timeline,
      stats: {
        work_count: workCount,
        figure_count: figureCount,
        year_range: yearRange,
      },
    };
  } finally {
    await session.close();
  }
}

export async function searchLocationsAndEras(query: string): Promise<{
  locations: LocationWithStats[];
  eras: EraWithStats[];
}> {
  const session = await getSession();
  try {
    const locationResult = await session.run(
      `MATCH (l:Location)
       WHERE toLower(l.name) CONTAINS toLower($query)
          OR (l.description IS NOT NULL AND toLower(l.description) CONTAINS toLower($query))
       OPTIONAL MATCH (m:MediaWork)-[:SET_IN]->(l)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN]->(l)
       WITH l, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count,
            CASE WHEN toLower(l.name) CONTAINS toLower($query) THEN 10
                 WHEN l.description IS NOT NULL AND toLower(l.description) CONTAINS toLower($query) THEN 5
                 ELSE 0 END as relevance_score
       RETURN l, work_count, figure_count, relevance_score
       ORDER BY relevance_score DESC, work_count DESC
       LIMIT 20`,
      { query }
    );

    const eraResult = await session.run(
      `MATCH (e:Era)
       WHERE toLower(e.name) CONTAINS toLower($query)
          OR (e.description IS NOT NULL AND toLower(e.description) CONTAINS toLower($query))
       OPTIONAL MATCH (m:MediaWork)-[:SET_IN_ERA]->(e)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN_ERA]->(e)
       WITH e, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count,
            CASE WHEN toLower(e.name) CONTAINS toLower($query) THEN 10
                 WHEN e.description IS NOT NULL AND toLower(e.description) CONTAINS toLower($query) THEN 5
                 ELSE 0 END as relevance_score
       RETURN e, work_count, figure_count, relevance_score
       ORDER BY relevance_score DESC, work_count DESC
       LIMIT 20`,
      { query }
    );

    const locations = locationResult.records.map(record => {
      const node = record.get('l');
      return {
        location_id: node.properties.location_id,
        name: node.properties.name,
        location_type: node.properties.location_type,
        wikidata_id: node.properties.wikidata_id,
        parent_location: node.properties.parent_location,
        coordinates: node.properties.coordinates,
        description: node.properties.description,
        work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
        figure_count: record.get('figure_count')?.toNumber?.() ?? Number(record.get('figure_count')),
      };
    });

    const eras = eraResult.records.map(record => {
      const node = record.get('e');
      return {
        era_id: node.properties.era_id,
        name: node.properties.name,
        start_year: node.properties.start_year?.toNumber?.() ?? Number(node.properties.start_year),
        end_year: node.properties.end_year?.toNumber?.() ?? Number(node.properties.end_year),
        era_type: node.properties.era_type,
        wikidata_id: node.properties.wikidata_id,
        parent_era: node.properties.parent_era,
        description: node.properties.description,
        work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
        figure_count: record.get('figure_count')?.toNumber?.() ?? Number(record.get('figure_count')),
      };
    });

    return { locations, eras };
  } finally {
    await session.close();
  }
}

export async function getDiscoveryStats(): Promise<DiscoveryBrowseResult> {
  const session = await getSession();
  try {
    const locationResult = await session.run(
      `MATCH (l:Location)
       OPTIONAL MATCH (m:MediaWork)-[:SET_IN]->(l)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN]->(l)
       WITH l, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count
       ORDER BY work_count DESC
       LIMIT 12
       RETURN l, work_count, figure_count`
    );

    const eraResult = await session.run(
      `MATCH (e:Era)
       OPTIONAL MATCH (m:MediaWork)-[:SET_IN_ERA]->(e)
       OPTIONAL MATCH (f:HistoricalFigure)-[:LIVED_IN_ERA]->(e)
       WITH e, count(DISTINCT m) as work_count, count(DISTINCT f) as figure_count
       ORDER BY work_count DESC
       LIMIT 12
       RETURN e, work_count, figure_count`
    );

    const locations = locationResult.records.map(record => {
      const node = record.get('l');
      return {
        location_id: node.properties.location_id,
        name: node.properties.name,
        location_type: node.properties.location_type,
        wikidata_id: node.properties.wikidata_id,
        parent_location: node.properties.parent_location,
        coordinates: node.properties.coordinates,
        description: node.properties.description,
        work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
        figure_count: record.get('figure_count')?.toNumber?.() ?? Number(record.get('figure_count')),
      };
    });

    const eras = eraResult.records.map(record => {
      const node = record.get('e');
      return {
        era_id: node.properties.era_id,
        name: node.properties.name,
        start_year: node.properties.start_year?.toNumber?.() ?? Number(node.properties.start_year),
        end_year: node.properties.end_year?.toNumber?.() ?? Number(node.properties.end_year),
        era_type: node.properties.era_type,
        wikidata_id: node.properties.wikidata_id,
        parent_era: node.properties.parent_era,
        description: node.properties.description,
        work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
        figure_count: record.get('figure_count')?.toNumber?.() ?? Number(record.get('figure_count')),
      };
    });

    // Get total counts
    const totalLocResult = await session.run(
      `MATCH (l:Location) RETURN count(l) as total`
    );
    const totalLocations = totalLocResult.records[0]?.get('total')?.toNumber?.() ?? 0;

    const totalEraResult = await session.run(
      `MATCH (e:Era) RETURN count(e) as total`
    );
    const totalEras = totalEraResult.records[0]?.get('total')?.toNumber?.() ?? 0;

    const mostWorksLocation = locations.length > 0 ? locations[0].name : '';
    const mostWorksEra = eras.length > 0 ? eras[0].name : '';

    return {
      locations,
      eras,
      stats: {
        total_locations: totalLocations,
        total_eras: totalEras,
        most_works_location: mostWorksLocation,
        most_works_era: mostWorksEra,
      },
    };
  } finally {
    await session.close();
  }
}

export async function getMediaLocationsAndEras(wikidataId: string): Promise<{
  locations: Location[];
  eras: Era[];
}> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork {wikidata_id: $wikidataId})
       OPTIONAL MATCH (m)-[:SET_IN]->(l:Location)
       OPTIONAL MATCH (m)-[:SET_IN_ERA]->(e:Era)
       RETURN collect(DISTINCT l) as locations, collect(DISTINCT e) as eras`,
      { wikidataId }
    );

    if (result.records.length === 0) {
      return { locations: [], eras: [] };
    }

    const record = result.records[0];
    const locationsData = record.get('locations').filter((l: any) => l !== null);
    const erasData = record.get('eras').filter((e: any) => e !== null);

    return {
      locations: locationsData.map((l: any) => ({
        location_id: l.properties.location_id,
        name: l.properties.name,
        location_type: l.properties.location_type,
        wikidata_id: l.properties.wikidata_id,
        parent_location: l.properties.parent_location,
        coordinates: l.properties.coordinates,
        description: l.properties.description,
      })),
      eras: erasData.map((e: any) => ({
        era_id: e.properties.era_id,
        name: e.properties.name,
        start_year: e.properties.start_year?.toNumber?.() ?? Number(e.properties.start_year),
        end_year: e.properties.end_year?.toNumber?.() ?? Number(e.properties.end_year),
        era_type: e.properties.era_type,
        wikidata_id: e.properties.wikidata_id,
        parent_era: e.properties.parent_era,
        description: e.properties.description,
      })),
    };
  } finally {
    await session.close();
  }
}

/**
 * CHR-17: Deduplication Helper - Check if MediaWork exists by Wikidata Q-ID
 *
 * @param qid - Wikidata Q-ID (e.g., "Q2003749")
 * @returns Object with exists flag and optional matched record metadata
 */
export async function checkExistingMediaWorkByQid(qid: string): Promise<{
  exists: boolean;
  match?: {
    media_id: string;
    wikidata_id: string;
    title: string;
    release_year: number;
  };
}> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork {wikidata_id: $qid})
       RETURN m
       LIMIT 1`,
      { qid }
    );

    if (result.records.length === 0) {
      return { exists: false };
    }

    const mediaNode = result.records[0].get('m');
    return {
      exists: true,
      match: {
        media_id: mediaNode.properties.media_id,
        wikidata_id: mediaNode.properties.wikidata_id,
        title: mediaNode.properties.title,
        release_year: mediaNode.properties.release_year?.toNumber?.() ?? Number(mediaNode.properties.release_year),
      },
    };
  } finally {
    await session.close();
  }
}

/**
 * CHR-17: Deduplication Helper - Check if HistoricalFigure exists by Wikidata Q-ID
 *
 * @param qid - Wikidata Q-ID (e.g., "Q517")
 * @returns Object with exists flag and optional matched record metadata
 */
export async function checkExistingFigureByQid(qid: string): Promise<{
  exists: boolean;
  match?: {
    canonical_id: string;
    wikidata_id?: string;
    name: string;
    birth_year?: number;
    death_year?: number;
  };
}> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure {wikidata_id: $qid})
       RETURN f
       LIMIT 1`,
      { qid }
    );

    if (result.records.length === 0) {
      return { exists: false };
    }

    const figureNode = result.records[0].get('f');
    return {
      exists: true,
      match: {
        canonical_id: figureNode.properties.canonical_id,
        wikidata_id: figureNode.properties.wikidata_id,
        name: figureNode.properties.name,
        birth_year: (figureNode.properties.birth_year?.toNumber?.() ?? Number(figureNode.properties.birth_year)) || undefined,
        death_year: (figureNode.properties.death_year?.toNumber?.() ?? Number(figureNode.properties.death_year)) || undefined,
      },
    };
  } finally {
    await session.close();
  }
}

/**
 * Temporal Coverage Visualization - Get aggregated coverage data by time periods
 *
 * @param granularity - Time bucket size: 'century' | 'decade' | 'year'
 * @param mediaType - Optional filter by media type (Book, Film, Game, TV)
 * @param region - Optional filter by geographic region
 * @returns Temporal coverage data with time buckets and statistics
 */
export async function getTemporalCoverage(
  granularity: 'century' | 'decade' | 'year' = 'century',
  mediaType?: string,
  region?: string
): Promise<TemporalCoverageData> {
  const session = await getSession();
  try {
    // Determine bucket size in years
    const bucketSize = granularity === 'century' ? 100 : granularity === 'decade' ? 10 : 1;

    // Build filters
    const mediaFilter = mediaType ? `AND m.media_type = $mediaType` : '';
    const regionFilter = region ? `AND EXISTS((m)-[:SET_IN]->(:Location {name: $region}))` : '';

    // Query for MediaWork temporal distribution
    const workResult = await session.run(
      `MATCH (m:MediaWork)
       WHERE m.release_year IS NOT NULL
         AND NOT m.media_type IN ['BookSeries', 'GameSeries', 'FilmSeries', 'TVSeriesCollection']
         ${mediaFilter}
         ${regionFilter}
       WITH m, toInteger(floor(toFloat(m.release_year) / ${bucketSize}) * ${bucketSize}) as bucketStart
       WITH bucketStart,
            count(m) as workCount,
            collect(DISTINCT m.media_type) as mediaTypes,
            collect(m) as works
       ORDER BY bucketStart
       RETURN bucketStart,
              bucketStart + ${bucketSize} - 1 as bucketEnd,
              workCount,
              mediaTypes,
              [w in works | {type: w.media_type, hasSeries: EXISTS((w)-[:PART_OF]->())}] as workDetails`,
      { mediaType, region }
    );

    // Query for HistoricalFigure temporal distribution
    const figureResult = await session.run(
      `MATCH (f:HistoricalFigure)
       WHERE f.birth_year IS NOT NULL
       WITH f, toInteger(floor(toFloat(f.birth_year) / ${bucketSize}) * ${bucketSize}) as bucketStart
       WITH bucketStart, count(f) as figureCount
       ORDER BY bucketStart
       RETURN bucketStart, figureCount`
    );

    // Create a map of figure counts by bucket
    const figureCountMap = new Map<number, number>();
    figureResult.records.forEach(record => {
      const bucketStart = record.get('bucketStart')?.toNumber?.() ?? Number(record.get('bucketStart'));
      const figureCount = record.get('figureCount')?.toNumber?.() ?? Number(record.get('figureCount'));
      figureCountMap.set(bucketStart, figureCount);
    });

    // Build time buckets from work results
    const timeBuckets: TimeBucket[] = workResult.records.map(record => {
      const bucketStart = record.get('bucketStart')?.toNumber?.() ?? Number(record.get('bucketStart'));
      const bucketEnd = record.get('bucketEnd')?.toNumber?.() ?? Number(record.get('bucketEnd'));
      const workCount = record.get('workCount')?.toNumber?.() ?? Number(record.get('workCount'));
      const mediaTypes = record.get('mediaTypes');
      const workDetails = record.get('workDetails');

      // Count media types
      const mediaTypeBreakdown: Record<string, number> = {};
      workDetails.forEach((w: any) => {
        const type = w.type || 'Unknown';
        mediaTypeBreakdown[type] = (mediaTypeBreakdown[type] || 0) + 1;
      });

      // Count series vs standalone
      const seriesCount = workDetails.filter((w: any) => w.hasSeries).length;
      const standaloneCount = workCount - seriesCount;

      // Determine coverage status
      let coverageStatus: 'sparse' | 'moderate' | 'rich';
      if (workCount < 5) coverageStatus = 'sparse';
      else if (workCount < 20) coverageStatus = 'moderate';
      else coverageStatus = 'rich';

      return {
        period: `${bucketStart}-${bucketEnd}`,
        startYear: bucketStart,
        endYear: bucketEnd,
        workCount,
        figureCount: figureCountMap.get(bucketStart) || 0,
        mediaTypes: mediaTypeBreakdown,
        topLocations: [], // TODO: Add in future enhancement
        seriesCount,
        standaloneCount,
        coverageStatus,
      };
    });

    // Calculate statistics
    const totalWorks = timeBuckets.reduce((sum, bucket) => sum + bucket.workCount, 0);
    const totalFigures = timeBuckets.reduce((sum, bucket) => sum + bucket.figureCount, 0);
    const earliestYear = timeBuckets.length > 0 ? timeBuckets[0].startYear : 0;
    const latestYear = timeBuckets.length > 0 ? timeBuckets[timeBuckets.length - 1].endYear : new Date().getFullYear();
    const coverageGaps = timeBuckets
      .filter(bucket => bucket.workCount < 5)
      .map(bucket => bucket.period);

    return {
      timeBuckets,
      statistics: {
        totalWorks,
        totalFigures,
        earliestYear,
        latestYear,
        coverageGaps,
      },
    };
  } finally {
    await session.close();
  }
}

/**
 * Temporal Coverage Visualization - Get detailed data for a specific time period
 *
 * @param startYear - Start year of period
 * @param endYear - End year of period
 * @param limit - Maximum number of works/figures to return (default 50)
 * @returns Detailed period data with works and figures
 */
export async function getTemporalCoverageDetails(
  startYear: number,
  endYear: number,
  limit: number = 50
): Promise<PeriodDetail | null> {
  const session = await getSession();
  try {
    // Query for works in period
    const workResult = await session.run(
      `MATCH (m:MediaWork)
       WHERE m.release_year >= $startYear
         AND m.release_year <= $endYear
         AND NOT m.media_type IN ['BookSeries', 'GameSeries', 'FilmSeries', 'TVSeriesCollection']
       RETURN m
       ORDER BY m.release_year DESC
       LIMIT $limit`,
      { startYear, endYear, limit }
    );

    // Query for figures in period
    const figureResult = await session.run(
      `MATCH (f:HistoricalFigure)
       WHERE (f.birth_year >= $startYear AND f.birth_year <= $endYear)
          OR (f.death_year >= $startYear AND f.death_year <= $endYear)
       RETURN f
       ORDER BY f.birth_year
       LIMIT $limit`,
      { startYear, endYear, limit }
    );

    // Query for statistics
    const statsResult = await session.run(
      `MATCH (m:MediaWork)
       WHERE m.release_year >= $startYear
         AND m.release_year <= $endYear
         AND NOT m.media_type IN ['BookSeries', 'GameSeries', 'FilmSeries', 'TVSeriesCollection']
       WITH count(m) as workCount,
            collect(m.media_type) as allTypes,
            collect(m.creator) as allCreators
       UNWIND allTypes as mediaType
       WITH workCount, mediaType, allCreators, count(*) as typeCount
       WITH workCount, collect({type: mediaType, count: typeCount}) as typeBreakdown, allCreators
       UNWIND allCreators as creator
       WITH workCount, typeBreakdown, creator, count(*) as creatorCount
       WHERE creator IS NOT NULL
       RETURN workCount,
              typeBreakdown,
              collect({name: creator, count: creatorCount}) as creators
       ORDER BY creatorCount DESC
       LIMIT 1`,
      { startYear, endYear }
    );

    // Parse works
    const works = workResult.records.map(record => {
      const node = record.get('m');
      return {
        title: node.properties.title,
        release_year: node.properties.release_year?.toNumber?.() ?? Number(node.properties.release_year),
        wikidata_id: node.properties.wikidata_id,
        media_id: node.properties.media_id || node.properties.wikidata_id,
        media_type: node.properties.media_type || 'Unknown',
        creator: node.properties.creator,
        publisher: node.properties.publisher,
        channel: node.properties.channel,
        production_studio: node.properties.production_studio,
        setting_year: node.properties.setting_year?.toNumber?.() ?? undefined,
        setting_year_end: node.properties.setting_year_end?.toNumber?.() ?? undefined,
      };
    });

    // Parse figures
    const figures = figureResult.records.map(record => {
      const node = record.get('f');
      return {
        canonical_id: node.properties.canonical_id,
        name: node.properties.name,
        is_fictional: node.properties.is_fictional || false,
        historicity_status: node.properties.historicity_status || (node.properties.is_fictional ? 'Fictional' : 'Historical'),
        era: node.properties.era,
        wikidata_id: node.properties.wikidata_id,
      };
    });

    // Parse statistics
    let mediaTypeBreakdown: Record<string, number> = {};
    let topCreators: Array<{ name: string; workCount: number }> = [];
    let workCount = 0;

    if (statsResult.records.length > 0) {
      const statsRecord = statsResult.records[0];
      workCount = statsRecord.get('workCount')?.toNumber?.() ?? Number(statsRecord.get('workCount'));

      const typeBreakdown = statsRecord.get('typeBreakdown');
      if (typeBreakdown) {
        typeBreakdown.forEach((tb: any) => {
          if (tb.type) {
            mediaTypeBreakdown[tb.type] = tb.count?.toNumber?.() ?? Number(tb.count);
          }
        });
      }

      const creators = statsRecord.get('creators');
      if (creators) {
        topCreators = creators.slice(0, 5).map((c: any) => ({
          name: c.name,
          workCount: c.count?.toNumber?.() ?? Number(c.count),
        }));
      }
    }

    return {
      period: `${startYear}-${endYear}`,
      startYear,
      endYear,
      works,
      figures,
      statistics: {
        workCount: works.length,
        figureCount: figures.length,
        mediaTypeBreakdown,
        topCreators,
      },
    };
  } finally {
    await session.close();
  }
}
