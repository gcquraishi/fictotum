export const dynamic = 'force-dynamic';
// file: web-app/app/api/wikidata/enrich/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { checkExistingMediaWorkByQid, checkExistingFigureByQid } from '@/lib/db';
import { findSimilarMediaWork, findSimilarFigure } from '@/lib/wikidata';

/**
 * Wikidata Enrichment Endpoint
 *
 * Fetches detailed Wikidata properties for historical figures and media works.
 * Used by the unified data ingestion hub to enrich entity records.
 *
 * For works: P840 (narrative location), P2408 (set in period), P577 (publication date)
 * For figures: P569 (birth), P570 (death), P106 (occupation), P27 (citizenship)
 *
 * CHR-17 Deduplication Behavior:
 * This endpoint now performs two-phase deduplication to prevent duplicate search results:
 * - Phase 1: Exact wikidata_id matching - filters out any Wikidata results that already exist in database
 * - Phase 2: Similarity matching - filters out Wikidata results that are similar to existing database entries
 *   (uses enhanced name similarity: 70% lexical + 30% phonetic matching)
 *
 * Deduplication stats are returned in the response for monitoring and debugging.
 */

interface WikidataMatch {
  qid: string;
  label: string;
  description?: string;
  confidence: 'high' | 'medium' | 'low';
  entityType?: 'figure' | 'work'; // CHR-17: Track whether result is a figure or work
}

interface EnrichedWorkData {
  narrative_locations?: Array<{ qid: string; label: string }>;
  set_in_periods?: Array<{ qid: string; label: string; start_year?: number; end_year?: number }>;
  publication_date?: string;
  publication_year?: number;
  media_type?: string; // CHR-20: Media type from Wikidata P31 (instance of)
  setting_year?: number; // CHR-20: Setting year from publication or narrative period
}

interface EnrichedFigureData {
  birth_year?: number;
  birth_date?: string;
  death_year?: number;
  death_date?: string;
  occupations?: Array<{ qid: string; label: string }>;
  citizenships?: Array<{ qid: string; label: string }>;
  isCreator?: boolean;
  worksCount?: number;
}

type EnrichedData = EnrichedWorkData | EnrichedFigureData;

/**
 * Fetch Wikidata entity data with timeout
 */
