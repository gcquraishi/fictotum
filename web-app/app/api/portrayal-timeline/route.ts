export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPortrayalTimelineData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const era = searchParams.get('era') || undefined;
    const mediaType = searchParams.get('mediaType') || undefined;
    const minPortrayals = searchParams.get('minPortrayals');

    const data = await getPortrayalTimelineData({
      era,
      mediaType,
      minPortrayals: minPortrayals ? parseInt(minPortrayals, 10) : undefined,
    });

    return NextResponse.json({ figures: data });
  } catch (error) {
    console.error('Portrayal timeline API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portrayal timeline data' },
      { status: 500 }
    );
  }
}
