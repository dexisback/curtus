function stripAuthOrigin(u: string | undefined): string {
  return (u ?? "").trim().replace(/\/$/, "");
}

export function getSocketCorsOrigins(): string[] {
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

  if (process.env.NODE_ENV !== "production") {
    add("http://localhost:3000");
    add("http://127.0.0.1:3000");
  }

  const list = [...set].filter(Boolean);
  if (list.length === 0) {
    throw new Error(
      "Set BETTER_AUTH_URL_LOCAL and NEXT_PUBLIC_APP_URL_LOCAL (and tunnel URLs when needed).",
    );
  }
  return list;
}

// — auth-urls.ts: Socket CORS allowlist from *_LOCAL / *_TUNNEL (and legacy) env vars.
