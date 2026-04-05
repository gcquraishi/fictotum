/**
 * Tag Normalization Utilities for Sentiment Tags
 *
 * Provides normalization, validation, and fuzzy matching for the hybrid sentiment tag system.
 * Tags are normalized to lowercase for consistent storage and aggregation.
 */

/**
 * Curated list of suggested sentiment tags for portrayal expression.
 * These tags are presented as clickable chips in the UI.
 */
export const SUGGESTED_TAGS = [
  'heroic',
  'villainous',
  'complex',
  'neutral',
  'sympathetic',
  'tragic',
  'comedic',
  'romantic',
  'antagonistic',
  'ambiguous',
  'satirical',
  'nuanced',
] as const;

export type SuggestedTag = typeof SUGGESTED_TAGS[number];

/**
 * Set for O(1) lookup of suggested tags.
 * Used for type-safe categorization without type assertions.
 */
const SUGGESTED_TAG_SET = new Set<string>(SUGGESTED_TAGS);

/**
 * Configuration for tag validation constraints
 */
export const TAG_CONSTRAINTS = {
  MIN_TAGS: 1,
  MAX_TAGS: 5,
  MIN_LENGTH: 2,
  MAX_LENGTH: 30,
} as const;

/**
 * Normalizes an array of tags for consistent storage and querying.
 *
 * Normalization steps:
 * 1. Trim whitespace
 * 2. Filter empty strings
 * 3. Convert to lowercase (per architectural decision)
 * 4. Remove duplicates (case-insensitive)
 * 5. Enforce length constraints (2-30 chars)
 *
 * @param tags - Raw array of tag strings from user input
 * @returns Normalized array of tags
 */
export function normalizeTags(tags: string[]): string[] {
  return tags
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => tag.toLowerCase())
    .filter(tag => tag.length >= TAG_CONSTRAINTS.MIN_LENGTH && tag.length <= TAG_CONSTRAINTS.MAX_LENGTH)
    .filter((tag, index, self) => self.indexOf(tag) === index); // Deduplicate
}

/**
 * Validates tag array against business constraints.
 *
 * @param tags - Normalized tag array
 * @returns Object with validation result and error message
 */
export function validateTags(tags: string[]): { valid: boolean; error?: string } {
  if (tags.length < TAG_CONSTRAINTS.MIN_TAGS) {
    return { valid: false, error: 'At least 1 tag is required' };
  }

  if (tags.length > TAG_CONSTRAINTS.MAX_TAGS) {
    return { valid: false, error: `Maximum ${TAG_CONSTRAINTS.MAX_TAGS} tags allowed` };
  }

  // Check individual tag lengths
  const invalidTag = tags.find(
    tag => tag.length < TAG_CONSTRAINTS.MIN_LENGTH || tag.length > TAG_CONSTRAINTS.MAX_LENGTH
  );

  if (invalidTag) {
    return {
      valid: false,
      error: `Tags must be between ${TAG_CONSTRAINTS.MIN_LENGTH} and ${TAG_CONSTRAINTS.MAX_LENGTH} characters`
    };
  }

  return { valid: true };
}

/**
 * Calculates string similarity using Levenshtein distance ratio.
 * Used for fuzzy matching custom tags to suggested tags.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity ratio between 0 and 1 (1 = identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculates Levenshtein distance between two strings using space-optimized algorithm.
 * Reduces memory complexity from O(m*n) to O(min(m,n)) by using two rows instead of full matrix.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance (number of operations to transform str1 to str2)
 */
function levenshteinDistance(str1: string, str2: string): number {
  // Ensure str1 is the shorter string for space optimization
  if (str1.length > str2.length) {
    [str1, str2] = [str2, str1];
  }

  const len1 = str1.length;
  const len2 = str2.length;

  // Only need current and previous row
  let prevRow = Array.from({ length: len1 + 1 }, (_, i) => i);
  let currRow = new Array(len1 + 1);

  for (let i = 1; i <= len2; i++) {
    currRow[0] = i;

    for (let j = 1; j <= len1; j++) {
      const cost = str2[i - 1] === str1[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // deletion
        currRow[j - 1] + 1,  // insertion
        prevRow[j - 1] + cost // substitution
      );
    }

    // Swap rows for next iteration
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[len1];
}

/**
 * Finds the closest matching suggested tag for a custom tag input.
 * Returns suggestion if similarity exceeds threshold.
 *
 * @param customTag - User-provided custom tag (normalized)
 * @param threshold - Minimum similarity ratio (default 0.75)
 * @returns Suggested tag if match found, otherwise null
 */
export function findSuggestedMatch(
  customTag: string,
  threshold: number = 0.75
): SuggestedTag | null {
  let bestMatch: SuggestedTag | null = null;
  let bestSimilarity = 0;

  for (const suggested of SUGGESTED_TAGS) {
    const similarity = calculateSimilarity(customTag, suggested);

    if (similarity > bestSimilarity && similarity >= threshold) {
      bestSimilarity = similarity;
      bestMatch = suggested;
    }
  }

  return bestMatch;
}

/**
 * Separates tags into suggested (common) and custom categories.
 * Used for tag metadata tracking.
 *
 * @param tags - Normalized tag array
 * @returns Object with common and custom tag arrays
 */
export function categorizeTags(tags: string[]): {
  common: string[];
  custom: string[];
} {
  const common: string[] = [];
  const custom: string[] = [];

  for (const tag of tags) {
    if (SUGGESTED_TAG_SET.has(tag)) {
      common.push(tag);
    } else {
      custom.push(tag);
    }
  }

  return { common, custom };
}
