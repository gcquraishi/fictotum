/**
 * Shared utilities for entity card components (FigureCard, WorkCard, PortrayalCard).
 * Single source of truth for color maps, icons, formatting, and placeholder styles.
 */

import { BookOpen, Film, Tv, Gamepad2, Theater, BookImage, type LucideIcon } from 'lucide-react';

// =============================================================================
// COLOR MAPS
// =============================================================================

/** Media type → accent color (matches canonical DB values after FIC-99 normalization) */
export const MEDIA_TYPE_COLORS: Record<string, string> = {
  'Film':           '#8B2635',
  'Book':           '#6B4423',
  'TV Series':      '#4A5D5E',
  'TV Miniseries':  '#4A5D5E',
  'TV Movie':       '#4A5D5E',
  'Video Game':     '#3E5641',
  'Game Series':    '#3E5641',
  'Play':           '#5D4E6D',
  'Book Series':    '#6B4423',
  'Epic Poem':      '#6B4423',
  'Musical':        '#5D4E6D',
  'Documentary':    '#4A6741',
  'Manga':          '#8B6914',
  'Graphic Novel':  '#8B6914',
  'Comic':          '#8B6914',
  default:          '#666666',
};

/** Sentiment → color for badges and accents (canonical values after FIC-100 normalization) */
export const SENTIMENT_COLORS: Record<string, string> = {
  Heroic:     '#22c55e',
  Villainous: '#ef4444',
  Complex:    '#eab308',
  Neutral:    '#6b7280',
  Tragic:     '#8b5cf6',
  default:    '#6b7280',
};

/** Figure type → color */
export const FIGURE_TYPE_COLORS: Record<string, string> = {
  Historical: '#2C2C2C',
  Fictional:  '#5D4E6D',
  Disputed:   '#8B6914',
  default:    '#2C2C2C',
};

// =============================================================================
// ICON MAPS
// =============================================================================

/** Media type → Lucide icon component (matches canonical DB values) */
export const MEDIA_TYPE_ICONS: Record<string, LucideIcon> = {
  'Film':           Film,
  'Book':           BookOpen,
  'TV Series':      Tv,
  'TV Miniseries':  Tv,
  'TV Movie':       Tv,
  'Video Game':     Gamepad2,
  'Game Series':    Gamepad2,
  'Play':           Theater,
  'Musical':        Theater,
  'Book Series':    BookImage,
  'Epic Poem':      BookOpen,
  'Documentary':    Film,
  'Manga':          BookImage,
  'Graphic Novel':  BookImage,
  'Comic':          BookImage,
};

// =============================================================================
// COLOR ACCESSORS (normalize inconsistent DB values)
// =============================================================================

export function getMediaTypeColor(mediaType?: string): string {
  if (!mediaType) return MEDIA_TYPE_COLORS.default;
  return MEDIA_TYPE_COLORS[mediaType] || MEDIA_TYPE_COLORS.default;
}

export function getSentimentColor(sentiment?: string): string {
  if (!sentiment) return SENTIMENT_COLORS.default;
  return SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.default;
}

export function getFigureTypeColor(status?: string): string {
  if (!status) return FIGURE_TYPE_COLORS.default;
  return FIGURE_TYPE_COLORS[status] || FIGURE_TYPE_COLORS.default;
}

export function getMediaTypeIcon(mediaType?: string): LucideIcon {
  if (!mediaType) return Film;
  return MEDIA_TYPE_ICONS[mediaType] || Film;
}

// =============================================================================
// YEAR FORMATTING
// =============================================================================

/** Format a single year, handling BCE dates */
export function formatYear(year?: number | null): string {
  if (year === undefined || year === null) return 'Unknown';
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}

/** Format a lifespan range (birth - death) */
export function formatLifespan(birthYear?: number | null, deathYear?: number | null): string {
  if (!birthYear && !deathYear) return '';
  const birth = birthYear ? formatYear(birthYear) : '?';
  const death = deathYear ? formatYear(deathYear) : 'present';
  return `${birth}\u2009\u2013\u2009${death}`;
}

/** Format media type for display. DB values are now canonical after FIC-99. */
export function formatMediaType(mediaType?: string): string {
  if (!mediaType) return 'Media';
  return mediaType;
}

// =============================================================================
// PLACEHOLDER STYLES (used when no AI-generated image exists)
// =============================================================================

/** Get initials from a name (first + last initial) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Generate placeholder style for entities without images */
export function getPlaceholderStyle(
  entityType: 'figure' | 'work',
  name: string,
  subtype?: string
): { backgroundColor: string; initials: string; textColor: string } {
  if (entityType === 'figure') {
    return {
      backgroundColor: getFigureTypeColor(subtype),
      initials: getInitials(name),
      textColor: '#FEFEFE',
    };
  }
  return {
    backgroundColor: getMediaTypeColor(subtype),
    initials: getInitials(name),
    textColor: '#FEFEFE',
  };
}

// =============================================================================
// IMAGE URL VALIDATION
// =============================================================================

/** Validate that an image URL is safe to render (not an arbitrary external resource) */
export function isValidImageUrl(url?: string | null): boolean {
  if (!url) return false;
  // Allow Vercel Blob URLs
  if (url.includes('.public.blob.vercel-storage.com/')) return true;
  // Allow local static paths
  if (url.startsWith('/images/')) return true;
  // Allow data URIs (base64 inline images)
  if (url.startsWith('data:image/')) return true;
  // Allow HTTPS URLs (images stored on known hosts)
  if (url.startsWith('https://')) return true;
  return false;
}
