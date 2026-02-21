import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "production",

  // Disable performance monitoring to conserve free-tier quota
  tracesSampleRate: 0,
});
