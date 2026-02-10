/**
 * Prompt templates for AI house-style image generation.
 *
 * Aesthetic: Simplified graphic sticker — bold flat shapes, chunky outlines.
 * Palette: NON-REALISTIC skin tones (palette-derived), charcoal outlines.
 *          Six two-color palettes rotate across figures for variety.
 * Feel: Bold, tactile, collectible — like vinyl die-cut stickers.
 *
 * Style references:
 *   - Alexei Vella spot illustrations (salzmanart.com/alexei-vella.html)
 *   - Andy Rementer (non-realistic color, geometric flat shapes)
 *   - Shepard Fairey screen prints (stylized skin tones)
 *   - Rubber stamp / screen print aesthetic
 *   - Thick chunky outlines, flat solid color fills
 *   - Minimal facial detail — iconic, not photorealistic
 *   - Die-cut sticker presentation (white border around silhouette)
 *
 * Emotional moods: Each figure gets an expression that matches their
 * historical memory (commanding, defiant, scheming, solemn, etc.)
 * rather than a generic "intense" or "smiling" default.
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
// Color palette system
// ---------------------------------------------------------------------------

export interface ColorPalette {
  name: string;
  skin: { hex: string; description: string };
  accent: { hex: string; description: string };
}

const PALETTES: ColorPalette[] = [
  {
    name: 'Burgundy & Olive',
    skin: { hex: '#6B7F5E', description: 'muted yellow-green olive' },
    accent: { hex: '#8B2635', description: 'dark red-brown burgundy' },
  },
  {
    name: 'Indigo & Amber',
    skin: { hex: '#C4922A', description: 'warm golden amber' },
    accent: { hex: '#2C3E6B', description: 'dark blue-purple indigo' },
  },
  {
    name: 'Sienna & Slate',
    skin: { hex: '#5E7B8A', description: 'muted grey-blue slate' },
    accent: { hex: '#A0522D', description: 'warm reddish-brown sienna' },
  },
  {
    name: 'Teal & Terracotta',
    skin: { hex: '#B5603A', description: 'warm orange-brown terracotta' },
    accent: { hex: '#3B6E6E', description: 'dark blue-green teal' },
  },
  {
    name: 'Plum & Sage',
    skin: { hex: '#8A9A7B', description: 'grey-green sage' },
    accent: { hex: '#6B3A5E', description: 'dark reddish-purple aubergine' },
  },
  {
    name: 'Ochre & Iron',
    skin: { hex: '#B8860B', description: 'warm yellow-brown ochre' },
    accent: { hex: '#4A4A4A', description: 'dark iron grey' },
  },
];

/**
 * Get a palette by index (wraps around). Deterministic per figure
 * so regenerating the same figure always gets the same palette.
 */
export function getPalette(index: number): ColorPalette {
  return PALETTES[index % PALETTES.length];
}

/**
 * Deterministic palette assignment from canonical_id.
 * Hashes the ID to pick a consistent palette index.
 */
