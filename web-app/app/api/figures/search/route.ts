import { NextRequest, NextResponse } from 'next/server';
import { searchFigures } from '@/lib/db';
import { withCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ figures: [] });
    }

    // Cache search results for 5 minutes
    const figures = await withCache(
      `search:figures:${query.toLowerCase()}`,
      () => searchFigures(query),
      { ttl: 1000 * 60 * 5, cacheType: 'search' }
    );

    return NextResponse.json({ figures });
  } catch (error) {
    console.error('Error searching figures:', error);
    return NextResponse.json(
      { error: 'Failed to search figures' },
      { status: 500 }
    );
  }
}
