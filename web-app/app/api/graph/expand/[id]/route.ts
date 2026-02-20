export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getNodeNeighbors } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const type = request.nextUrl.searchParams.get('type') as 'figure' | 'media';

    if (!type || (type !== 'figure' && type !== 'media')) {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Must be "figure" or "media".' },
        { status: 400 }
      );
    }

    const nodeId = params.id;
    const data = await getNodeNeighbors(nodeId, type);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error expanding node:', error);
    return NextResponse.json(
      { error: 'Failed to expand node' },
      { status: 500 }
    );
  }
}
