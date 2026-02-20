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

module.exports = nextConfig;
