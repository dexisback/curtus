import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid Turbopack chunk-load failures for better-auth in dev (e.g. ChunkLoadError on
  // pages that import `auth` via getSession / requireSession). Load the package with Node instead.
  serverExternalPackages: ["better-auth"],

  async redirects() {
    return [{ source: "/home", destination: "/dashboard", permanent: true }];
  },
};

export default nextConfig;
