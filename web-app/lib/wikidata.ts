/**
 * Wikidata Search & Validation Module
 *
 * Provides robust Q-ID lookup and validation for MediaWork entities.
 * Used by API endpoints to automatically find correct Wikidata Q-IDs.
 */

import { doubleMetaphone } from 'double-metaphone';
import type { SearchResult, WikidataMatch } from '@/types/contribute';
import {
  calculateSimilarity,
  calculatePhoneticSimilarity,
  enhancedNameSimilarity,
} from '@/lib/name-matching';

interface WikidataSearchResult {
  qid: string;
  title: string;
  description: string;
  similarity: number;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

interface WikidataValidation {
  valid: boolean;
  wikidataLabel?: string;
  description?: string;
  similarity?: number;
  qid?: string;
  error?: string;
}

// Name similarity functions (calculateSimilarity, calculatePhoneticSimilarity, enhancedNameSimilarity)
// have been moved to @/lib/name-matching.ts for reuse across the codebase.

/**
 * Check if Wikidata description matches our media type
 */
function matchesMediaType(mediaType: string, description: string): boolean {
  const descLower = description.toLowerCase();

  const typeKeywords: Record<string, string[]> = {
    FILM: ['film', 'movie', 'motion picture', 'cinema'],
    BOOK: ['book', 'novel', 'literature', 'literary work'],
    TV_SERIES: ['television series', 'tv series', 'tv show', 'television program'],
    GAME: ['video game', 'game', 'computer game'],
    PLAY: ['play', 'theatrical', 'drama', 'stage'],
    COMIC: ['comic', 'graphic novel', 'manga'],
  };

  const keywords = typeKeywords[mediaType] || [];
  return keywords.some(keyword => descLower.includes(keyword));
}

/**
 * Search Wikidata for a work and return best match with Q-ID
 */
export async function searchWikidataForWork(params: {
  title: string;
  creator?: string;
  year?: number;
  mediaType?: string;
}): Promise<WikidataSearchResult | null> {
  const { title, creator, year, mediaType } = params;

  if (!title) {
    throw new Error('Title is required');
  }

  // Build search query
  const searchTerms = [title];
  if (creator) searchTerms.push(creator);
  if (year) searchTerms.push(String(year));

  const searchQuery = searchTerms.join(' ');

  try {
    // Use Wikidata search API
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action', 'wbsearchentities');
    url.searchParams.set('search', searchQuery);
    url.searchParams.set('language', 'en');
    url.searchParams.set('limit', '10');
    url.searchParams.set('format', 'json');
    url.searchParams.set('type', 'item');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Fictotum/1.0 (https://fictotum.com; Q-ID Validation)',
      },
    });

    if (!response.ok) {
      throw new Error(`Wikidata API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.search || data.search.length === 0) {
      return null;
    }

    // Score each result
    interface Candidate extends WikidataSearchResult {
      mediaTypeMatch: boolean;
    }

    const candidates: Candidate[] = data.search.map((result: any) => {
      const qid = result.id;
      const resultLabel = result.label || '';
      const resultDescription = result.description || '';

      // Calculate title similarity using enhanced matching (lexical + phonetic)
      const lexicalScore = calculateSimilarity(title, resultLabel);
      const phoneticScore = calculatePhoneticSimilarity(title, resultLabel);
      const similarity = enhancedNameSimilarity(title, resultLabel);

      // Similarity breakdown available via devLog if needed

      // Bonus points for matching creator in description
      // Use phonetic matching for creator names to catch spelling variations
      let creatorBonus = 0;
      if (creator && resultDescription.toLowerCase().includes(creator.toLowerCase())) {
        creatorBonus = 0.2;
      } else if (creator) {
        // Check for phonetic match of creator name in description
        const creatorPhonetic = calculatePhoneticSimilarity(creator, resultDescription);
        if (creatorPhonetic >= 0.5) {
          creatorBonus = 0.1; // Lower bonus for phonetic-only match
        }
      }

      // Media type filtering
      const mediaTypeMatch = mediaType
        ? matchesMediaType(mediaType, resultDescription)
        : true;

      const score = similarity + creatorBonus;

      return {
        qid,
        title: resultLabel,
        description: resultDescription,
        similarity,
        score,
        confidence: 'low' as const,
        mediaTypeMatch,
      };
    });

    // Filter by media type if specified
    let filteredCandidates = candidates;
    if (mediaType) {
      const typeMatches = candidates.filter(c => c.mediaTypeMatch);
      if (typeMatches.length > 0) {
        filteredCandidates = typeMatches;
      }
    }

    // Sort by score
    filteredCandidates.sort((a, b) => b.score - a.score);

    // Return best match if similarity is good enough
    const best = filteredCandidates[0];

    // Determine confidence
    let confidence: 'high' | 'medium' | 'low';
    if (best.score >= 0.9) {
      confidence = 'high';
    } else if (best.score >= 0.7) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    best.confidence = confidence;

    // Only return if we have reasonable confidence
    if (best.score >= 0.7) {
      return best;
    }

    return null;
  } catch (error) {
    console.error('Wikidata search error:', error);
    throw new Error(`Wikidata search failed: ${error}`);
  }
}

/**
 * Validate that a Q-ID matches the expected work
 */
export async function validateQid(
  qid: string,
  expectedTitle: string
): Promise<WikidataValidation> {
  try {
    // Reject provisional IDs immediately
    if (qid.startsWith('PROV:')) {
      return {
        valid: false,
        error: 'Provisional IDs are not allowed',
      };
    }

    // Fetch entity from Wikidata
    const url = new URL('https://www.wikidata.org/w/api.php');
    url.searchParams.set('action', 'wbgetentities');
    url.searchParams.set('ids', qid);
    url.searchParams.set('props', 'labels|descriptions');
    url.searchParams.set('languages', 'en');
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Fictotum/1.0 (https://fictotum.com; Q-ID Validation)',
      },
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Failed to fetch Q-ID ${qid} from Wikidata`,
      };
    }

