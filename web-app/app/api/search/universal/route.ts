// file: web-app/app/api/search/universal/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { withCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], total: 0, categories: {} });
  }

  try {
    // Cache universal search results for 5 minutes
    const searchResults = await withCache(
      `search:universal:${query.toLowerCase()}`,
      async () => {
        const session = await getSession();

    // Universal search across 7 categories (added Location and Era)
    const cypher = `
      // 1. Historical Figures
      MATCH (f:HistoricalFigure)
      WHERE toLower(f.name) CONTAINS toLower($q)
      RETURN {
        type: 'figure',
        id: f.canonical_id,
        label: f.name,
        meta: f.era,
        url: '/figure/' + f.canonical_id
      } as result
      LIMIT 3

      UNION

      // 2. Media Works (Non-Series)
      MATCH (m:MediaWork)
      WHERE toLower(m.title) CONTAINS toLower($q)
        AND NOT coalesce(m.media_type, m.type) IN ['BookSeries', 'FilmSeries', 'TVSeriesCollection', 'GameSeries', 'BoardGameSeries']
      WITH m, coalesce(m.media_id, m.wikidata_id) as id, coalesce(m.media_type, m.type) as media_type, coalesce(m.release_year, m.year) as year
      RETURN {
        type: 'media',
        id: id,
        label: m.title,
        meta: media_type + ' (' + toString(year) + ')',
        url: '/media/' + id
      } as result
      LIMIT 3

      UNION

      // 3. Series
      MATCH (m:MediaWork)
      WHERE toLower(m.title) CONTAINS toLower($q)
        AND coalesce(m.media_type, m.type) IN ['BookSeries', 'FilmSeries', 'TVSeriesCollection', 'GameSeries', 'BoardGameSeries']
      WITH m, coalesce(m.media_id, m.wikidata_id) as id, coalesce(m.media_type, m.type) as media_type
      RETURN {
        type: 'series',
        id: id,
        label: m.title,
        meta: media_type,
        url: '/media/' + id
      } as result
      LIMIT 3

      UNION

      // 4. Creators
      MATCH (m:MediaWork)
      WHERE toLower(m.creator) CONTAINS toLower($q)
      WITH DISTINCT m.creator as creator
      RETURN {
        type: 'creator',
        id: creator,
        label: creator,
        meta: 'Creator',
        url: '/contribute/creator?name=' + creator
      } as result
      LIMIT 3

      UNION

      // 5. Actors
      MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
      WHERE r.actor_name IS NOT NULL AND toLower(r.actor_name) CONTAINS toLower($q)
      WITH DISTINCT r.actor_name as actor, collect(DISTINCT m.title)[0] as exampleMedia, collect(DISTINCT m.media_id)[0] as exampleMediaId
      RETURN {
        type: 'actor',
        id: actor,
        label: actor,
        meta: 'Actor in ' + exampleMedia,
        url: '/media/' + exampleMediaId
      } as result
      LIMIT 3

      UNION

      // 6. Locations
      MATCH (l:Location)
      WHERE toLower(l.name) CONTAINS toLower($q)
      RETURN {
        type: 'location',
        id: l.location_id,
        label: l.name,
        meta: l.location_type,
        url: '/discovery/location/' + l.location_id
      } as result
      LIMIT 3

      UNION

      // 7. Eras
      MATCH (e:Era)
      WHERE toLower(e.name) CONTAINS toLower($q)
      RETURN {
        type: 'era',
        id: e.era_id,
        label: e.name,
        meta: toString(e.start_year) + ' - ' + toString(e.end_year),
        url: '/discovery/era/' + e.era_id
      } as result
      LIMIT 3
    `;

    const result = await session.run(cypher, { q: query });
    await session.close();

    const results = result.records.map(record => record.get('result'));

    // Deduplicate results by label + type (e.g., same figure appearing twice)
    const seenKeys = new Set<string>();
    const deduplicatedResults = results.filter((r: any) => {
      const key = `${r.type}:${r.label.toLowerCase()}`;
      if (seenKeys.has(key)) {
        return false; // Skip duplicate
      }
      seenKeys.add(key);
      return true;
    });

    // Count results by category
    const categories = deduplicatedResults.reduce((acc: Record<string, number>, r: any) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    return {
      results: deduplicatedResults,
      total: deduplicatedResults.length,
      categories,
    };
      },
      { ttl: 1000 * 60 * 5, cacheType: 'search' }
    );

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Universal search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
