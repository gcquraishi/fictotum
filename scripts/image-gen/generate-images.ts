#!/usr/bin/env npx tsx
/**
 * Batch image generation for Fictotum entities.
 *
 * Generates AI illustrations for HistoricalFigure and MediaWork nodes
 * using Google Gemini (gemini-2.5-flash-image) in the house engraved style.
 *
 * Usage (from web-app/):
 *   npx tsx ../scripts/image-gen/generate-images.ts --type figures --limit 10
 *   npx tsx ../scripts/image-gen/generate-images.ts --type works --limit 10
 *   npx tsx ../scripts/image-gen/generate-images.ts --type all
 *   npx tsx ../scripts/image-gen/generate-images.ts --type figures --dry-run
 */

import { GoogleGenAI } from '@google/genai';
import neo4j, { Driver } from 'neo4j-driver';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadEnvFile } from './env';

// Load .env.local manually (scripts run outside Next.js context)
loadEnvFile(path.resolve(__dirname, '../../web-app/.env.local'));
import {
  buildFigurePrompt,
  buildWorkPrompt,
  type FigureEntity,
  type WorkEntity,
} from './prompt-templates';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.resolve(__dirname, '../../tmp/generated-images');
const MANIFEST_PATH = path.resolve(OUTPUT_DIR, 'manifest.json');
const MODEL_NAME = 'gemini-2.5-flash-image';
const ASPECT_RATIO = '3:4'; // Portrait orientation for cards
const RATE_LIMIT_MS = 4000; // 4s between requests (15 RPM safe margin)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10000;

// ---------------------------------------------------------------------------
// CLI Args
// ---------------------------------------------------------------------------

interface CliArgs {
  type: 'figures' | 'works' | 'all';
  limit: number;
  dryRun: boolean;
  offset: number;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    type: 'all',
    limit: Infinity,
    dryRun: false,
    offset: 0,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      result.type = args[++i] as CliArgs['type'];
    } else if (args[i] === '--limit' && args[i + 1]) {
      result.limit = parseInt(args[++i], 10);
    } else if (args[i] === '--offset' && args[i + 1]) {
      result.offset = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      result.dryRun = true;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Manifest (tracks progress for resume)
// ---------------------------------------------------------------------------

interface ManifestEntry {
  id: string;
  entityType: 'figure' | 'work';
  name: string;
  filename: string;
  prompt: string;
  generatedAt: string;
  model: string;
}

interface Manifest {
  entries: ManifestEntry[];
  lastRun: string;
}

function loadManifest(): Manifest {
  if (fs.existsSync(MANIFEST_PATH)) {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
  }
  return { entries: [], lastRun: '' };
}

function saveManifest(manifest: Manifest): void {
  manifest.lastRun = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

// ---------------------------------------------------------------------------
// Neo4j connection (standalone, not using server-only module)
// ---------------------------------------------------------------------------

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error(
      'Missing Neo4j env vars. Run from web-app/ directory so .env.local is loaded.'
    );
  }

  return neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });
}

// ---------------------------------------------------------------------------
// Fetch entities from Neo4j
// ---------------------------------------------------------------------------

async function fetchFigures(
  driver: Driver,
  limit: number,
  offset: number,
  existingIds: Set<string>,
): Promise<FigureEntity[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (f:HistoricalFigure)
       WHERE f.image_url IS NULL OR f.image_url = ''
       RETURN f.canonical_id AS canonical_id,
              f.name AS name,
              f.era AS era,
              f.birth_year AS birth_year,
              f.death_year AS death_year,
              f.description AS description,
              f.historicity_status AS historicity_status,
              f.title AS title
       ORDER BY f.name
       SKIP $offset
       LIMIT $limit`,
      { offset: neo4j.int(offset), limit: neo4j.int(limit) },
    );

    return result.records
      .map((r) => ({
        canonical_id: r.get('canonical_id'),
        name: r.get('name'),
        era: r.get('era'),
        birth_year: r.get('birth_year'),
        death_year: r.get('death_year'),
        description: r.get('description'),
        historicity_status: r.get('historicity_status'),
        title: r.get('title'),
      }))
      .filter((f) => !existingIds.has(`figure-${f.canonical_id}`));
  } finally {
    await session.close();
  }
}

async function fetchWorks(
  driver: Driver,
  limit: number,
  offset: number,
  existingIds: Set<string>,
): Promise<WorkEntity[]> {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (m:MediaWork)
       WHERE m.image_url IS NULL OR m.image_url = ''
       RETURN m.wikidata_id AS wikidata_id,
              m.media_id AS media_id,
              m.title AS title,
              m.media_type AS media_type,
              m.release_year AS release_year,
              m.creator AS creator,
              m.director AS director,
              m.author AS author,
              m.description AS description
       ORDER BY m.title
       SKIP $offset
       LIMIT $limit`,
      { offset: neo4j.int(offset), limit: neo4j.int(limit) },
    );

    return result.records
      .map((r) => ({
        wikidata_id: r.get('wikidata_id'),
        media_id: r.get('media_id'),
        title: r.get('title'),
        media_type: r.get('media_type'),
        release_year: r.get('release_year'),
        creator: r.get('creator'),
        director: r.get('director'),
        author: r.get('author'),
        description: r.get('description'),
      }))
      .filter((w) => {
        const id = w.wikidata_id || w.media_id;
        return id && !existingIds.has(`work-${id}`);
      });
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

