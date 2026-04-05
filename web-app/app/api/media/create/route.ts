export const dynamic = 'force-dynamic';
// file: web-app/app/api/media/create/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';
import { auth } from '@/lib/auth';
import { isInt } from 'neo4j-driver';
import { searchWikidataForWork, validateQid } from '@/lib/wikidata';

function toNumber(value: any): number {
  if (isInt(value)) {
    return value.toNumber();
  }
  return Number(value);
}

function generateMediaId(title: string, year: number | null): string {
  // Create a slug-based ID: lowercase, replace spaces with hyphens, remove special chars
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return year ? `${slug}-${year}` : `${slug}-${Date.now()}`;
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
      title,
      mediaType,
      releaseYear,
      creator,
      wikidataId,
      parentSeriesId,
      sequenceNumber,
      seasonNumber,
      episodeNumber,
      relationshipType,
      isMainSeries,
      publisher,
      translator,
      channel,
      productionStudio,
      locationIds,
      eraIds,
      eraTags,
      locationProminence,
      eraSettingType,
      setting_year,
      setting_year_end,
      wikidata_verified,
      data_source,
      unmapped_location_actions
    } = body;

    if (!title || !mediaType) {
      return NextResponse.json(
        { error: 'Title and media type are required' },
        { status: 400 }
      );
    }

    const year = releaseYear ? parseInt(releaseYear) : null;
    const mediaId = generateMediaId(title, year);

    /**
     * MediaWork Ingestion Protocol - Step 1: Search Wikidata for Q-ID
     * If no Q-ID provided or it's provisional, auto-search Wikidata to find canonical identifier.
     * This ensures we use standardized Wikidata Q-IDs when available.
     */
    let finalWikidataId = wikidataId;
    let wikidataLabel: string | undefined;

    if (!finalWikidataId || finalWikidataId.startsWith('PROV:')) {
      console.log(`[Media Create] No valid Q-ID provided for "${title}", searching Wikidata...`);

      try {
        const wikidataResult = await searchWikidataForWork({
          title,
          creator,
          year: year || undefined,
          mediaType,
        });

        if (wikidataResult && wikidataResult.confidence !== 'low') {
          finalWikidataId = wikidataResult.qid;
          wikidataLabel = wikidataResult.title;
          console.log(`[Media Create] Found Q-ID: ${finalWikidataId} (confidence: ${wikidataResult.confidence})`);
        } else {
          console.log(`[Media Create] No good Q-ID match found for "${title}"`);
          // Continue without Q-ID - we'll allow works without Wikidata IDs
        }
      } catch (error) {
        console.error(`[Media Create] Wikidata search failed:`, error);
        // Continue without Q-ID - don't block media creation
      }
    } else {
      // Validate provided Q-ID
      console.log(`[Media Create] Validating provided Q-ID: ${finalWikidataId}`);

      try {
        const validation = await validateQid(finalWikidataId, title);

        if (!validation.valid) {
          console.warn(`[Media Create] Q-ID validation failed: ${validation.error}`);
          return NextResponse.json(
            {
              error: `Invalid Wikidata Q-ID: ${validation.error}`,
              suggestion: 'Try removing the Q-ID to auto-search for the correct one',
            },
            { status: 400 }
          );
        }

        wikidataLabel = validation.wikidataLabel;
        console.log(`[Media Create] Q-ID validated successfully (similarity: ${validation.similarity?.toFixed(2)})`);
      } catch (error) {
        console.error(`[Media Create] Q-ID validation error:`, error);
        // Continue with provided Q-ID - don't block on validation errors
      }
    }

    const dbSession = await getSession();

    /**
     * MediaWork Ingestion Protocol - Step 2: Query Neo4j for existing work by wikidata_id
     * Before creating a new MediaWork node, check if it already exists by either:
     * 1. media_id (slug-based identifier)
     * 2. wikidata_id (canonical Q-ID if available)
     * This prevents duplicate entries for the same work.
     */
    let checkQuery = 'MATCH (m:MediaWork) WHERE m.media_id = $mediaId';
    if (finalWikidataId) {
      checkQuery += ' OR m.wikidata_id = $wikidataId';
    }
    checkQuery += ' RETURN m.media_id AS media_id, m.title AS title, m.release_year AS year, m.media_type AS media_type';

    const checkResult = await dbSession.run(checkQuery, {
      mediaId,
      wikidataId: finalWikidataId || null
    });

    /**
     * MediaWork Ingestion Protocol - Step 3: If exists, return 409 with existing media
     * Do NOT create duplicate node. Return existing media info to client.
     */
    if (checkResult.records.length > 0) {
      await dbSession.close();
      const existing = checkResult.records[0];
      return NextResponse.json(
        {
          error: 'This media work already exists in the database',
          existingMedia: {
            media_id: existing.get('media_id'),
            title: existing.get('title'),
            year: toNumber(existing.get('year')),
            media_type: existing.get('media_type'),
          }
        },
        { status: 409 }
      );
    }

    // Validate that all provided location IDs exist (excluding newly created ones)
    if (locationIds && locationIds.length > 0) {
      const locValidation = await dbSession.run(
        `MATCH (l:Location) WHERE l.location_id IN $locationIds RETURN count(l) as count`,
        { locationIds }
      );
      const locCount = locValidation.records[0]?.get('count')?.toNumber?.() ?? 0;
      if (locCount !== locationIds.length) {
        await dbSession.close();
        return NextResponse.json(
          { error: 'One or more location IDs do not exist' },
          { status: 400 }
        );
      }
    }

    // Validate that all provided era IDs exist
    if (eraIds && eraIds.length > 0) {
      const eraValidation = await dbSession.run(
        `MATCH (e:Era) WHERE e.era_id IN $eraIds RETURN count(e) as count`,
        { eraIds }
      );
      const eraCount = eraValidation.records[0]?.get('count')?.toNumber?.() ?? 0;
      if (eraCount !== eraIds.length) {
        await dbSession.close();
        return NextResponse.json(
          { error: 'One or more era IDs do not exist' },
          { status: 400 }
        );
      }
    }

    // ============================================================================
    // PROCESS USER-SUGGESTED LOCATIONS (CHR-20)
    // ============================================================================
    // Handle suggested locations from unmapped_location_actions array.
    // Create new Location nodes for validated suggestions and add their IDs
    // to the locationIds array so they get linked via SET_IN relationships.
    // ============================================================================
    const createdLocationIds: string[] = [];
    const suggestedActions = (unmapped_location_actions || []).filter(
      (action: any) => action.action === 'suggest'
    );

    if (suggestedActions.length > 0) {
      console.log(`[Media Create] Processing ${suggestedActions.length} user-suggested locations...`);

      for (const suggestion of suggestedActions) {
        const { name, wikidataId, notes, validationConfidence } = suggestion;

        // Generate location_id as slug + timestamp
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        const locationId = `${slug}-${Date.now()}`;

        // Create Location node with user_suggested data source
        const createLocationQuery = `
          CREATE (l:Location {
            location_id: $locationId,
            name: $name,
            wikidata_id: $wikidataId,
            location_type: 'city',
            data_source: 'user_suggested',
            validation_confidence: $validationConfidence,
            notes: $notes,
            created_at: timestamp(),
            created_by: $userEmail
          })
          RETURN l.location_id AS location_id
        `;

        try {
          const result = await dbSession.run(createLocationQuery, {
            locationId,
            name,
            wikidataId: wikidataId || null,
            validationConfidence: validationConfidence || 0.5,
            notes: notes || null,
            userEmail
          });

          const createdId = result.records[0]?.get('location_id');
          if (createdId) {
            createdLocationIds.push(createdId);
            console.log(`[Media Create] Created suggested location: ${name} (${createdId})`);
          }
        } catch (error) {
          console.error(`[Media Create] Failed to create suggested location "${name}":`, error);
          // Continue with other suggestions even if one fails
        }
      }
    }

    // Merge created location IDs with existing locationIds
    const allLocationIds = [...(locationIds || []), ...createdLocationIds];

    // Determine data quality flags based on wikidataId if not explicitly provided
    const wikidataVerified = wikidata_verified !== undefined
      ? wikidata_verified
      : (finalWikidataId ? true : false);

    const dataSource = data_source || (finalWikidataId ? 'wikidata' : 'user_generated');

    /**
     * MediaWork Ingestion Protocol - Step 4: If not exists, create with wikidata_id property
     * Create new MediaWork node with all provided properties, including the canonical wikidata_id
     * if one was found or provided. This ensures the node is properly linked to Wikidata.
     */
    const batch_id = `web_ui_${Date.now()}`;
    let query = `
      MATCH (u:User {email: $userEmail})

      // Ensure Web UI Agent exists for provenance tracking
      MERGE (agent:Agent {agent_id: "web-ui-generic"})
      ON CREATE SET
        agent.name = "Fictotum Web UI",
        agent.type = "human_user",
        agent.created_at = datetime(),
        agent.metadata = '{"interface":"web_ui","description":"Generic agent for web UI contributions"}'

      // Create MediaWork node
      CREATE (m:MediaWork {
        media_id: $mediaId,
        title: $title,
        media_type: $mediaType,
        release_year: $releaseYear,
        setting_year: $settingYear,
        setting_year_end: $settingYearEnd,
        creator: $creator,
        wikidata_id: $wikidataId,
        wikidata_label: $wikidataLabel,
        wikidata_verified: $wikidataVerified,
        data_source: $dataSource,
        publisher: $publisher,
        translator: $translator,
        channel: $channel,
        production_studio: $productionStudio,
        created_at: timestamp(),
        created_by: u.email,
        created_by_name: u.name,
        ingestion_batch: $batchId,
        ingestion_source: "web_ui"
      })

      // Create CREATED_BY relationship for provenance tracking
      CREATE (m)-[:CREATED_BY {
        timestamp: datetime(),
        context: "web_ui",
        batch_id: $batchId,
        method: $dataSource
      }]->(agent)
    `;

    // Add PART_OF relationship if parent series is specified
    if (parentSeriesId) {
      query += `
      WITH m
      MATCH (parent:MediaWork {wikidata_id: $parentSeriesId})
      CREATE (m)-[r:PART_OF {
        sequence_number: $sequenceNumber,
        season_number: $seasonNumber,
        episode_number: $episodeNumber,
        relationship_type: $relationshipType,
        is_main_series: $isMainSeries
      }]->(parent)
      `;
    }

    // Add SET_IN relationships for locations (includes both existing and newly created)
    if (allLocationIds && allLocationIds.length > 0) {
      query += `
      WITH m
      UNWIND $allLocationIds AS locationId
      MATCH (loc:Location {location_id: locationId})
      CREATE (m)-[:SET_IN {prominence: $locationProminence}]->(loc)
      `;
    }

    // Add SET_IN_ERA relationships for eras
    if (eraIds && eraIds.length > 0) {
      query += `
      WITH m
      UNWIND $eraIds AS eraId
      MATCH (era:Era {era_id: eraId})
      CREATE (m)-[:SET_IN_ERA {era_setting_type: $eraSettingType}]->(era)
      `;
    }

    // Add TAGGED_WITH relationships for era tags (with confidence scores)
    // CHR-20: Support optional era dates (start_year/end_year can be null for impressionistic eras)
    if (eraTags && eraTags.length > 0) {
      query += `
      WITH m
      UNWIND $eraTags AS eraTag
      MERGE (era:Era {name: eraTag.name})
      ON CREATE SET era.era_id = toLower(replace(eraTag.name, ' ', '_')),
                    era.era_type = 'literary_period',
                    era.start_year = eraTag.start_year,
                    era.end_year = eraTag.end_year,
                    era.is_approximate = eraTag.is_approximate,
                    era.created_at = timestamp()
      CREATE (m)-[:TAGGED_WITH {
        confidence: eraTag.confidence,
        source: eraTag.source,
        added_by: $userEmail,
        added_at: timestamp()
      }]->(era)
      `;
    }

    query += `
      RETURN m.media_id AS media_id, m.title AS title, m.release_year AS year, m.media_type AS media_type
    `;

    const result = await dbSession.run(query, {
      mediaId,
      title,
      mediaType,
      releaseYear: year,
      settingYear: setting_year ? parseInt(setting_year) : null,
      settingYearEnd: setting_year_end ? parseInt(setting_year_end) : null,
      creator: creator || null,
      wikidataId: finalWikidataId || null,
      wikidataLabel: wikidataLabel || null,
      wikidataVerified,
      dataSource,
      publisher: publisher || null,
      translator: translator || null,
      channel: channel || null,
      productionStudio: productionStudio || null,
      userEmail,
      batchId: batch_id,
      parentSeriesId: parentSeriesId || null,
      sequenceNumber: sequenceNumber ? parseInt(sequenceNumber) : null,
      seasonNumber: seasonNumber ? parseInt(seasonNumber) : null,
      episodeNumber: episodeNumber ? parseInt(episodeNumber) : null,
      relationshipType: relationshipType || null,
      isMainSeries: isMainSeries !== undefined ? isMainSeries : true,
      allLocationIds: allLocationIds || [],
      eraIds: eraIds || [],
      eraTags: eraTags || [],
      locationProminence: locationProminence || 'primary',
      eraSettingType: eraSettingType || 'contemporary',
    });

    await dbSession.close();

    const record = result.records[0];
    const newMedia = {
      media_id: record.get('media_id'),
      title: record.get('title'),
      year: toNumber(record.get('year')),
      media_type: record.get('media_type'),
    };

    return NextResponse.json({ media: newMedia }, { status: 201 });
  } catch (error) {
    console.error('Media creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
