export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (series:MediaWork)
       WHERE (series.media_type IN ['Book Series', 'Game Series'])
       OR (series.media_type IN ['Book', 'Film', 'TV Series', 'Video Game'] AND (series)-[:PART_OF]->())
       OPTIONAL MATCH (work:MediaWork)-[:PART_OF]->(series)
       OPTIONAL MATCH (fig:HistoricalFigure)-[:APPEARS_IN]->(work)
       WITH series,
            count(DISTINCT work) as work_count,
            count(DISTINCT fig) as character_count,
            collect(DISTINCT work.release_year) as release_years,
            collect(DISTINCT work.image_url)[0] as first_work_image
       WHERE work_count > 0
       RETURN series.wikidata_id as wikidata_id,
              series.media_id as media_id,
              series.title as title,
              series.media_type as media_type,
              series.creator as creator,
              series.image_url as series_image_url,
              first_work_image,
              work_count,
              character_count,
              release_years
       ORDER BY work_count DESC
       LIMIT 100`
    );

    const series = result.records.map(record => {
      const releaseYears: number[] = (record.get('release_years') || [])
        .map((y: any) => y?.toNumber?.() ?? Number(y))
        .filter((y: number) => y && y > 0);
      const minYear = releaseYears.length > 0 ? Math.min(...releaseYears) : null;
      const maxYear = releaseYears.length > 0 ? Math.max(...releaseYears) : null;
      const seriesImageUrl = record.get('series_image_url');
      const firstWorkImage = record.get('first_work_image');

      return {
        wikidata_id: record.get('wikidata_id'),
        media_id: record.get('media_id'),
        title: record.get('title'),
        media_type: record.get('media_type'),
        creator: record.get('creator'),
        image_url: seriesImageUrl || firstWorkImage || null,
        work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
        character_count: record.get('character_count')?.toNumber?.() ?? Number(record.get('character_count')),
        year_range: minYear ? [minYear, maxYear] : null,
      };
    });

    await session.close();

    return NextResponse.json(series);
  } catch (error) {
    await session.close();
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
