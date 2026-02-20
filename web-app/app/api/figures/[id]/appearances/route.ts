export const dynamic = 'force-dynamic';
// file: web-app/app/api/figures/[id]/appearances/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { isInt } from 'neo4j-driver';

function toNumber(value: any): number {
  if (isInt(value)) {
    return value.toNumber();
  }
  return Number(value);
}

interface MediaAppearance {
  title: string;
  media_type: string;
  release_year: number | null;
  role: string | null;
  wikidata_id: string | null;
}

/**
 * GET /api/figures/[id]/appearances
 *
 * Fetch all media appearances for a given HistoricalFigure.
 *
 * Returns list of MediaWork nodes connected via APPEARS_IN relationships.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const canonicalId = params.id;

  if (!canonicalId) {
    return NextResponse.json(
      { error: 'Figure ID is required' },
      { status: 400 }
    );
  }

  try {
    const dbSession = await getSession();

    const query = `
      MATCH (f:HistoricalFigure {canonical_id: $canonicalId})-[r:APPEARS_IN]->(m:MediaWork)
      RETURN
        m.title AS title,
        m.media_type AS media_type,
        m.release_year AS release_year,
        m.wikidata_id AS wikidata_id,
        r.role AS role,
        r.role_description AS role_description
      ORDER BY m.release_year DESC
    `;

    const result = await dbSession.run(query, { canonicalId });
    await dbSession.close();

    const appearances: MediaAppearance[] = result.records.map(record => ({
      title: record.get('title'),
      media_type: record.get('media_type'),
      release_year: record.get('release_year') ? toNumber(record.get('release_year')) : null,
      role: record.get('role') || record.get('role_description') || null,
      wikidata_id: record.get('wikidata_id'),
    }));

    return NextResponse.json({
      canonical_id: canonicalId,
      appearances_count: appearances.length,
      appearances,
    });
  } catch (error) {
    console.error('Fetch appearances error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch appearances' },
      { status: 500 }
    );
  }
}
