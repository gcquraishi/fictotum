import { describe, it, expect } from 'vitest';
import {
  normalizeTags,
  validateTags,
  findSuggestedMatch,
  categorizeTags,
  SUGGESTED_TAGS,
  TAG_CONSTRAINTS,
} from './tagNormalizer';

describe('normalizeTags', () => {
  it('trims whitespace and lowercases', () => {
    expect(normalizeTags(['  Heroic ', 'COMPLEX'])).toEqual(['heroic', 'complex']);
  });

  it('removes empty strings', () => {
    expect(normalizeTags(['heroic', '', '  ', 'complex'])).toEqual(['heroic', 'complex']);
  });

  it('deduplicates case-insensitively', () => {
    expect(normalizeTags(['Heroic', 'heroic', 'HEROIC'])).toEqual(['heroic']);
  });

  it('filters tags shorter than MIN_LENGTH', () => {
    expect(normalizeTags(['a', 'heroic'])).toEqual(['heroic']);
  });

  it('filters tags longer than MAX_LENGTH', () => {
    const longTag = 'a'.repeat(TAG_CONSTRAINTS.MAX_LENGTH + 1);
    expect(normalizeTags([longTag, 'heroic'])).toEqual(['heroic']);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe('validateTags', () => {
  it('returns valid for acceptable tags', () => {
    expect(validateTags(['heroic', 'complex'])).toEqual({ valid: true });
  });

  it('rejects empty tag array', () => {
    const result = validateTags([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('1 tag');
  });

  it('rejects more than MAX_TAGS', () => {
    const tags = Array.from({ length: TAG_CONSTRAINTS.MAX_TAGS + 1 }, (_, i) => `tag${i}`);
    const result = validateTags(tags);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${TAG_CONSTRAINTS.MAX_TAGS}`);
  });

  it('rejects tags that are too short', () => {
    const result = validateTags(['a']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between');
  });

  it('rejects tags that are too long', () => {
    const longTag = 'a'.repeat(TAG_CONSTRAINTS.MAX_LENGTH + 1);
    const result = validateTags([longTag]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between');
  });

  it('accepts exactly MAX_TAGS', () => {
    const tags = Array.from({ length: TAG_CONSTRAINTS.MAX_TAGS }, (_, i) => `tag${i + 10}`);
    expect(validateTags(tags)).toEqual({ valid: true });
  });
});

describe('findSuggestedMatch', () => {
  it('returns exact match for suggested tag', () => {
    expect(findSuggestedMatch('heroic')).toBe('heroic');
  });

  it('returns close match for typo', () => {
    expect(findSuggestedMatch('heroik')).toBe('heroic');
  });

  it('returns null for unrelated input', () => {
    expect(findSuggestedMatch('xyzzy')).toBeNull();
  });

  it('respects custom threshold', () => {
    // With a very high threshold, minor typos should fail
    expect(findSuggestedMatch('heroik', 0.99)).toBeNull();
  });

  it('returns best match among candidates', () => {
    // "tragic" is closer to "tragik" than any other tag
    expect(findSuggestedMatch('tragik')).toBe('tragic');
  });
});

describe('categorizeTags', () => {
  it('separates suggested from custom tags', () => {
    const result = categorizeTags(['heroic', 'custom-tag', 'complex']);
    expect(result.common).toEqual(['heroic', 'complex']);
    expect(result.custom).toEqual(['custom-tag']);
  });

  it('returns all common for only suggested tags', () => {
    const result = categorizeTags(['heroic', 'tragic']);
    expect(result.common).toEqual(['heroic', 'tragic']);
    expect(result.custom).toEqual([]);
  });

  it('returns all custom for unknown tags', () => {
    const result = categorizeTags(['foo', 'bar']);
    expect(result.common).toEqual([]);
    expect(result.custom).toEqual(['foo', 'bar']);
  });

  it('returns empty arrays for empty input', () => {
    const result = categorizeTags([]);
    expect(result.common).toEqual([]);
    expect(result.custom).toEqual([]);
  });
});

describe('SUGGESTED_TAGS', () => {
  it('contains 12 tags', () => {
    expect(SUGGESTED_TAGS).toHaveLength(12);
  });

  it('includes core sentiment tags', () => {
    expect(SUGGESTED_TAGS).toContain('heroic');
    expect(SUGGESTED_TAGS).toContain('villainous');
    expect(SUGGESTED_TAGS).toContain('complex');
    expect(SUGGESTED_TAGS).toContain('neutral');
    expect(SUGGESTED_TAGS).toContain('tragic');
  });
});
