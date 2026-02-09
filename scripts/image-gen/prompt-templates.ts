/**
 * Prompt templates for AI house-style image generation.
 *
 * Aesthetic: Two-tone engraved portrait / archival illustration.
 * Palette: Wine-red (#8B2635) + cream (#FEFEFE) + black (#1A1A1A).
 * Feel: Scholarly, archival, intentionally stylized (not photorealistic).
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

const STYLE_PREAMBLE = `Style: crosshatched line engraving, like a vintage encyclopedia plate or banknote illustration.
Colors: deep wine red (#8B2635) ink on cream (#FEFEFE) paper. Two-tone only.
No text, no labels, no borders, no background patterns. Clean, scholarly, minimal.`;

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

  return `A two-tone engraved portrait illustration of ${figure.name}${titleContext}, a historical figure${eraContext}${dateContext}.${descContext}
Bust portrait, head and shoulders, facing slightly left. Dignified, period-appropriate attire.
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

  return `A two-tone engraved illustration representing the ${typeLabel} "${work.title}"${yearStr}${dirContext}.
Depict a symbolic scene or key visual motif from the work. Cinematic composition, dramatic lighting suggested through crosshatching density.
${STYLE_PREAMBLE}`;
}

function buildBookPrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const authorStr = work.author || work.creator;
  const authorContext = authorStr ? ` by ${authorStr}` : '';

  return `A two-tone engraved still-life illustration representing the book "${work.title}"${authorContext}${yearStr}.
Show symbolic objects related to the book's themes arranged as a classical bookplate composition. Scholarly, contemplative.
${STYLE_PREAMBLE}`;
}

function buildPlayPrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const authorStr = work.author || work.creator;
  const authorContext = authorStr ? ` by ${authorStr}` : '';

  return `A two-tone engraved illustration representing the stage play "${work.title}"${authorContext}${yearStr}.
Depict a symbolic theatrical scene with dramatic staging. Masks, curtains, or stage elements as compositional framing.
${STYLE_PREAMBLE}`;
}

function buildGamePrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';

  return `A two-tone engraved illustration representing the video game "${work.title}"${yearStr}.
Depict a symbolic scene or iconic visual motif from the game. Dynamic composition suggesting action or exploration.
${STYLE_PREAMBLE}`;
}

function buildDefaultWorkPrompt(work: WorkEntity): string {
  const yearStr = work.release_year ? ` (${work.release_year})` : '';
  const typeStr = work.media_type ? `${work.media_type} ` : '';

  return `A two-tone engraved illustration representing the ${typeStr}"${work.title}"${yearStr}.
Depict a symbolic composition representing the work's themes and subject matter.
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
