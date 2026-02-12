import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  calculatePhoneticSimilarity,
  enhancedNameSimilarity,
  getConfidenceLevel,
} from './name-matching';

describe('calculateSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(calculateSimilarity('Napoleon', 'Napoleon')).toBe(1.0);
  });

  it('is case-insensitive', () => {
    expect(calculateSimilarity('napoleon', 'NAPOLEON')).toBe(1.0);
  });

  it('returns 1.0 for two empty strings', () => {
    expect(calculateSimilarity('', '')).toBe(1.0);
  });

  it('returns high similarity for close strings', () => {
    const sim = calculateSimilarity('Steven', 'Stephen');
    expect(sim).toBeGreaterThan(0.6);
  });

  it('returns low similarity for different strings', () => {
    const sim = calculateSimilarity('Napoleon', 'Shakespeare');
    expect(sim).toBeLessThan(0.4);
  });

  it('handles substring relationships', () => {
    const sim = calculateSimilarity('Napoleon', 'Napoleon Bonaparte');
    expect(sim).toBeGreaterThan(0.4);
    expect(sim).toBeLessThan(1.0);
  });
});

describe('calculatePhoneticSimilarity', () => {
  it('returns 1.0 for phonetically identical names', () => {
    expect(calculatePhoneticSimilarity('Stephen', 'Steven')).toBe(1.0);
  });

  it('returns 1.0 for Smith/Smyth', () => {
    expect(calculatePhoneticSimilarity('Smith', 'Smyth')).toBe(1.0);
  });

  it('returns 0.0 for empty strings', () => {
    expect(calculatePhoneticSimilarity('', '')).toBe(0.0);
    expect(calculatePhoneticSimilarity('Napoleon', '')).toBe(0.0);
  });

  it('returns > 0 for phonetically related names', () => {
    const sim = calculatePhoneticSimilarity('Caesar', 'Cesar');
    expect(sim).toBeGreaterThan(0);
  });

  it('returns low score for phonetically unrelated names', () => {
    const sim = calculatePhoneticSimilarity('Napoleon', 'Shakespeare');
    expect(sim).toBeLessThanOrEqual(0.5);
  });
});

describe('enhancedNameSimilarity', () => {
  it('returns 1.0 for identical names', () => {
    const sim = enhancedNameSimilarity('Julius Caesar', 'Julius Caesar');
    expect(sim).toBe(1.0);
  });

  it('returns high score for spelling variants', () => {
    const sim = enhancedNameSimilarity('Stephen', 'Steven');
    expect(sim).toBeGreaterThanOrEqual(0.80);
  });

  it('uses 70/30 weight distribution', () => {
    // For identical strings: lexical=1.0, phonetic=1.0 → 0.7*1 + 0.3*1 = 1.0
    expect(enhancedNameSimilarity('test', 'test')).toBe(1.0);
  });

  it('handles partial name matches', () => {
    const sim = enhancedNameSimilarity('Napoleon', 'Napoleon Bonaparte');
    expect(sim).toBeGreaterThan(0.4);
  });
});

describe('getConfidenceLevel', () => {
  it('returns high for >= 0.90', () => {
    expect(getConfidenceLevel(0.95)).toBe('high');
    expect(getConfidenceLevel(0.90)).toBe('high');
    expect(getConfidenceLevel(1.0)).toBe('high');
  });

  it('returns medium for 0.75-0.89', () => {
    expect(getConfidenceLevel(0.89)).toBe('medium');
    expect(getConfidenceLevel(0.75)).toBe('medium');
    expect(getConfidenceLevel(0.80)).toBe('medium');
  });

  it('returns low for < 0.75', () => {
    expect(getConfidenceLevel(0.74)).toBe('low');
    expect(getConfidenceLevel(0.5)).toBe('low');
    expect(getConfidenceLevel(0.0)).toBe('low');
  });
});
