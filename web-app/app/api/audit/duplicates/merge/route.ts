export const dynamic = 'force-dynamic';
// file: web-app/app/api/audit/duplicates/merge/route.ts
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

interface MergeResult {
  success: boolean;
  primary_id: string;
  secondary_id: string;
  relationships_transferred: number;
  properties_merged: string[];
  dry_run: boolean;
  timestamp: string;
}

/**
 * POST /api/audit/duplicates/merge
 *
 * Merge two HistoricalFigure nodes into one, transferring all relationships and properties.
 *
 * Request Body:
 * - primary_id: canonical_id of the figure to keep
 * - secondary_id: canonical_id of the figure to merge into primary
 * - dry_run: if true, simulate the merge without making changes (default: false)
 *
 * Process:
 * 1. Validate both nodes exist
 * 2. Transfer all APPEARS_IN relationships to primary
 * 3. Transfer all other relationships (INTERACTED_WITH, NEMESIS_OF, etc.)
 * 4. Merge properties (keep non-null values, prefer primary)
 * 5. Create MERGED_FROM relationship for audit trail
 * 6. Soft-delete secondary node (add :Deleted label + deleted_at property)
 * 7. Update CREATED_BY to reflect merge action
 *
 * Returns:
 * - Detailed merge report with counts and property changes
 * - Transaction is atomic (all-or-nothing)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = session.user.email;

  try {
    const body = await request.json();
    const { primary_id, secondary_id, dry_run = false } = body;

    // Validate inputs
    if (!primary_id || !secondary_id) {
      return NextResponse.json(
        { error: 'Both primary_id and secondary_id are required' },
        { status: 400 }
      );
    }

    if (primary_id === secondary_id) {
      return NextResponse.json(
        { error: 'Cannot merge a figure with itself' },
        { status: 400 }
      );
    }

    const dbSession = await getSession();

    // Step 1: Validate both nodes exist
    const validationQuery = `
      MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
      MATCH (secondary:HistoricalFigure {canonical_id: $secondary_id})
      RETURN
        primary.name AS primary_name,
        secondary.name AS secondary_name,
        primary.wikidata_id AS primary_wikidata_id,
        secondary.wikidata_id AS secondary_wikidata_id
    `;

    const validationResult = await dbSession.run(validationQuery, {
      primary_id,
      secondary_id,
    });

    if (validationResult.records.length === 0) {
      await dbSession.close();
      return NextResponse.json(
        { error: 'One or both figures not found' },
        { status: 404 }
      );
    }

    const primaryName = validationResult.records[0].get('primary_name');
    const secondaryName = validationResult.records[0].get('secondary_name');
    const primaryWikidataId = validationResult.records[0].get('primary_wikidata_id');
    const secondaryWikidataId = validationResult.records[0].get('secondary_wikidata_id');

    // Prevent merging figures with different Wikidata Q-IDs (likely not duplicates)
    if (
      primaryWikidataId &&
      secondaryWikidataId &&
      primaryWikidataId.startsWith('Q') &&
      secondaryWikidataId.startsWith('Q') &&
      primaryWikidataId !== secondaryWikidataId
    ) {
      await dbSession.close();
      return NextResponse.json(
        {
          error: 'Cannot merge figures with different Wikidata Q-IDs',
          details: {
            primary: { id: primary_id, wikidata_id: primaryWikidataId },
            secondary: { id: secondary_id, wikidata_id: secondaryWikidataId },
          },
        },
        { status: 400 }
      );
    }

    if (dry_run) {
      // Dry run: count relationships that would be transferred
      const dryRunQuery = `
        MATCH (secondary:HistoricalFigure {canonical_id: $secondary_id})-[r]->()
        RETURN type(r) AS rel_type, count(r) AS count
      `;

      const dryRunResult = await dbSession.run(dryRunQuery, { secondary_id });
      const relationshipCounts = dryRunResult.records.map(record => ({
        type: record.get('rel_type'),
        count: toNumber(record.get('count')),
      }));

      await dbSession.close();

      return NextResponse.json({
        success: true,
        dry_run: true,
        primary: { id: primary_id, name: primaryName },
        secondary: { id: secondary_id, name: secondaryName },
        relationship_counts: relationshipCounts,
        message: 'Dry run completed. No changes made.',
      });
    }

    // Step 2-7: Perform actual merge (transaction)
    const mergeTimestamp = new Date().toISOString();
    const batch_id = `merge_${Date.now()}`;

    const mergeQuery = `
      MATCH (primary:HistoricalFigure {canonical_id: $primary_id})
      MATCH (secondary:HistoricalFigure {canonical_id: $secondary_id})

      // Ensure Merge Agent exists
      MERGE (agent:Agent {agent_id: "merge-operation"})
      ON CREATE SET
        agent.name = "Fictotum Merge Operation",
        agent.type = "system",
        agent.created_at = datetime(),
        agent.metadata = '{"operation":"duplicate_merge","description":"Automated merge of duplicate figures"}'

      // Step 2: Transfer all APPEARS_IN relationships
      WITH primary, secondary, agent
      MATCH (secondary)-[r:APPEARS_IN]->(m:MediaWork)
      WHERE NOT EXISTS((primary)-[:APPEARS_IN]->(m))
      CREATE (primary)-[new_r:APPEARS_IN]->(m)
      SET new_r = properties(r)
      DELETE r

      // Step 3: Transfer INTERACTED_WITH relationships
      WITH primary, secondary, agent
      OPTIONAL MATCH (secondary)-[r2:INTERACTED_WITH]->(target)
      WHERE NOT EXISTS((primary)-[:INTERACTED_WITH]->(target))
      FOREACH (ignored IN CASE WHEN r2 IS NOT NULL THEN [1] ELSE [] END |
        CREATE (primary)-[new_r2:INTERACTED_WITH]->(target)
        SET new_r2 = properties(r2)
        DELETE r2
      )

      // Step 4: Transfer NEMESIS_OF relationships
      WITH primary, secondary, agent
      OPTIONAL MATCH (secondary)-[r3:NEMESIS_OF]->(nemesis)
      WHERE NOT EXISTS((primary)-[:NEMESIS_OF]->(nemesis))
      FOREACH (ignored IN CASE WHEN r3 IS NOT NULL THEN [1] ELSE [] END |
        CREATE (primary)-[new_r3:NEMESIS_OF]->(nemesis)
        SET new_r3 = properties(r3)
        DELETE r3
      )

      // Step 5: Transfer PORTRAYED_IN relationships
      WITH primary, secondary, agent
      OPTIONAL MATCH (secondary)-[r4:PORTRAYED_IN]->(media)
      WHERE NOT EXISTS((primary)-[:PORTRAYED_IN]->(media))
      FOREACH (ignored IN CASE WHEN r4 IS NOT NULL THEN [1] ELSE [] END |
        CREATE (primary)-[new_r4:PORTRAYED_IN]->(media)
        SET new_r4 = properties(r4)
        DELETE r4
      )

      // Step 6: Merge properties (keep non-null, prefer primary)
      WITH primary, secondary, agent
      SET primary.wikidata_id = COALESCE(primary.wikidata_id, secondary.wikidata_id),
          primary.birth_year = COALESCE(primary.birth_year, secondary.birth_year),
          primary.death_year = COALESCE(primary.death_year, secondary.death_year),
          primary.description = COALESCE(primary.description, secondary.description),
          primary.era = COALESCE(primary.era, secondary.era),
          primary.title = COALESCE(primary.title, secondary.title),
          primary.wikidata_verified = COALESCE(primary.wikidata_verified, secondary.wikidata_verified),
          primary.data_source = COALESCE(primary.data_source, secondary.data_source),
          primary.last_merged_at = datetime($mergeTimestamp),
          primary.last_merged_from = $secondary_id

      // Step 7: Create MERGED_FROM audit trail
      CREATE (primary)-[:MERGED_FROM {
        timestamp: datetime($mergeTimestamp),
        merged_id: $secondary_id,
        merged_name: secondary.name,
        batch_id: $batch_id,
        performed_by: $userEmail
      }]->(secondary)

      // Step 8: Create CREATED_BY relationship for merge operation
      CREATE (primary)-[:CREATED_BY {
        timestamp: datetime($mergeTimestamp),
        context: "merge_operation",
        batch_id: $batch_id,
        method: "duplicate_merge"
      }]->(agent)

      // Step 9: Soft-delete secondary node
      SET secondary:Deleted,
          secondary.deleted_at = datetime($mergeTimestamp),
          secondary.deleted_reason = "Merged into " + $primary_id,
          secondary.deleted_by = $userEmail

      // Return counts for reporting
      WITH primary, secondary
      MATCH (primary)-[r:APPEARS_IN]->()
      WITH primary, secondary, count(r) AS appears_in_count
      RETURN
        primary.canonical_id AS primary_id,
        primary.name AS primary_name,
        secondary.canonical_id AS secondary_id,
        secondary.name AS secondary_name,
        appears_in_count
    `;

    const mergeResult = await dbSession.run(mergeQuery, {
      primary_id,
      secondary_id,
      mergeTimestamp,
      batch_id,
      userEmail,
    });

    await dbSession.close();

    if (mergeResult.records.length === 0) {
      return NextResponse.json(
        { error: 'Merge operation failed' },
        { status: 500 }
      );
    }

    const record = mergeResult.records[0];
    const result: MergeResult = {
      success: true,
      primary_id: record.get('primary_id'),
      secondary_id: record.get('secondary_id'),
      relationships_transferred: toNumber(record.get('appears_in_count')),
      properties_merged: [
        'wikidata_id',
        'birth_year',
        'death_year',
        'description',
        'era',
        'title',
      ],
      dry_run: false,
      timestamp: mergeTimestamp,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Figure merge error:', error);
    return NextResponse.json(
      { error: 'Internal server error during merge' },
      { status: 500 }
    );
  }
}