export function getPaletteForFigure(canonicalId: string): ColorPalette {
  let hash = 0;
  for (let i = 0; i < canonicalId.length; i++) {
    hash = ((hash << 5) - hash + canonicalId.charCodeAt(i)) | 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

// ---------------------------------------------------------------------------
// Style preamble (shared across all prompts)
// ---------------------------------------------------------------------------

const STYLE_PREAMBLE = `Simplified graphic illustration style. Bold flat color shapes with thick chunky dark charcoal outlines, like a rubber stamp or screen print. Minimal facial detail — simple lines for features, NOT photorealistic. NO shading, NO shadows, NO gradients, NO texture in hair. Every shape is a single flat color with hard edges. No crosshatching, no halftone dots. Flat solid color fills only. Die-cut sticker with thick white border following silhouette. Plain solid cream (#FEFEFE) background. Sticker floats freely within the frame, never touches edges. No drop shadow. No text, no labels, no watermarks.`;

// ---------------------------------------------------------------------------
// Emotional mood system
// ---------------------------------------------------------------------------

type EmotionalMood =
  | 'commanding'    // rulers, conquerors, emperors
  | 'defiant'       // warriors, martyrs, revolutionaries
  | 'scheming'      // politicians, spymasters, manipulators
  | 'solemn'        // witnesses, victims, diarists
  | 'dignified'     // tragic figures, fallen royalty
  | 'wise'          // thinkers, scientists, philosophers
  | 'roguish'       // adventurers, pirates, scoundrels
  | 'stoic'         // soldiers, dutiful leaders
  | 'fierce'        // warlords, berserkers, conquerors
  | 'composed';     // default — neutral, self-possessed

const MOOD_EXPRESSIONS: Record<EmotionalMood, string> = {
  commanding: 'Commanding, imperious expression — the look of someone accustomed to absolute authority.',
  defiant: 'Defiant, resolute expression — jaw set, eyes burning with conviction.',
  scheming: 'Sly, knowing expression — a slight smirk that says they know something you do not.',
  solemn: 'Solemn, contemplative expression — a quiet witness to history, eyes that have seen too much.',
  dignified: 'Dignified, composed expression with an undercurrent of tragedy — grace under pressure.',
  wise: 'Warm but thoughtful expression — the look of deep intelligence and curiosity.',
  roguish: 'Roguish, self-satisfied expression — cocky half-smile, eyes gleaming with mischief.',
  stoic: 'Stoic, duty-bound expression — steady gaze, no emotion wasted.',
  fierce: 'Fierce, intimidating expression — a warrior who inspires fear.',
  composed: 'Composed, self-possessed expression — calm and present.',
};

/**
 * Keyword-based mood inference from figure metadata.
 * Checks title, description, and era for mood signals.
 */
function inferMood(figure: FigureEntity): EmotionalMood {
  const text = [
    figure.title,
    figure.description,
    figure.name,
  ].filter(Boolean).join(' ').toLowerCase();

  const era = (figure.era || '').toLowerCase();

  // Specific role keywords → mood (order matters — first match wins)
  // Fate-based moods take priority (how they're remembered matters most)
  if (/martyr|saint|burned|executed for|heretic/.test(text)) return 'defiant';
  if (/witness|diary|diarist|holocaust|victim|refugee|prisoner/.test(text)) return 'solemn';
  if (/beheaded|assassinated|overthrown|deposed|exiled|tragic|fallen/.test(text)) return 'dignified';
  // Role-based moods
  if (/pirate|privateer|buccaneer|adventurer|rogue|scoundrel/.test(text)) return 'roguish';
  if (/schemer|spymaster|advisor|chief minister|chancellor|cardinal|political fixer/.test(text)) return 'scheming';
  if (/philosopher|scientist|mathematician|inventor|thinker|polymath|writer|poet|playwright/.test(text)) return 'wise';
  if (/warlord|berserker|conqueror|khan|raider|barbarian/.test(text)) return 'fierce';
  if (/revolutionary|rebel|insurgent|freedom fighter|resistance/.test(text)) return 'defiant';
  if (/emperor|empress|pharaoh|king|queen|tsar|sultan|dictator|ruler/.test(text)) return 'commanding';
  if (/general|marshal|commander|admiral|officer|colonel/.test(text)) return 'stoic';

  // Era-based fallbacks
  if (/revolution|civil war/.test(era)) return 'defiant';
  if (/world war/.test(era)) return 'stoic';

  return 'composed';
}

// ---------------------------------------------------------------------------
// Figure prompts
// ---------------------------------------------------------------------------

export function buildFigurePrompt(figure: FigureEntity, palette?: ColorPalette): string {
  const eraContext = figure.era ? ` from the ${figure.era} era` : '';
  const dateContext =
    figure.birth_year && figure.death_year
      ? ` (${formatHistoricalYear(figure.birth_year)} - ${formatHistoricalYear(figure.death_year)})`
      : '';
  const titleContext = figure.title ? `, known as ${figure.title}` : '';
  const descContext = figure.description
    ? ` ${figure.description}`
    : '';

  const mood = inferMood(figure);
  const moodExpr = MOOD_EXPRESSIONS[mood];

  const pal = palette || getPaletteForFigure(figure.canonical_id);
  const colorDirective = `NO realistic skin tones. Skin and face filled with ${pal.skin.description} (${pal.skin.hex}). Clothing and accessories filled with ${pal.accent.description} (${pal.accent.hex}). Charcoal (#2A2A2A) outlines.`;

  return `Illustration of ${figure.name}${titleContext}, a historical figure${eraContext}${dateContext}.${descContext}
Head and upper body. ${moodExpr} Period-appropriate details (hair, headwear, attire at neckline).
${colorDirective}
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
