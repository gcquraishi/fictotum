export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getWorksInLocation } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ location_id: string }> }
) {
  try {
    const { location_id } = await params;

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const skip = Math.max(parseInt(searchParams.get('skip') || '0'), 0);

    const result = await getWorksInLocation(location_id, limit, skip);

    if (!result) {
      return NextResponse.json(
        { error: 'Location not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Location detail error:', error);

    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
