export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getTimelineData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startYear = searchParams.get('startYear');
    const endYear = searchParams.get('endYear');
    const era = searchParams.get('era');

    const data = await getTimelineData(
      startYear ? parseInt(startYear, 10) : undefined,
      endYear ? parseInt(endYear, 10) : undefined,
      era || undefined
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error('Timeline API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline data' },
      { status: 500 }
    );
  }
}
