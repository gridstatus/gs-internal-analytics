import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@mantine/charts"],
  },
  // Configure proxy for middleware functionality (Next.js 16)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
