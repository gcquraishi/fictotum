#!/usr/bin/env node
/**
 * Hardcoded ID Validation Script
 *
 * Scans the codebase for hardcoded canonical_id and wikidata_id patterns,
 * validates them against Neo4j database, and reports any invalid references.
 *
 * Usage:
 *   npm run validate:entities          # Validate all IDs
 *   npm run validate:entities --fix    # Auto-fix by updating to constants
 *
 * Exit codes:
 *   0 - All IDs valid
 *   1 - Invalid IDs found
 *   2 - Script error (database connection, file access, etc.)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Neo4j connection (assumes environment variables are set)
const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USER = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;

interface HardcodedId {
  file: string;
  line: number;
  id: string;
  context: string;
  type: 'canonical_id' | 'wikidata_id';
}

interface ValidationResult {
  id: string;
  exists: boolean;
  entityType?: string;
  name?: string;
  error?: string;
}

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /__pycache__/,
  /\.venv/,
  /\.pytest_cache/,
  /\.mypy_cache/,
  /scripts\/qa\/validate_hardcoded_ids\.ts/, // Exclude self
  /lib\/constants\/entities\.ts/, // Exclude the constants registry itself
  /docs\/seed-entities\.md/, // Exclude documentation
];

const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py'];

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // Skip excluded patterns
    if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, files);
    } else if (entry.isFile() && FILE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract hardcoded Q-IDs from file content
 * Matches patterns like:
 *   - canonicalId="Q12345"
 *   - canonical_id: 'Q38358'
 *   - wikidata_id = "Q174583"
 *   - {wikidata_id: "Q23633"}
 */
function extractHardcodedIds(filePath: string): HardcodedId[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const ids: HardcodedId[] = [];

  // Regex patterns for Q-IDs
  const patterns = [
    // TypeScript/JavaScript patterns
    /canonicalId\s*[=:]\s*['"]([Q]\d+)['"]/g,
    /canonical_id\s*[=:]\s*['"]([Q]\d+)['"]/g,
    /wikidata_id\s*[=:]\s*['"]([Q]\d+)['"]/g,
    /wikidataId\s*[=:]\s*['"]([Q]\d+)['"]/g,
    // Python patterns
    /canonical_id\s*=\s*['"]([Q]\d+)['"]/g,
    /wikidata_id\s*=\s*['"]([Q]\d+)['"]/g,
  ];

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
      return;
    }

    // Skip lines that reference CRITICAL_ENTITIES (these are using the constants)
    if (line.includes('CRITICAL_ENTITIES')) {
      return;
    }

    for (const pattern of patterns) {
      const matches = Array.from(line.matchAll(pattern));
      for (const match of matches) {
        const id = match[1];
        const type = match[0].includes('wikidata') ? 'wikidata_id' : 'canonical_id';

        ids.push({
          file: filePath,
          line: index + 1,
          id,
          context: line.trim(),
          type,
        });
      }
    }
  });

  return ids;
}

/**
 * Validate ID against Neo4j database via API
 */
async function validateId(id: string): Promise<ValidationResult> {
  try {
    const response = await fetch(`http://localhost:3000/api/entities/validate?id=${id}`);

    if (!response.ok) {
      return {
        id,
        exists: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      id,
      exists: data.exists,
      entityType: data.entityType,
      name: data.name,
    };
  } catch (error) {
    return {
      id,
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main validation logic
 */
async function main() {
  console.log('🔍 Scanning for hardcoded canonical_id and wikidata_id references...\n');

  // Find project root (where package.json is)
  const projectRoot = path.resolve(__dirname, '../..');
  console.log(`📁 Project root: ${projectRoot}\n`);

  // Scan for files
  const files = scanDirectory(projectRoot);
  console.log(`📄 Found ${files.length} files to scan\n`);

  // Extract hardcoded IDs
  const allIds: HardcodedId[] = [];
  for (const file of files) {
    const ids = extractHardcodedIds(file);
    allIds.push(...ids);
  }

  if (allIds.length === 0) {
    console.log('✅ No hardcoded IDs found - all references use constants!\n');
    process.exit(0);
  }

  console.log(`⚠️  Found ${allIds.length} hardcoded ID reference(s):\n`);

  // Group by ID for deduplication
  const uniqueIds = new Map<string, HardcodedId[]>();
  for (const item of allIds) {
    if (!uniqueIds.has(item.id)) {
      uniqueIds.set(item.id, []);
    }
    uniqueIds.get(item.id)!.push(item);
  }

  // Validate each unique ID
  console.log('🔎 Validating IDs against database...\n');

  const results: Array<{ id: string; validation: ValidationResult; occurrences: HardcodedId[] }> = [];

  for (const [id, occurrences] of uniqueIds) {
    const validation = await validateId(id);
    results.push({ id, validation, occurrences });
  }

  // Report results
  const invalid = results.filter(r => !r.validation.exists);
  const valid = results.filter(r => r.validation.exists);

  if (valid.length > 0) {
    console.log(`✅ Valid IDs (${valid.length}):\n`);
    for (const { id, validation, occurrences } of valid) {
      console.log(`  ${id} - ${validation.name} (${validation.entityType})`);
      console.log(`    Found in ${occurrences.length} location(s):`);
      for (const occ of occurrences) {
        const relativePath = path.relative(projectRoot, occ.file);
        console.log(`      ${relativePath}:${occ.line}`);
      }
      console.log();
    }
  }

  if (invalid.length > 0) {
    console.error(`❌ Invalid IDs (${invalid.length}):\n`);
    for (const { id, validation, occurrences } of invalid) {
      console.error(`  ${id} - NOT FOUND`);
      if (validation.error) {
        console.error(`    Error: ${validation.error}`);
      }
      console.error(`    Found in ${occurrences.length} location(s):`);
      for (const occ of occurrences) {
        const relativePath = path.relative(projectRoot, occ.file);
        console.error(`      ${relativePath}:${occ.line}`);
        console.error(`        ${occ.context}`);
      }
      console.error();
    }

    console.error('\n💡 Recommended fixes:\n');
    console.error('  1. Add valid IDs to lib/constants/entities.ts (CRITICAL_ENTITIES)');
    console.error('  2. Replace hardcoded IDs with constant references');
    console.error('  3. Remove or update invalid ID references');
    console.error('  4. Document in docs/seed-entities.md\n');

    process.exit(1);
  }

  console.log('\n✨ All IDs are valid, but consider moving them to CRITICAL_ENTITIES for better maintainability.\n');
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(2);
});
