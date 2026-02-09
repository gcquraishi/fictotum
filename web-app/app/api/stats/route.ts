import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET() {
  const session = await getSession();
  try {
    // Run queries sequentially — a Neo4j session only supports one open transaction at a time
    const statsResult = await session.run(`
      MATCH (f:HistoricalFigure) WITH count(f) as figureCount
      MATCH (m:MediaWork) WITH figureCount, count(m) as mediaCount
      MATCH ()-[r:APPEARS_IN]->() WITH figureCount, mediaCount, count(r) as portrayalCount
      RETURN figureCount, mediaCount, portrayalCount
    `);
    const topResult = await session.run(`
      MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
      WITH f, count(r) as portrayalCount
      ORDER BY portrayalCount DESC
      LIMIT 5
      RETURN f.name as name, f.canonical_id as canonical_id, portrayalCount
    `);
    const latestResult = await session.run(`
      MATCH (f:HistoricalFigure)-[c:CREATED_BY]->(a:Agent)
      WITH f, c.timestamp as created_at
      ORDER BY created_at DESC
      LIMIT 5
      RETURN f.name as name, f.canonical_id as canonical_id, created_at
    `);

    const statsRecord = statsResult.records[0];
    const figureCount = statsRecord.get('figureCount');
    const mediaCount = statsRecord.get('mediaCount');
    const portrayals = statsRecord.get('portrayalCount');

    const topPortrayed = topResult.records.map(r => ({
      name: r.get('name'),
      canonical_id: r.get('canonical_id'),
      count: typeof r.get('portrayalCount') === 'number' ? r.get('portrayalCount') : Number(r.get('portrayalCount')),
    }));

    const latestAdditions = latestResult.records.map(r => {
      const createdAt = r.get('created_at');
      let dateStr = '';
      if (createdAt) {
        const d = new Date(createdAt.toString());
        dateStr = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
      }
      return {
        name: r.get('name'),
        canonical_id: r.get('canonical_id'),
        date: dateStr,
      };
    });

    return NextResponse.json({
      figures: typeof figureCount === 'number' ? figureCount : Number(figureCount),
      works: typeof mediaCount === 'number' ? mediaCount : Number(mediaCount),
      portrayals: typeof portrayals === 'number' ? portrayals : Number(portrayals),
      topPortrayed,
      latestAdditions,
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    return NextResponse.json(
      { figures: 0, works: 0, portrayals: 0, topPortrayed: [], latestAdditions: [] },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
