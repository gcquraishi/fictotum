import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

/**
 * GET /api/figures/[id]/connected
 *
 * Returns historical figures that co-appear in the same MediaWorks
 * as the given figure. Used for the "Connected Figures" section
 * on the figure detail page.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing figure id' }, { status: 400 });
  }

  const session = await getSession();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure {canonical_id: $id})-[:APPEARS_IN]->(m:MediaWork)<-[:APPEARS_IN]-(other:HistoricalFigure)
       WHERE other.canonical_id <> $id
       WITH other, count(DISTINCT m) AS sharedWorks
       ORDER BY sharedWorks DESC
       LIMIT 10
       RETURN other.canonical_id AS canonical_id,
              other.name AS name,
              other.era AS era,
              other.birth_year AS birth_year,
              other.death_year AS death_year,
              other.image_url AS image_url,
              other.historicity_status AS historicity_status,
              sharedWorks`,
      { id },
    );

    const connected = result.records.map((r) => ({
      canonical_id: r.get('canonical_id'),
      name: r.get('name'),
      era: r.get('era'),
      birth_year: r.get('birth_year')?.toNumber?.() ?? r.get('birth_year'),
      death_year: r.get('death_year')?.toNumber?.() ?? r.get('death_year'),
      image_url: r.get('image_url'),
      historicity_status: r.get('historicity_status'),
      sharedWorks: r.get('sharedWorks')?.toNumber?.() ?? Number(r.get('sharedWorks')),
    }));

    return NextResponse.json(connected);
  } catch (err: unknown) {
    console.error('Connected figures error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  } finally {
    await session.close();
  }
}
