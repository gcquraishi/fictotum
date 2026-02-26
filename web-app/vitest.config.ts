import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'threads',
    include: ['lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts'],
      exclude: [
        'lib/neo4j.ts',      // DB driver — needs live connection
        'lib/db.ts',          // DB queries — needs live connection
        'lib/auth.ts',        // Auth config — needs env vars
        'lib/cache.ts',       // Cache middleware — needs runtime
        'lib/analytics.ts',   // Analytics — side-effect heavy
        'lib/wikidata.ts',    // API calls — needs mocking
        'lib/wikidata-batch.ts', // API calls — needs mocking
        'lib/locationMatcher.ts', // DB-dependent — needs live connection
        'lib/types.ts',           // Type definitions only
        'lib/constants/**',       // Static constants
        'lib/**/*.test.ts',
      ],
      thresholds: {
        lines: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
});
