/**
 * Shared env file loader for scripts running outside the Next.js context.
 * Manually parses .env.local without requiring the dotenv package.
 */

import * as fs from 'node:fs';

export function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: env file not found at ${filePath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const value = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
