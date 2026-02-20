export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSeriesMetadata } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seriesId: string }> }
) {
  try {
    const { seriesId } = await params;

    const metadata = await getSeriesMetadata(seriesId);

    if (!metadata) {
      return NextResponse.json(
        { error: 'Series not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Series metadata error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
