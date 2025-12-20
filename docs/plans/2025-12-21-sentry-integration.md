# Sentry.io Error Tracking Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install Sentry.io error tracking on both the NestJS API backend and Next.js web frontend to capture unhandled exceptions.

**Architecture:** Two separate Sentry projects - one for API errors (server-side) and one for Web errors (client + server-side rendering). Both integrate with Clerk for user context. Errors only, no performance monitoring.

**Tech Stack:** @sentry/nestjs for API, @sentry/nextjs for Web, environment variables for DSN configuration

---

## Task 1: Install Sentry SDK for NestJS API

**Files:**
- Modify: `apps/api/package.json`

**Step 1: Install the Sentry NestJS SDK**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm install @sentry/nestjs
```

**Step 2: Verify installation**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm list @sentry/nestjs
```

Expected: Shows `@sentry/nestjs@X.X.X` in output

---

## Task 2: Add Sentry DSN to API Environment Variables

**Files:**
- Modify: `apps/api/.env`

**Step 1: Add SENTRY_DSN to .env**

Add at the end of `apps/api/.env`:
```
# Sentry Error Tracking
SENTRY_DSN=https://184883ddb40cb3272c942e4c51b3657f@o4510568658829312.ingest.us.sentry.io/4510569121906688
```

**Step 2: Verify the variable is readable**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && grep SENTRY_DSN .env
```

Expected: Shows the SENTRY_DSN line

---

## Task 3: Initialize Sentry in NestJS main.ts

**Files:**
- Modify: `apps/api/src/main.ts`

**Step 1: Add Sentry import and initialization**

At the top of `apps/api/src/main.ts`, add the import:
```typescript
import * as Sentry from '@sentry/nestjs';
```

**Step 2: Initialize Sentry before NestFactory.create**

Add before `const app = await NestFactory.create(...)`:
```typescript
// Initialize Sentry for error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Only send errors, no performance data
    tracesSampleRate: 0,
    // Don't send default PII
    sendDefaultPii: false,
  });
  logger.log('Sentry initialized for error tracking');
}
```

Note: The `logger` variable needs to be defined before this block. Move `const logger = new Logger('Bootstrap');` to before the Sentry init.

**Step 3: Verify API builds successfully**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm run build
```

Expected: Build completes without errors

---

## Task 4: Add Sentry Error Filter to NestJS

**Files:**
- Create: `apps/api/src/common/filters/sentry-exception.filter.ts`
- Modify: `apps/api/src/main.ts`

**Step 1: Create Sentry exception filter**

Create `apps/api/src/common/filters/sentry-exception.filter.ts`:
```typescript
import { Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class SentryExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // Only capture 5xx errors and unhandled exceptions
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= 500) {
      Sentry.captureException(exception);
    }

    super.catch(exception, host);
  }
}
```

**Step 2: Register the Sentry filter in main.ts**

Add import at top of `apps/api/src/main.ts`:
```typescript
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
```

Add after existing `app.useGlobalFilters(new GlobalExceptionFilter());`:
```typescript
// Sentry error tracking filter (captures 5xx errors)
if (process.env.SENTRY_DSN) {
  app.useGlobalFilters(new SentryExceptionFilter());
}
```

**Step 3: Verify API builds successfully**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm run build
```

Expected: Build completes without errors

---

## Task 5: Test Sentry API Integration

**Files:**
- None (manual test)

**Step 1: Start the API server**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm run start:dev
```

**Step 2: Trigger a test error (optional)**

You can temporarily add a test endpoint or check Sentry dashboard after normal usage generates errors.

**Step 3: Commit backend changes**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting && git add apps/api && git commit -m "feat(api): add Sentry error tracking integration"
```

---

## Task 6: Install Sentry SDK for Next.js Web

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install the Sentry Next.js SDK**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm install @sentry/nextjs
```

