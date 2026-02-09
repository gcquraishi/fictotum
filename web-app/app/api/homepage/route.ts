import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET() {
  const session = await getSession();
  try {
    // Top portrayed figures with full card data
    const figuresResult = await session.run(`
      MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
      WITH f, count(r) AS portrayalCount
      ORDER BY portrayalCount DESC
      LIMIT 12
      RETURN f.canonical_id AS canonical_id, f.name AS name, f.era AS era,
             f.birth_year AS birth_year, f.death_year AS death_year,
             f.image_url AS image_url, f.historicity_status AS historicity_status,
             portrayalCount
    `);

    // Popular media works by figure count
    const worksResult = await session.run(`
      MATCH (m:MediaWork)<-[r:APPEARS_IN]-(:HistoricalFigure)
      WITH m, count(r) AS figureCount
      ORDER BY figureCount DESC
      LIMIT 8
      RETURN m.media_id AS media_id, m.title AS title, m.media_type AS media_type,
             m.release_year AS release_year, m.creator AS creator,
             m.director AS director, m.author AS author,
             m.image_url AS image_url, m.wikidata_id AS wikidata_id,
             figureCount
    `);

    // Era distribution for chips
    const erasResult = await session.run(`
      MATCH (f:HistoricalFigure)
      WITH f.era AS era, count(f) AS figureCount
      WHERE era IS NOT NULL
      ORDER BY figureCount DESC
      LIMIT 12
      RETURN era, figureCount
    `);

    // Aggregate stats
    const statsResult = await session.run(`
      MATCH (f:HistoricalFigure) WITH count(f) AS figureCount
      MATCH (m:MediaWork) WITH figureCount, count(m) AS workCount
      MATCH ()-[r:APPEARS_IN]->() WITH figureCount, workCount, count(r) AS portrayalCount
      RETURN figureCount, workCount, portrayalCount
    `);

    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number') return v;
      if (typeof v === 'object' && v !== null && 'toNumber' in v) {
        return (v as { toNumber: () => number }).toNumber();
      }
      return Number(v);
    };

    const figures = figuresResult.records.map(r => ({
      canonical_id: r.get('canonical_id'),
      name: r.get('name'),
      era: r.get('era'),
      birth_year: toNum(r.get('birth_year')),
      death_year: toNum(r.get('death_year')),
      image_url: r.get('image_url'),
      historicity_status: r.get('historicity_status') || 'Historical',
      portrayalCount: toNum(r.get('portrayalCount')) || 0,
    }));

    const works = worksResult.records.map(r => ({
      media_id: r.get('media_id'),
      title: r.get('title'),
      media_type: r.get('media_type'),
      release_year: toNum(r.get('release_year')),
      creator: r.get('creator') || r.get('director') || r.get('author'),
      image_url: r.get('image_url'),
      wikidata_id: r.get('wikidata_id'),
      figureCount: toNum(r.get('figureCount')) || 0,
    }));

    const eras = erasResult.records.map(r => ({
      name: r.get('era'),
      figureCount: toNum(r.get('figureCount')) || 0,
    }));

    const statsRecord = statsResult.records[0];
    const stats = {
      figures: toNum(statsRecord.get('figureCount')) || 0,
      works: toNum(statsRecord.get('workCount')) || 0,
      portrayals: toNum(statsRecord.get('portrayalCount')) || 0,
    };

    return NextResponse.json({ figures, works, eras, stats });
  } catch (error) {
    console.error('Homepage API error:', error);
    return NextResponse.json(
      { figures: [], works: [], eras: [], stats: { figures: 0, works: 0, portrayals: 0 } },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
