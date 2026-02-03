import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

/**
 * GET /api/entities/lookup?name={entityName}&type={entityType}
 *
 * Looks up an entity by name and returns its canonical_id
 * Eliminates need for hardcoded IDs in components
 *
 * @param name - The entity name to search for (query parameter, required)
 * @param type - Entity type filter: 'figure' | 'media' | 'character' (optional)
 * @returns { found: boolean, entities: Array<{canonicalId, name, type}> }
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name');
  const type = searchParams.get('type'); // optional filter

  if (!name) {
    return NextResponse.json(
      { error: 'Missing required parameter: name' },
      { status: 400 }
    );
  }

  const session = await getSession();

  try {
    // Build query based on type filter
    let query = '';
    let returnClause = '';

    if (!type || type === 'figure') {
      query += `
        OPTIONAL MATCH (f:HistoricalFigure)
        WHERE toLower(f.name) = toLower($name)
      `;
      returnClause += `
        collect(DISTINCT {
          canonicalId: f.canonical_id,
          name: f.name,
          type: 'figure',
          wikidataId: f.wikidata_id
        }) AS figures
      `;
    }

    if (!type || type === 'media') {
      if (query) query += '\n';
      query += `
        OPTIONAL MATCH (m:MediaWork)
        WHERE toLower(m.title) = toLower($name)
      `;
      if (returnClause) returnClause += ',\n';
      returnClause += `
        collect(DISTINCT {
          canonicalId: m.wikidata_id,
          name: m.title,
          type: 'media',
          mediaType: m.media_type,
          year: m.release_year
        }) AS media
      `;
    }

    if (!type || type === 'character') {
      if (query) query += '\n';
      query += `
        OPTIONAL MATCH (c:FictionalCharacter)
        WHERE toLower(c.name) = toLower($name)
      `;
      if (returnClause) returnClause += ',\n';
      returnClause += `
        collect(DISTINCT {
          canonicalId: c.canonical_id,
          name: c.name,
          type: 'character'
        }) AS characters
      `;
    }

    const fullQuery = query + '\nRETURN ' + returnClause;

    const result = await session.run(fullQuery, { name });

    if (result.records.length === 0) {
      return NextResponse.json({
        found: false,
        query: name,
        entities: [],
      });
    }

    const record = result.records[0];
    const entities: any[] = [];

    // Collect all matches
    if (!type || type === 'figure') {
      const figures = record.get('figures') || [];
      entities.push(...figures.filter((f: any) => f.canonicalId));
    }

    if (!type || type === 'media') {
      const media = record.get('media') || [];
      entities.push(...media.filter((m: any) => m.canonicalId));
    }

    if (!type || type === 'character') {
      const characters = record.get('characters') || [];
      entities.push(...characters.filter((c: any) => c.canonicalId));
    }

    return NextResponse.json({
      found: entities.length > 0,
      query: name,
      entities,
      count: entities.length,
    });
  } catch (error) {
    console.error('[API] Entity lookup error:', error);
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