    const data = await response.json();

    if (!data.entities || !data.entities[qid]) {
      return {
        valid: false,
        error: `Q-ID ${qid} not found in Wikidata`,
      };
    }

    const entity = data.entities[qid];

    // Check if entity exists (not deleted/missing)
    if ('missing' in entity) {
      return {
        valid: false,
        error: `Q-ID ${qid} is missing/deleted in Wikidata`,
      };
    }

    // Get label
    if (!entity.labels || !entity.labels.en) {
      return {
        valid: false,
        error: `Q-ID ${qid} has no English label`,
      };
    }

    const wikidataLabel = entity.labels.en.value;
    const description = entity.descriptions?.en?.value || '';

    // Calculate similarity using enhanced matching (lexical + phonetic)
    const similarity = enhancedNameSimilarity(expectedTitle, wikidataLabel);

    // Validation threshold: 75% similarity (includes both lexical and phonetic components)
    const isValid = similarity >= 0.75;

    return {
      valid: isValid,
      wikidataLabel,
      description,
      similarity,
      qid,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate Q-ID ${qid}: ${error}`,
    };
  }
}

/**
 * Rate limiting for Wikidata requests
 * Ensures we don't hammer their API
 */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 500ms between requests

export async function rateLimitedWikidataRequest<T>(
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;

  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - elapsed)
    );
  }

  const result = await fn();
  lastRequestTime = Date.now();

  return result;
}

/**
 * Fetch works created by a person from Wikidata
 * Used by the creator bulk import workflow
 */
export interface CreatorWork {
  qid: string;
  title: string;
  year: number | null;
  type: string;
}

export async function fetchCreatorWorks(
  creatorQid: string
): Promise<CreatorWork[]> {
  if (!creatorQid || !creatorQid.startsWith('Q')) {
    throw new Error('Invalid creator Q-ID');
  }

  try {
    // Build SPARQL query to find works by creator
    const sparqlQuery = `
      SELECT DISTINCT ?work ?workLabel ?date ?typeLabel WHERE {
        # Find works created by this person
        # P170 = creator, P50 = author, P57 = director, P178 = developer, P86 = composer
        {
          ?work wdt:P170 wd:${creatorQid} .
        } UNION {
          ?work wdt:P50 wd:${creatorQid} .
        } UNION {
          ?work wdt:P57 wd:${creatorQid} .
        } UNION {
          ?work wdt:P178 wd:${creatorQid} .
        } UNION {
          ?work wdt:P86 wd:${creatorQid} .
        }

        # Get the type of work
        ?work wdt:P31 ?type .

        # Filter to only relevant media types
        VALUES ?type {
          wd:Q7725634    # literary work
          wd:Q571        # book
          wd:Q11424      # film
          wd:Q5398426    # TV series
          wd:Q7889       # video game
          wd:Q1261214    # video game franchise
          wd:Q25379      # play
          wd:Q1344       # opera
          wd:Q482994     # album
        }

        # Get publication/release date
        OPTIONAL { ?work wdt:P577 ?date . }

        SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
      }
      ORDER BY DESC(?date)
      LIMIT 100
    `;

    const wikidataUrl = 'https://query.wikidata.org/sparql';
    const response = await fetch(wikidataUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Fictotum/1.0 (https://fictotum.com; Creator Works)',
      },
      body: `query=${encodeURIComponent(sparqlQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Wikidata SPARQL query failed: ${response.statusText}`);
    }

    const data = await response.json();
    const bindings = data.results?.bindings || [];

    const works: CreatorWork[] = bindings.map((item: any) => {
      const workUri = item.work?.value || '';
      const qid = workUri.split('/').pop() || '';
      const title = item.workLabel?.value || 'Unknown';
      const dateStr = item.date?.value;
      const type = item.typeLabel?.value || 'Unknown';

      let year: number | null = null;
      if (dateStr) {
        try {
          year = parseInt(dateStr.split('-')[0]);
        } catch (e) {
          // Ignore parse errors
        }
      }

      return { qid, title, year, type };
    });

    return works;
  } catch (error) {
    console.error('Wikidata creator works fetch error:', error);
    throw new Error(`Failed to fetch works for creator ${creatorQid}: ${error}`);
  }
}

/**
 * CHR-17: Find similar MediaWork in database results using title similarity + year matching
 *
 * @param wikidataMatch - Wikidata search result to check for similarity
 * @param dbResults - Database search results to compare against
 * @returns Matched SearchResult or null if no high-confidence match found
 */
export function findSimilarMediaWork(
  wikidataMatch: WikidataMatch,
  dbResults: SearchResult[]
): SearchResult | null {
  if (!dbResults || dbResults.length === 0) return null;

  // Filter for work-type results only
  const workResults = dbResults.filter(result => result.type === 'work');
  if (workResults.length === 0) return null;

  // Threshold for title similarity (0.85 = 85% similarity required)
  const SIMILARITY_THRESHOLD = 0.85;
  const YEAR_TOLERANCE = 2; // ±2 years

  for (const dbWork of workResults) {
    // Calculate enhanced name similarity (lexical + phonetic)
    const titleSimilarity = enhancedNameSimilarity(
      wikidataMatch.label,
      dbWork.name
    );

    // Check if title similarity meets threshold
    if (titleSimilarity >= SIMILARITY_THRESHOLD) {
      // If we have year data from both sources, verify year match
      const wikidataYear = wikidataMatch.enrichedData?.release_year;
      const dbYear = dbWork.year;

      if (wikidataYear && dbYear) {
        const yearDiff = Math.abs(wikidataYear - dbYear);
        if (yearDiff <= YEAR_TOLERANCE) {
          // High-confidence match: title similar + year within tolerance
          return dbWork;
        }
      } else {
        // No year data available, rely on title similarity alone
        return dbWork;
      }
    }
  }

  return null;
}

/**
 * CHR-17: Find similar HistoricalFigure in database results using name similarity + birth/death year matching
 *
 * @param wikidataMatch - Wikidata search result to check for similarity
 * @param dbResults - Database search results to compare against
 * @returns Matched SearchResult or null if no high-confidence match found
 */
export function findSimilarFigure(
  wikidataMatch: WikidataMatch,
  dbResults: SearchResult[]
): SearchResult | null {
  if (!dbResults || dbResults.length === 0) return null;

  // Filter for figure-type results only
  const figureResults = dbResults.filter(result => result.type === 'figure');
  if (figureResults.length === 0) return null;

  // Threshold for name similarity (0.9 = 90% similarity required - higher than works)
  const SIMILARITY_THRESHOLD = 0.9;
  const YEAR_TOLERANCE = 5; // ±5 years for fuzzy historical dates

  for (const dbFigure of figureResults) {
    // Calculate enhanced name similarity (lexical + phonetic)
    const nameSimilarity = enhancedNameSimilarity(
      wikidataMatch.label,
      dbFigure.name
    );

    // Check if name similarity meets threshold
    if (nameSimilarity >= SIMILARITY_THRESHOLD) {
      // If we have birth/death year data from both sources, verify year match
      const wikidataBirthYear = wikidataMatch.enrichedData?.birth_year;
      const wikidataDeathYear = wikidataMatch.enrichedData?.death_year;
      const dbBirthYear = dbFigure.metadata?.birth_year;
      const dbDeathYear = dbFigure.metadata?.death_year;

      // If we have any year data, use it for additional confidence
      let yearMatch = false;

      if (wikidataBirthYear && dbBirthYear) {
        const birthDiff = Math.abs(wikidataBirthYear - dbBirthYear);
        if (birthDiff <= YEAR_TOLERANCE) {
          yearMatch = true;
        }
      }

      if (wikidataDeathYear && dbDeathYear) {
        const deathDiff = Math.abs(wikidataDeathYear - dbDeathYear);
        if (deathDiff <= YEAR_TOLERANCE) {
          yearMatch = true;
        }
      }

      // If we have year data and it matches, or if no year data available, return match
      if (yearMatch || (!wikidataBirthYear && !dbBirthYear && !wikidataDeathYear && !dbDeathYear)) {
        return dbFigure;
      }
    }
  }

  return null;
}
