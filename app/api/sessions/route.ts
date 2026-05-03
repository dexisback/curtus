import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  roomCode: z.string().optional(),
});

export const GET = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.sessionsRead, session.user.id);
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    roomCode: url.searchParams.get("roomCode") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { cursor, limit, roomCode } = parsed.data;

  let roomId: string | undefined;
  if (roomCode) {
    const room = await prisma.room.findUnique({ where: { code: roomCode }, select: { id: true } });
    if (!room) return NextResponse.json({ items: [], nextCursor: null });
    roomId = room.id;
  }

  let cursorFilter: { completedAt: Date; id: string } | undefined;
  if (cursor) {
    const pivot = await prisma.focusSession.findUnique({
      where: { id: cursor },
      select: { completedAt: true, id: true },
    });
    if (pivot) cursorFilter = { completedAt: pivot.completedAt, id: pivot.id };
  }

  const items = await prisma.focusSession.findMany({
    where: {
      userId: session.user.id,
      ...(roomId ? { roomId } : {}),
      ...(cursorFilter
        ? {
            OR: [
              { completedAt: { lt: cursorFilter.completedAt } },
              { completedAt: cursorFilter.completedAt, id: { lt: cursorFilter.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: {
      id: true,
      durationMin: true,
      completedAt: true,
      room: { select: { code: true, name: true } },
    },
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

  return NextResponse.json({
    items: page.map((s) => ({
      id: s.id,
      durationMin: s.durationMin,
      completedAt: s.completedAt.toISOString(),
      roomCode: s.room?.code ?? null,
      roomName: s.room?.name ?? null,
    })),
    nextCursor,
  });
});

// — GET: paginated focus sessions for the user.
