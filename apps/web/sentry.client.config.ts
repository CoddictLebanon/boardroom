import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
