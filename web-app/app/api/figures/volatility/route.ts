export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { getSentimentScore, getNormalizedSentiment } from '@/lib/sentiment-parser';
import neo4j from 'neo4j-driver';

export interface VolatileFigure {
  canonicalId: string;
  name: string;
  volatilityScore: number;
  portrayalCount: number;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    complex: number;
    neutral: number;
  };
  sparklineData: Array<{ year: number; sentiment: number }>;
}

/**
 * GET /api/figures/volatility
 *
 * Returns top figures with highest sentiment volatility (most controversial reputations).
 * Volatility is calculated as variance in sentiment across all portrayals.
 *
 * Algorithm:
 * - Uses shared sentiment-parser utility for accurate scoring of hyphenated sentiments
 * - Calculate standard deviation of sentiment scores (0-100 scale)
 * - Scale to 0-100 volatility score
 * - Handles compound sentiments like "villainous-desperate", "heroic-patriotic", etc.
 */
export async function GET() {
  const session = await getSession();
  try {
    // Fetch raw portrayal data - we'll calculate volatility in JavaScript using sentiment parser
    const result = await session.run(
      `MATCH (f:HistoricalFigure)-[r:APPEARS_IN]->(m:MediaWork)
       WHERE r.sentiment IS NOT NULL
         AND m.release_year IS NOT NULL
       WITH f,
            collect({
              sentiment: r.sentiment,
              year: m.release_year
            }) as portrayals
       WHERE size(portrayals) >= 3
       RETURN f.canonical_id as canonicalId,
              f.name as name,
              portrayals`
    );

    // Calculate volatility for each figure using sentiment parser
    const figuresWithVolatility = result.records.map(record => {
      const canonicalId = record.get('canonicalId');
      const name = record.get('name');
      const portrayals = record.get('portrayals');

      // Use sentiment parser to score each portrayal
      const sentimentScores = portrayals.map((p: any) => getSentimentScore(p.sentiment));

      // Calculate volatility (standard deviation scaled to 0-100)
      const mean = sentimentScores.reduce((sum: number, score: number) => sum + score, 0) / sentimentScores.length;
      const variance = sentimentScores.reduce((sum: number, score: number) => sum + Math.pow(score - mean, 2), 0) / sentimentScores.length;
      const stdDev = Math.sqrt(variance);
      const volatilityScore = Math.min(100, Math.round((stdDev / 50.0) * 100));

      // Calculate sentiment breakdown using sentiment parser
      const sentimentBreakdown = {
        positive: 0,
        negative: 0,
        complex: 0,
        neutral: 0,
      };

      portrayals.forEach((p: any) => {
        const normalized = getNormalizedSentiment(p.sentiment);
        sentimentBreakdown[normalized]++;
      });

      // Create sparkline data (aggregate by decade for visualization) using sentiment parser
      const sparklineMap = new Map<number, number[]>();
      portrayals.forEach((p: any) => {
        const year = p.year?.toNumber?.() ?? Number(p.year);
        const decade = Math.floor(year / 10) * 10;
        const sentimentValue = getSentimentScore(p.sentiment);

        if (!sparklineMap.has(decade)) {
          sparklineMap.set(decade, []);
        }
        sparklineMap.get(decade)!.push(sentimentValue);
      });

      // Average sentiment per decade
      const sparklineData = Array.from(sparklineMap.entries())
        .map(([decade, values]) => ({
          year: decade,
          sentiment: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        }))
        .sort((a, b) => a.year - b.year);

      return {
        canonicalId,
        name,
        volatilityScore,
        portrayalCount: portrayals.length,
        sentimentBreakdown,
        sparklineData,
      };
    });

    // Sort by volatility and return top 10
    const volatileFigures = figuresWithVolatility
      .sort((a, b) => b.volatilityScore - a.volatilityScore)
      .slice(0, 10);

    return NextResponse.json({
      figures: volatileFigures,
      totalAnalyzed: volatileFigures.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating volatility:', error);
    return NextResponse.json(
      { error: 'Failed to calculate reputation volatility' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
