export function authUseTunnel(): boolean {
  const v = process.env.AUTH_USE_TUNNEL?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function stripAuthOrigin(u: string | undefined): string {
  return (u ?? "").trim().replace(/\/$/, "");
}

export function effectiveBetterAuthUrl(): string {
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    const prod = stripAuthOrigin(process.env.BETTER_AUTH_URL);
    if (prod) return prod;
  }

  if (authUseTunnel()) {
    const t = stripAuthOrigin(process.env.BETTER_AUTH_TUNNEL_URL);
    if (t) return t;
  }
  const local = stripAuthOrigin(process.env.BETTER_AUTH_URL_LOCAL);
  if (local) return local;
  const legacy = stripAuthOrigin(process.env.BETTER_AUTH_URL);
  if (legacy) return legacy;
  return "http://localhost:3000";
}

export function buildTrustedAuthOrigins(): string[] {
  const set = new Set<string>();
  const add = (raw?: string) => {
    const o = stripAuthOrigin(raw);
    if (o) set.add(o);
  };

  add(process.env.BETTER_AUTH_URL_LOCAL);
  add(process.env.BETTER_AUTH_TUNNEL_URL);
  add(process.env.NEXT_PUBLIC_APP_URL_LOCAL);
  add(process.env.NEXT_PUBLIC_APP_TUNNEL_URL);
  add(process.env.BETTER_AUTH_URL);
  add(process.env.NEXT_PUBLIC_APP_URL);
  add(effectiveBetterAuthUrl());

  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    add("http://localhost:3000");
    add("http://127.0.0.1:3000");
  }
  if (isProd) {
    set.add("https://*.vercel.app");
  }

  return [...set];
}

// — auth-urls.ts: AUTH_USE_TUNNEL + *_LOCAL / *_TUNNEL URL pairs → effective Better Auth base and trusted origins.
