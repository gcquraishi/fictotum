export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { getNormalizedSentiment } from '@/lib/sentiment-parser';
import neo4j from 'neo4j-driver';

export interface ReputationDataPoint {
  workId: string;
  workTitle: string;
  year: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'complex';
  characterName?: string;
  mediaType?: string;
}

/**
 * GET /api/figure/[id]/reputation-timeline
 *
 * Returns portrayal sentiment data over time for reputation timeline visualization.
 * Shows how a figure's portrayal sentiment evolves across decades.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const canonicalId = params.id;

  if (!canonicalId) {
    return NextResponse.json(
      { error: 'Figure ID required' },
      { status: 400 }
    );
  }

  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $canonicalId})-[r:APPEARS_IN]->(m:MediaWork)
       WHERE m.release_year IS NOT NULL
         AND r.sentiment IS NOT NULL
         AND m.release_year >= 1900
       RETURN m.wikidata_id as workId,
              m.title as workTitle,
              m.release_year as year,
              r.sentiment as sentiment,
              r.character_name as characterName,
              m.media_type as mediaType
       ORDER BY m.release_year ASC`,
      { canonicalId }
    );

    // Parse and normalize sentiment values using shared parser
    const dataPoints: ReputationDataPoint[] = result.records.map(record => {
      const rawSentiment = record.get('sentiment');
      const normalizedSentiment = getNormalizedSentiment(rawSentiment);

      return {
        workId: record.get('workId'),
        workTitle: record.get('workTitle'),
        year: record.get('year')?.toNumber?.() ?? Number(record.get('year')),
        sentiment: normalizedSentiment,
        characterName: record.get('characterName') || undefined,
        mediaType: record.get('mediaType') || undefined,
      };
    });

    // Return 200 even if no data (graceful empty state)
    return NextResponse.json({
      canonicalId,
      dataPoints,
      totalPortrayals: dataPoints.length,
      yearRange: dataPoints.length > 0 ? {
        earliest: dataPoints[0].year,
        latest: dataPoints[dataPoints.length - 1].year,
      } : {
        earliest: 0,
        latest: new Date().getFullYear(),
      },
      message: dataPoints.length === 0 ? 'No sentiment data available for this figure' : undefined,
    });
  } catch (error) {
    console.error('Error fetching reputation timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reputation timeline data' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
