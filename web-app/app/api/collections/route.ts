export const dynamic = 'force-dynamic';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';

// GET /api/collections — list the current user's collections
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbSession = await getSession();
  try {
    const result = await dbSession.run(
      `
      MATCH (u:User {email: $email})-[:OWNS]->(c:Collection)
      OPTIONAL MATCH (c)-[:CONTAINS]->(item)
      RETURN c {
        .collection_id,
        .name,
        .description,
        .created_at,
        .updated_at,
        itemCount: count(item)
      }
      ORDER BY c.updated_at DESC
      `,
      { email: session.user.email }
    );

    const collections = result.records.map((r) => r.get('c'));
    return NextResponse.json({ collections });
  } catch (error) {
    console.error('[Collections GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}

// POST /api/collections — create a new collection
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: 'Collection name must be 100 characters or fewer' }, { status: 400 });
  }

  const collectionId = `COL-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const dbSession = await getSession();
  try {
    const result = await dbSession.run(
      `
      MATCH (u:User {email: $email})
      CREATE (c:Collection {
        collection_id: $collectionId,
        name: $name,
        description: $description,
        created_at: datetime(),
        updated_at: datetime()
      })
      CREATE (u)-[:OWNS]->(c)
      RETURN c {
        .collection_id,
        .name,
        .description,
        .created_at,
        .updated_at
      }
      `,
      {
        email: session.user.email,
        collectionId,
        name: name.trim(),
        description: (description || '').trim(),
      }
    );

    const collection = result.records[0]?.get('c');
    if (!collection) {
      // User node might not exist yet — create it
      await dbSession.run(
        `
        MERGE (u:User {email: $email})
        ON CREATE SET u.name = $name, u.created_at = datetime(), u.updated_at = datetime()
        CREATE (c:Collection {
          collection_id: $collectionId,
          name: $collName,
          description: $description,
          created_at: datetime(),
          updated_at: datetime()
        })
        CREATE (u)-[:OWNS]->(c)
        RETURN c
        `,
        {
          email: session.user.email,
          name: session.user.name || '',
          collectionId,
          collName: name.trim(),
          description: (description || '').trim(),
        }
      );
    }

    return NextResponse.json({ collection: { collection_id: collectionId, name: name.trim(), description: (description || '').trim() } }, { status: 201 });
  } catch (error) {
    console.error('[Collections POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}
