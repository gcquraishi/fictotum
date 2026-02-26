export const dynamic = 'force-dynamic';
// file: web-app/app/api/audit/duplicates/dismiss/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';

/**
 * POST /api/audit/duplicates/dismiss
 *
 * Mark a duplicate pair as "not a duplicate" to prevent it from appearing in future scans.
 *
 * Request Body:
 * - figure1_id: canonical_id of first figure
 * - figure2_id: canonical_id of second figure
 * - note: Optional note explaining why they are not duplicates
 *
 * Creates a NOT_DUPLICATE relationship between the two figures with audit trail.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const body = await request.json();
    const { figure1_id, figure2_id, note } = body;

    // Validate inputs
    if (!figure1_id || !figure2_id) {
      return NextResponse.json(
        { error: 'Both figure1_id and figure2_id are required' },
        { status: 400 }
      );
    }

    if (figure1_id === figure2_id) {
      return NextResponse.json(
        { error: 'Cannot dismiss a figure with itself' },
        { status: 400 }
      );
    }

    const dbSession = await getSession();

    // Create bidirectional NOT_DUPLICATE relationships with audit trail
    const query = `
      MATCH (f1:HistoricalFigure {canonical_id: $figure1_id})
      MATCH (f2:HistoricalFigure {canonical_id: $figure2_id})

      // Create bidirectional relationships (so we can filter in either direction)
      MERGE (f1)-[r1:NOT_DUPLICATE]->(f2)
      ON CREATE SET
        r1.dismissed_at = datetime(),
        r1.dismissed_by = $userEmail,
        r1.note = $note

      MERGE (f2)-[r2:NOT_DUPLICATE]->(f1)
      ON CREATE SET
        r2.dismissed_at = datetime(),
        r2.dismissed_by = $userEmail,
        r2.note = $note

      RETURN f1.name AS figure1_name, f2.name AS figure2_name
    `;

    const result = await dbSession.run(query, {
      figure1_id,
      figure2_id,
      userEmail,
      note: note || 'Dismissed by admin',
    });

    await dbSession.close();

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'One or both figures not found' },
        { status: 404 }
      );
    }

    const record = result.records[0];

    return NextResponse.json({
      success: true,
      figure1: { id: figure1_id, name: record.get('figure1_name') },
      figure2: { id: figure2_id, name: record.get('figure2_name') },
      dismissed_by: userEmail,
      note: note || 'Dismissed by admin',
    }, { status: 200 });
  } catch (error) {
    console.error('Dismiss duplicate error:', error);
    return NextResponse.json(
      { error: 'Internal server error during dismiss' },
      { status: 500 }
    );
  }
}
