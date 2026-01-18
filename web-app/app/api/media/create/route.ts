// file: web-app/app/api/media/create/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/app/api/auth/[...nextauth]/route';

function generateMediaId(title: string, year: number): string {
  // Create a slug-based ID: lowercase, replace spaces with hyphens, remove special chars
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return `${slug}-${year}`;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const body = await request.json();
    const { title, mediaType, releaseYear, creator, wikidataId } = body;

    if (!title || !mediaType || !releaseYear) {
      return NextResponse.json(
        { error: 'Title, media type, and release year are required' },
        { status: 400 }
      );
    }

    const mediaId = generateMediaId(title, releaseYear);

    const dbSession = await getSession();

    // Check if media already exists (by media_id or wikidata_id)
    let checkQuery = 'MATCH (m:MediaWork) WHERE m.media_id = $mediaId';
    if (wikidataId) {
      checkQuery += ' OR m.wikidata_id = $wikidataId';
    }
    checkQuery += ' RETURN m.media_id AS media_id, m.title AS title, m.release_year AS year';

    const checkResult = await dbSession.run(checkQuery, {
      mediaId,
      wikidataId: wikidataId || null
    });

    if (checkResult.records.length > 0) {
      await dbSession.close();
      const existing = checkResult.records[0];
      return NextResponse.json(
        {
          error: 'This media work already exists in the database',
          existingMedia: {
            media_id: existing.get('media_id'),
            title: existing.get('title'),
            year: existing.get('year')?.toNumber() ?? existing.get('year'),
          }
        },
        { status: 409 }
      );
    }

    // Create new media work
    const query = `
      MATCH (u:User {email: $userEmail})
      CREATE (m:MediaWork {
        media_id: $mediaId,
        title: $title,
        media_type: $mediaType,
        release_year: $releaseYear,
        creator: $creator,
        wikidata_id: $wikidataId,
        created_at: timestamp(),
        created_by: u.email,
        created_by_name: u.name
      })
      RETURN m.media_id AS media_id, m.title AS title, m.release_year AS year
    `;

    const result = await dbSession.run(query, {
      mediaId,
      title,
      mediaType,
      releaseYear: parseInt(releaseYear),
      creator: creator || null,
      wikidataId: wikidataId || null,
      userEmail,
    });

    await dbSession.close();

    const record = result.records[0];
    const newMedia = {
      media_id: record.get('media_id'),
      title: record.get('title'),
      year: record.get('year')?.toNumber() ?? record.get('year'),
    };

    return NextResponse.json({ media: newMedia }, { status: 201 });
  } catch (error) {
    console.error('Media creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
