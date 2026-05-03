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
  serverExternalPackages: ["better-auth"],
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),

  async redirects() {
    return [{ source: "/home", destination: "/dashboard", permanent: true }];
  },
};

export default nextConfig;

// — next.config.ts: Next.js config — better-auth as server external, optional allowedDevOrigins, /home → /dashboard.

