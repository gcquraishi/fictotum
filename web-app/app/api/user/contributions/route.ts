export const dynamic = 'force-dynamic';
import 'server-only';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';

// GET /api/user/contributions — fetch the current user's contribution history
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbSession = await getSession();
  try {
    // Query figures, media, and portrayals created by this user via CREATED_BY or appearance attribution
    const result = await dbSession.run(
      `
      MATCH (u:User {email: $email})
      OPTIONAL MATCH (f:HistoricalFigure)-[cb_f:CREATED_BY]->(u)
      OPTIONAL MATCH (m:MediaWork)-[cb_m:CREATED_BY]->(u)
      OPTIONAL MATCH (f2:HistoricalFigure)-[app:APPEARS_IN]->(mw:MediaWork)
        WHERE app.created_by = $email
      RETURN
        count(DISTINCT f) AS figureCount,
        count(DISTINCT m) AS mediaCount,
        count(DISTINCT app) AS portrayalCount,
        collect(DISTINCT {
          type: 'figure',
          id: f.canonical_id,
          name: f.name,
          era: f.era,
          created_at: cb_f.timestamp
        })[..10] AS recentFigures,
        collect(DISTINCT {
          type: 'media',
          id: m.media_id,
          name: m.title,
          media_type: m.media_type,
          created_at: cb_m.timestamp
        })[..10] AS recentMedia
      `,
      { email: session.user.email }
    );

    if (result.records.length === 0) {
      return NextResponse.json({
        figureCount: 0,
        mediaCount: 0,
        portrayalCount: 0,
        recentFigures: [],
        recentMedia: [],
      });
    }

    const record = result.records[0];

    // Neo4j integers need conversion
    const toNum = (v: any) => (v && typeof v.toNumber === 'function') ? v.toNumber() : (v ?? 0);

    return NextResponse.json({
      figureCount: toNum(record.get('figureCount')),
      mediaCount: toNum(record.get('mediaCount')),
      portrayalCount: toNum(record.get('portrayalCount')),
      recentFigures: (record.get('recentFigures') || []).filter((f: any) => f.id),
      recentMedia: (record.get('recentMedia') || []).filter((m: any) => m.id),
    });
  } catch (error) {
    console.error('[User Contributions GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch contributions' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}
