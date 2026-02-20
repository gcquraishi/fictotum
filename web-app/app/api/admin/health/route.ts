export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

/**
 * CHR-42: Neo4j Health Monitoring API
 *
 * Provides comprehensive database health metrics including:
 * - Node and relationship counts
 * - Orphaned node detection
 * - Query performance statistics
 * - Data quality metrics
 */

interface HealthMetrics {
  timestamp: string;
  database: {
    total_nodes: number;
    total_relationships: number;
    nodes_by_label: Record<string, number>;
    relationships_by_type: Record<string, number>;
  };
  data_quality: {
    orphaned_nodes: number;
    orphaned_nodes_list: Array<{ label: string; count: number }>;
    figures_without_era: number;
    figures_without_wikidata: number;
    media_without_wikidata: number;
    figures_without_portrayals: number;
  };
  indexes: {
    total_indexes: number;
    online_indexes: number;
    index_usage: Array<{
      name: string;
      read_count: number;
      entity_type: string;
      properties: string[];
    }>;
  };
  performance: {
    avg_query_time_ms: number | null;
    slow_queries_count: number;
  };
}

export async function GET(request: Request) {
  try {
    // Authentication check (optional - enable for production)
    // const session = await getServerSession(authOptions);
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json or csv

    // Import Neo4j driver
    const neo4j = require('neo4j-driver');
    const driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );

    const session = driver.session({ database: 'neo4j' });

    try {
      // 1. Node and Relationship Counts
      const countsResult = await session.run(`
        MATCH (n)
        RETURN labels(n)[0] as label, count(*) as count
        ORDER BY count DESC
      `);

      const nodes_by_label: Record<string, number> = {};
      let total_nodes = 0;
      for (const record of countsResult.records) {
        const label = record.get('label');
        const count = record.get('count').toNumber();
        nodes_by_label[label] = count;
        total_nodes += count;
      }

      const relCountsResult = await session.run(`
        MATCH ()-[r]->()
        RETURN type(r) as rel_type, count(*) as count
        ORDER BY count DESC
      `);

      const relationships_by_type: Record<string, number> = {};
      let total_relationships = 0;
      for (const record of relCountsResult.records) {
        const rel_type = record.get('rel_type');
        const count = record.get('count').toNumber();
        relationships_by_type[rel_type] = count;
        total_relationships += count;
      }

      // 2. Orphaned Nodes Detection
      const orphanedResult = await session.run(`
        MATCH (n)
        WHERE NOT (n)-[]-()
        RETURN labels(n)[0] as label, count(*) as count
        ORDER BY count DESC
      `);

      const orphaned_nodes_list: Array<{ label: string; count: number }> = [];
      let total_orphaned = 0;
      for (const record of orphanedResult.records) {
        const label = record.get('label');
        const count = record.get('count').toNumber();
        orphaned_nodes_list.push({ label, count });
        total_orphaned += count;
      }

      // 3. Data Quality Metrics
      const figuresWithoutEra = await session.run(`
        MATCH (f:HistoricalFigure)
        WHERE f.era IS NULL
        RETURN count(f) as count
      `);

      const figuresWithoutWikidata = await session.run(`
        MATCH (f:HistoricalFigure)
        WHERE f.wikidata_id IS NULL
        RETURN count(f) as count
      `);

      const mediaWithoutWikidata = await session.run(`
        MATCH (m:MediaWork)
        WHERE m.wikidata_id IS NULL
        RETURN count(m) as count
      `);

      const figuresWithoutPortrayals = await session.run(`
        MATCH (f:HistoricalFigure)
        WHERE NOT (f)-[:APPEARS_IN]->()
        RETURN count(f) as count
      `);

      // 4. Index Usage Statistics
      const indexesResult = await session.run(`
        SHOW INDEXES
        YIELD name, entityType, properties, state, readCount
        WHERE readCount IS NOT NULL
        RETURN name, entityType, properties, state, readCount
        ORDER BY readCount DESC
        LIMIT 20
      `);

      const index_usage: Array<{
        name: string;
        read_count: number;
        entity_type: string;
        properties: string[];
      }> = [];

      let online_indexes = 0;
      for (const record of indexesResult.records) {
        const name = record.get('name');
        const entityType = record.get('entityType');
        const properties = record.get('properties') || [];
        const state = record.get('state');
        const readCount = record.get('readCount') ? record.get('readCount').toNumber() : 0;

        if (state === 'ONLINE') {
          online_indexes++;
        }

        index_usage.push({
          name,
          read_count: readCount,
          entity_type: entityType,
          properties,
        });
      }

      // Get total index count
      const totalIndexResult = await session.run(`
        SHOW INDEXES
        YIELD name
        RETURN count(name) as total
      `);
      const total_indexes = totalIndexResult.records[0].get('total').toNumber();

      // 5. Performance Metrics (placeholder - would need query logging for real data)
      // For now, just flag slow queries as 0
      const performance = {
        avg_query_time_ms: null,
        slow_queries_count: 0,
      };

      // Build response
      const metrics: HealthMetrics = {
        timestamp: new Date().toISOString(),
        database: {
          total_nodes,
          total_relationships,
          nodes_by_label,
          relationships_by_type,
        },
        data_quality: {
          orphaned_nodes: total_orphaned,
          orphaned_nodes_list,
          figures_without_era: figuresWithoutEra.records[0].get('count').toNumber(),
          figures_without_wikidata: figuresWithoutWikidata.records[0].get('count').toNumber(),
          media_without_wikidata: mediaWithoutWikidata.records[0].get('count').toNumber(),
          figures_without_portrayals: figuresWithoutPortrayals.records[0].get('count').toNumber(),
        },
        indexes: {
          total_indexes,
          online_indexes,
          index_usage,
        },
        performance,
      };

      // CSV export
      if (format === 'csv') {
        const csv = convertHealthMetricsToCSV(metrics);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="fictotum-health-${Date.now()}.csv"`,
          },
        });
      }

      return NextResponse.json(metrics);
    } finally {
      await session.close();
      await driver.close();
    }
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Convert health metrics to CSV format
 */
function convertHealthMetricsToCSV(metrics: HealthMetrics): string {
  const lines: string[] = [];

  // Header
  lines.push('Fictotum Database Health Report');
  lines.push(`Generated: ${metrics.timestamp}`);
  lines.push('');

  // Database Stats
  lines.push('DATABASE STATISTICS');
  lines.push('Label,Count');
  for (const [label, count] of Object.entries(metrics.database.nodes_by_label)) {
    lines.push(`${label},${count}`);
  }
  lines.push(`TOTAL NODES,${metrics.database.total_nodes}`);
  lines.push('');

  lines.push('RELATIONSHIPS');
  lines.push('Type,Count');
  for (const [type, count] of Object.entries(metrics.database.relationships_by_type)) {
    lines.push(`${type},${count}`);
  }
  lines.push(`TOTAL RELATIONSHIPS,${metrics.database.total_relationships}`);
  lines.push('');

  // Data Quality
  lines.push('DATA QUALITY METRICS');
  lines.push('Metric,Count');
  lines.push(`Orphaned Nodes,${metrics.data_quality.orphaned_nodes}`);
  lines.push(`Figures Without Era,${metrics.data_quality.figures_without_era}`);
  lines.push(`Figures Without Wikidata,${metrics.data_quality.figures_without_wikidata}`);
  lines.push(`Media Without Wikidata,${metrics.data_quality.media_without_wikidata}`);
  lines.push(`Figures Without Portrayals,${metrics.data_quality.figures_without_portrayals}`);
  lines.push('');

  // Index Usage
  lines.push('INDEX USAGE (TOP 20)');
  lines.push('Index Name,Entity Type,Read Count,Properties');
  for (const index of metrics.indexes.index_usage) {
    lines.push(
      `${index.name},${index.entity_type},${index.read_count},"${index.properties.join(', ')}"`
    );
  }

  return lines.join('\n');
}
