export const dynamic = 'force-dynamic';
// file: web-app/app/api/media/check-existing/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wikidataIds } = body;

    if (!Array.isArray(wikidataIds) || wikidataIds.length === 0) {
      return NextResponse.json({ error: 'wikidataIds array is required' }, { status: 400 });
    }

    const session = await getSession();

    // Query to check which wikidata_ids already exist
    const query = `
      UNWIND $wikidataIds AS qid
      OPTIONAL MATCH (m:MediaWork {wikidata_id: qid})
      RETURN qid, m.media_id as media_id, m.title as title
    `;

    const result = await session.run(query, { wikidataIds });
    await session.close();

    // Build a map of qid -> exists
    const existingWorks: Record<string, { exists: boolean; mediaId?: string; title?: string }> = {};

    result.records.forEach(record => {
      const qid = record.get('qid');
      const mediaId = record.get('media_id');
      const title = record.get('title');

      existingWorks[qid] = {
        exists: mediaId !== null,
        mediaId: mediaId || undefined,
        title: title || undefined,
      };
    });

    return NextResponse.json({ existingWorks });
  } catch (error) {
    console.error('Check existing media error:', error);
    return NextResponse.json({ error: 'Failed to check existing media' }, { status: 500 });
  }
}
