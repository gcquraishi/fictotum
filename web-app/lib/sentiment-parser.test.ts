import { describe, it, expect } from 'vitest';
import {
  parseSentiment,
  getSentimentScore,
  getCanonicalSentiment,
  isPositiveSentiment,
  isNegativeSentiment,
  getNormalizedSentiment,
} from './sentiment-parser';

describe('parseSentiment', () => {
  it('parses canonical sentiments correctly', () => {
    expect(parseSentiment('Heroic')).toEqual({ canonical: 'Heroic', numericScore: 85, original: 'Heroic' });
    expect(parseSentiment('Villainous')).toEqual({ canonical: 'Villainous', numericScore: 15, original: 'Villainous' });
    expect(parseSentiment('Complex')).toEqual({ canonical: 'Complex', numericScore: 50, original: 'Complex' });
    expect(parseSentiment('Neutral')).toEqual({ canonical: 'Neutral', numericScore: 50, original: 'Neutral' });
    expect(parseSentiment('Tragic')).toEqual({ canonical: 'Tragic', numericScore: 30, original: 'Tragic' });
  });

  it('defaults to Complex for null/undefined/empty', () => {
    expect(parseSentiment(null)).toEqual({ canonical: 'Complex', numericScore: 50, original: 'unknown' });
    expect(parseSentiment(undefined)).toEqual({ canonical: 'Complex', numericScore: 50, original: 'unknown' });
    expect(parseSentiment('')).toEqual({ canonical: 'Complex', numericScore: 50, original: 'unknown' });
  });

  it('defaults to Complex for unknown values', () => {
    const result = parseSentiment('garbage');
    expect(result.canonical).toBe('Complex');
    expect(result.numericScore).toBe(50);
    expect(result.original).toBe('garbage');
  });
});

describe('getSentimentScore', () => {
  it('returns correct scores', () => {
    expect(getSentimentScore('Heroic')).toBe(85);
    expect(getSentimentScore('Villainous')).toBe(15);
    expect(getSentimentScore('Complex')).toBe(50);
    expect(getSentimentScore('Neutral')).toBe(50);
    expect(getSentimentScore('Tragic')).toBe(30);
  });

  it('returns 50 for null', () => {
    expect(getSentimentScore(null)).toBe(50);
  });
});

describe('getCanonicalSentiment', () => {
  it('returns canonical name', () => {
    expect(getCanonicalSentiment('Heroic')).toBe('Heroic');
    expect(getCanonicalSentiment(null)).toBe('Complex');
    expect(getCanonicalSentiment('garbage')).toBe('Complex');
  });
});

describe('isPositiveSentiment', () => {
  it('returns true only for Heroic', () => {
    expect(isPositiveSentiment('Heroic')).toBe(true);
    expect(isPositiveSentiment('Villainous')).toBe(false);
    expect(isPositiveSentiment('Complex')).toBe(false);
    expect(isPositiveSentiment(null)).toBe(false);
  });
});

describe('isNegativeSentiment', () => {
  it('returns true only for Villainous', () => {
    expect(isNegativeSentiment('Villainous')).toBe(true);
    expect(isNegativeSentiment('Heroic')).toBe(false);
    expect(isNegativeSentiment('Complex')).toBe(false);
    expect(isNegativeSentiment(null)).toBe(false);
  });
});

describe('getNormalizedSentiment', () => {
  it('maps canonical to normalized labels', () => {
    expect(getNormalizedSentiment('Heroic')).toBe('positive');
    expect(getNormalizedSentiment('Villainous')).toBe('negative');
    expect(getNormalizedSentiment('Neutral')).toBe('neutral');
    expect(getNormalizedSentiment('Complex')).toBe('complex');
    expect(getNormalizedSentiment('Tragic')).toBe('complex');
  });
});

describe('score ordering', () => {
  it('maintains Heroic > Neutral = Complex > Tragic > Villainous', () => {
    expect(getSentimentScore('Heroic')).toBeGreaterThan(getSentimentScore('Neutral'));
    expect(getSentimentScore('Neutral')).toBe(getSentimentScore('Complex'));
    expect(getSentimentScore('Complex')).toBeGreaterThan(getSentimentScore('Tragic'));
    expect(getSentimentScore('Tragic')).toBeGreaterThan(getSentimentScore('Villainous'));
  });
});
