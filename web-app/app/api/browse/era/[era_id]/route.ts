export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getWorksInEra } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ era_id: string }> }
) {
  try {
    const { era_id } = await params;

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const result = await getWorksInEra(era_id, limit);

    if (!result) {
      return NextResponse.json(
        { error: 'Era not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Era detail error:', error);

    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
