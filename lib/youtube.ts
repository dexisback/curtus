export type YouTubeMediaKind = "VIDEO" | "PLAYLIST";

export type ParsedYouTubeInput = {
  kind: YouTubeMediaKind;
  normalizedUrl: string;
  embedUrl: string;
  videoId: string | null;
  playlistId: string | null;
};

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const PLAYLIST_ID_RE = /^[a-zA-Z0-9_-]{10,}$/;

function ensureProtocol(raw: string) {
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  return `https://${raw}`;
}

function canonicalHost(hostname: string) {
  const h = hostname.toLowerCase();
  if (h.startsWith("www.")) return h.slice(4);
  return h;
}

function readVideoIdFromPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  if (parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") {
    return parts[1] ?? null;
  }
  return null;
}

export function parseYouTubeInput(input: string): ParsedYouTubeInput | null {
  const raw = input.trim();
  if (!raw) return null;

  if (VIDEO_ID_RE.test(raw)) {
    return {
      kind: "VIDEO",
      normalizedUrl: `https://www.youtube.com/watch?v=${raw}`,
      embedUrl: `https://www.youtube.com/embed/${raw}?rel=0&modestbranding=1`,
      videoId: raw,
      playlistId: null,
    };
  }

  const withProtocol = ensureProtocol(raw);
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }

  const host = canonicalHost(url.hostname);
  if (!["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)) {
    return null;
  }

  const list = url.searchParams.get("list");
  if (list && PLAYLIST_ID_RE.test(list)) {
    return {
      kind: "PLAYLIST",
      normalizedUrl: `https://www.youtube.com/playlist?list=${list}`,
      embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}&rel=0&modestbranding=1`,
      videoId: null,
      playlistId: list,
    };
  }

  let videoId: string | null = null;
  if (host === "youtu.be") {
    const segment = url.pathname.split("/").filter(Boolean)[0] ?? null;
    videoId = segment;
  } else {
    videoId = url.searchParams.get("v");
    if (!videoId) videoId = readVideoIdFromPath(url.pathname);
  }

  if (videoId && VIDEO_ID_RE.test(videoId)) {
    return {
      kind: "VIDEO",
      normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      videoId,
      playlistId: null,
    };
  }

  return null;
}

// — Parse user-provided YouTube URLs into canonical watch/playlist + embed URLs.
