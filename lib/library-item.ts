import { parseYouTubeInput } from '@/lib/youtube';

export type LibraryItemView = {
  id: string;
  url: string;
  mediaKind: 'VIDEO' | 'PLAYLIST';
  videoId: string | null;
  playlistId: string | null;
  title: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  embedUrl: string | null;
};

type PrismaLibraryRow = {
  id: string;
  url: string;
  mediaKind: 'VIDEO' | 'PLAYLIST';
  videoId: string | null;
  playlistId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Server loader: Prisma row → client list shape. */
export function libraryItemFromPrismaRow(
  row: PrismaLibraryRow,
): LibraryItemView {
  const parsed = parseYouTubeInput(row.url);
  return {
    id: row.id,
    url: row.url,
    mediaKind: row.mediaKind,
    videoId: row.videoId,
    playlistId: row.playlistId,
    title: row.title,
    createdAtIso: row.createdAt.toISOString(),
    updatedAtIso: row.updatedAt.toISOString(),
    embedUrl: parsed?.embedUrl ?? null,
  };
}

function fallbackLabel(item: LibraryItemView): string {
  if (item.mediaKind === 'PLAYLIST') {
    return `Playlist ${item.playlistId ?? ''}`.trim();
  }
  return `Video ${item.videoId ?? ''}`.trim();
}

export function displayLabel(item: LibraryItemView): string {
  const trimmed = item.title?.trim();
  if (trimmed) return trimmed;
  return fallbackLabel(item);
}

export function formatItemDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

/** Shape of `item` in POST /api/library JSON (dates are ISO strings after JSON parse). */
export type LibraryItemPostBody = {
  id: string;
  url: string;
  mediaKind: 'VIDEO' | 'PLAYLIST';
  videoId: string | null;
  playlistId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  embedUrl: string | null;
};

/** POST /api/library JSON item → list row. */
export function libraryItemFromPostBody(
  item: LibraryItemPostBody,
): LibraryItemView {
  return {
    id: item.id,
    url: item.url,
    mediaKind: item.mediaKind,
    videoId: item.videoId,
    playlistId: item.playlistId,
    title: item.title,
    createdAtIso: item.createdAt,
    updatedAtIso: item.updatedAt,
    embedUrl: item.embedUrl,
  };
}
