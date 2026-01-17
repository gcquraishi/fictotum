import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ figures: [] });
    }

    const session = await getSession();

    try {
      // Search for historical figures by name (case-insensitive, partial match)
      const result = await session.run(
        `MATCH (f:HistoricalFigure)
         WHERE toLower(f.name) CONTAINS toLower($query)
         RETURN f.canonical_id as canonical_id, f.name as name, f.era as era
         ORDER BY f.name
         LIMIT 10`,
        { query: query.trim() }
      );

      const figures = result.records.map(record => ({
        canonical_id: record.get('canonical_id'),
        name: record.get('name'),
        era: record.get('era'),
      }));

      return NextResponse.json({ figures });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Error searching figures:', error);
    return NextResponse.json(
      { error: 'Failed to search figures' },
      { status: 500 }
    );
  }
}
