import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { libraryItemFromPrismaRow } from "@/lib/library-item";
import LibraryClient from "@/components/library/library-client";
import { isMissingLibraryTableError, LIBRARY_LIST_SELECT } from "@/lib/library-db";

export default async function LibraryPage() {
  const session = await requireSession();

  const rows = await prisma.libraryItem
    .findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 60,
      select: LIBRARY_LIST_SELECT,
    })
    .catch((error) => {
      if (isMissingLibraryTableError(error)) return [];
      throw error;
    });

  const initialItems = rows.map(libraryItemFromPrismaRow);

  return <LibraryClient initialItems={initialItems} />;
}
