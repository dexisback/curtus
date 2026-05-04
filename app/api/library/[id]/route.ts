import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";
import { isMissingLibraryTableError } from "@/lib/library-db";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withApi(async (_request: Request, { params }: Params) => {
  const session = await requireApiSession();
  await enforce(limiters.profileWrite, session.user.id);
  const { id } = await params;

  const updated = await prisma.libraryItem
    .updateMany({
      where: { id, userId: session.user.id },
      data: { updatedAt: new Date() },
    })
    .catch((error) => {
      if (isMissingLibraryTableError(error)) return { count: 0 };
      throw error;
    });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Item not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
});

// — Library item API: bump updatedAt when item is opened.
