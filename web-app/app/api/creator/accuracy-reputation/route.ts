export const dynamic = 'force-dynamic';
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const creator = request.nextUrl.searchParams.get('creator');

  if (!creator) {
    return NextResponse.json({ error: 'Creator parameter is required' }, { status: 400 });
  }

  const session = await getSession();

  try {
    // Get conflict and anachronism flags across all of this creator's works
    const result = await session.run(
      `
      MATCH (m:MediaWork {creator: $creator})<-[r:APPEARS_IN]-(f:HistoricalFigure)
      WITH m, r, f
      RETURN
        count(DISTINCT m) AS totalWorks,
        count(*) AS totalPortrayals,
        count(CASE WHEN r.conflict_flag = true THEN 1 END) AS conflictCount,
        count(CASE WHEN r.anachronism_flag = true THEN 1 END) AS anachronismCount,
        count(DISTINCT CASE WHEN r.conflict_flag = true OR r.anachronism_flag = true THEN m END) AS flaggedWorks,
        collect(DISTINCT CASE WHEN r.conflict_flag = true THEN {
          figure: f.name,
          work: m.title,
          notes: r.conflict_notes
        } END)[0..10] AS conflictDetails,
        collect(DISTINCT CASE WHEN r.anachronism_flag = true THEN {
          figure: f.name,
          work: m.title,
          notes: r.anachronism_notes
        } END)[0..10] AS anachronismDetails
      `,
      { creator }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    const record = result.records[0];
    const totalWorks = record.get('totalWorks')?.toNumber?.() ?? 0;
    const totalPortrayals = record.get('totalPortrayals')?.toNumber?.() ?? 0;
    const conflictCount = record.get('conflictCount')?.toNumber?.() ?? 0;
    const anachronismCount = record.get('anachronismCount')?.toNumber?.() ?? 0;
    const flaggedWorks = record.get('flaggedWorks')?.toNumber?.() ?? 0;
    const conflictDetails = (record.get('conflictDetails') || []).filter(Boolean);
    const anachronismDetails = (record.get('anachronismDetails') || []).filter(Boolean);

    const totalFlags = conflictCount + anachronismCount;
    const cleanWorks = totalWorks - flaggedWorks;
    const accuracyScore = totalWorks > 0 ? Math.round((cleanWorks / totalWorks) * 100) : 100;

    // Determine tier
    let tier: string;
    if (accuracyScore >= 90 && totalFlags <= 1) {
      tier = 'Historical Purist';
    } else if (accuracyScore >= 70 && totalFlags <= 5) {
      tier = 'Historically Grounded';
    } else if (accuracyScore >= 40) {
      tier = 'Creative License';
    } else {
      tier = 'Historical Fantasy';
    }

    // Get database average for comparison
    const avgResult = await session.run(`
      MATCH (m:MediaWork)<-[r:APPEARS_IN]-(f:HistoricalFigure)
      WHERE m.creator IS NOT NULL
      WITH m.creator AS c,
           count(DISTINCT m) AS works,
           count(DISTINCT CASE WHEN r.conflict_flag = true OR r.anachronism_flag = true THEN m END) AS flagged
      WHERE works >= 3
      WITH c, toFloat(works - flagged) / works * 100 AS score
      RETURN avg(score) AS avgAccuracy, count(c) AS totalCreators
    `);

    const avgRecord = avgResult.records[0];
    const avgAccuracy = avgRecord?.get('avgAccuracy') ?? null;
    const totalCreators = avgRecord?.get('totalCreators')?.toNumber?.() ?? 0;

    // Calculate percentile (what % of creators have lower accuracy)
    let percentile: number | null = null;
    if (totalCreators > 0 && avgAccuracy !== null) {
      const rankResult = await session.run(`
        MATCH (m:MediaWork)<-[r:APPEARS_IN]-(f:HistoricalFigure)
        WHERE m.creator IS NOT NULL
        WITH m.creator AS c,
             count(DISTINCT m) AS works,
             count(DISTINCT CASE WHEN r.conflict_flag = true OR r.anachronism_flag = true THEN m END) AS flagged
        WHERE works >= 3
        WITH c, toFloat(works - flagged) / works * 100 AS score
        RETURN count(CASE WHEN score < $accuracyScore THEN 1 END) AS belowCount
      `, { accuracyScore: accuracyScore * 1.0 });

      const belowCount = rankResult.records[0]?.get('belowCount')?.toNumber?.() ?? 0;
      percentile = totalCreators > 0 ? Math.round((belowCount / totalCreators) * 100) : null;
    }

    return NextResponse.json({
      accuracyScore,
      tier,
      totalWorks,
      totalPortrayals,
      conflictCount,
      anachronismCount,
      totalFlags,
      flaggedWorks,
      cleanWorks,
      conflictDetails,
      anachronismDetails,
      percentile,
      avgAccuracy: avgAccuracy !== null ? Math.round(avgAccuracy) : null,
    });
  } catch (error) {
    console.error('Error fetching accuracy reputation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await session.close();
  }
}
