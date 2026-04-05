export const dynamic = 'force-dynamic';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const creator = request.nextUrl.searchParams.get('creator');

  if (!creator) {
    return NextResponse.json({ error: 'Creator parameter is required' }, { status: 400 });
  }

  const session = await getSession();

  try {
    const result = await session.run(
      `
      MATCH (m:MediaWork {creator: $creator})<-[:APPEARS_IN]-(f:HistoricalFigure)
      WHERE f.era IS NOT NULL
      WITH f.era AS era, count(DISTINCT m) AS workCount, count(DISTINCT f) AS figureCount,
           collect(DISTINCT m.title)[0..5] AS sampleWorks
      RETURN era, workCount, figureCount, sampleWorks
      ORDER BY workCount DESC
      LIMIT 20
      `,
      { creator }
    );

    const eras = result.records.map(record => ({
      era: record.get('era'),
      workCount: record.get('workCount')?.toNumber?.() ?? Number(record.get('workCount')),
      figureCount: record.get('figureCount')?.toNumber?.() ?? Number(record.get('figureCount')),
      sampleWorks: record.get('sampleWorks') || [],
    }));

    // Also get the temporal range of settings
    const rangeResult = await session.run(
      `
      MATCH (m:MediaWork {creator: $creator})
      WHERE m.setting_year IS NOT NULL
      RETURN min(m.setting_year) AS earliest, max(m.setting_year) AS latest, count(m) AS count
      `,
      { creator }
    );

    const range = rangeResult.records[0];
    const temporalRange = range ? {
      earliest: range.get('earliest')?.toNumber?.() ?? null,
      latest: range.get('latest')?.toNumber?.() ?? null,
      count: range.get('count')?.toNumber?.() ?? 0,
    } : null;

    return NextResponse.json({ eras, temporalRange });
  } catch (error) {
    console.error('Error fetching temporal obsession:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.close();
  }
}
