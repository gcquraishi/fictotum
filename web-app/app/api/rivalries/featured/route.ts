export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { isPositiveSentiment } from '@/lib/sentiment-parser';
import neo4j from 'neo4j-driver';

export interface FeaturedRivalry {
  figure1: {
    canonicalId: string;
    name: string;
    title?: string;
  };
  figure2: {
    canonicalId: string;
    name: string;
    title?: string;
  };
  sharedWorks: number;
  sampleWorks: string[];
  sentimentComparison: {
    figure1Positive: number;
    figure2Positive: number;
  };
}

/**
 * GET /api/rivalries/featured
 *
 * Returns featured rivalries (figure pairs with most shared portrayals).
 * Useful for "Conflict Engine" visualization on landing page.
 *
 * Algorithm:
 * - Find figure pairs appearing together in MediaWorks
 * - Count shared appearances
 * - Compare sentiment profiles using shared sentiment-parser utility
 * - Return top 5 rivalries (only real historical figures with Wikidata Q-IDs)
 */
export async function GET() {
  const session = await getSession();
  try {
    // Fetch raw sentiment data - we'll calculate positive percentages in JavaScript using sentiment parser
    const result = await session.run(
      `MATCH (f1:HistoricalFigure)-[r1:APPEARS_IN]->(m:MediaWork)<-[r2:APPEARS_IN]-(f2:HistoricalFigure)
       WHERE id(f1) < id(f2)
         AND f1.canonical_id STARTS WITH 'Q'
         AND f2.canonical_id STARTS WITH 'Q'
       WITH f1, f2,
            COUNT(DISTINCT m) as shared_works,
            COLLECT(DISTINCT m.title)[0..3] as sample_works,
            COLLECT(r1.sentiment) as f1_sentiments,
            COLLECT(r2.sentiment) as f2_sentiments
       WHERE shared_works >= 3
       RETURN f1.canonical_id as f1_id,
              f1.name as f1_name,
              f1.title as f1_title,
              f2.canonical_id as f2_id,
              f2.name as f2_name,
              f2.title as f2_title,
              shared_works,
              sample_works,
              f1_sentiments,
              f2_sentiments
       ORDER BY shared_works DESC
       LIMIT 5`
    );

    const rivalries: FeaturedRivalry[] = result.records.map(record => {
      // Use sentiment parser to calculate positive sentiment percentages
      const f1Sentiments = record.get('f1_sentiments') || [];
      const f2Sentiments = record.get('f2_sentiments') || [];

      const f1PositiveCount = f1Sentiments.filter((s: string) => isPositiveSentiment(s)).length;
      const f2PositiveCount = f2Sentiments.filter((s: string) => isPositiveSentiment(s)).length;
      const f1Total = f1Sentiments.length || 1;
      const f2Total = f2Sentiments.length || 1;

      return {
        figure1: {
          canonicalId: record.get('f1_id'),
          name: record.get('f1_name'),
          title: record.get('f1_title') || undefined,
        },
        figure2: {
          canonicalId: record.get('f2_id'),
          name: record.get('f2_name'),
          title: record.get('f2_title') || undefined,
        },
        sharedWorks: record.get('shared_works')?.toNumber?.() ?? 0,
        sampleWorks: record.get('sample_works'),
        sentimentComparison: {
          figure1Positive: Math.round((f1PositiveCount / f1Total) * 100),
          figure2Positive: Math.round((f2PositiveCount / f2Total) * 100),
        },
      };
    });

    // If we have rivalries, return a featured one (rotate through top 3)
    const featuredIndex = new Date().getHours() % Math.min(3, rivalries.length);
    const featured = rivalries[featuredIndex];

    return NextResponse.json({
      featured: featured || null,
      allRivalries: rivalries,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching rivalries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch featured rivalries' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
