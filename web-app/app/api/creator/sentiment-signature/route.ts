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
    // Get sentiment distribution across all portrayals in this creator's works
    const result = await session.run(
      `
      MATCH (m:MediaWork {creator: $creator})<-[r:APPEARS_IN]-(f:HistoricalFigure)
      WHERE r.sentiment IS NOT NULL
      WITH r.sentiment AS sentiment, count(*) AS count,
           collect(DISTINCT f.name)[0..5] AS sampleFigures
      RETURN sentiment, count, sampleFigures
      ORDER BY count DESC
      LIMIT 20
      `,
      { creator }
    );

    const sentiments = result.records.map(record => ({
      sentiment: record.get('sentiment'),
      count: record.get('count')?.toNumber?.() ?? Number(record.get('count')),
      sampleFigures: record.get('sampleFigures') || [],
    }));

    // Get total portrayal count for percentages
    const totalResult = await session.run(
      `
      MATCH (m:MediaWork {creator: $creator})<-[r:APPEARS_IN]-(f:HistoricalFigure)
      RETURN count(*) AS total,
             count(CASE WHEN r.sentiment IS NOT NULL THEN 1 END) AS withSentiment
      `,
      { creator }
    );

    const totals = totalResult.records[0];
    const total = totals?.get('total')?.toNumber?.() ?? 0;
    const withSentiment = totals?.get('withSentiment')?.toNumber?.() ?? 0;

    return NextResponse.json({ sentiments, total, withSentiment });
  } catch (error) {
    console.error('Error fetching sentiment signature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.close();
  }
}
