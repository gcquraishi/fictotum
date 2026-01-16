import { getSession } from './neo4j';
import { HistoricalFigure, FigureProfile, Portrayal, SentimentDistribution, GraphNode, GraphLink } from './types';

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
       RETURN f, collect({media: m, sentiment: r.sentiment}) as portrayals`,
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
        era: node.properties.era,
      };
    });
  } finally {
    await session.close();
  }
}

export async function getGraphData(canonicalId: string): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $canonicalId})-[r:APPEARS_IN]->(m:MediaWork)
       RETURN f, r, m`,
      { canonicalId }
    );

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // Add the central figure node
    if (result.records.length > 0) {
      const figureNode = result.records[0].get('f');
      const figureId = `figure-${canonicalId}`;
      nodes.push({
        id: figureId,
        name: figureNode.properties.name,
        type: 'figure',
      });
      nodeIds.add(figureId);
    }

    // Add media work nodes and links
    result.records.forEach(record => {
      const mediaNode = record.get('m');
      const relationship = record.get('r');
      const mediaId = `media-${mediaNode.properties.title}`;

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
      });
    });

    return { nodes, links };
  } finally {
    await session.close();
  }
}
