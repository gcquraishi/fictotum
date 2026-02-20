export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSession } from '@/lib/neo4j';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';

const MODEL_NAME = 'gemini-2.5-flash-image';
const ASPECT_RATIO = '3:4';

const STYLE_PREAMBLE = `Simplified graphic illustration style. Bold flat color shapes with thick chunky dark charcoal outlines, like a rubber stamp or screen print. Minimal facial detail — simple lines for features, NOT photorealistic. NO shading, NO shadows, NO gradients, NO texture in hair. Every shape is a single flat color with hard edges. No crosshatching, no halftone dots. Flat solid color fills only. Die-cut sticker with thick white border following silhouette. Plain solid cream (#FEFEFE) background. Sticker floats freely within the frame, never touches edges. No drop shadow. No text, no labels, no watermarks.`;

// ---------------------------------------------------------------------------
// Color palette system (deterministic per figure)
// ---------------------------------------------------------------------------

interface ColorPalette {
  name: string;
  skin: { hex: string; description: string };
  accent: { hex: string; description: string };
}

const PALETTES: ColorPalette[] = [
  { name: 'Burgundy & Olive', skin: { hex: '#6B7F5E', description: 'muted yellow-green olive' }, accent: { hex: '#8B2635', description: 'dark red-brown burgundy' } },
  { name: 'Indigo & Amber', skin: { hex: '#C4922A', description: 'warm golden amber' }, accent: { hex: '#2C3E6B', description: 'dark blue-purple indigo' } },
  { name: 'Sienna & Slate', skin: { hex: '#5E7B8A', description: 'muted grey-blue slate' }, accent: { hex: '#A0522D', description: 'warm reddish-brown sienna' } },
  { name: 'Teal & Terracotta', skin: { hex: '#B5603A', description: 'warm orange-brown terracotta' }, accent: { hex: '#3B6E6E', description: 'dark blue-green teal' } },
  { name: 'Plum & Sage', skin: { hex: '#8A9A7B', description: 'grey-green sage' }, accent: { hex: '#6B3A5E', description: 'dark reddish-purple aubergine' } },
  { name: 'Ochre & Iron', skin: { hex: '#B8860B', description: 'warm yellow-brown ochre' }, accent: { hex: '#4A4A4A', description: 'dark iron grey' } },
];

