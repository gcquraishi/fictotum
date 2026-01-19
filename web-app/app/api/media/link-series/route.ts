// file: web-app/app/api/media/link-series/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      childMediaId,
      parentSeriesId,
      sequenceNumber,
      seasonNumber,
      episodeNumber,
      relationshipType,
      isMainSeries
    } = body;

    if (!childMediaId || !parentSeriesId) {
      return NextResponse.json(
        { error: 'Both child media ID and parent series ID are required' },
        { status: 400 }
      );
    }

    const dbSession = await getSession();

    // Check if relationship already exists
    const checkResult = await dbSession.run(
      `MATCH (child:MediaWork {wikidata_id: $childWikidataId})-[r:PART_OF]->(parent:MediaWork {wikidata_id: $parentWikidataId})
       RETURN r`,
      { childWikidataId: childMediaId, parentWikidataId: parentSeriesId }
    );

    if (checkResult.records.length > 0) {
      await dbSession.close();
      return NextResponse.json(
        { error: 'This media work is already part of the specified series' },
        { status: 409 }
      );
    }

    // Create PART_OF relationship
    const result = await dbSession.run(
      `MATCH (child:MediaWork {wikidata_id: $childWikidataId}), (parent:MediaWork {wikidata_id: $parentWikidataId})
       CREATE (child)-[r:PART_OF {
         sequence_number: $sequenceNumber,
         season_number: $seasonNumber,
         episode_number: $episodeNumber,
         relationship_type: $relationshipType,
         is_main_series: $isMainSeries
       }]->(parent)
       RETURN child.wikidata_id AS child_id, parent.wikidata_id AS parent_id`,
      {
        childWikidataId: childMediaId,
        parentWikidataId: parentSeriesId,
        sequenceNumber: sequenceNumber ? parseInt(sequenceNumber) : null,
        seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
        episodeNumber: episodeNumber ? parseInt(episodeNumber) : null,
        relationshipType: relationshipType || 'part',
        isMainSeries: isMainSeries !== undefined ? isMainSeries : true,
      }
    );

    await dbSession.close();

    if (result.records.length === 0) {
      return NextResponse.json(
        { error: 'One or both media works not found' },
        { status: 404 }
      );
    }

    const record = result.records[0];
    return NextResponse.json({
      success: true,
      child_id: record.get('child_id'),
      parent_id: record.get('parent_id'),
    }, { status: 201 });
  } catch (error) {
    console.error('Link series API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
