import type { NextConfig } from "next";

function hostFromUrl(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const allowedDevOrigins = Array.from(
  new Set(
    [
      hostFromUrl(process.env.BETTER_AUTH_URL),
      hostFromUrl(process.env.NEXT_PUBLIC_APP_URL),
    ].filter((v): v is string => Boolean(v)),
  ),
);

const nextConfig: NextConfig = {
  // Avoid Turbopack chunk-load failures for better-auth in dev (e.g. ChunkLoadError on
  // pages that import `auth` via getSession / requireSession). Load the package with Node instead.
  serverExternalPackages: ["better-auth"],
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),

  async redirects() {
    return [{ source: "/home", destination: "/dashboard", permanent: true }];
  },
};

export default nextConfig;
