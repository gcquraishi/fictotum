export const dynamic = 'force-dynamic';
// file: web-app/app/api/media/check/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

/**
 * Check if a media work exists in the database by Q-ID
 * Used by the creator bulk import workflow to determine which works are already added
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const qid = searchParams.get('qid');

  if (!qid) {
    return NextResponse.json({ error: 'Q-ID is required' }, { status: 400 });
  }

  try {
    const dbSession = await getSession();

    const query = `
      MATCH (m:MediaWork {wikidata_id: $qid})
      RETURN m.media_id AS media_id, m.title AS title
      LIMIT 1
    `;

    const result = await dbSession.run(query, { qid });
    await dbSession.close();

    const exists = result.records.length > 0;

    if (exists) {
      const record = result.records[0];
      return NextResponse.json({
        exists: true,
        media_id: record.get('media_id'),
        title: record.get('title')
      });
    }

    return NextResponse.json({ exists: false });

  } catch (error) {
    console.error('Media check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
