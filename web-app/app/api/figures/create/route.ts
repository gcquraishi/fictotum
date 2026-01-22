// file: web-app/app/api/figures/create/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';
import { isInt } from 'neo4j-driver';

function toNumber(value: any): number {
  if (isInt(value)) {
    return value.toNumber();
  }
  return Number(value);
}

/**
 * Generate canonical_id from figure name
 * Following same pattern as media_id: lowercase, hyphens, no special chars
 */
function generateCanonicalId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return slug;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const body = await request.json();
    const {
      name,
      birthYear,
      deathYear,
      description,
      era,
      wikidataId,
      historicity,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!historicity) {
      return NextResponse.json(
        { error: 'Historicity is required' },
        { status: 400 }
      );
    }

    const canonical_id = generateCanonicalId(name);
    const dbSession = await getSession();

    // Check if figure already exists by canonical_id
    const checkResult = await dbSession.run(
      'MATCH (f:HistoricalFigure {canonical_id: $canonical_id}) RETURN f.canonical_id AS canonical_id, f.name AS name',
      { canonical_id }
    );

    if (checkResult.records.length > 0) {
      await dbSession.close();
      const existing = checkResult.records[0];
      return NextResponse.json(
        {
          error: 'This figure already exists in the database',
          existingFigure: {
            canonical_id: existing.get('canonical_id'),
            name: existing.get('name'),
          }
        },
        { status: 409 }
      );
    }

    // Create new HistoricalFigure node
    const batch_id = `web_ui_${Date.now()}`;
    const query = `
      MATCH (u:User {email: $userEmail})
      CREATE (f:HistoricalFigure {
        canonical_id: $canonical_id,
        name: $name,
        birth_year: $birthYear,
        death_year: $deathYear,
        description: $description,
        era: $era,
        wikidata_id: $wikidataId,
        historicity: $historicity,
        created_at: timestamp(),
        created_by: u.email,
        created_by_name: u.name,
        ingestion_batch: $batchId,
        ingestion_source: "web_ui"
      })
      RETURN f.canonical_id AS canonical_id, f.name AS name
    `;

    const result = await dbSession.run(query, {
      canonical_id,
      name,
      birthYear: birthYear ? parseInt(birthYear) : null,
      deathYear: deathYear ? parseInt(deathYear) : null,
      description: description || null,
      era: era || null,
      wikidataId: wikidataId || null,
      historicity,
      userEmail,
      batchId: batch_id,
    });

    await dbSession.close();

    const record = result.records[0];
    const newFigure = {
      canonical_id: record.get('canonical_id'),
      name: record.get('name'),
    };

    return NextResponse.json(newFigure, { status: 201 });
  } catch (error) {
    console.error('Figure creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
