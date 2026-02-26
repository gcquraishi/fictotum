import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: "production",

  // Disable performance monitoring to conserve free-tier quota
  tracesSampleRate: 0,

  // Filter out expected Next.js errors that aren't bugs
  beforeSend(event) {
    // NEXT_NOT_FOUND is thrown by notFound() — intentional 404, not a bug
    if (event.exception?.values?.some(e => e.value?.includes('NEXT_NOT_FOUND'))) {
      return null;
    }
    // NEXT_REDIRECT is thrown by redirect() — intentional, not a bug
    if (event.exception?.values?.some(e => e.value?.includes('NEXT_REDIRECT'))) {
      return null;
    }
    return event;
  },
});
