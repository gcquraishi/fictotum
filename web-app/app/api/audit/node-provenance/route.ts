export const dynamic = 'force-dynamic';
// file: web-app/app/api/audit/node-provenance/route.ts
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

interface ProvenanceRecord {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  created_by_agent: string;
  created_at: string | null;
  creation_context: string | null;
  batch_id: string | null;
  method: string | null;
  agent_type: string | null;
  user_email: string | null;
  user_name: string | null;
}

/**
 * GET /api/audit/node-provenance
 *
 * Query node provenance (CREATED_BY relationships) with filtering options.
 *
 * Query Parameters:
 * - entity_id: Filter by specific entity ID (canonical_id, media_id, wikidata_id, char_id)
 * - node_type: Filter by node type (HistoricalFigure, MediaWork, FictionalCharacter)
 * - agent_id: Filter by creating agent
 * - context: Filter by creation context (bulk_ingestion, web_ui, api, migration)
 * - since: Filter by creation date (ISO 8601 format, e.g., "2025-01-01T00:00:00Z")
 * - limit: Maximum number of results (default: 100, max: 1000)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityId = searchParams.get('entity_id');
    const nodeType = searchParams.get('node_type');
    const agentId = searchParams.get('agent_id');
    const context = searchParams.get('context');
    const since = searchParams.get('since');
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100'),
      1000
    );

    // Build dynamic WHERE clause based on filters
    const whereClauses: string[] = [];
    const params: any = { limit };

    if (entityId) {
      whereClauses.push(`(
        n.canonical_id = $entityId OR
        n.media_id = $entityId OR
        n.wikidata_id = $entityId OR
        n.char_id = $entityId
      )`);
      params.entityId = entityId;
    }

    if (nodeType) {
      whereClauses.push(`$nodeType IN labels(n)`);
      params.nodeType = nodeType;
    }

    if (agentId) {
      whereClauses.push(`a.agent_id = $agentId`);
      params.agentId = agentId;
    }

    if (context) {
      whereClauses.push(`r.context = $context`);
      params.context = context;
    }

    if (since) {
      whereClauses.push(`r.timestamp >= datetime($since)`);
      params.since = since;
    }

    const whereClause = whereClauses.length > 0
      ? `WHERE ${whereClauses.join(' AND ')}`
      : '';

    const query = `
      MATCH (n)-[r:CREATED_BY]->(a:Agent)
      ${whereClause}
      OPTIONAL MATCH (u:User {email: n.created_by})
      RETURN
        coalesce(n.canonical_id, n.media_id, n.wikidata_id, n.char_id) AS entity_id,
        labels(n)[0] AS entity_type,
        coalesce(n.name, n.title) AS entity_name,
        a.name AS created_by_agent,
        a.agent_id AS agent_id,
        a.type AS agent_type,
        r.timestamp AS created_at,
        r.context AS creation_context,
        r.batch_id AS batch_id,
        r.method AS method,
        u.email AS user_email,
        u.name AS user_name
      ORDER BY r.timestamp DESC
      LIMIT $limit
    `;

    const dbSession = await getSession();
    const result = await dbSession.run(query, params);
    await dbSession.close();

    const provenance: ProvenanceRecord[] = result.records.map((record) => ({
      entity_id: record.get('entity_id'),
      entity_type: record.get('entity_type'),
      entity_name: record.get('entity_name'),
      created_by_agent: record.get('created_by_agent'),
      agent_id: record.get('agent_id'),
      agent_type: record.get('agent_type'),
      created_at: record.get('created_at')
        ? record.get('created_at').toString()
        : null,
      creation_context: record.get('creation_context'),
      batch_id: record.get('batch_id'),
      method: record.get('method'),
      user_email: record.get('user_email'),
      user_name: record.get('user_name'),
    }));

    return NextResponse.json({
      count: provenance.length,
      provenance,
    });
  } catch (error) {
    console.error('Provenance audit error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provenance data' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/audit/node-provenance/stats
 *
 * Get aggregated statistics about node provenance.
 *
 * Returns:
 * - Counts by agent
 * - Counts by node type
 * - Counts by creation context
 * - Counts by creation method
 */
export async function POST(request: NextRequest) {
  try {
    const dbSession = await getSession();

    // Get counts by agent
    const agentStatsResult = await dbSession.run(`
      MATCH ()-[r:CREATED_BY]->(a:Agent)
      RETURN
        a.name AS agent_name,
        a.agent_id AS agent_id,
        a.type AS agent_type,
        count(r) AS count
      ORDER BY count DESC
    `);

    const agentStats = agentStatsResult.records.map((record) => ({
      agent_name: record.get('agent_name'),
      agent_id: record.get('agent_id'),
      agent_type: record.get('agent_type'),
      count: toNumber(record.get('count')),
    }));

    // Get counts by node type
    const nodeTypeStatsResult = await dbSession.run(`
      MATCH (n)-[:CREATED_BY]->()
      RETURN labels(n)[0] AS node_type, count(n) AS count
      ORDER BY count DESC
    `);

    const nodeTypeStats = nodeTypeStatsResult.records.map((record) => ({
      node_type: record.get('node_type'),
      count: toNumber(record.get('count')),
    }));

    // Get counts by creation context
    const contextStatsResult = await dbSession.run(`
      MATCH ()-[r:CREATED_BY]->()
      RETURN r.context AS context, count(r) AS count
      ORDER BY count DESC
    `);

    const contextStats = contextStatsResult.records.map((record) => ({
      context: record.get('context'),
      count: toNumber(record.get('count')),
    }));

    // Get counts by method
    const methodStatsResult = await dbSession.run(`
      MATCH ()-[r:CREATED_BY]->()
      WHERE r.method IS NOT NULL
      RETURN r.method AS method, count(r) AS count
      ORDER BY count DESC
    `);

    const methodStats = methodStatsResult.records.map((record) => ({
      method: record.get('method'),
      count: toNumber(record.get('count')),
    }));

    // Get nodes missing provenance
    const missingProvenanceResult = await dbSession.run(`
      MATCH (n)
      WHERE (n:HistoricalFigure OR n:MediaWork OR n:FictionalCharacter)
        AND NOT EXISTS((n)-[:CREATED_BY]->())
      RETURN labels(n)[0] AS node_type, count(n) AS count
      ORDER BY count DESC
    `);

    const missingProvenance = missingProvenanceResult.records.map((record) => ({
      node_type: record.get('node_type'),
      count: toNumber(record.get('count')),
    }));

    await dbSession.close();

    return NextResponse.json({
      by_agent: agentStats,
      by_node_type: nodeTypeStats,
      by_context: contextStats,
      by_method: methodStats,
      missing_provenance: missingProvenance,
    });
  } catch (error) {
    console.error('Provenance stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provenance statistics' },
      { status: 500 }
    );
  }
}
