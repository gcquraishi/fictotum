export const dynamic = 'force-dynamic';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';
import { getCollectionById } from '@/lib/collections';

type Params = { params: Promise<{ id: string }> };

// GET /api/collections/[id] — fetch a single collection (public, no auth required to view)
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const data = await getCollectionById(id);
    if (!data) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Collection GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch collection' }, { status: 500 });
  }
}

// PATCH /api/collections/[id] — update collection metadata
export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description } = body;

  const dbSession = await getSession();
  try {
    // Verify ownership before updating
    const ownerCheck = await dbSession.run(
      `MATCH (u:User {email: $email})-[:OWNS]->(c:Collection {collection_id: $id}) RETURN c`,
      { email: session.user.email, id }
    );

    if (ownerCheck.records.length === 0) {
      return NextResponse.json({ error: 'Collection not found or not owned by you' }, { status: 403 });
    }

    const setParts: string[] = ['c.updated_at = datetime()'];
    const queryParams: any = { id };

    if (name && typeof name === 'string' && name.trim().length > 0) {
      setParts.push('c.name = $name');
      queryParams.name = name.trim();
    }
    if (typeof description === 'string') {
      setParts.push('c.description = $description');
      queryParams.description = description.trim();
    }

    await dbSession.run(
      `MATCH (c:Collection {collection_id: $id}) SET ${setParts.join(', ')} RETURN c`,
      queryParams
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Collection PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update collection' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}

// DELETE /api/collections/[id] — delete a collection
export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const dbSession = await getSession();
  try {
    const result = await dbSession.run(
      `
      MATCH (u:User {email: $email})-[:OWNS]->(c:Collection {collection_id: $id})
      DETACH DELETE c
      RETURN count(c) AS deleted
      `,
      { email: session.user.email, id }
    );

    const deleted = result.records[0]?.get('deleted');
    if (!deleted || deleted.toNumber() === 0) {
      return NextResponse.json({ error: 'Collection not found or not owned by you' }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Collection DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete collection' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}
