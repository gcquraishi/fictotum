/**
 * Shared utilities for entity card components (FigureCard, WorkCard, PortrayalCard).
 * Single source of truth for color maps, icons, formatting, and placeholder styles.
 */

import { BookOpen, Film, Tv, Gamepad2, Theater, BookImage, type LucideIcon } from 'lucide-react';

// =============================================================================
// COLOR MAPS
// =============================================================================

/** Media type → accent color (matches CSS variables in globals.css) */
export const MEDIA_TYPE_COLORS: Record<string, string> = {
  Film:        '#8B2635',  // var(--color-node-film)
  Book:        '#6B4423',  // var(--color-node-book)
  TVSeries:    '#4A5D5E',  // var(--color-node-tv)
  TVMiniseries:'#4A5D5E',
  Game:        '#3E5641',  // var(--color-node-videogame)
  VideoGame:   '#3E5641',
  GAME:        '#3E5641',  // Normalize inconsistent DB values
  Play:        '#5D4E6D',
  BookSeries:  '#6B4423',
  Comic:       '#8B6914',
  default:     '#666666',  // var(--color-node-default)
};

/** Sentiment → color for badges and accents */
export const SENTIMENT_COLORS: Record<string, string> = {
  Heroic:     '#22c55e',
  heroic:     '#22c55e',
  Villainous: '#ef4444',
  villainous: '#ef4444',
  Complex:    '#eab308',
  complex:    '#eab308',
  Neutral:    '#6b7280',
  neutral:    '#6b7280',
  Positive:   '#22c55e',
  mixed:      '#eab308',
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

/** Media type → Lucide icon component */
export const MEDIA_TYPE_ICONS: Record<string, LucideIcon> = {
  Film:        Film,
  Book:        BookOpen,
  TVSeries:    Tv,
  TVMiniseries:Tv,
  Game:        Gamepad2,
  VideoGame:   Gamepad2,
  GAME:        Gamepad2,
  Play:        Theater,
  BookSeries:  BookImage,
  Comic:       BookImage,
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

/** Normalize media type label for display (handles inconsistent DB values) */
export function formatMediaType(mediaType?: string): string {
  if (!mediaType) return 'Media';
  const normalized: Record<string, string> = {
    Film: 'Film',
    film: 'Film',
    Book: 'Book',
    book: 'Book',
    BOOK: 'Book',
    TVSeries: 'TV Series',
    TVMiniseries: 'TV Miniseries',
    Game: 'Game',
    game: 'Game',
    GAME: 'Game',
    VideoGame: 'Video Game',
    'Video Game': 'Video Game',
    Play: 'Play',
    BookSeries: 'Book Series',
    Comic: 'Comic',
  };
  return normalized[mediaType] || mediaType;
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