async function generateImage(
  ai: GoogleGenAI,
  prompt: string,
): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: ASPECT_RATIO,
          },
        } as any,
      });

      // Extract image data from response
      const parts = response.candidates?.[0]?.content?.parts;
      if (!parts) {
        console.error(`  No parts in response (attempt ${attempt})`);
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        return null;
      }

      for (const part of parts) {
        if ((part as any).inlineData) {
          const imageData = (part as any).inlineData.data;
          return Buffer.from(imageData, 'base64');
        }
      }

      console.error(`  No image data in response (attempt ${attempt})`);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    } catch (err: any) {
      const msg = err.message || String(err);
      console.error(`  API error (attempt ${attempt}): ${msg}`);

      // API key referrer restriction
      if (msg.includes('API_KEY_HTTP_REFERRER_BLOCKED') || msg.includes('PERMISSION_DENIED')) {
        console.error('\n  *** API KEY REFERRER RESTRICTION ***');
        console.error('  The GEMINI_API_KEY has HTTP referrer restrictions that block CLI usage.');
        console.error('  Fix: Go to Google Cloud Console > APIs & Services > Credentials');
        console.error('  and either remove referrer restrictions from this key or create');
        console.error('  a new unrestricted key for server-side use.\n');
        return null; // Don't retry, this won't resolve
      }

      // Rate limit: back off significantly
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        const backoff = RETRY_DELAY_MS * attempt * 2;
        console.log(`  Rate limited. Waiting ${backoff / 1000}s...`);
        await sleep(backoff);
      } else if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  console.log(`\n=== Fictotum Image Generation ===`);
  console.log(`Type: ${args.type} | Limit: ${args.limit === Infinity ? 'all' : args.limit} | Offset: ${args.offset} | Dry run: ${args.dryRun}`);
  console.log(`Model: ${MODEL_NAME} | Aspect: ${ASPECT_RATIO}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  // Ensure output dirs exist
  fs.mkdirSync(path.join(OUTPUT_DIR, 'figures'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'works'), { recursive: true });

  // Load manifest for resume capability
  const manifest = loadManifest();
  const existingIds = new Set(manifest.entries.map((e) => `${e.entityType}-${e.id}`));
  console.log(`Manifest: ${manifest.entries.length} previously generated images\n`);

  // Connect to Neo4j
  const driver = createDriver();
  console.log('Connected to Neo4j');

  // Initialize Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY env var');
  }
  const ai = new GoogleGenAI({ apiKey });

  let totalGenerated = 0;
  let totalFailed = 0;

  // --- Generate figure images ---
  if (args.type === 'figures' || args.type === 'all') {
    const figures = await fetchFigures(driver, args.limit, args.offset, existingIds);
    console.log(`\nFigures to process: ${figures.length}`);

    for (let i = 0; i < figures.length; i++) {
      const figure = figures[i];
      const prompt = buildFigurePrompt(figure);
      const safeId = sanitizeFilename(figure.canonical_id);
      const filename = `figures/${safeId}.png`;

      console.log(`[${i + 1}/${figures.length}] ${figure.name} (${figure.canonical_id})`);

      if (args.dryRun) {
        console.log(`  PROMPT: ${prompt.substring(0, 120)}...`);
        continue;
      }

      const imageBuffer = await generateImage(ai, prompt);
      if (imageBuffer) {
        const outputPath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`  Saved: ${filename} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

        manifest.entries.push({
          id: figure.canonical_id,
          entityType: 'figure',
          name: figure.name,
          filename,
          prompt,
          generatedAt: new Date().toISOString(),
          model: MODEL_NAME,
        });
        saveManifest(manifest);
        totalGenerated++;
      } else {
        console.error(`  FAILED: Could not generate image for ${figure.name}`);
        totalFailed++;
      }

      // Rate limit
      if (i < figures.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    }
  }

  // --- Generate work images ---
  if (args.type === 'works' || args.type === 'all') {
    const works = await fetchWorks(driver, args.limit, args.offset, existingIds);
    console.log(`\nWorks to process: ${works.length}`);

    for (let i = 0; i < works.length; i++) {
      const work = works[i];
      const prompt = buildWorkPrompt(work);
      const workId = work.wikidata_id || work.media_id || 'unknown';
      const safeId = sanitizeFilename(workId);
      const filename = `works/${safeId}.png`;

      console.log(`[${i + 1}/${works.length}] ${work.title} (${workId})`);

      if (args.dryRun) {
        console.log(`  PROMPT: ${prompt.substring(0, 120)}...`);
        continue;
      }

      const imageBuffer = await generateImage(ai, prompt);
      if (imageBuffer) {
        const outputPath = path.join(OUTPUT_DIR, filename);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`  Saved: ${filename} (${(imageBuffer.length / 1024).toFixed(1)}KB)`);

        manifest.entries.push({
          id: workId,
          entityType: 'work',
          name: work.title,
          filename,
          prompt,
          generatedAt: new Date().toISOString(),
          model: MODEL_NAME,
        });
        saveManifest(manifest);
        totalGenerated++;
      } else {
        console.error(`  FAILED: Could not generate image for ${work.title}`);
        totalFailed++;
      }

      if (i < works.length - 1) {
        await sleep(RATE_LIMIT_MS);
      }
    }
  }

  await driver.close();

  console.log(`\n=== Generation Complete ===`);
  console.log(`Generated: ${totalGenerated} | Failed: ${totalFailed}`);
  console.log(`Manifest: ${manifest.entries.length} total images`);
  if (args.dryRun) {
    console.log('(Dry run -- no images were actually generated)');
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFilename(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
