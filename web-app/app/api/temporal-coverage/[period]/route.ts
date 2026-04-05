import { NextRequest, NextResponse } from 'next/server';
import { getTemporalCoverageDetails } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/temporal-coverage/[period]
 *
 * Returns detailed data for a specific time period including works and figures.
 *
 * Path Parameter:
 * - period: Time period in format "YYYY-YYYY" (e.g., "1400-1500")
 *
 * Query Parameters:
 * - limit: Maximum number of results to return (default: 50, max: 200)
 *
 * Response Format:
 * {
 *   period: "1400-1500",
 *   startYear: 1400,
 *   endYear: 1500,
 *   works: [...],
 *   figures: [...],
 *   statistics: {
 *     workCount: 45,
 *     figureCount: 23,
 *     mediaTypeBreakdown: {"Book": 30, "Film": 10},
 *     topCreators: [{name: "Author", workCount: 5}]
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ period: string }> }
) {
  try {
    const { period } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Parse period string (format: "YYYY-YYYY")
    const periodMatch = period.match(/^(-?\d+)-(-?\d+)$/);
    if (!periodMatch) {
      return NextResponse.json(
        { error: 'Invalid period format. Expected format: YYYY-YYYY (e.g., 1400-1500)' },
        { status: 400 }
      );
    }

    const startYear = parseInt(periodMatch[1]);
    const endYear = parseInt(periodMatch[2]);

    if (startYear > endYear) {
      return NextResponse.json(
        { error: 'Start year must be less than or equal to end year' },
        { status: 400 }
      );
    }

    const data = await getTemporalCoverageDetails(startYear, endYear, limit);

    if (!data) {
      return NextResponse.json(
        { error: 'Period not found or no data available' },
        { status: 404 }
      );
    }

    // Add cache headers (stale-while-revalidate for 1 hour)
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('Error fetching period details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch period details' },
      { status: 500 }
    );
  }
}
