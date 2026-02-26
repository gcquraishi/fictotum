import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: "production",

  // Disable performance monitoring to conserve free-tier quota (5k errors/month)
  tracesSampleRate: 0,

  // Disable session replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});
