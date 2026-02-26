export const dynamic = 'force-dynamic';
// file: web-app/app/api/contribution/appearance/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';
import { normalizeTags, validateTags, categorizeTags } from '@/lib/utils/tagNormalizer';

export async function POST(request: NextRequest) {
  const session = await auth(); // Get the server-side session
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  // Declare body outside try block for error logging
  let body: any;

  try {
    body = await request.json();
    const { figureId, mediaId, sentimentTags, roleDescription, isProtagonist, actorName } = body;

    if (!figureId || !mediaId) {
      return NextResponse.json({ error: 'Figure ID and Media ID are required' }, { status: 400 });
    }

    // Validate sentiment tags
    if (!sentimentTags || !Array.isArray(sentimentTags)) {
      return NextResponse.json({ error: 'Sentiment tags are required and must be an array' }, { status: 400 });
    }

    // Validate array elements are strings
    if (!sentimentTags.every((tag): tag is string => typeof tag === 'string')) {
      return NextResponse.json(
        { error: 'All sentiment tags must be strings' },
        { status: 400 }
      );
    }

    // Normalize tags (lowercase, trim, dedupe, length validation)
    const normalizedTags = normalizeTags(sentimentTags);

    // Validate tag constraints (1-5 tags)
    const validation = validateTags(normalizedTags);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Categorize tags into common (suggested) and custom
    const tagMetadata = categorizeTags(normalizedTags);

    const dbSession = await getSession();
    const query = `
      MATCH (f:HistoricalFigure {canonical_id: $figureId})
      MATCH (m:MediaWork)
      WHERE m.media_id = $mediaId OR m.wikidata_id = $mediaId
      MATCH (u:User {email: $userEmail})
      MERGE (f)-[r:APPEARS_IN]->(m)
      ON CREATE SET
        r.sentiment_tags = $sentimentTags,
        r.tag_metadata = $tagMetadata,
        r.sentiment = $legacySentiment,
        r.role_description = $roleDescription,
        r.is_protagonist = $isProtagonist,
        r.actor_name = $actorName,
        r.created_at = timestamp(),
        r.created_by = u.email,
        r.created_by_name = u.name
      ON MATCH SET
        r.sentiment_tags = $sentimentTags,
        r.tag_metadata = $tagMetadata,
        r.sentiment = $legacySentiment,
        r.role_description = $roleDescription,
        r.is_protagonist = $isProtagonist,
        r.actor_name = $actorName,
        r.updated_at = timestamp(),
        r.updated_by = u.email,
        r.updated_by_name = u.name
      RETURN r
    `;

    await dbSession.run(query, {
      figureId,
      mediaId,
      userEmail,
      sentimentTags: normalizedTags,
      tagMetadata: JSON.stringify(tagMetadata), // Convert to JSON string for Neo4j
      legacySentiment: normalizedTags[0] || 'complex', // Dual-write: first tag as legacy sentiment
      roleDescription,
      isProtagonist,
      actorName: actorName || null,
    });

    await dbSession.close();

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    // Log structured error with context
    console.error('[Appearance API] Contribution failed', {
      figureId: body?.figureId,
      mediaId: body?.mediaId,
      userEmail,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Provide specific error messages where possible
    if (error instanceof Error) {
      if (error.message.includes('constraint violation')) {
        return NextResponse.json(
          { error: 'Database constraint violated. Please check your input.' },
          { status: 400 }
        );
      }
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { error: 'Database connection failed. Please try again.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to save appearance. Please try again.' },
      { status: 500 }
    );
  }
}
