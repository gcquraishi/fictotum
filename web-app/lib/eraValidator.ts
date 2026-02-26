/**
 * Era Confidence Scoring & Validation Utility
 *
 * Validates era tags against temporal context (setting_year, release_year) and
 * detects anachronisms in historical media representations.
 *
 * Used by the unified data ingestion hub to ensure temporal accuracy and
 * flag potentially problematic era assignments for review.
 */

/**
 * Era definition structure
 */
export interface Era {
  name: string;
  start_year: number;
  end_year: number;
}

/**
 * Result of era validation for a single era tag
 */
export interface EraValidation {
  /** Name of the era being validated */
  eraName: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Whether this era is anachronistic for the given context */
  isAnachronistic: boolean;
  /** Human-readable explanation of the validation result */
  reasoning: string;
}

/**
 * Calculate confidence score for an era tag based on temporal alignment
 *
 * Confidence scoring rules:
 * - If settingYear provided:
 *   - In range (within era bounds): 0.95
 *   - Close (within 50 years): 0.60
 *   - Far (100+ years): 0.20
 * - If only releaseYear provided:
 *   - In range: 0.70
 *   - Out of range: 0.30
 *
 * @param era - Era definition with start/end years
 * @param settingYear - When the work is set (most accurate)
 * @param releaseYear - When the work was released (fallback)
 * @returns Confidence score between 0.0 and 1.0
 *
 * @example
 * // Perfect match with setting year
 * const era = { name: 'Victorian Era', start_year: 1837, end_year: 1901 };
 * calculateEraConfidence(era, 1860, 1995) // Returns 0.95
 *
 * // Release year only
 * calculateEraConfidence(era, undefined, 1895) // Returns 0.70
 *
 * // Far from era
 * calculateEraConfidence(era, 1750, 1995) // Returns 0.20
 */
export function calculateEraConfidence(
  era: Era,
  settingYear: number | undefined,
  releaseYear: number
): number {
  // Priority 1: Use setting year if provided (most accurate)
  if (settingYear !== undefined && settingYear !== null) {
    // Check if setting year falls within era boundaries
    if (settingYear >= era.start_year && settingYear <= era.end_year) {
      return 0.95; // High confidence - setting year within era
    }

    // Calculate distance from era
    const distanceFromStart = Math.abs(settingYear - era.start_year);
    const distanceFromEnd = Math.abs(settingYear - era.end_year);
    const minDistance = Math.min(distanceFromStart, distanceFromEnd);

    // Close proximity (within 50 years)
    if (minDistance <= 50) {
      return 0.60; // Medium confidence - close but not exact
    }

    // Far from era (100+ years)
    return 0.20; // Low confidence - significant temporal mismatch
  }

  // Priority 2: Fall back to release year (less accurate, work may be historical fiction)
  if (releaseYear >= era.start_year && releaseYear <= era.end_year) {
    return 0.70; // Moderate confidence - release year aligns but no setting context
  }

  // Release year doesn't align
  return 0.30; // Low-medium confidence - could still be valid (historical fiction)
}

/**
 * Detect whether an era assignment is anachronistic
 *
 * An era is considered anachronistic if:
 * - settingYear is provided AND
 * - Confidence score < 0.5 (significant temporal mismatch)
 *
 * @param era - Era definition with start/end years
 * @param settingYear - When the work is set
 * @returns true if anachronistic, false otherwise
 *
 * @example
 * const medievalEra = { name: 'Medieval Period', start_year: 500, end_year: 1500 };
 * detectAnachronism(medievalEra, 1850) // Returns true (Victorian setting, medieval era)
 * detectAnachronism(medievalEra, 1200) // Returns false (valid)
 * detectAnachronism(medievalEra, undefined) // Returns false (no setting year to verify)
 */
export function detectAnachronism(
  era: Era,
  settingYear: number | undefined
): boolean {
  // Can only detect anachronism if we have a setting year
  if (settingYear === undefined || settingYear === null) {
    return false;
  }

  // Check if setting year is reasonably close to era
  const inRange = settingYear >= era.start_year && settingYear <= era.end_year;
  if (inRange) {
    return false; // Perfect alignment - not anachronistic
  }

  // Calculate minimum distance from era boundaries
  const distanceFromStart = Math.abs(settingYear - era.start_year);
  const distanceFromEnd = Math.abs(settingYear - era.end_year);
  const minDistance = Math.min(distanceFromStart, distanceFromEnd);

  // If distance is significant (implies confidence < 0.5), flag as anachronistic
  // Using 50 years as threshold (matches confidence calculation)
  return minDistance > 50;
}