async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Fictotum/1.0 (https://fictotum.com; Data Enrichment)',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Extract year from Wikidata time value
 * Format: +YYYY-MM-DDTHH:MM:SSZ or similar
 */
function extractYear(timeValue: string): number | undefined {
  if (!timeValue) return undefined;

  const match = timeValue.match(/([+-]?\d+)-/);
  if (match) {
    const year = parseInt(match[1], 10);
    return year > 0 ? year : Math.abs(year); // Handle BCE dates
  }

  return undefined;
}

/**
 * Get label for a Wikidata entity
 */
async function getEntityLabel(qid: string): Promise<string | undefined> {
  try {
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action', 'wbgetentities');
    url.searchParams.set('ids', qid);
    url.searchParams.set('props', 'labels');
    url.searchParams.set('languages', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) return undefined;

    const data = await response.json();
    return data.entities?.[qid]?.labels?.en?.value;
  } catch (error) {
    console.error(`Failed to fetch label for ${qid}:`, error);
    return undefined;
  }
}

/**
 * Enrich a Media Work with Wikidata properties
 */
async function enrichMediaWork(wikidataId: string): Promise<EnrichedWorkData> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', wikidataId);
  url.searchParams.set('props', 'claims');
  url.searchParams.set('format', 'json');

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Wikidata API returned ${response.status}`);
  }

  const data = await response.json();
  const entity = data.entities?.[wikidataId];

  if (!entity || 'missing' in entity) {
    throw new Error(`Q-ID ${wikidataId} not found in Wikidata`);
  }

  const enrichedData: EnrichedWorkData = {};

  // P840: Narrative location
  if (entity.claims?.P840) {
    const locationClaims = entity.claims.P840;
    enrichedData.narrative_locations = await Promise.all(
      locationClaims.slice(0, 5).map(async (claim: any) => {
        const locationQid = claim.mainsnak?.datavalue?.value?.id;
        if (locationQid) {
          const label = await getEntityLabel(locationQid);
          return { qid: locationQid, label: label || locationQid };
        }
        return null;
      })
    ).then(results => results.filter(Boolean) as Array<{ qid: string; label: string }>);
  }

  // P2408: Set in period
  if (entity.claims?.P2408) {
    const periodClaims = entity.claims.P2408;
    enrichedData.set_in_periods = await Promise.all(
      periodClaims.slice(0, 5).map(async (claim: any) => {
        const periodQid = claim.mainsnak?.datavalue?.value?.id;
        if (periodQid) {
          const label = await getEntityLabel(periodQid);
          // TODO: Could fetch period start/end years from the period entity
          return { qid: periodQid, label: label || periodQid };
        }
        return null;
      })
    ).then(results => results.filter(Boolean) as Array<{ qid: string; label: string }>);
  }

  // P577: Publication date
  if (entity.claims?.P577) {
    const pubDateClaim = entity.claims.P577[0];
    const timeValue = pubDateClaim?.mainsnak?.datavalue?.value?.time;
    if (timeValue) {
      enrichedData.publication_date = timeValue;
      enrichedData.publication_year = extractYear(timeValue);
    }
  }

  // P31: Instance of (media type)
  // Map Wikidata types to Fictotum media types
  if (entity.claims?.P31) {
    const instanceClaims = entity.claims.P31;
    const typeQid = instanceClaims[0]?.mainsnak?.datavalue?.value?.id;

    // Mapping of common Wikidata Q-IDs to media types
    const typeMapping: Record<string, string> = {
      'Q7725634': 'Novel',           // literary work
      'Q8261': 'Novel',              // novel
      'Q11424': 'Film',              // film
      'Q5398426': 'TV Series',       // television series
      'Q21191270': 'TV Series',      // television series episode
      'Q506240': 'Theatre',          // theatrical play
      'Q482994': 'Album',            // album
      'Q7889': 'Video Game',         // video game
      'Q1344': 'Opera',              // opera
      'Q213665': 'Comic',            // comic
      'Q1261214': 'Documentary',     // documentary film
      'Q24862': 'Short Film'         // short film
    };

    if (typeQid && typeMapping[typeQid]) {
      enrichedData.media_type = typeMapping[typeQid];
    } else {
      // Default to "Novel" if type unknown but it's a work
      enrichedData.media_type = 'Novel';
    }
  }

  return enrichedData;
}

/**
 * Enrich a Historical Figure with Wikidata properties
 */
async function enrichHistoricalFigure(wikidataId: string): Promise<EnrichedFigureData> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', wikidataId);
  url.searchParams.set('props', 'claims');
  url.searchParams.set('format', 'json');

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Wikidata API returned ${response.status}`);
  }

  const data = await response.json();
  const entity = data.entities?.[wikidataId];

  if (!entity || 'missing' in entity) {
    throw new Error(`Q-ID ${wikidataId} not found in Wikidata`);
  }

  const enrichedData: EnrichedFigureData = {};

  // P569: Birth date
  if (entity.claims?.P569) {
    const birthClaim = entity.claims.P569[0];
    const timeValue = birthClaim?.mainsnak?.datavalue?.value?.time;
    if (timeValue) {
      enrichedData.birth_date = timeValue;
      enrichedData.birth_year = extractYear(timeValue);
    }
  }

  // P570: Death date
  if (entity.claims?.P570) {
    const deathClaim = entity.claims.P570[0];
    const timeValue = deathClaim?.mainsnak?.datavalue?.value?.time;
    if (timeValue) {
      enrichedData.death_date = timeValue;
      enrichedData.death_year = extractYear(timeValue);
    }
  }

  // P106: Occupation
  if (entity.claims?.P106) {
    const occupationClaims = entity.claims.P106;
    enrichedData.occupations = await Promise.all(
      occupationClaims.slice(0, 5).map(async (claim: any) => {
        const occupationQid = claim.mainsnak?.datavalue?.value?.id;
        if (occupationQid) {
          const label = await getEntityLabel(occupationQid);
          return { qid: occupationQid, label: label || occupationQid };
        }
        return null;
      })
    ).then(results => results.filter(Boolean) as Array<{ qid: string; label: string }>);
  }

  // P27: Country of citizenship
  if (entity.claims?.P27) {
    const citizenshipClaims = entity.claims.P27;
    enrichedData.citizenships = await Promise.all(
      citizenshipClaims.slice(0, 3).map(async (claim: any) => {
        const citizenshipQid = claim.mainsnak?.datavalue?.value?.id;
        if (citizenshipQid) {
          const label = await getEntityLabel(citizenshipQid);
          return { qid: citizenshipQid, label: label || citizenshipQid };
        }
        return null;
      })
    ).then(results => results.filter(Boolean) as Array<{ qid: string; label: string }>);
  }

  // Check if this person is a creator by looking for notable works
  // P800 = notable work, P50 = author of, P57 = director of, P170 = creator of, P178 = developer of
  const creatorProperties = ['P800', 'P50', 'P57', 'P170', 'P178', 'P86'];
  let totalWorksCount = 0;

  for (const prop of creatorProperties) {
    if (entity.claims?.[prop]) {
      totalWorksCount += entity.claims[prop].length;
    }
  }

  if (totalWorksCount > 0) {
    enrichedData.isCreator = true;
    enrichedData.worksCount = totalWorksCount;
  }

  return enrichedData;
}

