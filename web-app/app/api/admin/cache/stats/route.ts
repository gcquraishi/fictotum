export const dynamic = 'force-dynamic';
// file: web-app/app/api/admin/cache/stats/route.ts
import 'server-only';
import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';
import { auth } from '@/lib/auth';

/**
 * GET /api/admin/cache/stats
 *
 * Returns cache statistics for monitoring performance.
 * Requires authentication.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = getCacheStats();

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cache Stats Error]', error);
    return NextResponse.json(
      { error: 'Failed to retrieve cache stats' },
      { status: 500 }
    );
  }
}