**Step 2: Verify installation**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm list @sentry/nextjs
```

Expected: Shows `@sentry/nextjs@X.X.X` in output

---

## Task 7: Add Sentry DSN to Web Environment Variables

**Files:**
- Modify: `apps/web/.env.local`

**Step 1: Add SENTRY_DSN to .env.local**

Add at the end of `apps/web/.env.local`:
```
# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://beaff166b9788c54a0ab68e5ad854b94@o4510568658829312.ingest.us.sentry.io/4510569124069376
SENTRY_DSN=https://beaff166b9788c54a0ab68e5ad854b94@o4510568658829312.ingest.us.sentry.io/4510569124069376
```

Note: NEXT_PUBLIC_ prefix makes it available to client-side code. Both are needed for client and server.

**Step 2: Verify the variables are readable**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && grep SENTRY .env.local
```

Expected: Shows both SENTRY_DSN lines

---

## Task 8: Create Sentry Client Configuration

**Files:**
- Create: `apps/web/sentry.client.config.ts`

**Step 1: Create client-side Sentry config**

Create `apps/web/sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only track errors, no performance
  tracesSampleRate: 0,

  // Don't send session replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Don't send default PII
  sendDefaultPii: false,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Only enable in production or when DSN is set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
```

---

## Task 9: Create Sentry Server Configuration

**Files:**
- Create: `apps/web/sentry.server.config.ts`

**Step 1: Create server-side Sentry config**

Create `apps/web/sentry.server.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only track errors, no performance
  tracesSampleRate: 0,

  // Don't send default PII
  sendDefaultPii: false,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Only enable when DSN is set
  enabled: !!process.env.SENTRY_DSN,
});
```

---

## Task 10: Create Sentry Edge Configuration

**Files:**
- Create: `apps/web/sentry.edge.config.ts`

**Step 1: Create edge runtime Sentry config**

Create `apps/web/sentry.edge.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only track errors, no performance
  tracesSampleRate: 0,

  // Don't send default PII
  sendDefaultPii: false,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Only enable when DSN is set
  enabled: !!process.env.SENTRY_DSN,
});
```

---

## Task 11: Update Next.js Config for Sentry

**Files:**
- Modify: `apps/web/next.config.ts`

**Step 1: Wrap config with Sentry**

Replace the entire `apps/web/next.config.ts` with:
```typescript
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
    ],
  },
};

// Wrap with Sentry
export default withSentryConfig(nextConfig, {
  // Sentry organization and project
  org: "chairboard",
  project: "boardmeeting-web",

  // Only upload source maps in production builds
  silent: !process.env.CI,

  // Disable source map upload (we're not using it for now)
  sourcemaps: {
    disable: true,
  },

  // Disable telemetry
  telemetry: false,
});
```

Note: Update `org` to match your Sentry organization slug.

**Step 2: Verify web builds successfully**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm run build
```

Expected: Build completes (may show Sentry warnings about source maps, which is fine)

---

## Task 12: Create Global Error Handler Component

**Files:**
- Create: `apps/web/app/global-error.tsx`

**Step 1: Create global error boundary**

Create `apps/web/app/global-error.tsx`:
```typescript
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
          <p className="text-muted-foreground mb-4">
            An unexpected error occurred. Our team has been notified.
          </p>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
```

---

## Task 13: Test Sentry Web Integration

**Files:**
- None (manual test)

**Step 1: Start the web dev server**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm run dev
```

**Step 2: Verify no console errors**

Open http://localhost:3000 in browser, check console for any Sentry-related errors.

**Step 3: Commit frontend changes**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting && git add apps/web && git commit -m "feat(web): add Sentry error tracking integration"
```

---

## Task 14: Final Verification

**Step 1: Run both apps and verify functionality**

Run API:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/api && npm run start:dev
```

Run Web (in separate terminal):
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting/apps/web && npm run dev
```

**Step 2: Check Sentry dashboards**

- Visit your Sentry boardmeeting-api project dashboard
- Visit your Sentry boardmeeting-web project dashboard
- Both should show the SDK is configured (even without errors)

**Step 3: Final commit (if any remaining changes)**

Run:
```bash
cd /Users/danymoussa/Desktop/Claude/Boardmeeting && git status
```

If any uncommitted changes, commit them.

---

## Summary

After completing all tasks, you will have:
1. Sentry error tracking on NestJS API (captures 5xx errors)
2. Sentry error tracking on Next.js Web (captures client and server errors)
3. Environment-based configuration (only active when DSN is set)
4. Privacy-respecting defaults (no PII, no request bodies)
5. Global error boundary for user-friendly error pages
