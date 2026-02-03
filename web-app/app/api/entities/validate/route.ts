import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

/**
 * GET /api/entities/validate?id={canonicalId}
 *
 * Validates that an entity with the given canonical_id exists in Neo4j
 * Used by entity validation system to catch stale/incorrect ID references
 *
 * @param id - The canonical_id to validate (query parameter)
 * @returns { exists: boolean, entityType?: string, name?: string }
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const canonicalId = searchParams.get('id');

  if (!canonicalId) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    );
  }

  const session = await getSession();

  try {
    // Check if entity exists (could be HistoricalFigure, MediaWork, or FictionalCharacter)
    const result = await session.run(
      `
      OPTIONAL MATCH (f:HistoricalFigure)
      WHERE f.canonical_id = $id OR f.wikidata_id = $id
      OPTIONAL MATCH (m:MediaWork {wikidata_id: $id})
      OPTIONAL MATCH (c:FictionalCharacter {canonical_id: $id})
      RETURN
        f.name AS figureName,
        f.canonical_id AS figureId,
        m.title AS mediaTitle,
        m.wikidata_id AS mediaId,
        c.name AS characterName,
        c.canonical_id AS characterId
      LIMIT 1
      `,
      { id: canonicalId }
    );

    if (result.records.length === 0) {
      return NextResponse.json({
        exists: false,
        canonicalId,
      });
    }

    const record = result.records[0];
    const figureName = record.get('figureName');
    const mediaTitle = record.get('mediaTitle');
    const characterName = record.get('characterName');

    if (figureName) {
      return NextResponse.json({
        exists: true,
        canonicalId,
        entityType: 'HistoricalFigure',
        name: figureName,
      });
    }

    if (mediaTitle) {
      return NextResponse.json({
        exists: true,
        canonicalId,
        entityType: 'MediaWork',
        name: mediaTitle,
      });
    }

    if (characterName) {
      return NextResponse.json({
        exists: true,
        canonicalId,
        entityType: 'FictionalCharacter',
        name: characterName,
      });
    }

    // No matches found
    return NextResponse.json({
      exists: false,
      canonicalId,
    });
  } catch (error) {
    console.error('[API] Entity validation error:', error);
    return NextResponse.json(
      {
        error: 'Database query failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}
