/**
 * In-Memory LRU Cache for Hot Entities
 *
 * Provides caching for frequently accessed database entities to reduce
 * Neo4j load and improve response times.
 *
 * Usage:
 *   const data = await withCache('figure:Q1048', async () => {
 *     return await fetchFromNeo4j();
 *   }, 900000); // 15 min TTL
 */

import { LRUCache } from 'lru-cache';

// Cache configuration
const CACHE_CONFIG = {
  // Figure detail cache (most frequently accessed)
  figures: {
    max: 500,              // Cache top 500 figures
    ttl: 1000 * 60 * 15,   // 15 minutes
    updateAgeOnGet: true,  // Reset TTL on cache hit
  },

  // Media work cache
  media: {
    max: 300,              // Cache top 300 media works
    ttl: 1000 * 60 * 15,   // 15 minutes
    updateAgeOnGet: true,
  },

  // Search results cache (shorter TTL due to frequent changes)
  search: {
    max: 100,              // Cache top 100 search queries
    ttl: 1000 * 60 * 5,    // 5 minutes
    updateAgeOnGet: true,
  },

  // Duplicate detection cache (longer TTL, expensive operation)
  duplicates: {
    max: 10,               // Only cache a few configurations
    ttl: 1000 * 60 * 30,   // 30 minutes
    updateAgeOnGet: false, // Don't reset TTL on access
  },
};

// Initialize caches
const figureCache = new LRUCache<string, any>(CACHE_CONFIG.figures);
const mediaCache = new LRUCache<string, any>(CACHE_CONFIG.media);
const searchCache = new LRUCache<string, any>(CACHE_CONFIG.search);
const duplicatesCache = new LRUCache<string, any>(CACHE_CONFIG.duplicates);

// Cache registry for stats
const caches = {
  figures: figureCache,
  media: mediaCache,
  search: searchCache,
  duplicates: duplicatesCache,
};

/**
 * Generic cache wrapper with automatic cache selection
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    cacheType?: keyof typeof caches;
  }
): Promise<T> {
  // Determine cache type from key prefix
  const cacheType = options?.cacheType || getCacheTypeFromKey(key);
  const cache = caches[cacheType];

  // Check cache
  const cached = cache.get(key);
  if (cached !== undefined) {
    console.log(`[Cache HIT] ${cacheType}:${key}`);
    return cached as T;
  }

  console.log(`[Cache MISS] ${cacheType}:${key}`);

  // Fetch and cache
  try {
    const result = await fetcher();

    // Only cache successful results (not null/undefined)
    if (result !== null && result !== undefined) {
      cache.set(key, result, { ttl: options?.ttl });
    }

    return result;
  } catch (error) {
    // Don't cache errors
    throw error;
  }
}

/**
 * Determine cache type from key prefix
 */
function getCacheTypeFromKey(key: string): keyof typeof caches {
  if (key.startsWith('figure:')) return 'figures';
  if (key.startsWith('media:')) return 'media';
  if (key.startsWith('search:')) return 'search';
  if (key.startsWith('duplicates:')) return 'duplicates';

  // Default to figures cache
  return 'figures';
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
  const cacheType = getCacheTypeFromKey(key);
  caches[cacheType].delete(key);
  console.log(`[Cache INVALIDATE] ${cacheType}:${key}`);
}

/**
 * Invalidate all caches (use sparingly, e.g., after bulk data import)
 */
export function invalidateAllCaches(): void {
  Object.entries(caches).forEach(([type, cache]) => {
    const size = cache.size;
    cache.clear();
    console.log(`[Cache CLEAR] ${type}: cleared ${size} entries`);
  });
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return Object.entries(caches).map(([type, cache]) => ({
    type,
    size: cache.size,
    max: cache.max,
    utilization: (cache.size / cache.max * 100).toFixed(1) + '%',
  }));
}

/**
 * Cache middleware for API routes
 *
 * Example usage:
 *   export const GET = cacheMiddleware(
 *     async (req) => { ... },
 *     { keyGenerator: (req) => `figure:${req.params.id}` }
 *   );
 */
export function cacheMiddleware<T>(
  handler: (req: any, context?: any) => Promise<T>,
  options: {
    keyGenerator: (req: any, context?: any) => string;
    ttl?: number;
    cacheType?: keyof typeof caches;
  }
) {
  return async (req: any, context?: any): Promise<T> => {
    const cacheKey = options.keyGenerator(req, context);

    return withCache(
      cacheKey,
      () => handler(req, context),
      { ttl: options.ttl, cacheType: options.cacheType }
    );
  };
}
