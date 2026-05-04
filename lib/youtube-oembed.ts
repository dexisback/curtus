/** Resolve display title from YouTube oEmbed (no API key). */
export async function fetchYouTubeOEmbedTitle(pageUrl: string, init?: RequestInit): Promise<string | null> {
  try {
    const u = new URL("https://www.youtube.com/oembed");
    u.searchParams.set("url", pageUrl);
    u.searchParams.set("format", "json");
    const res = await fetch(u.toString(), {
      ...init,
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: unknown };
    const t = typeof data.title === "string" ? data.title.trim() : "";
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}
