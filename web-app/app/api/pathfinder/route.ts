export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { findShortestPath } from '@/lib/db';
import { devError } from '@/utils/devLog';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { start_id, end_id } = body;

    if (!start_id || !end_id) {
      return NextResponse.json(
        { error: 'Both start_id and end_id are required' },
        { status: 400 }
      );
    }

    const path = await findShortestPath(start_id, end_id);

    if (!path) {
      return NextResponse.json(
        { path: null, message: 'No path found between these figures' },
        { status: 200 }
      );
    }

    return NextResponse.json({ path }, { status: 200 });
  } catch (error) {
    devError('Pathfinder API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