function getPaletteForFigure(canonicalId: string): ColorPalette {
  let hash = 0;
  for (let i = 0; i < canonicalId.length; i++) {
    hash = ((hash << 5) - hash + canonicalId.charCodeAt(i)) | 0;
  }
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

// ---------------------------------------------------------------------------
// Mood system
// ---------------------------------------------------------------------------

type EmotionalMood = 'commanding' | 'defiant' | 'scheming' | 'solemn' | 'dignified' | 'wise' | 'roguish' | 'stoic' | 'fierce' | 'composed';

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

function inferMood(data: FigureData): EmotionalMood {
  const text = [data.title, data.description, data.name].filter(Boolean).join(' ').toLowerCase();
  const era = (data.era || '').toLowerCase();
  if (/martyr|saint|burned|executed for|heretic/.test(text)) return 'defiant';
  if (/witness|diary|diarist|holocaust|victim|refugee|prisoner/.test(text)) return 'solemn';
  if (/beheaded|assassinated|overthrown|deposed|exiled|tragic|fallen/.test(text)) return 'dignified';
  if (/pirate|privateer|buccaneer|adventurer|rogue|scoundrel/.test(text)) return 'roguish';
  if (/schemer|spymaster|advisor|chief minister|chancellor|cardinal|political fixer/.test(text)) return 'scheming';
  if (/philosopher|scientist|mathematician|inventor|thinker|polymath|writer|poet|playwright/.test(text)) return 'wise';
  if (/warlord|berserker|conqueror|khan|raider|barbarian/.test(text)) return 'fierce';
  if (/revolutionary|rebel|insurgent|freedom fighter|resistance/.test(text)) return 'defiant';
  if (/emperor|empress|pharaoh|king|queen|tsar|sultan|dictator|ruler/.test(text)) return 'commanding';
  if (/general|marshal|commander|admiral|officer|colonel/.test(text)) return 'stoic';
  if (/revolution|civil war/.test(era)) return 'defiant';
  if (/world war/.test(era)) return 'stoic';
  return 'composed';
}

// ---------------------------------------------------------------------------
// Types for Neo4j query results
// ---------------------------------------------------------------------------

interface FigureData {
  canonical_id: string;
  name: string;
  era?: string;
  birth_year?: number;
  death_year?: number;
  description?: string;
  title?: string;
}

interface WorkData {
  title: string;
  media_type?: string;
  release_year?: number;
  creator?: string;
  director?: string;
  author?: string;
}

// Type for Gemini response parts with inline image data
interface InlineDataPart {
  inlineData: { data: string; mimeType: string };
}

function hasInlineData(part: unknown): part is InlineDataPart {
  return typeof part === 'object' && part !== null && 'inlineData' in part;
}

/**
 * POST /api/admin/regenerate-image
 *
 * Regenerate the AI illustration for a single entity.
 * Body: { entityType: "figure" | "work", entityId: string }
 */
export async function POST(request: NextRequest) {
  // Auth guard: require authenticated session
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Missing entityType or entityId' },
        { status: 400 },
      );
    }

    if (entityType !== 'figure' && entityType !== 'work') {
      return NextResponse.json(
        { error: 'entityType must be "figure" or "work"' },
        { status: 400 },
      );
    }

    // Fetch entity data from Neo4j
    const dbSession = await getSession();
    let entityData: FigureData | WorkData;

    try {
      if (entityType === 'figure') {
        const result = await dbSession.run(
          `MATCH (f:HistoricalFigure {canonical_id: $id})
           RETURN f.canonical_id AS canonical_id, f.name AS name, f.era AS era,
                  f.birth_year AS birth_year, f.death_year AS death_year,
                  f.description AS description, f.title AS title`,
          { id: entityId },
        );
        if (result.records.length === 0) {
          return NextResponse.json({ error: 'Figure not found' }, { status: 404 });
        }
        entityData = result.records[0].toObject() as FigureData;
      } else {
        const result = await dbSession.run(
          `MATCH (m:MediaWork)
           WHERE m.wikidata_id = $id OR m.media_id = $id
           RETURN m.title AS title, m.media_type AS media_type,
                  m.release_year AS release_year, m.creator AS creator,
                  m.director AS director, m.author AS author`,
          { id: entityId },
        );
        if (result.records.length === 0) {
          return NextResponse.json({ error: 'Work not found' }, { status: 404 });
        }
        entityData = result.records[0].toObject() as WorkData;
      }
    } finally {
      await dbSession.close();
    }

    // Build prompt
    const prompt = entityType === 'figure'
      ? buildFigurePrompt(entityData as FigureData)
      : buildWorkPrompt(entityData as WorkData);

    // Generate image
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: ASPECT_RATIO },
      } as Record<string, unknown>,
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    let imageBuffer: Buffer | null = null;
    for (const part of parts) {
      if (hasInlineData(part)) {
        imageBuffer = Buffer.from(part.inlineData.data, 'base64');
        break;
      }
    }

    if (!imageBuffer) {
      return NextResponse.json({ error: 'No image data in response' }, { status: 500 });
    }

    // Upload to Vercel Blob (or return base64 if no blob token)
    let imageUrl: string;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (blobToken) {
      const subdir = entityType === 'figure' ? 'figures' : 'works';
      const safeId = entityId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const blobPath = `fictotum/${subdir}/${safeId}.png`;
      const blob = await put(blobPath, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
        token: blobToken,
        addRandomSuffix: false, // Overwrite existing — prevents orphaned blobs
      });
      imageUrl = blob.url;
    } else {
      imageUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    }

    // Update Neo4j with the new image URL (skip for data URLs)
    if (!imageUrl.startsWith('data:')) {
      const updateSession = await getSession();
      try {
        if (entityType === 'figure') {
          await updateSession.run(
            `MATCH (f:HistoricalFigure {canonical_id: $id})
             SET f.image_url = $imageUrl,
                 f.image_generated_at = datetime(),
                 f.image_model = $model`,
            { id: entityId, imageUrl, model: MODEL_NAME },
          );
        } else {
          await updateSession.run(
            `MATCH (m:MediaWork)
             WHERE m.wikidata_id = $id OR m.media_id = $id
             SET m.image_url = $imageUrl,
                 m.image_generated_at = datetime(),
                 m.image_model = $model`,
            { id: entityId, imageUrl, model: MODEL_NAME },
          );
        }
      } finally {
        await updateSession.close();
      }
    }

    return NextResponse.json({
      success: true,
      entityType,
      entityId,
      imageUrl,
      model: MODEL_NAME,
      prompt: prompt.substring(0, 200) + '...',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Regenerate image error:', err);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Inline prompt builders (simplified versions of the script templates)
// ---------------------------------------------------------------------------

function getProminenceDecade(data: FigureData): string | null {
  if (data.birth_year != null && data.death_year != null) {
    const peak = Math.round(data.birth_year + (data.death_year - data.birth_year) * 0.6);
    return fmtDecade(peak);
  }
  if (data.birth_year != null) {
    return fmtDecade(data.birth_year + 40);
  }
  return null;
}

function fmtDecade(year: number): string {
  if (year < 0) {
    const absDecade = Math.floor(Math.abs(year) / 10) * 10;
    return `the ${absDecade}s BCE`;
  }
  const decade = Math.floor(year / 10) * 10;
  return `the ${decade}s`;
}

function buildFigurePrompt(data: FigureData): string {
  const eraCtx = data.era ? ` from the ${data.era} era` : '';
  const dateCtx = data.birth_year && data.death_year
    ? ` (${fmtYear(data.birth_year)} - ${fmtYear(data.death_year)})`
    : '';
  const titleCtx = data.title ? `, known as ${data.title}` : '';
  const descCtx = data.description ? ` ${data.description}` : '';

  const mood = inferMood(data);
  const moodExpr = MOOD_EXPRESSIONS[mood];

  const pal = getPaletteForFigure(data.canonical_id);
  const colorDirective = `NO realistic skin tones. Skin and face filled with ${pal.skin.description} (${pal.skin.hex}). Clothing and accessories filled with ${pal.accent.description} (${pal.accent.hex}). Charcoal (#2A2A2A) outlines.`;

  const decade = getProminenceDecade(data);
  const attireDirective = decade
    ? `Attire, hairstyle, and accessories appropriate to ${decade}. Period-accurate details at neckline and headwear.`
    : `Period-appropriate details (hair, headwear, attire at neckline).`;

  const isModern = data.birth_year != null && data.birth_year > 1900;
  const figureLabel = isModern ? 'a public figure' : 'a historical figure';

  return `Illustration of ${data.name}${titleCtx}, ${figureLabel}${eraCtx}${dateCtx}.${descCtx}
Head and upper body. ${moodExpr} ${attireDirective}
${colorDirective}
${STYLE_PREAMBLE}`;
}

function buildWorkPrompt(data: WorkData): string {
  const year = data.release_year ? ` (${data.release_year})` : '';
  const dir = data.director || data.creator || data.author;
  const dirCtx = dir ? ` by ${dir}` : '';
  const type = data.media_type || 'work';

  return `Illustration representing the ${type} "${data.title}"${dirCtx}${year}.
Symbolic scene or key visual motif from the work.
${STYLE_PREAMBLE}`;
}

function fmtYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}
