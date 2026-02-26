/**
 * Name Matching Utilities
 *
 * Shared functions for calculating name similarity using lexical (Levenshtein)
 * and phonetic (Double Metaphone) matching algorithms.
 *
 * Used by:
 * - Wikidata entity resolution (wikidata.ts)
 * - Duplicate detection (api/admin/duplicates/detect/route.ts)
 * - Entity validation during contribution
 */

import { doubleMetaphone } from 'double-metaphone';

/**
 * Levenshtein distance algorithm
 * Returns the minimum number of single-character edits (insertions, deletions, substitutions)
 * required to change one string into another.
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
 * Calculate similarity ratio between two strings (0-1)
 * Uses Levenshtein distance to determine how similar two strings are.
 *
 * @returns 1.0 for identical strings, 0.0 for completely different
 */
export function calculateSimilarity(str1: string, str2: string): number {
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
 * Calculate phonetic similarity between two strings using Double Metaphone
 * Returns 1.0 for primary phonetic match, 0.5 for secondary match, 0.0 for no match
 *
 * Double Metaphone handles non-English names better than Soundex and generates
 * primary and secondary phonetic encodings for each name token.
 *
 * Examples:
 * - "Stephen" and "Steven" → 1.0 (both encode to "STFN")
 * - "Smith" and "Smyth" → 1.0 (both encode to "SM0")
 * - "Caesar" and "Cesar" → 1.0 (both encode to "SSR")
 */
export function calculatePhoneticSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0.0;

  // Extract name tokens (first/last names) for better phonetic matching
  const tokens1 = str1.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
  const tokens2 = str2.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);

  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  // Calculate phonetic encoding for each token
  const phonetics1 = tokens1.map(token => doubleMetaphone(token));
  const phonetics2 = tokens2.map(token => doubleMetaphone(token));

  // Check for phonetic matches across all tokens
  let bestMatch = 0.0;

  for (const [primary1, secondary1] of phonetics1) {
    for (const [primary2, secondary2] of phonetics2) {
      // Primary phonetic key match (highest confidence)
      if (primary1 && primary2 && primary1 === primary2) {
        bestMatch = Math.max(bestMatch, 1.0);
      }
      // Secondary phonetic key match (medium confidence)
      else if (
        (primary1 && secondary2 && primary1 === secondary2) ||
        (secondary1 && primary2 && secondary1 === primary2) ||
        (secondary1 && secondary2 && secondary1 === secondary2)
      ) {
        bestMatch = Math.max(bestMatch, 0.5);
      }
    }
  }

  return bestMatch;
}

/**
 * Enhanced name similarity combining lexical (Levenshtein) and phonetic (Double Metaphone) matching
 * Weight distribution: 70% lexical, 30% phonetic
 *
 * This catches name variations like "Steven/Stephen" or "Smyth/Smith" that have similar
 * pronunciation but different spellings, while still prioritizing exact/close lexical matches.
 *
 * @param name1 - First name to compare
 * @param name2 - Second name to compare
 * @returns Combined similarity score from 0.0 to 1.0
 *
 * Examples:
 * - "Napoleon Bonaparte" vs "Napoleon" → ~0.75 (partial lexical match)
 * - "Stephen" vs "Steven" → ~0.95 (high phonetic + medium lexical)
 * - "Julius Caesar" vs "Gaius Julius Caesar" → ~0.70 (partial match)
 */
export function enhancedNameSimilarity(name1: string, name2: string): number {
  const lexicalScore = calculateSimilarity(name1, name2);
  const phoneticScore = calculatePhoneticSimilarity(name1, name2);

  // Weighted average: 70% lexical (exact spelling), 30% phonetic (pronunciation)
  return (lexicalScore * 0.7) + (phoneticScore * 0.3);
}

/**
 * Determine confidence level based on similarity score
 *
 * @param similarity - Combined similarity score (0-1)
 * @returns Confidence level string
 */
export function getConfidenceLevel(similarity: number): 'high' | 'medium' | 'low' {
  if (similarity >= 0.90) return 'high';
  if (similarity >= 0.75) return 'medium';
  return 'low';
}
