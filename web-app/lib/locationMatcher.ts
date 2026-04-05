/**
 * Location Matching Utility
 *
 * Provides intelligent duplicate detection for locations using fuzzy string matching,
 * Wikidata Q-ID verification, and coordinate proximity analysis.
 *
 * Used by the unified data ingestion hub to prevent duplicate location entries
 * while maintaining high data quality standards.
 */

import { getSession } from './neo4j';
import { Location } from './types';

/**
 * Result of location matching operation
 */
export interface LocationMatch {
  /** Type of match found */
  matchType: 'exact' | 'auto_merge' | 'possible_duplicate' | 'unmapped';
  /** Existing location if a match was found */
  existingLocation?: Location;
  /** String similarity score (0-1) */
  similarity?: number;
  /** Whether Wikidata Q-IDs match */
  qIdMatch?: boolean;
  /** Whether coordinates are within proximity threshold */
  coordMatch?: boolean;
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * Implements the dynamic programming algorithm for computing edit distance.
 * Time complexity: O(n*m) where n and m are string lengths.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Edit distance (number of single-character edits needed)
 *
 * @example
 * calculateLevenshteinDistance('kitten', 'sitting') // Returns 3
 * calculateLevenshteinDistance('Rome', 'roma') // Returns 2
 */
export function calculateLevenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  // Initialize first column (0, 1, 2, 3, ...)
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  // Initialize first row (0, 1, 2, 3, ...)
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        // Characters match - no edit needed
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        // Take minimum of: substitution, insertion, deletion
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 *
 * Uses Levenshtein distance normalized by the length of the longer string.
 * A score of 1.0 means identical strings, 0.0 means completely different.
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Similarity score between 0.0 and 1.0
 *
 * @example
 * calculateSimilarity('London', 'london') // Returns 1.0 (case-insensitive)
 * calculateSimilarity('Paris', 'Pariis') // Returns ~0.83
 * calculateSimilarity('Rome', 'Tokyo') // Returns 0.0
 */
export function calculateSimilarity(str1: string, str2: string): number {
  // Normalize to lowercase for case-insensitive comparison
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Handle edge cases
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const editDistance = calculateLevenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate distance between two coordinate pairs using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 *
 * @example
 * // Distance between New York and Boston (approx 306 km)
 * calculateDistance(40.7128, -74.0060, 42.3601, -71.0589) // ~306
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Match a candidate location against existing locations in the database
 *
 * Implements intelligent matching using multiple criteria in order of confidence:
 * 1. Exact name match (case-insensitive) → exact
 * 2. Levenshtein ≥95% + Q-ID match → auto_merge
 * 3. Levenshtein 70-94% → possible_duplicate
 * 4. Coordinate proximity (<50km) → possible_duplicate
 * 5. No match → unmapped
 *
 * @param candidateName - Name of the location to match
 * @param candidateQId - Optional Wikidata Q-ID
 * @param candidateCoords - Optional coordinates {lat, lon}
 * @returns LocationMatch object with match type and existing location if found
 *
 * @example
 * // Exact match
 * await matchLocation('London', 'Q84') // { matchType: 'exact', existingLocation: {...} }
 *
 * // High similarity with Q-ID match
 * await matchLocation('Londinium', 'Q84') // { matchType: 'auto_merge', ... }
 *
 * // Possible duplicate (similarity only)
 * await matchLocation('Londyn') // { matchType: 'possible_duplicate', similarity: 0.83, ... }
 *
 * // No match
 * await matchLocation('NewCityName') // { matchType: 'unmapped' }
 */
export async function matchLocation(
  candidateName: string,
  candidateQId?: string,
  candidateCoords?: { lat: number; lon: number }
): Promise<LocationMatch> {
  const session = await getSession();

  try {
    // Fetch all existing locations
    const result = await session.run(`
      MATCH (l:Location)
      RETURN l.location_id AS location_id,
             l.name AS name,
             l.location_type AS location_type,
             l.wikidata_id AS wikidata_id,
             l.parent_location AS parent_location,
             l.coordinates AS coordinates,
             l.description AS description
    `);

    const existingLocations: Location[] = result.records.map(record => ({
      location_id: record.get('location_id'),
      name: record.get('name'),
      location_type: record.get('location_type'),
      wikidata_id: record.get('wikidata_id') || undefined,
      parent_location: record.get('parent_location') || undefined,
      coordinates: record.get('coordinates') || undefined,
      description: record.get('description') || undefined,
    }));

    // Normalize candidate name for comparison
    const normalizedCandidate = candidateName.toLowerCase().trim();

    // 1. Check for exact name match (case-insensitive)
    const exactMatch = existingLocations.find(
      loc => loc.name.toLowerCase().trim() === normalizedCandidate
    );

    if (exactMatch) {
      return {
        matchType: 'exact',
        existingLocation: exactMatch,
        similarity: 1.0,
      };
    }

    // 2. Calculate similarity scores for all locations
    const scoredLocations = existingLocations.map(loc => ({
      location: loc,
      similarity: calculateSimilarity(candidateName, loc.name),
      qIdMatch: candidateQId && loc.wikidata_id
        ? candidateQId === loc.wikidata_id
        : false,
      coordMatch: false,
    }));

    // 3. Check for coordinate proximity if provided
    if (candidateCoords) {
      for (const scored of scoredLocations) {
        if (scored.location.coordinates) {
          const coords = scored.location.coordinates;
          const distance = calculateDistance(
            candidateCoords.lat,
            candidateCoords.lon,
            coords.latitude,
            coords.longitude
          );
          scored.coordMatch = distance < 50; // 50km threshold
        }
      }
    }

    // 4. Check for high similarity (≥95%) + Q-ID match → auto_merge
    const autoMergeCandidate = scoredLocations.find(
      scored => scored.similarity >= 0.95 && scored.qIdMatch
    );

    if (autoMergeCandidate) {
      return {
        matchType: 'auto_merge',
        existingLocation: autoMergeCandidate.location,
        similarity: autoMergeCandidate.similarity,
        qIdMatch: true,
      };
    }

    // 5. Check for medium similarity (70-94%) → possible_duplicate
    const possibleDuplicates = scoredLocations
      .filter(scored => scored.similarity >= 0.70 && scored.similarity < 0.95)
      .sort((a, b) => b.similarity - a.similarity);

    if (possibleDuplicates.length > 0) {
      const best = possibleDuplicates[0];
      return {
        matchType: 'possible_duplicate',
        existingLocation: best.location,
        similarity: best.similarity,
        qIdMatch: best.qIdMatch,
        coordMatch: best.coordMatch,
      };
    }

    // 6. Check for coordinate proximity match
    const coordMatchCandidate = scoredLocations.find(scored => scored.coordMatch);

    if (coordMatchCandidate) {
      return {
        matchType: 'possible_duplicate',
        existingLocation: coordMatchCandidate.location,
        similarity: coordMatchCandidate.similarity,
        coordMatch: true,
      };
    }

    // 7. No match found
    return {
      matchType: 'unmapped',
    };
  } finally {
    await session.close();
  }
}
