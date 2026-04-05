import { NextRequest, NextResponse } from 'next/server';
import { getTemporalCoverage } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/temporal-coverage
 *
 * Returns aggregated temporal coverage data showing distribution of works and figures across time periods.
 *
 * Query Parameters:
 * - granularity: 'century' | 'decade' | 'year' (default: 'century')
 * - mediaType: Optional filter by media type (Book, Film, Game, TV)
 * - region: Optional filter by geographic region
 *
 * Response Format:
 * {
 *   timeBuckets: [
 *     {
 *       period: "1400-1500",
 *       startYear: 1400,
 *       endYear: 1500,
 *       workCount: 45,
 *       figureCount: 23,
 *       mediaTypes: {"Book": 30, "Film": 10, "Game": 5},
 *       topLocations: ["England", "Italy", "France"],
 *       seriesCount: 5,
 *       standaloneCount: 40,
 *       coverageStatus: "moderate"
 *     }
 *   ],
 *   statistics: {
 *     totalWorks: 1542,
 *     totalFigures: 897,
 *     earliestYear: -3000,
 *     latestYear: 2025,
 *     coverageGaps: ["500-600", "900-1000"]
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const granularity = (searchParams.get('granularity') as 'century' | 'decade' | 'year') || 'century';
    const mediaType = searchParams.get('mediaType') || undefined;
    const region = searchParams.get('region') || undefined;

    // Validate granularity
    if (!['century', 'decade', 'year'].includes(granularity)) {
      return NextResponse.json(
        { error: 'Invalid granularity. Must be century, decade, or year.' },
        { status: 400 }
      );
    }

    const data = await getTemporalCoverage(granularity, mediaType, region);

    // Add cache headers (stale-while-revalidate for 1 hour)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching temporal coverage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temporal coverage data' },
      { status: 500 }
    );
  }
}
