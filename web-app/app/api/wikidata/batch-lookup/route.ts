export const dynamic = 'force-dynamic';
// file: web-app/app/api/wikidata/batch-lookup/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { batchEnrichFigures, batchEnrichMedia } from '@/lib/wikidata-batch';
import { withCache } from '@/lib/cache';

/**
 * POST /api/wikidata/batch-lookup
 *
 * Batch fetch Wikidata entity data for multiple Q-IDs.
 *
 * Request Body:
 * {
 *   "ids": ["Q1430", "Q1446", "Q174583"],
 *   "type": "figure" | "media"  // Default: "figure"
 * }
 *
 * Response:
 * {
 *   "Q1430": {
 *     "wikidata_id": "Q1430",
 *     "name": "Marcus Aurelius",
 *     "birth_year": 121,
 *     "death_year": 180,
 *     "occupation": "Q4964182",
 *     "description": "Roman emperor from 161 to 180 and a Stoic philosopher",
 *     ...
 *   },
 *   "Q1446": { ... },
 *   ...
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, type = 'figure' } = body;

    // Validate input
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be an array' },
        { status: 400 }
      );
    }

    if (ids.length === 0) {
      return NextResponse.json({});
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Too many IDs: maximum 100 per request' },
        { status: 400 }
      );
    }

    // Validate Q-IDs
    const validQids: string[] = [];
    for (const id of ids) {
      if (typeof id === 'string' && /^Q\d+$/.test(id)) {
        validQids.push(id);
      } else {
        console.warn(`[Batch Lookup] Invalid Q-ID: ${id}`);
      }
    }

    if (validQids.length === 0) {
      return NextResponse.json(
        { error: 'No valid Q-IDs provided' },
        { status: 400 }
      );
    }

    // Cache batch lookups for 30 days (Wikidata data rarely changes)
    const cacheKey = `wikidata:batch:${type}:${validQids.sort().join(',')}`;
    const enrichedData = await withCache(
      cacheKey,
      async () => {
        console.log(`[Batch Lookup] Fetching ${validQids.length} ${type} entities from Wikidata`);

        let enrichedMap;
        if (type === 'media') {
          enrichedMap = await batchEnrichMedia(validQids);
        } else {
          enrichedMap = await batchEnrichFigures(validQids);
        }

        // Convert Map to plain object for JSON serialization
        const result: Record<string, any> = {};
        for (const [qid, data] of enrichedMap) {
          result[qid] = data;
        }

        return result;
      },
      { ttl: 1000 * 60 * 60 * 24 * 30, cacheType: 'figures' } // 30 days
    );

    return NextResponse.json(enrichedData);
  } catch (error) {
    console.error('[Batch Lookup Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch Wikidata entities' },
      { status: 500 }
    );
  }
}
