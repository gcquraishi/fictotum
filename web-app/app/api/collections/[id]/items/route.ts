export const dynamic = 'force-dynamic';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

// POST /api/collections/[id]/items — add an item to a collection
export async function POST(request: NextRequest, { params }: Params) {
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

  const { item_id, item_type } = body;
  if (!item_id || !item_type || !['figure', 'media'].includes(item_type)) {
    return NextResponse.json({ error: 'item_id and item_type (figure|media) are required' }, { status: 400 });
  }

  const dbSession = await getSession();
  try {
    // Verify ownership
    const ownerCheck = await dbSession.run(
      `MATCH (u:User {email: $email})-[:OWNS]->(c:Collection {collection_id: $id}) RETURN c`,
      { email: session.user.email, id }
    );
    if (ownerCheck.records.length === 0) {
      return NextResponse.json({ error: 'Collection not found or not owned by you' }, { status: 403 });
    }

    let addQuery: string;
    if (item_type === 'figure') {
      addQuery = `
        MATCH (c:Collection {collection_id: $id})
        MATCH (f:HistoricalFigure {canonical_id: $item_id})
        MERGE (c)-[r:CONTAINS {item_type: 'figure'}]->(f)
        ON CREATE SET r.added_at = datetime()
        RETURN f.name AS label
      `;
    } else {
      addQuery = `
        MATCH (c:Collection {collection_id: $id})
        MATCH (m:MediaWork)
        WHERE m.media_id = $item_id OR m.wikidata_id = $item_id
        MERGE (c)-[r:CONTAINS {item_type: 'media'}]->(m)
        ON CREATE SET r.added_at = datetime()
        RETURN m.title AS label
      `;
    }

    const result = await dbSession.run(addQuery, { id, item_id });
    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Item not found in database' }, { status: 404 });
    }

    // Update collection timestamp
    await dbSession.run(
      `MATCH (c:Collection {collection_id: $id}) SET c.updated_at = datetime()`,
      { id }
    );

    return NextResponse.json({ success: true, label: result.records[0].get('label') }, { status: 201 });
  } catch (error) {
    console.error('[Collection Items POST] Error:', error);
    return NextResponse.json({ error: 'Failed to add item to collection' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}

// DELETE /api/collections/[id]/items — remove an item from a collection
export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const item_id = searchParams.get('item_id');
  const item_type = searchParams.get('item_type');

  if (!item_id || !item_type || !['figure', 'media'].includes(item_type)) {
    return NextResponse.json({ error: 'item_id and item_type query params are required' }, { status: 400 });
  }

  const dbSession = await getSession();
  try {
    // Verify ownership
    const ownerCheck = await dbSession.run(
      `MATCH (u:User {email: $email})-[:OWNS]->(c:Collection {collection_id: $id}) RETURN c`,
      { email: session.user.email, id }
    );
    if (ownerCheck.records.length === 0) {
      return NextResponse.json({ error: 'Collection not found or not owned by you' }, { status: 403 });
    }

    let removeQuery: string;
    if (item_type === 'figure') {
      removeQuery = `
        MATCH (c:Collection {collection_id: $id})-[r:CONTAINS]->(f:HistoricalFigure {canonical_id: $item_id})
        DELETE r
      `;
    } else {
      removeQuery = `
        MATCH (c:Collection {collection_id: $id})-[r:CONTAINS]->(m:MediaWork)
        WHERE m.media_id = $item_id OR m.wikidata_id = $item_id
        DELETE r
      `;
    }

    await dbSession.run(removeQuery, { id, item_id });
    await dbSession.run(
      `MATCH (c:Collection {collection_id: $id}) SET c.updated_at = datetime()`,
      { id }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Collection Items DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to remove item from collection' }, { status: 500 });
  } finally {
    await dbSession.close();
  }
}
