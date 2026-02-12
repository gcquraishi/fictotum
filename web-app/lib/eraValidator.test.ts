import { describe, it, expect } from 'vitest';
import {
  calculateEraConfidence,
  detectAnachronism,
  validateEraTags,
  getMostConfidentEra,
  getHighConfidenceEras,
  getAnachronisticEras,
  type Era,
} from './eraValidator';

const VICTORIAN: Era = { name: 'Victorian Era', start_year: 1837, end_year: 1901 };
const MEDIEVAL: Era = { name: 'Medieval Period', start_year: 500, end_year: 1500 };
const ROMAN: Era = { name: 'Roman Empire', start_year: -27, end_year: 476 };

describe('calculateEraConfidence', () => {
  it('returns 0.95 when setting year is within era', () => {
    expect(calculateEraConfidence(VICTORIAN, 1860, 1995)).toBe(0.95);
  });

  it('returns 0.60 when setting year is close (within 50 years)', () => {
    expect(calculateEraConfidence(VICTORIAN, 1920, 1995)).toBe(0.60);
  });

  it('returns 0.20 when setting year is far (100+ years)', () => {
    expect(calculateEraConfidence(VICTORIAN, 1700, 1995)).toBe(0.20);
  });

  it('returns 0.70 when only release year is in range', () => {
    expect(calculateEraConfidence(VICTORIAN, undefined, 1870)).toBe(0.70);
  });

  it('returns 0.30 when release year is out of range and no setting year', () => {
    expect(calculateEraConfidence(VICTORIAN, undefined, 2020)).toBe(0.30);
  });

  it('handles BCE eras', () => {
    expect(calculateEraConfidence(ROMAN, 100, 2000)).toBe(0.95);
    expect(calculateEraConfidence(ROMAN, -20, 2000)).toBe(0.95);
  });
});

describe('detectAnachronism', () => {
  it('returns false when setting year is within era', () => {
    expect(detectAnachronism(VICTORIAN, 1860)).toBe(false);
  });

  it('returns false when setting year is close (within 50 years)', () => {
    expect(detectAnachronism(VICTORIAN, 1920)).toBe(false);
  });

  it('returns true when setting year is far outside era', () => {
    expect(detectAnachronism(MEDIEVAL, 1850)).toBe(true);
  });

  it('returns false when no setting year provided', () => {
    expect(detectAnachronism(VICTORIAN, undefined)).toBe(false);
  });
});

describe('validateEraTags', () => {
  it('validates multiple eras against context', () => {
    const results = validateEraTags(1860, 1995, [VICTORIAN, MEDIEVAL]);
    expect(results).toHaveLength(2);
    expect(results[0].eraName).toBe('Victorian Era');
    expect(results[0].confidence).toBe(0.95);
    expect(results[0].isAnachronistic).toBe(false);
    expect(results[1].eraName).toBe('Medieval Period');
    expect(results[1].confidence).toBe(0.20);
    expect(results[1].isAnachronistic).toBe(true);
  });

  it('returns empty array for empty era tags', () => {
    expect(validateEraTags(1860, 1995, [])).toEqual([]);
  });

  it('includes reasoning in results', () => {
    const results = validateEraTags(1860, 1995, [VICTORIAN]);
    expect(results[0].reasoning).toContain('1860');
    expect(results[0].reasoning).toContain('Victorian Era');
  });

  it('handles release-year-only validation', () => {
    const results = validateEraTags(undefined, 1870, [VICTORIAN]);
    expect(results[0].confidence).toBe(0.70);
    expect(results[0].reasoning).toContain('Release year');
  });
});

describe('getMostConfidentEra', () => {
  it('returns the highest confidence era', () => {
    const validations = validateEraTags(1860, 1995, [VICTORIAN, MEDIEVAL]);
    const best = getMostConfidentEra(validations);
    expect(best?.eraName).toBe('Victorian Era');
    expect(best?.confidence).toBe(0.95);
  });

  it('returns undefined for empty array', () => {
    expect(getMostConfidentEra([])).toBeUndefined();
  });
});

describe('getHighConfidenceEras', () => {
  it('filters to high confidence eras', () => {
    const validations = validateEraTags(1860, 1995, [VICTORIAN, MEDIEVAL]);
    const high = getHighConfidenceEras(validations, 0.70);
    expect(high).toHaveLength(1);
    expect(high[0].eraName).toBe('Victorian Era');
  });

  it('returns empty for no matches above threshold', () => {
    const validations = validateEraTags(1860, 1995, [MEDIEVAL]);
    const high = getHighConfidenceEras(validations, 0.70);
    expect(high).toHaveLength(0);
  });
});

describe('getAnachronisticEras', () => {
  it('returns only anachronistic eras', () => {
    const validations = validateEraTags(1860, 1995, [VICTORIAN, MEDIEVAL]);
    const problems = getAnachronisticEras(validations);
    expect(problems).toHaveLength(1);
    expect(problems[0].eraName).toBe('Medieval Period');
  });

  it('returns empty when no anachronisms', () => {
    const validations = validateEraTags(1860, 1995, [VICTORIAN]);
    expect(getAnachronisticEras(validations)).toHaveLength(0);
  });
});
