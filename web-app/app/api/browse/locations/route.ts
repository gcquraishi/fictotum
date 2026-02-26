export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getLocationsWithStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // Filter by city, region, country, fictional_place
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0);

    let locations = await getLocationsWithStats();

    // Filter by type if provided
    if (type) {
      locations = locations.filter(loc => loc.location_type === type);
    }

    // Apply pagination
    const paginated = locations.slice(skip, skip + limit);

    return NextResponse.json({
      locations: paginated,
      total: locations.length,
      limit,
      skip,
    });
  } catch (error) {
    console.error('List locations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
