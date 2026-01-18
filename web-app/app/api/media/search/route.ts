// file: web-app/app/api/media/search/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { isInt } from 'neo4j-driver';

function toNumber(value: any): number {
  if (isInt(value)) {
    return value.toNumber();
  }
  return Number(value);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const includeSeries = searchParams.get('includeSeries') !== 'false'; // default true
    const typeFilter = searchParams.get('type'); // optional media type filter

    if (!query) {
      return NextResponse.json({ works: [] });
    }

    const session = await getSession();

    // Build WHERE clause dynamically
    let whereClause = 'WHERE toLower(m.title) CONTAINS toLower($query)';

    if (!includeSeries) {
      whereClause += ` AND NOT m.media_type IN ['BookSeries', 'FilmSeries', 'TVSeriesCollection', 'GameSeries', 'BoardGameSeries']`;
    }

    if (typeFilter) {
      whereClause += ' AND m.media_type = $typeFilter';
    }

    const result = await session.run(
      `MATCH (m:MediaWork)
       ${whereClause}
       RETURN m.media_id AS media_id, m.title AS title, m.release_year AS year, m.media_type AS media_type, m.wikidata_id AS wikidata_id
       LIMIT 10`,
      { query, typeFilter }
    );

    const works = result.records.map((record) => ({
      media_id: record.get('media_id'),
      wikidata_id: record.get('wikidata_id'),
      title: record.get('title'),
      year: toNumber(record.get('year')),
      media_type: record.get('media_type'),
    }));

    return NextResponse.json({ works });
  } catch (error) {
    console.error('Media search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
