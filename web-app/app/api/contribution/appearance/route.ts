// file: web-app/app/api/contribution/appearance/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/app/api/auth/[...nextauth]/route'; // Import auth from our handler

export async function POST(request: NextRequest) {
  const session = await auth(); // Get the server-side session
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const body = await request.json();
    const { figureId, mediaId, sentiment, roleDescription, isProtagonist } = body;

    if (!figureId || !mediaId) {
      return NextResponse.json({ error: 'Figure ID and Media ID are required' }, { status: 400 });
    }

    const dbSession = await getSession();
    const query = `
      MATCH (f:HistoricalFigure {canonical_id: $figureId})
      MATCH (m:MediaWork {media_id: $mediaId})
      MATCH (u:User {email: $userEmail})
      MERGE (f)-[r:APPEARS_IN]->(m)
      ON CREATE SET
        r.sentiment = $sentiment,
        r.role_description = $roleDescription,
        r.is_protagonist = $isProtagonist,
        r.created_at = timestamp(),
        r.created_by = u.email,
        r.created_by_name = u.name
      ON MATCH SET
        r.sentiment = $sentiment,
        r.role_description = $roleDescription,
        r.is_protagonist = $isProtagonist,
        r.updated_at = timestamp(),
        r.updated_by = u.email,
        r.updated_by_name = u.name
      RETURN r
    `;

    await dbSession.run(query, {
      figureId,
      mediaId,
      userEmail,
      sentiment,
      roleDescription,
      isProtagonist,
    });

    await dbSession.close();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Appearance contribution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
