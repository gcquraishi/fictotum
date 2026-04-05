export const dynamic = 'force-dynamic';
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
 * Generate canonical_id for HistoricalFigure using Wikidata-first approach
 *
 * Priority 1: Use Wikidata Q-ID if available (e.g., "Q517" for Napoleon)
 * Priority 2: Generate provisional ID with timestamp to prevent collisions
 *
 * Provisional format: PROV:{slug}-{timestamp}
 * Example: "PROV:john-smith-1738462847293"
 *
 * This prevents collisions between figures with identical names (e.g., multiple "John Smith" entries)
 * while maintaining alignment with the MediaWork Wikidata-first strategy.
 */
function generateCanonicalId(name: string, wikidataId?: string, birthYear?: number): string {
  // Priority 1: Use Wikidata Q-ID as canonical_id if available
  if (wikidataId && wikidataId.startsWith('Q') && !wikidataId.startsWith('PROV:')) {
    return wikidataId;
  }

  // Priority 2: Generate provisional ID with timestamp to ensure uniqueness
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  // Use timestamp to prevent collisions for figures with identical names
  const timestamp = Date.now();
  return `PROV:${slug}-${timestamp}`;
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
      wikidata_verified,
      data_source,
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

    // Generate canonical_id using Wikidata-first approach
    const canonical_id = generateCanonicalId(name, wikidataId, birthYear ? parseInt(birthYear) : undefined);
    const dbSession = await getSession();

    // Dual-key duplicate check: prioritize wikidata_id, fall back to canonical_id
    // This prevents duplicates via either Q-ID match or provisional ID match
    let checkQuery = 'MATCH (f:HistoricalFigure) WHERE ';
    const queryParams: any = { canonical_id };

    if (wikidataId && wikidataId.startsWith('Q')) {
      // If Q-ID provided, check for Q-ID match first
      checkQuery += 'f.wikidata_id = $wikidataId OR f.canonical_id = $canonical_id';
      queryParams.wikidataId = wikidataId;
    } else {
      // No Q-ID, just check canonical_id
      checkQuery += 'f.canonical_id = $canonical_id';
    }

    checkQuery += ' RETURN f.canonical_id AS canonical_id, f.name AS name, f.wikidata_id AS wikidata_id';

    const checkResult = await dbSession.run(checkQuery, queryParams);

    if (checkResult.records.length > 0) {
      await dbSession.close();
      const existing = checkResult.records[0];
      return NextResponse.json(
        {
          error: 'This figure already exists in the database',
          existingFigure: {
            canonical_id: existing.get('canonical_id'),
            name: existing.get('name'),
            wikidata_id: existing.get('wikidata_id'),
          }
        },
        { status: 409 }
      );
    }

    // Determine data quality flags based on wikidataId if not explicitly provided
    const wikidataVerified = wikidata_verified !== undefined
      ? wikidata_verified
      : (wikidataId ? true : false);

    const dataSource = data_source || (wikidataId ? 'wikidata' : 'user_generated');

    // Create new HistoricalFigure node with CREATED_BY provenance
    const batch_id = `web_ui_${Date.now()}`;
    const query = `
      MATCH (u:User {email: $userEmail})

      // Ensure Web UI Agent exists
      MERGE (agent:Agent {agent_id: "web-ui-generic"})
      ON CREATE SET
        agent.name = "Fictotum Web UI",
        agent.type = "human_user",
        agent.created_at = datetime(),
        agent.metadata = '{"interface":"web_ui","description":"Generic agent for web UI contributions"}'

      // Create HistoricalFigure node
      CREATE (f:HistoricalFigure {
        canonical_id: $canonical_id,
        name: $name,
        birth_year: $birthYear,
        death_year: $deathYear,
        description: $description,
        era: $era,
        wikidata_id: $wikidataId,
        wikidata_verified: $wikidataVerified,
        data_source: $dataSource,
        historicity: $historicity,
        created_at: timestamp(),
        created_by: u.email,
        created_by_name: u.name,
        ingestion_batch: $batchId,
        ingestion_source: "web_ui"
      })

      // Create CREATED_BY relationship for provenance tracking
      CREATE (f)-[:CREATED_BY {
        timestamp: datetime(),
        context: "web_ui",
        batch_id: $batchId,
        method: $dataSource
      }]->(agent)

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
      wikidataVerified,
      dataSource,
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
