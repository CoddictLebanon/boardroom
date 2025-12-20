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

export default withSentryConfig(nextConfig, {
  org: "chairboard",
  project: "boardmeeting-web",
  silent: !process.env.CI,
  sourcemaps: {
    disable: true,
  },
  telemetry: false,
});
