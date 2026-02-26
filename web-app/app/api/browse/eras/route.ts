export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getErasWithStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // Filter by historical_period, literary_period, dynasty, reign
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0);

    let eras = await getErasWithStats();

    // Filter by type if provided
    if (type) {
      eras = eras.filter(era => era.era_type === type);
    }

    // Apply pagination
    const paginated = eras.slice(skip, skip + limit);

    return NextResponse.json({
      eras: paginated,
      total: eras.length,
      limit,
      skip,
    });
  } catch (error) {
    console.error('List eras error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
