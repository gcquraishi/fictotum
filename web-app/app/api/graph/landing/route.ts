export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getLandingGraphData } from '@/lib/db';

export async function GET() {
  try {
    const graphData = await getLandingGraphData();
    return NextResponse.json(graphData);
  } catch (error) {
    console.error('Failed to fetch landing graph data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch graph data' },
      { status: 500 }
    );
  }
}
