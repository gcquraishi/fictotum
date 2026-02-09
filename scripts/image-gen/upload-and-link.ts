#!/usr/bin/env npx tsx
/**
 * Upload generated images to Vercel Blob and update Neo4j with image URLs.
 *
 * Reads the manifest from generate-images.ts, uploads each image to
 * Vercel Blob storage, then writes the blob URL back to the Neo4j node.
 *
 * Usage (from web-app/):
 *   npx tsx ../scripts/image-gen/upload-and-link.ts
 *   npx tsx ../scripts/image-gen/upload-and-link.ts --dry-run
 *   npx tsx ../scripts/image-gen/upload-and-link.ts --local   # copy to public/ instead
 */

import { put } from '@vercel/blob';
import neo4j, { Driver } from 'neo4j-driver';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadEnvFile } from './env';

// Load .env.local manually (scripts run outside Next.js context)
loadEnvFile(path.resolve(__dirname, '../../web-app/.env.local'));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.resolve(__dirname, '../../tmp/generated-images');
const MANIFEST_PATH = path.resolve(OUTPUT_DIR, 'manifest.json');
const PUBLIC_IMAGES_DIR = path.resolve(__dirname, '../../web-app/public/images');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  id: string;
  entityType: 'figure' | 'work';
  name: string;
  filename: string;
  prompt: string;
  generatedAt: string;
  model: string;
  uploadedUrl?: string;
  linkedAt?: string;
}

interface Manifest {
  entries: ManifestEntry[];
  lastRun: string;
}

interface CliArgs {
  dryRun: boolean;
  local: boolean;
}

// ---------------------------------------------------------------------------
// CLI Args
// ---------------------------------------------------------------------------

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    local: args.includes('--local'),
  };
}

// ---------------------------------------------------------------------------
// Neo4j connection
// ---------------------------------------------------------------------------

function createDriver(): Driver {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    throw new Error('Missing Neo4j env vars.');
  }

  return neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });
}

// ---------------------------------------------------------------------------
// Upload strategies
// ---------------------------------------------------------------------------

async function uploadToBlob(
  filePath: string,
  blobPath: string,
): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const blob = await put(blobPath, fileBuffer, {
    access: 'public',
    contentType: 'image/png',
  });
  return blob.url;
}

function copyToPublic(filePath: string, entry: ManifestEntry): string {
  const subdir = entry.entityType === 'figure' ? 'figures' : 'works';
  const destDir = path.join(PUBLIC_IMAGES_DIR, subdir);
  fs.mkdirSync(destDir, { recursive: true });

  const destFile = path.join(destDir, path.basename(entry.filename));
  fs.copyFileSync(filePath, destFile);

  // Return a relative URL for Next.js static serving
  return `/images/${subdir}/${path.basename(entry.filename)}`;
}

// ---------------------------------------------------------------------------
// Neo4j update
// ---------------------------------------------------------------------------

async function updateNeo4jImageUrl(
  driver: Driver,
  entry: ManifestEntry,
  imageUrl: string,
): Promise<void> {
  const session = driver.session();
  try {
    if (entry.entityType === 'figure') {
      await session.run(
        `MATCH (f:HistoricalFigure {canonical_id: $id})
         SET f.image_url = $imageUrl,
             f.image_generated_at = datetime(),
             f.image_model = $model
         RETURN f.name AS name`,
        { id: entry.id, imageUrl, model: entry.model },
      );
    } else {
      // Works can be identified by wikidata_id or media_id
      await session.run(
        `MATCH (m:MediaWork)
         WHERE m.wikidata_id = $id OR m.media_id = $id
         SET m.image_url = $imageUrl,
             m.image_generated_at = datetime(),
             m.image_model = $model
         RETURN m.title AS title`,
        { id: entry.id, imageUrl, model: entry.model },
      );
    }
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();

  console.log('\n=== Fictotum Image Upload & Link ===');
  console.log(`Mode: ${args.local ? 'local (public/)' : 'Vercel Blob'}`);
  console.log(`Dry run: ${args.dryRun}\n`);

  // Validate Vercel Blob token if not local mode
  if (!args.local && !args.dryRun) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error(
        'ERROR: BLOB_READ_WRITE_TOKEN not set.\n' +
          'Either:\n' +
          '  1. Set it in .env.local (get from Vercel dashboard > Storage > Blob)\n' +
          '  2. Use --local flag to copy to public/ instead\n',
      );
      process.exit(1);
    }
  }

  // Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('No manifest found. Run generate-images.ts first.');
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));

  // Filter to entries that haven't been uploaded yet
  const pending = manifest.entries.filter((e) => !e.uploadedUrl);
  console.log(`Total in manifest: ${manifest.entries.length}`);
  console.log(`Already uploaded: ${manifest.entries.length - pending.length}`);
  console.log(`Pending upload: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('Nothing to upload. All images already linked.');
    return;
  }

  const driver = createDriver();
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const entry = pending[i];
    const filePath = path.join(OUTPUT_DIR, entry.filename);

    console.log(`[${i + 1}/${pending.length}] ${entry.name} (${entry.id})`);

    // Check file exists
    if (!fs.existsSync(filePath)) {
      console.error(`  SKIP: File not found: ${entry.filename}`);
      failed++;
      continue;
    }

    if (args.dryRun) {
      const size = fs.statSync(filePath).size;
      console.log(`  Would upload: ${entry.filename} (${(size / 1024).toFixed(1)}KB)`);
      continue;
    }

    try {
      let imageUrl: string;

      if (args.local) {
        imageUrl = copyToPublic(filePath, entry);
        console.log(`  Copied to: ${imageUrl}`);
      } else {
        const blobPath = `fictotum/${entry.entityType === 'figure' ? 'figures' : 'works'}/${path.basename(entry.filename)}`;
        imageUrl = await uploadToBlob(filePath, blobPath);
        console.log(`  Uploaded: ${imageUrl}`);
      }

      // Update Neo4j
      await updateNeo4jImageUrl(driver, entry, imageUrl);
      console.log(`  Neo4j updated`);

      // Mark as uploaded in manifest
      entry.uploadedUrl = imageUrl;
      entry.linkedAt = new Date().toISOString();
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

      uploaded++;
    } catch (err: any) {
      console.error(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  await driver.close();

  console.log(`\n=== Upload Complete ===`);
  console.log(`Uploaded: ${uploaded} | Failed: ${failed}`);
  if (args.dryRun) {
    console.log('(Dry run -- no changes made)');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
