import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during build to avoid failing the build for lint-only issues.
  // This is intentional per user's request; re-enable when ready to enforce lint.
  eslint: {
    ignoreDuringBuilds: false,
  },
  output: "standalone",
};

export default nextConfig;
