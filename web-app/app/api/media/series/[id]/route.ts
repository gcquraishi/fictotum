export const dynamic = 'force-dynamic';
// file: web-app/app/api/media/series/[id]/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getMediaSeriesHierarchy } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const hierarchy = await getMediaSeriesHierarchy(id);

    if (!hierarchy) {
      return NextResponse.json(
        { error: 'Media work not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(hierarchy);
  } catch (error) {
    console.error('Series hierarchy API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
