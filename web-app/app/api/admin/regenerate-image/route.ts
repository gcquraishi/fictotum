import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSession } from '@/lib/neo4j';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';

const MODEL_NAME = 'gemini-2.5-flash-image';
const ASPECT_RATIO = '3:4';

const STYLE_PREAMBLE = `Style: crosshatched line engraving, like a vintage encyclopedia plate or banknote illustration.
Colors: deep wine red (#8B2635) ink on cream (#FEFEFE) paper. Two-tone only.
No text, no labels, no borders, no background patterns. Clean, scholarly, minimal.`;

// ---------------------------------------------------------------------------
// Types for Neo4j query results
// ---------------------------------------------------------------------------

interface FigureData {
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
           RETURN f.name AS name, f.era AS era,
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

function buildFigurePrompt(data: FigureData): string {
  const eraCtx = data.era ? ` from the ${data.era} era` : '';
  const dateCtx = data.birth_year && data.death_year
    ? ` (${fmtYear(data.birth_year)} - ${fmtYear(data.death_year)})`
    : '';
  const titleCtx = data.title ? `, known as ${data.title}` : '';

  return `A two-tone engraved portrait illustration of ${data.name}${titleCtx}, a historical figure${eraCtx}${dateCtx}.
Bust portrait, head and shoulders, facing slightly left. Dignified, period-appropriate attire.
${STYLE_PREAMBLE}`;
}

function buildWorkPrompt(data: WorkData): string {
  const year = data.release_year ? ` (${data.release_year})` : '';
  const dir = data.director || data.creator || data.author;
  const dirCtx = dir ? ` by ${dir}` : '';
  const type = data.media_type || 'work';

  return `A two-tone engraved illustration representing the ${type} "${data.title}"${dirCtx}${year}.
Depict a symbolic scene or key visual motif from the work.
${STYLE_PREAMBLE}`;
}

function fmtYear(y: number): string {
  return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
}
