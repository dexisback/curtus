import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseYouTubeInput } from "@/lib/youtube";
import LibraryClient, { type LibraryItemView } from "@/components/library/library-client";
import { isMissingLibraryTableError } from "@/lib/library-db";

export default async function LibraryPage() {
  const session = await requireSession();

  const rows = await prisma.libraryItem
    .findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: {
        id: true,
        url: true,
        mediaKind: true,
        videoId: true,
        playlistId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .catch((error) => {
      if (isMissingLibraryTableError(error)) return [];
      throw error;
    });

  const initialItems: LibraryItemView[] = rows.map((item) => {
    const parsed = parseYouTubeInput(item.url);
    return {
      id: item.id,
      url: item.url,
      mediaKind: item.mediaKind,
      videoId: item.videoId,
      playlistId: item.playlistId,
      title: item.title,
      createdAtIso: item.createdAt.toISOString(),
      updatedAtIso: item.updatedAt.toISOString(),
      embedUrl: parsed?.embedUrl ?? null,
    };
  });

  return <LibraryClient initialItems={initialItems} />;
}

// — Library page server loader; fetches current user's saved YouTube links.
