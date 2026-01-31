import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET() {
  try {
    const session = await getSession();

    // Test 1: Count total HistoricalFigure nodes
    const countResult = await session.run(
      'MATCH (f:HistoricalFigure) RETURN count(f) as total'
    );
    const total = countResult.records[0]?.get('total')?.toNumber() ?? 0;

    // Test 2: Get sample nodes with properties
    const sampleResult = await session.run(
      'MATCH (f:HistoricalFigure) RETURN f LIMIT 5'
    );

    const samples = sampleResult.records.map(record => {
      const node = record.get('f');
      return node.properties;
    });

    // Test 3: Test search query
    const searchResult = await session.run(
      `MATCH (f:HistoricalFigure)
       WHERE toLower(f.name) CONTAINS toLower($query)
       RETURN f.canonical_id as id, f.name as name
       LIMIT 5`,
      { query: 'caesar' }
    );

    const searchResults = searchResult.records.map(record => ({
      id: record.get('id'),
      name: record.get('name')
    }));

    await session.close();

    return NextResponse.json({
      success: true,
      totalFigures: total,
      sampleNodes: samples,
      searchTest: searchResults
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
