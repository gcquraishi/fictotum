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
            count(DISTINCT fig) as character_count
       WHERE work_count > 0
       RETURN series.wikidata_id as wikidata_id,
              series.title as title,
              series.media_type as media_type,
              series.creator as creator,
              work_count,
              character_count
       ORDER BY work_count DESC
       LIMIT 100`
    );

    const series = result.records.map(record => ({
      wikidata_id: record.get('wikidata_id'),
      title: record.get('title'),
      media_type: record.get('media_type'),
      creator: record.get('creator'),
      work_count: record.get('work_count')?.toNumber?.() ?? Number(record.get('work_count')),
      character_count: record.get('character_count')?.toNumber?.() ?? Number(record.get('character_count')),
    }));

    await session.close();

    return NextResponse.json(series);
  } catch (error) {
    console.error('Browse series error:', error);
    await session.close();
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