/**
 * Validate multiple era tags against temporal context
 *
 * Evaluates each era tag and returns validation results with confidence scores,
 * anachronism flags, and human-readable reasoning.
 *
 * @param settingYear - When the work is set (optional but recommended)
 * @param releaseYear - When the work was released (required)
 * @param eraTags - Array of era definitions to validate
 * @returns Array of validation results for each era
 *
 * @example
 * const eras = [
 *   { name: 'Victorian Era', start_year: 1837, end_year: 1901 },
 *   { name: 'Medieval Period', start_year: 500, end_year: 1500 }
 * ];
 *
 * // Validate for a Victorian-set work
 * validateEraTags(1860, 1995, eras)
 * // Returns:
 * // [
 * //   {
 * //     eraName: 'Victorian Era',
 * //     confidence: 0.95,
 * //     isAnachronistic: false,
 * //     reasoning: 'Setting year (1860) falls within Victorian Era (1837-1901)'
 * //   },
 * //   {
 * //     eraName: 'Medieval Period',
 * //     confidence: 0.20,
 * //     isAnachronistic: true,
 * //     reasoning: 'Setting year (1860) is 360 years outside Medieval Period (500-1500)'
 * //   }
 * // ]
 */
export function validateEraTags(
  settingYear: number | undefined,
  releaseYear: number,
  eraTags: Era[]
): EraValidation[] {
  // Handle edge case: empty era tags
  if (!eraTags || eraTags.length === 0) {
    return [];
  }

  return eraTags.map(era => {
    const confidence = calculateEraConfidence(era, settingYear, releaseYear);
    const isAnachronistic = detectAnachronism(era, settingYear);

    // Generate human-readable reasoning
    let reasoning: string;

    if (settingYear !== undefined && settingYear !== null) {
      // We have setting year - most accurate reasoning
      if (settingYear >= era.start_year && settingYear <= era.end_year) {
        reasoning = `Setting year (${settingYear}) falls within ${era.name} (${era.start_year}-${era.end_year})`;
      } else {
        const distanceFromStart = Math.abs(settingYear - era.start_year);
        const distanceFromEnd = Math.abs(settingYear - era.end_year);
        const minDistance = Math.min(distanceFromStart, distanceFromEnd);
        const direction = settingYear < era.start_year ? 'before' : 'after';

        if (minDistance <= 50) {
          reasoning = `Setting year (${settingYear}) is ${minDistance} years ${direction} ${era.name} (${era.start_year}-${era.end_year}) - close proximity`;
        } else {
          reasoning = `Setting year (${settingYear}) is ${minDistance} years outside ${era.name} (${era.start_year}-${era.end_year})`;
        }
      }

      if (isAnachronistic) {
        reasoning += ' - ANACHRONISTIC';
      }
    } else {
      // Only release year available - less certain reasoning
      if (releaseYear >= era.start_year && releaseYear <= era.end_year) {
        reasoning = `Release year (${releaseYear}) falls within ${era.name} (${era.start_year}-${era.end_year}) - setting year unknown, could be historical fiction`;
      } else {
        reasoning = `Release year (${releaseYear}) outside ${era.name} (${era.start_year}-${era.end_year}) - setting year unknown, uncertain alignment`;
      }
    }

    return {
      eraName: era.name,
      confidence,
      isAnachronistic,
      reasoning,
    };
  });
}

/**
 * Get the most confident era tag from a validation result set
 *
 * Utility function to extract the best era match from validation results.
 *
 * @param validations - Array of era validation results
 * @returns The validation with the highest confidence score, or undefined if empty
 *
 * @example
 * const validations = validateEraTags(1860, 1995, eras);
 * const bestEra = getMostConfidentEra(validations);
 * console.log(bestEra.eraName); // 'Victorian Era'
 * console.log(bestEra.confidence); // 0.95
 */
export function getMostConfidentEra(
  validations: EraValidation[]
): EraValidation | undefined {
  if (!validations || validations.length === 0) {
    return undefined;
  }

  return validations.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  );
}

/**
 * Filter era validations to only include high-confidence matches
 *
 * Utility function to get only reliable era assignments (confidence ≥ threshold).
 *
 * @param validations - Array of era validation results
 * @param threshold - Minimum confidence score (default: 0.70)
 * @returns Filtered array of high-confidence validations
 *
 * @example
 * const validations = validateEraTags(1860, 1995, eras);
 * const reliable = getHighConfidenceEras(validations, 0.70);
 * // Only includes Victorian Era (0.95), excludes Medieval Period (0.20)
 */
export function getHighConfidenceEras(
  validations: EraValidation[],
  threshold = 0.70
): EraValidation[] {
  return validations.filter(v => v.confidence >= threshold);
}

/**
 * Get all anachronistic era assignments from validation results
 *
 * Utility function to extract problematic era tags that need review.
 *
 * @param validations - Array of era validation results
 * @returns Array of anachronistic validations
 *
 * @example
 * const validations = validateEraTags(1860, 1995, eras);
 * const problems = getAnachronisticEras(validations);
 * // Returns [{ eraName: 'Medieval Period', isAnachronistic: true, ... }]
 */
export function getAnachronisticEras(
  validations: EraValidation[]
): EraValidation[] {
  return validations.filter(v => v.isAnachronistic);
}
