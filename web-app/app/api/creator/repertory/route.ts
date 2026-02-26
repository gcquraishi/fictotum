export const dynamic = 'force-dynamic';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const creator = searchParams.get('creator');

  if (!creator) {
    return NextResponse.json(
      { error: 'Creator parameter is required' },
      { status: 400 }
    );
  }

  const session = await getSession();

  try {
    // Query for recurring figures in creator's works
    const result = await session.run(
      `
      MATCH (m:MediaWork {creator: $creator})-[r:APPEARS_IN]-(f:HistoricalFigure)
      WITH f, count(DISTINCT m) as appearances, collect(DISTINCT m.title)[0..10] as works
      WHERE appearances > 1
      WITH f, appearances, works
      ORDER BY appearances DESC
      LIMIT 10
      WITH collect({
        name: f.name,
        canonical_id: f.canonical_id,
        appearances: appearances,
        works: works
      }) as recurringFigures

      // Also get total unique figure count
      MATCH (m2:MediaWork {creator: $creator})-[:APPEARS_IN]-(f2:HistoricalFigure)
      WITH recurringFigures, count(DISTINCT f2) as uniqueCount

      RETURN recurringFigures, uniqueCount
      `,
      { creator }
    );

    if (result.records.length === 0) {
      return NextResponse.json({
        recurringFigures: [],
        uniqueCount: 0
      });
    }

    const record = result.records[0];
    const recurringFigures = record.get('recurringFigures') || [];
    const uniqueCount = record.get('uniqueCount')?.toNumber?.() ?? Number(record.get('uniqueCount')) ?? 0;

    return NextResponse.json({
      recurringFigures,
      uniqueCount
    });
  } catch (error) {
    console.error('Error fetching creator repertory:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
