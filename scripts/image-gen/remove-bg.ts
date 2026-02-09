/**
 * Background removal utility for Fictotum sticker illustrations.
 *
 * Takes a PNG with a solid cream/white background and produces a
 * transparent PNG (true die-cut sticker). Works by flood-filling from
 * the corners with transparency, using a color-distance threshold to
 * handle slight variations in the background.
 *
 * Usage as CLI (from web-app/):
 *   NODE_PATH=./node_modules npx tsx ../scripts/image-gen/remove-bg.ts input.png output.png
 *   NODE_PATH=./node_modules npx tsx ../scripts/image-gen/remove-bg.ts input.png  # overwrites in-place
 *
 * Usage as module:
 *   import { removeBackground } from './remove-bg';
 *   const transparentBuffer = await removeBackground('path/to/image.png');
 */

import sharp from 'sharp';
import * as fs from 'node:fs';

// Color distance threshold — pixels within this distance of the background
// color (sampled from corners) are made transparent. Higher = more aggressive.
const DEFAULT_THRESHOLD = 30;

interface RGBPixel {
  r: number;
  g: number;
  b: number;
}

/**
 * Remove the solid background from a sticker image, producing a transparent PNG.
 */
export async function removeBackground(
  inputPath: string,
  outputPath?: string,
  threshold = DEFAULT_THRESHOLD,
): Promise<Buffer> {
  const image = sharp(inputPath);
  const { width, height, channels } = await image.metadata();

  if (!width || !height) {
    throw new Error(`Could not read image dimensions: ${inputPath}`);
  }

  // Get raw RGBA pixel data
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8Array(data);
  const w = info.width;
  const h = info.height;

  // Sample background color from the four corners (average)
  const bgColor = sampleBackgroundColor(pixels, w, h);

  // Flood-fill from all edges to find connected background pixels
  const isBackground = new Uint8Array(w * h); // 0 = foreground, 1 = background
  const queue: number[] = [];

  // Seed the queue with all edge pixels that match the background color
  for (let x = 0; x < w; x++) {
    seedIfBackground(x, 0, pixels, w, h, bgColor, threshold, isBackground, queue);
    seedIfBackground(x, h - 1, pixels, w, h, bgColor, threshold, isBackground, queue);
  }
  for (let y = 0; y < h; y++) {
    seedIfBackground(0, y, pixels, w, h, bgColor, threshold, isBackground, queue);
    seedIfBackground(w - 1, y, pixels, w, h, bgColor, threshold, isBackground, queue);
  }

  // BFS flood fill
  while (queue.length > 0) {
    const idx = queue.pop()!;
    const x = idx % w;
    const y = Math.floor(idx / w);

    const neighbors = [
      [x - 1, y], [x + 1, y],
      [x, y - 1], [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (isBackground[nIdx]) continue;

      const pIdx = nIdx * 4;
      const pixel: RGBPixel = { r: pixels[pIdx], g: pixels[pIdx + 1], b: pixels[pIdx + 2] };
      if (colorDistance(pixel, bgColor) <= threshold) {
        isBackground[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // Set alpha to 0 for all background pixels
  for (let i = 0; i < w * h; i++) {
    if (isBackground[i]) {
      pixels[i * 4 + 3] = 0; // alpha = 0
    }
  }

  const result = await sharp(Buffer.from(pixels), {
    raw: { width: w, height: h, channels: 4 },
  })
    .png()
    .toBuffer();

  const dest = outputPath || inputPath;
  fs.writeFileSync(dest, result);

  return result;
}

function sampleBackgroundColor(pixels: Uint8Array, w: number, h: number): RGBPixel {
  const corners = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
  ];

  let r = 0, g = 0, b = 0;
  for (const [x, y] of corners) {
    const idx = (y * w + x) * 4;
    r += pixels[idx];
    g += pixels[idx + 1];
    b += pixels[idx + 2];
  }

  return { r: Math.round(r / 4), g: Math.round(g / 4), b: Math.round(b / 4) };
}

function colorDistance(a: RGBPixel, b: RGBPixel): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function seedIfBackground(
  x: number, y: number,
  pixels: Uint8Array, w: number, h: number,
  bgColor: RGBPixel, threshold: number,
  isBackground: Uint8Array, queue: number[],
): void {
  const idx = y * w + x;
  if (isBackground[idx]) return;

  const pIdx = idx * 4;
  const pixel: RGBPixel = { r: pixels[pIdx], g: pixels[pIdx + 1], b: pixels[pIdx + 2] };
  if (colorDistance(pixel, bgColor) <= threshold) {
    isBackground[idx] = 1;
    queue.push(idx);
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: remove-bg.ts <input.png> [output.png] [--threshold N]');
    process.exit(1);
  }

  const inputPath = args[0];
  let outputPath: string | undefined;
  let threshold = DEFAULT_THRESHOLD;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--threshold' && args[i + 1]) {
      threshold = parseInt(args[++i], 10);
    } else if (!args[i].startsWith('--')) {
      outputPath = args[i];
    }
  }

  removeBackground(inputPath, outputPath, threshold)
    .then((buf) => {
      const dest = outputPath || inputPath;
      const kb = (buf.length / 1024).toFixed(1);
      console.log(`Done: ${dest} (${kb}KB, transparent)`);
    })
    .catch((err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });
}