/**
 * Search Wikidata for matching entities
 */
async function searchWikidata(
  searchQuery: string,
  entityType: 'figure' | 'work'
): Promise<WikidataMatch[]> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', searchQuery);
  url.searchParams.set('language', 'en');
  url.searchParams.set('limit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('type', 'item');

  const response = await fetchWithTimeout(url.toString());
  if (!response.ok) {
    throw new Error(`Wikidata search API returned ${response.status}`);
  }

  const data = await response.json();

  if (!data.search || data.search.length === 0) {
    return [];
  }

  // Map results to WikidataMatch format
  return data.search.map((result: any) => {
    const description = result.description || '';
    const label = result.label || '';

    // Determine confidence based on description matching
    let confidence: 'high' | 'medium' | 'low' = 'medium';

    if (entityType === 'figure') {
      // Higher confidence if description mentions person-related terms
      if (
        description.match(/person|human|figure|politician|author|artist|leader/i) ||
        label.toLowerCase() === searchQuery.toLowerCase()
      ) {
        confidence = 'high';
      } else if (description.match(/character|fictional|entity/i)) {
        confidence = 'low';
      }
    } else if (entityType === 'work') {
      // Higher confidence if description mentions work-related terms
      if (
        description.match(/book|film|novel|movie|series|game|play|work/i) ||
        label.toLowerCase() === searchQuery.toLowerCase()
      ) {
        confidence = 'high';
      } else if (description.match(/person|human|politician/i)) {
        confidence = 'low';
      }
    }

    return {
      qid: result.id,
      label: result.label || result.id,
      description: result.description,
      confidence,
      entityType, // CHR-17: Include entityType so frontend knows if it's a figure or work
    };
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { entityType, searchQuery, wikidataId } = body;

    // Validate required fields
    if (!entityType || (entityType !== 'figure' && entityType !== 'work')) {
      return NextResponse.json(
        { error: 'entityType must be "figure" or "work"' },
        { status: 400 }
      );
    }

    if (!searchQuery && !wikidataId) {
      return NextResponse.json(
        { error: 'Either searchQuery or wikidataId is required' },
        { status: 400 }
      );
    }

    let matches: WikidataMatch[] = [];
    let enrichedData: EnrichedData = {};
    let highConfidence = false;
    let deduplicationStats = { totalBeforeFilter: 0, filtered: 0, filteredQids: [] as string[] };

    // Case 1: wikidataId provided - enrich directly
    if (wikidataId) {
      try {
        if (entityType === 'work') {
          enrichedData = await enrichMediaWork(wikidataId);
        } else {
          enrichedData = await enrichHistoricalFigure(wikidataId);
        }

        highConfidence = true;
      } catch (error) {
        console.error(`Enrichment failed for ${wikidataId}:`, error);
        return NextResponse.json(
          {
            error: `Failed to enrich Q-ID ${wikidataId}`,
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 400 }
        );
      }
    }

    // Case 2: searchQuery provided - search for matches
    if (searchQuery) {
      try {
        matches = await searchWikidata(searchQuery, entityType);

        // CHR-17 Phase 1: Deduplicate matches by filtering out entities already in database (exact wikidata_id match)
        deduplicationStats.totalBeforeFilter = matches.length;

        if (matches.length > 0) {
          console.log(`[CHR-17] Starting exact match deduplication for ${matches.length} Wikidata results (entityType: ${entityType}, query: "${searchQuery}")`);

          const deduplicationPromises = matches.map(async (match) => {
            try {
              if (entityType === 'work') {
                const result = await checkExistingMediaWorkByQid(match.qid);
                return { qid: match.qid, exists: result.exists };
              } else {
                const result = await checkExistingFigureByQid(match.qid);
                return { qid: match.qid, exists: result.exists };
              }
            } catch (error) {
              // If check fails, don't filter (graceful degradation)
              console.error(`Deduplication check failed for ${match.qid}:`, error);
              return { qid: match.qid, exists: false };
            }
          });

          const deduplicationResults = await Promise.all(deduplicationPromises);

          // Filter out matches that exist in database
          const qidsToFilter = deduplicationResults
            .filter(result => result.exists)
            .map(result => result.qid);

          matches = matches.filter(match => !qidsToFilter.includes(match.qid));
          deduplicationStats.filteredQids = qidsToFilter;
          deduplicationStats.filtered = qidsToFilter.length;

          if (qidsToFilter.length > 0) {
            console.log(`[CHR-17] Exact match deduplication filtered ${qidsToFilter.length} duplicate(s): ${qidsToFilter.join(', ')}`);
          }
        }

        // CHR-17 Phase 2: Similarity-based deduplication
        // Fetch database search results for same query to run similarity checks
        if (matches.length > 0) {
          console.log(`[CHR-17] Starting similarity-based deduplication for ${matches.length} remaining results`);

          try {
            const baseUrl = request.nextUrl.origin;
            const searchUrl = new URL('/api/search/universal', baseUrl);
            searchUrl.searchParams.set('q', searchQuery);

            const dbSearchResponse = await fetch(searchUrl.toString(), {
              headers: {
                Cookie: request.headers.get('cookie') || '',
              },
            });

            if (dbSearchResponse.ok) {
              const dbSearchData = await dbSearchResponse.json();
              const dbResults = dbSearchData.results || [];

              // Filter matches by similarity (after exact Q-ID filtering)
              const similarityFiltered: string[] = [];

              matches = matches.filter((match) => {
                let similarMatch = null;

                if (entityType === 'work') {
                  similarMatch = findSimilarMediaWork(match, dbResults);
                } else {
                  similarMatch = findSimilarFigure(match, dbResults);
                }

                if (similarMatch) {
                  similarityFiltered.push(match.qid);
                  return false; // Filter out this match
                }

                return true; // Keep this match
              });

              // Update stats with similarity filtering
              if (similarityFiltered.length > 0) {
                deduplicationStats.filteredQids.push(...similarityFiltered);
                deduplicationStats.filtered += similarityFiltered.length;
                console.log(`[CHR-17] Similarity-based deduplication filtered ${similarityFiltered.length} duplicate(s): ${similarityFiltered.join(', ')}`);
              }
            } else {
              console.error('Failed to fetch DB results for similarity matching:', dbSearchResponse.status);
              // Continue without similarity filtering (graceful degradation)
            }
          } catch (error) {
            console.error('Similarity filtering failed:', error);
            // Continue without similarity filtering (graceful degradation)
          }
        }

        // If we found high-confidence matches, enrich the top one
        if (matches.length > 0 && matches[0].confidence === 'high') {
          highConfidence = true;
          const topMatch = matches[0];

          try {
            if (entityType === 'work') {
              enrichedData = await enrichMediaWork(topMatch.qid);
            } else {
              enrichedData = await enrichHistoricalFigure(topMatch.qid);
              // Add creator info to the match if it's a creator
              const figureData = enrichedData as EnrichedFigureData;
              if (figureData.isCreator) {
                // Update the match with enriched creator data
                matches[0] = {
                  ...matches[0],
                  entityType: 'figure'
                } as WikidataMatch & {
                  enrichedData?: {
                    isCreator?: boolean;
                    worksCount?: number;
                    birth_year?: number;
                    death_year?: number;
                  }
                };

                // Add enrichedData separately to avoid type errors
                (matches[0] as any).enrichedData = {
                  isCreator: figureData.isCreator,
                  worksCount: figureData.worksCount,
                  birth_year: figureData.birth_year,
                  death_year: figureData.death_year
                };
              }
            }
          } catch (error) {
            console.error(`Enrichment failed for top match ${topMatch.qid}:`, error);
            // Continue without enriched data
          }
        }
      } catch (error) {
        console.error('Wikidata search failed:', error);
        return NextResponse.json(
          {
            error: 'Wikidata search failed',
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 503 }
        );
      }
    }

    // CHR-17: Log final deduplication stats
    if (searchQuery && deduplicationStats.filtered > 0) {
      console.log(`[CHR-17] Deduplication complete: ${deduplicationStats.totalBeforeFilter} → ${matches.length} (filtered ${deduplicationStats.filtered} duplicates)`);
    }

    return NextResponse.json({
      matches,
      highConfidence,
      enrichedData,
      deduplication: deduplicationStats,
    });
  } catch (error) {
    console.error('Wikidata enrichment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Example curl test:
 *
 * # Search for a work
 * curl -X POST http://localhost:3000/api/wikidata/enrich \
 *   -H "Content-Type: application/json" \
 *   -d '{"entityType": "work", "searchQuery": "Pride and Prejudice"}'
 *
 * # Enrich with known Q-ID
 * curl -X POST http://localhost:3000/api/wikidata/enrich \
 *   -H "Content-Type: application/json" \
 *   -d '{"entityType": "work", "wikidataId": "Q170583"}'
 *
 * # Search for a figure
 * curl -X POST http://localhost:3000/api/wikidata/enrich \
 *   -H "Content-Type: application/json" \
 *   -d '{"entityType": "figure", "searchQuery": "Napoleon Bonaparte"}'
 */
