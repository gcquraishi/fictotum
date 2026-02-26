export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

interface CreatorWork {
  wikidata_id: string;
  title: string;
  release_year: number;
  media_type: string;
  portrayal_count: number;
}

interface CreatorProfile {
  name: string;
  works: CreatorWork[];
  total_portrayals: number;
  unique_figures: number;
  media_types: string[];
  first_work_year: number;
  latest_work_year: number;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const decodedName = decodeURIComponent(name);

  const session = await getSession();

  try {
    // Query to get all works by creator and their portrayals
    const result = await session.run(
      `
      MATCH (m:MediaWork {creator: $creatorName})
      OPTIONAL MATCH (m)<-[r:APPEARS_IN]-(f:HistoricalFigure)
      WITH m, collect(DISTINCT f) as figures
      RETURN
        m.wikidata_id as wikidata_id,
        m.title as title,
        m.release_year as release_year,
        m.media_type as media_type,
        size(figures) as portrayal_count
      ORDER BY m.release_year DESC
      `,
      { creatorName: decodedName }
    );

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      );
    }

    // Process works
    const works: CreatorWork[] = result.records.map(record => ({
      wikidata_id: record.get('wikidata_id'),
      title: record.get('title'),
      release_year: record.get('release_year')?.toNumber?.() ?? Number(record.get('release_year')),
      media_type: record.get('media_type') || 'UNKNOWN',
      portrayal_count: record.get('portrayal_count')?.toNumber?.() ?? Number(record.get('portrayal_count'))
    }));

    // Calculate aggregate statistics
    const total_portrayals = works.reduce((sum, work) => sum + work.portrayal_count, 0);
    const media_types = Array.from(new Set(works.map(w => w.media_type)));
    const release_years = works.map(w => w.release_year).filter(y => y > 0);
    const first_work_year = release_years.length > 0 ? Math.min(...release_years) : 0;
    const latest_work_year = release_years.length > 0 ? Math.max(...release_years) : 0;

    // Get count of unique figures across all works
    const uniqueFiguresResult = await session.run(
      `
      MATCH (m:MediaWork {creator: $creatorName})<-[:APPEARS_IN]-(f:HistoricalFigure)
      RETURN count(DISTINCT f) as unique_figures
      `,
      { creatorName: decodedName }
    );

    const unique_figures = uniqueFiguresResult.records[0]
      ?.get('unique_figures')
      ?.toNumber?.() ?? 0;

    const profile: CreatorProfile = {
      name: decodedName,
      works,
      total_portrayals,
      unique_figures,
      media_types,
      first_work_year,
      latest_work_year
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
