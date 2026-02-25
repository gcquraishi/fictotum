const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase static page data collection timeout.
  // All API routes and dynamic pages are force-dynamic, but Next.js still
  // evaluates modules during build. Neo4j Aura cold starts can be slow.
  staticPageGenerationTimeout: 180,
  images: {
    minimumCacheTTL: 2592000, // 30 days — AI illustrations rarely change
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'commons.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('neo4j-driver');
    }
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Disable source map uploads — auth token lacks required scopes.
  // Sentry error monitoring still works via DSN; only source maps are affected.
  // Re-enable after generating a token with project:releases scope.
  sourcemaps: {
    disable: true,
  },
});
