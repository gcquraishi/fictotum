/**
 * Shared sentiment parsing utility for Fictotum.
 * After FIC-100 normalization, the DB has exactly 5 canonical values:
 * Heroic, Villainous, Complex, Neutral, Tragic.
 *
 * This parser converts canonical sentiments to numeric scores for charting
 * and provides helper functions for comparisons.
 */

export type CanonicalSentiment = 'Heroic' | 'Villainous' | 'Complex' | 'Neutral' | 'Tragic';

export interface SentimentScore {
  canonical: CanonicalSentiment;
  numericScore: number; // 0-100 scale (0=villainous, 50=complex, 100=heroic)
  original: string;
}

const SENTIMENT_SCORES: Record<CanonicalSentiment, number> = {
  Heroic: 85,
  Villainous: 15,
  Complex: 50,
  Neutral: 50,
  Tragic: 30,
};

/**
 * Parse a sentiment string into a scored form.
 * With canonical DB values, this is now a direct lookup.
 */
export function parseSentiment(sentiment: string | null | undefined): SentimentScore {
  if (!sentiment) {
    return { canonical: 'Complex', numericScore: 50, original: 'unknown' };
  }

  const score = SENTIMENT_SCORES[sentiment as CanonicalSentiment];
  if (score !== undefined) {
    return { canonical: sentiment as CanonicalSentiment, numericScore: score, original: sentiment };
  }

  // Fallback for any non-canonical value that slips through
  return { canonical: 'Complex', numericScore: 50, original: sentiment };
}

/**
 * Get numeric score for charting (0-100 scale).
 * Used by ReputationTimeline and VolatilityLeaderboard.
 */
export function getSentimentScore(sentiment: string | null | undefined): number {
  return parseSentiment(sentiment).numericScore;
}

/**
 * Get canonical sentiment category.
 */
export function getCanonicalSentiment(sentiment: string | null | undefined): CanonicalSentiment {
  return parseSentiment(sentiment).canonical;
}

/**
 * Check if sentiment leans positive (for comparisons).
 */
export function isPositiveSentiment(sentiment: string | null | undefined): boolean {
  return parseSentiment(sentiment).canonical === 'Heroic';
}

/**
 * Check if sentiment leans negative (for comparisons).
 */
export function isNegativeSentiment(sentiment: string | null | undefined): boolean {
  return parseSentiment(sentiment).canonical === 'Villainous';
}

// Backward compatibility aliases
export type NormalizedSentiment = 'positive' | 'negative' | 'complex' | 'neutral';

/** @deprecated Use getCanonicalSentiment instead */
export function getNormalizedSentiment(sentiment: string | null | undefined): NormalizedSentiment {
  const { canonical } = parseSentiment(sentiment);
  switch (canonical) {
    case 'Heroic': return 'positive';
    case 'Villainous': return 'negative';
    case 'Neutral': return 'neutral';
    default: return 'complex';
  }
}
