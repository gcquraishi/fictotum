/**
 * Prompt templates for AI house-style image generation.
 *
 * Aesthetic: Halftone pop-art sticker — hand-inked, screen-printed feel.
 * Palette: Halftone flesh tones, muted dusty olive, wine-red (#8B2635),
 *          charcoal blacks.
 * Feel: Bold, tactile, collectible — like vinyl die-cut stickers.
 *
 * Style references:
 *   - Alexei Vella editorial illustration (salzmanart.com/alexei-vella.html)
 *   - Ben-Day dot / halftone screen-printing
 *   - Heavy black ink outlines with hand-drawn quality
 *   - Fine crosshatched linework for hair and texture
 *   - Die-cut sticker presentation (white border around silhouette)
 *
 * IMPORTANT: Output images are NOT final assets. They are generated with a
 * solid cream background for clean composition, then post-processed to remove
 * the background and produce transparent PNGs (true die-cut stickers).
 * The UI layer controls what background they sit on (cream, charcoal, etc.).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FigureEntity {
  canonical_id: string;
  name: string;
  era?: string;
  birth_year?: number;
  death_year?: number;
  description?: string;
  historicity_status?: string;
  title?: string;
}

export interface WorkEntity {
  wikidata_id?: string;
  media_id?: string;
  title: string;
  media_type?: string;
  release_year?: number;
  creator?: string;
  director?: string;
  author?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Style preamble (shared across all prompts)
// ---------------------------------------------------------------------------

const STYLE_PREAMBLE = `Heavily stylized in a halftone pop-art sticker style. Skin tones rendered with visible halftone dot patterns like vintage comic book printing. Heavy black ink outlines with slightly rough hand-drawn quality edges. Fine crosshatched ink linework for hair texture. Colorful but controlled palette: natural flesh tones via halftone dots, muted dusty olive greens, deep wine red (#8B2635) accents, dark ink blacks for outlines. The illustration looks like a hand-inked screen-printed die-cut sticker with a thick white border following the subject's silhouette. Place the sticker on a plain solid cream (#FEFEFE) background. The sticker must float freely within the frame with visible background on all sides — it must never touch or bleed off any edge of the image. No drop shadow. No text, no labels, no watermarks.`;

// ---------------------------------------------------------------------------
// Figure prompts
// ---------------------------------------------------------------------------

export function buildFigurePrompt(figure: FigureEntity): string {
  const eraContext = figure.era ? ` from the ${figure.era} era` : '';
  const dateContext =
    figure.birth_year && figure.death_year
      ? ` (${formatHistoricalYear(figure.birth_year)} - ${formatHistoricalYear(figure.death_year)})`
      : '';
  const titleContext = figure.title ? `, known as ${figure.title}` : '';
  const descContext = figure.description
    ? ` ${figure.description}`
    : '';

  return `Illustration of ${figure.name}${titleContext}, a historical figure${eraContext}${dateContext}.${descContext}
Head and face only, tightly cropped, front-facing with intense expression. Strong angular bone structure, deep-set eyes. Period-appropriate details (hair, headwear, attire at neckline).
${STYLE_PREAMBLE}`;
}

// ---------------------------------------------------------------------------
// Work prompts (by media type)
// ---------------------------------------------------------------------------

export function buildWorkPrompt(work: WorkEntity): string {
  const normalizedType = normalizeMediaType(work.media_type);

  switch (normalizedType) {
    case 'Film':
    case 'TVSeries':
    case 'TVMiniseries':
      return buildFilmPrompt(work, normalizedType);
    case 'Book':
    case 'BookSeries':
      return buildBookPrompt(work);
    case 'Play':
      return buildPlayPrompt(work);
    case 'Game':
    case 'VideoGame':
      return buildGamePrompt(work);
    default:
      return buildDefaultWorkPrompt(work);
  }
}

function buildFilmPrompt(work: WorkEntity, type: string): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const dirStr = work.director || work.creator;
  const dirContext = dirStr ? ` directed by ${dirStr}` : '';
  const typeLabel = type === 'Film' ? 'film' : 'television series';

  return `Illustration representing the ${typeLabel} "${work.title}"${yearStr}${dirContext}.
Symbolic scene or key visual motif from the work. Cinematic composition, dramatic mood.
${STYLE_PREAMBLE}`;
}

function buildBookPrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const authorStr = work.author || work.creator;
  const authorContext = authorStr ? ` by ${authorStr}` : '';

  return `Illustration representing the book "${work.title}"${authorContext}${yearStr}.
Symbolic objects related to the book's themes arranged as a still-life composition. Scholarly, contemplative.
${STYLE_PREAMBLE}`;
}

function buildPlayPrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const authorStr = work.author || work.creator;
  const authorContext = authorStr ? ` by ${authorStr}` : '';

  return `Illustration representing the stage play "${work.title}"${authorContext}${yearStr}.
Symbolic theatrical scene with dramatic staging. Masks, curtains, or stage elements as compositional framing.
${STYLE_PREAMBLE}`;
}

function buildGamePrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';

  return `Illustration representing the video game "${work.title}"${yearStr}.
Symbolic scene or iconic visual motif from the game. Dynamic composition suggesting action or exploration.
${STYLE_PREAMBLE}`;
}

function buildDefaultWorkPrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const typeStr = work.media_type ? `${work.media_type} ` : '';

  return `Illustration representing the ${typeStr}"${work.title}"${yearStr}.
Symbolic composition representing the work's themes and subject matter.
${STYLE_PREAMBLE}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeMediaType(type?: string): string {
  if (!type) return 'Unknown';
  const lower = type.toLowerCase();
  if (lower === 'film' || lower === 'movie') return 'Film';
  if (lower === 'tvseries' || lower === 'tv_series' || lower === 'tv series') return 'TVSeries';
  if (lower === 'tvminiseries' || lower === 'tv_miniseries') return 'TVMiniseries';
  if (lower === 'book') return 'Book';
  if (lower === 'bookseries' || lower === 'book_series') return 'BookSeries';
  if (lower === 'play' || lower === 'theatre' || lower === 'theater') return 'Play';
  if (lower === 'game' || lower === 'videogame' || lower === 'video_game') return 'Game';
  if (lower === 'comic') return 'Comic';
  return type;
}

function formatHistoricalYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return `${year} CE`;
}
