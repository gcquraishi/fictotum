#!/usr/bin/env npx tsx
/**
 * Quick single-image generation for style exploration.
 *
 * Usage (from web-app/):
 *   NODE_PATH=./node_modules npx tsx ../scripts/image-gen/style-test.ts "Your prompt here"
 *   NODE_PATH=./node_modules npx tsx ../scripts/image-gen/style-test.ts --file ../scripts/image-gen/prompts/test1.txt
 *   NODE_PATH=./node_modules npx tsx ../scripts/image-gen/style-test.ts "prompt" --name "lincoln-v2"
 *   NODE_PATH=./node_modules npx tsx ../scripts/image-gen/style-test.ts "prompt" --name "lincoln-v2" --transparent
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadEnvFile } from './env';
import { removeBackground } from './remove-bg';

loadEnvFile(path.resolve(__dirname, '../../web-app/.env.local'));

const OUTPUT_DIR = path.resolve(__dirname, '../../tmp/style-tests');
const MODEL_NAME = 'gemini-2.5-flash-image';

async function main() {
  const args = process.argv.slice(2);

  // Parse args
  let prompt = '';
  let name = `test-${Date.now()}`;
  let transparent = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      prompt = fs.readFileSync(args[++i], 'utf-8').trim();
    } else if (args[i] === '--name' && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === '--transparent') {
      transparent = true;
    } else if (!args[i].startsWith('--')) {
      prompt = args[i];
    }
  }

  if (!prompt) {
    console.error('Usage: style-test.ts "prompt text" [--name filename]');
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('Missing GEMINI_API_KEY');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`Model: ${MODEL_NAME}`);
  console.log(`Prompt: ${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}`);
  console.log(`Output: ${name}.png\n`);

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '3:4',
        },
      } as any,
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      console.error('No response parts');
      process.exit(1);
    }

    for (const part of parts) {
      if ((part as any).inlineData) {
        const imageData = (part as any).inlineData.data;
        const buffer = Buffer.from(imageData, 'base64');
        const outputPath = path.join(OUTPUT_DIR, `${name}.png`);
        fs.writeFileSync(outputPath, buffer);
        console.log(`Saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)}KB)`);

        if (transparent) {
          await removeBackground(outputPath);
          console.log(`Background removed (transparent PNG)`);
        }
        return;
      }
    }

    console.error('No image data in response');
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();
