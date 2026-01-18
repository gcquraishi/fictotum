import { NextRequest, NextResponse } from 'next/server';
import { getGraphData } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const canonicalId = context.params.id;

    if (!canonicalId) {
      return NextResponse.json(
        { error: 'Figure ID is required' },
        { status: 400 }
      );
    }

    const graphData = await getGraphData(canonicalId);

    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}
