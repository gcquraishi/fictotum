/**
 * Wikidata Batch Query Utilities
 *
 * Efficiently fetch data for multiple Wikidata Q-IDs in a single request.
 * Used by bulk import enrichment pipeline.
 */

interface WikidataEntity {
  id: string;
  labels?: { [lang: string]: { language: string; value: string } };
  descriptions?: { [lang: string]: { language: string; value: string } };
  claims?: any;
}

interface WikidataResponse {
  entities: {
    [qid: string]: WikidataEntity;
  };
}

interface EnrichedFigure {
  wikidata_id: string;
  name?: string;
  birth_date?: string;
  birth_year?: number;
  death_date?: string;
  death_year?: number;
  occupation?: string;
  title?: string;
  description?: string;
  image_url?: string;
}

interface EnrichedMedia {
  wikidata_id: string;
  title?: string;
  release_year?: number;
  creator?: string;
  genre?: string;
  runtime_minutes?: number;
  description?: string;
}

/**
 * Fetch multiple Wikidata entities in a single API call
 */
export async function fetchWikidataEntities(
  qids: string[]
): Promise<Map<string, WikidataEntity>> {
  if (qids.length === 0) {
    return new Map();
  }

  // Wikidata API supports up to 50 entities per request
  const batchSize = 50;
  const results = new Map<string, WikidataEntity>();

  for (let i = 0; i < qids.length; i += batchSize) {
    const batch = qids.slice(i, i + batchSize);
    const ids = batch.join('|');

    const url = new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action', 'wbgetentities');
    url.searchParams.set('ids', ids);
    url.searchParams.set('props', 'labels|descriptions|claims');
    url.searchParams.set('languages', 'en');
    url.searchParams.set('format', 'json');

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        console.error(`[Wikidata Batch] HTTP ${response.status} for batch: ${ids}`);
        continue;
      }

      const data: WikidataResponse = await response.json();

      // Add entities to results map
      for (const [qid, entity] of Object.entries(data.entities)) {
        if (entity && !entity.hasOwnProperty('missing')) {
          results.set(qid, entity);
        }
      }
    } catch (error) {
      console.error(`[Wikidata Batch] Error fetching batch ${ids}:`, error);
    }
  }

  return results;
}

/**
 * Extract year from Wikidata date string
 * Format: +1234-05-06T00:00:00Z or -0100-01-01T00:00:00Z
 */
function extractYear(dateString: string): number | undefined {
  const match = dateString.match(/^([+-]?\d+)-/);
  if (!match) return undefined;

  const year = parseInt(match[1], 10);
  return year;
}

/**
 * Get claim value from Wikidata entity
 */
function getClaimValue(entity: WikidataEntity, property: string): any {
  if (!entity.claims || !entity.claims[property]) {
    return undefined;
  }

  const claim = entity.claims[property][0];
  if (!claim || !claim.mainsnak) {
    return undefined;
  }

  const snak = claim.mainsnak;

  // Handle different data types
  if (snak.datavalue?.type === 'time') {
    return snak.datavalue.value.time;
  } else if (snak.datavalue?.type === 'string') {
    return snak.datavalue.value;
  } else if (snak.datavalue?.type === 'wikibase-entityid') {
    return snak.datavalue.value.id;
  }

  return undefined;
}

/**
 * Get label from Wikidata entity
 */
function getLabel(entity: WikidataEntity, lang: string = 'en'): string | undefined {
  return entity.labels?.[lang]?.value;
}

/**
 * Get description from Wikidata entity
 */
function getDescription(entity: WikidataEntity, lang: string = 'en'): string | undefined {
  return entity.descriptions?.[lang]?.value;
}

/**
 * Enrich historical figure data from Wikidata entity
 */
export function enrichFigureFromEntity(
  qid: string,
  entity: WikidataEntity
): EnrichedFigure {
  const enriched: EnrichedFigure = {
    wikidata_id: qid,
  };

  // Name (label)
  enriched.name = getLabel(entity);

  // Description
  enriched.description = getDescription(entity);

  // Birth date (P569)
  const birthDate = getClaimValue(entity, 'P569');
  if (birthDate) {
    enriched.birth_date = birthDate;
    enriched.birth_year = extractYear(birthDate);
  }

  // Death date (P570)
  const deathDate = getClaimValue(entity, 'P570');
  if (deathDate) {
    enriched.death_date = deathDate;
    enriched.death_year = extractYear(deathDate);
  }

  // Occupation (P106) - get first one
  const occupationQid = getClaimValue(entity, 'P106');
  if (occupationQid) {
    // For now, just store the Q-ID. Could fetch label in a second pass.
    enriched.occupation = occupationQid;
  }

  // Position held (P39) - for titles like "Roman Emperor"
  const positionQid = getClaimValue(entity, 'P39');
  if (positionQid) {
    enriched.title = positionQid;
  }

  // Image (P18)
  const imageFilename = getClaimValue(entity, 'P18');
  if (imageFilename) {
    // Convert filename to Commons URL
    const filename = imageFilename.replace(/ /g, '_');
    enriched.image_url = `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}`;
  }

  return enriched;
}

/**
 * Enrich media work data from Wikidata entity
 */
export function enrichMediaFromEntity(
  qid: string,
  entity: WikidataEntity
): EnrichedMedia {
  const enriched: EnrichedMedia = {
    wikidata_id: qid,
  };

  // Title (label)
  enriched.title = getLabel(entity);

  // Description
  enriched.description = getDescription(entity);

  // Publication/release date (P577)
  const releaseDate = getClaimValue(entity, 'P577');
  if (releaseDate) {
    enriched.release_year = extractYear(releaseDate);
  }

  // Director (P57) for films
  const directorQid = getClaimValue(entity, 'P57');
  if (directorQid) {
    enriched.creator = directorQid; // Q-ID for now
  }

  // Author (P50) for books
  if (!enriched.creator) {
    const authorQid = getClaimValue(entity, 'P50');
    if (authorQid) {
      enriched.creator = authorQid;
    }
  }

  // Genre (P136)
  const genreQid = getClaimValue(entity, 'P136');
  if (genreQid) {
    enriched.genre = genreQid;
  }

  // Duration (P2047) in minutes
  const durationValue = getClaimValue(entity, 'P2047');
  if (durationValue) {
    enriched.runtime_minutes = parseInt(durationValue, 10);
  }

  return enriched;
}

/**
 * Batch enrich multiple figures
 */
export async function batchEnrichFigures(
  qids: string[]
): Promise<Map<string, EnrichedFigure>> {
  const entities = await fetchWikidataEntities(qids);
  const enriched = new Map<string, EnrichedFigure>();

  for (const [qid, entity] of entities) {
    enriched.set(qid, enrichFigureFromEntity(qid, entity));
  }

  return enriched;
}

/**
 * Batch enrich multiple media works
 */
export async function batchEnrichMedia(
  qids: string[]
): Promise<Map<string, EnrichedMedia>> {
  const entities = await fetchWikidataEntities(qids);
  const enriched = new Map<string, EnrichedMedia>();

  for (const [qid, entity] of entities) {
    enriched.set(qid, enrichMediaFromEntity(qid, entity));
  }

  return enriched;
}
