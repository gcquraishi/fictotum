/**
 * Wikidata Search & Validation Module
 *
 * Provides robust Q-ID lookup and validation for MediaWork entities.
 * Used by API endpoints to automatically find correct Wikidata Q-IDs.
 */

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

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Simple Levenshtein-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Levenshtein distance algorithm
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

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
        'User-Agent': 'ChronosGraph/1.0 (https://chronosgraph.com; Q-ID Validation)',
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

      // Calculate title similarity
      const similarity = calculateSimilarity(title, resultLabel);

      // Bonus points for matching creator in description
      let creatorBonus = 0;
      if (creator && resultDescription.toLowerCase().includes(creator.toLowerCase())) {
        creatorBonus = 0.2;
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
        'User-Agent': 'ChronosGraph/1.0 (https://chronosgraph.com; Q-ID Validation)',
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

    // Calculate similarity
    const similarity = calculateSimilarity(expectedTitle, wikidataLabel);

    // Validation threshold: 75% similarity
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
