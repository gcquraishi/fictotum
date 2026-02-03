/**
 * Critical Entities Registry
 *
 * This file maintains canonical_id references for entities used across the application.
 * All IDs are validated at runtime in development mode to catch stale or incorrect references.
 *
 * IMPORTANT: When adding a new critical entity:
 * 1. Add it to CRITICAL_ENTITIES object below
 * 2. Add entry to docs/seed-entities.md with usage context
 * 3. Run validation: npm run validate:entities
 */

export const CRITICAL_ENTITIES = {
  /**
   * Henry VIII of England
   * Used in: Landing page, universe mockup
   * Added: 2026-02-02 (Sprint 2)
   */
  HENRY_VIII: 'Q38358',

  // Add more critical entities here as needed
  // Format: ENTITY_NAME: 'Q12345',
} as const;

// Type helper for entity keys
export type CriticalEntityKey = keyof typeof CRITICAL_ENTITIES;

// Type helper for canonical IDs (branded type for type safety)
export type CanonicalID = string & { readonly __brand: 'CanonicalID' };

/**
 * Get a canonical ID from the registry
 * @param key - The entity key from CRITICAL_ENTITIES
 * @returns The canonical ID as a branded type
 */
export function getEntityId(key: CriticalEntityKey): CanonicalID {
  return CRITICAL_ENTITIES[key] as CanonicalID;
}

/**
 * Validates that all critical entities exist in Neo4j database
 * Runs automatically in development mode on app startup
 * @throws Error if any entity is not found in database
 */
export async function validateCriticalEntities(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only validate in development
  }

  console.log('[Entity Validation] Checking critical entities...');

  const entities = Object.entries(CRITICAL_ENTITIES);
  const results: { key: string; id: string; valid: boolean; error?: string }[] = [];

  for (const [key, canonicalId] of entities) {
    try {
      // Call validation API endpoint
      const port = process.env.NEXT_PUBLIC_PORT || '3001';
      const response = await fetch(`http://localhost:${port}/api/entities/validate?id=${canonicalId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        results.push({
          key,
          id: canonicalId,
          valid: false,
          error: `API error: ${response.status}`,
        });
        continue;
      }

      const data = await response.json();
      results.push({
        key,
        id: canonicalId,
        valid: data.exists,
        error: data.exists ? undefined : 'Entity not found in database',
      });
    } catch (error) {
      results.push({
        key,
        id: canonicalId,
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Report results
  const invalid = results.filter(r => !r.valid);

  if (invalid.length > 0) {
    console.error('[Entity Validation] ❌ FAILED - Invalid entities detected:');
    invalid.forEach(({ key, id, error }) => {
      console.error(`  - ${key} (${id}): ${error}`);
    });
    console.error('\n💡 Fix these issues:');
    console.error('  1. Check docs/seed-entities.md for correct IDs');
    console.error('  2. Verify entities exist in Neo4j database');
    console.error('  3. Update CRITICAL_ENTITIES in lib/constants/entities.ts\n');

    throw new Error(
      `Entity validation failed: ${invalid.length} invalid entity reference(s). ` +
      `See console for details.`
    );
  }

  console.log(`[Entity Validation] ✅ All ${results.length} critical entities validated successfully`);
}

/**
 * Client-side validation hook
 * Import and call this in _app.tsx or root layout to run validation on startup
 */
export function useEntityValidation() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Run validation once on mount
    validateCriticalEntities().catch(err => {
      console.error('[Entity Validation] Startup validation failed:', err);
    });
  }
}
