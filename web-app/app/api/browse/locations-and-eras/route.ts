export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getDiscoveryStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const result = await getDiscoveryStats();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Discovery stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
