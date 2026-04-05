import { describe, it, expect } from 'vitest';
import {
  getMediaTypeColor,
  getSentimentColor,
  getFigureTypeColor,
  formatYear,
  formatLifespan,
  formatMediaType,
  getPlaceholderStyle,
  isValidImageUrl,
  MEDIA_TYPE_COLORS,
  SENTIMENT_COLORS,
} from './card-utils';

describe('getMediaTypeColor', () => {
  it('returns correct colors for known types', () => {
    expect(getMediaTypeColor('Film')).toBe('#8B2635');
    expect(getMediaTypeColor('Book')).toBe('#6B4423');
    expect(getMediaTypeColor('TV Series')).toBe('#4A5D5E');
    expect(getMediaTypeColor('Video Game')).toBe('#3E5641');
    expect(getMediaTypeColor('Play')).toBe('#5D4E6D');
  });

  it('returns default for unknown types', () => {
    expect(getMediaTypeColor('Podcast')).toBe(MEDIA_TYPE_COLORS.default);
    expect(getMediaTypeColor(undefined)).toBe(MEDIA_TYPE_COLORS.default);
  });
});

describe('getSentimentColor', () => {
  it('returns correct colors for canonical sentiments', () => {
    expect(getSentimentColor('Heroic')).toBe('#22c55e');
    expect(getSentimentColor('Villainous')).toBe('#ef4444');
    expect(getSentimentColor('Complex')).toBe('#eab308');
    expect(getSentimentColor('Neutral')).toBe('#6b7280');
    expect(getSentimentColor('Tragic')).toBe('#8b5cf6');
  });

  it('returns default for unknown sentiments', () => {
    expect(getSentimentColor('Ambivalent')).toBe(SENTIMENT_COLORS.default);
    expect(getSentimentColor(undefined)).toBe(SENTIMENT_COLORS.default);
  });
});

describe('getFigureTypeColor', () => {
  it('returns correct colors', () => {
    expect(getFigureTypeColor('Historical')).toBe('#2C2C2C');
    expect(getFigureTypeColor('Fictional')).toBe('#5D4E6D');
    expect(getFigureTypeColor(undefined)).toBe('#2C2C2C');
  });
});

describe('formatYear', () => {
  it('formats positive years as CE', () => {
    expect(formatYear(1066)).toBe('1066 CE');
    expect(formatYear(2024)).toBe('2024 CE');
  });

  it('formats negative years as BCE', () => {
    expect(formatYear(-44)).toBe('44 BCE');
    expect(formatYear(-753)).toBe('753 BCE');
  });

  it('returns Unknown for null/undefined', () => {
    expect(formatYear(null)).toBe('Unknown');
    expect(formatYear(undefined)).toBe('Unknown');
  });
});

describe('formatLifespan', () => {
  it('formats both years', () => {
    const result = formatLifespan(100, 44);
    expect(result).toContain('100 CE');
    expect(result).toContain('44 CE');
  });

  it('handles BCE dates', () => {
    const result = formatLifespan(-100, -44);
    expect(result).toContain('100 BCE');
    expect(result).toContain('44 BCE');
  });

  it('returns empty string for no dates', () => {
    expect(formatLifespan(null, null)).toBe('');
    expect(formatLifespan(undefined, undefined)).toBe('');
  });

  it('handles missing birth year', () => {
    const result = formatLifespan(null, 2024);
    expect(result).toContain('?');
    expect(result).toContain('2024 CE');
  });

  it('handles missing death year', () => {
    const result = formatLifespan(1990, null);
    expect(result).toContain('1990 CE');
    expect(result).toContain('present');
  });
});

describe('formatMediaType', () => {
  it('returns the type as-is (canonical values)', () => {
    expect(formatMediaType('Film')).toBe('Film');
    expect(formatMediaType('TV Series')).toBe('TV Series');
  });

  it('returns Media for undefined', () => {
    expect(formatMediaType(undefined)).toBe('Media');
  });
});

describe('getPlaceholderStyle', () => {
  it('returns initials for single-name figures', () => {
    const style = getPlaceholderStyle('figure', 'Cleopatra');
    expect(style.initials).toBe('C');
    expect(style.textColor).toBe('#FEFEFE');
  });

  it('returns two-letter initials for full names', () => {
    const style = getPlaceholderStyle('figure', 'Julius Caesar');
    expect(style.initials).toBe('JC');
  });

  it('uses media type color for works', () => {
    const style = getPlaceholderStyle('work', 'Gladiator', 'Film');
    expect(style.backgroundColor).toBe('#8B2635');
    expect(style.initials).toBe('G');
  });

  it('handles multi-word names with middle names', () => {
    const style = getPlaceholderStyle('figure', 'Gaius Julius Caesar');
    expect(style.initials).toBe('GC');
  });
});

describe('isValidImageUrl', () => {
  it('accepts Vercel Blob URLs', () => {
    expect(isValidImageUrl('https://xyz.public.blob.vercel-storage.com/image.png')).toBe(true);
  });

  it('accepts local image paths', () => {
    expect(isValidImageUrl('/images/figures/test.png')).toBe(true);
  });

  it('accepts data URIs', () => {
    expect(isValidImageUrl('data:image/png;base64,abc123')).toBe(true);
  });

  it('accepts HTTPS URLs', () => {
    expect(isValidImageUrl('https://example.com/image.png')).toBe(true);
  });

  it('rejects null/undefined/empty', () => {
    expect(isValidImageUrl(null)).toBe(false);
    expect(isValidImageUrl(undefined)).toBe(false);
    expect(isValidImageUrl('')).toBe(false);
  });

  it('rejects HTTP URLs', () => {
    expect(isValidImageUrl('http://example.com/image.png')).toBe(false);
  });
});
