import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";

type Params = { params: Promise<{ code: string }> };

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const GET = withApi(async (request: Request, { params }: Params) => {
  const session = await requireApiSession();
  await enforce(limiters.messagesRead, session.user.id);
  const { code } = await params;
  const url = new URL(request.url);

  const parsed = querySchema.safeParse({
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { cursor, limit } = parsed.data;

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true, isPublic: true,
      members: { where: { userId: session.user.id }, select: { userId: true } },
    },
  });

  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const isMember = room.members.length > 0;
  if (!room.isPublic && !isMember) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: {
      roomId: room.id,
      ...(cursor
        ? {
            createdAt: {
              lt: (
                await prisma.message.findUnique({ where: { id: cursor }, select: { createdAt: true } })
              )?.createdAt ?? new Date(),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true, content: true, createdAt: true, userId: true,
      clientNonce: true,
      user: { select: { name: true } },
    },
  });

  const hasMore = messages.length > limit;
  const page = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? page[page.length - 1]?.id : null;

  return NextResponse.json({
    items: page.map((m) => ({
      id: m.id, content: m.content, createdAt: m.createdAt.toISOString(),
      clientNonce: m.clientNonce,
      userId: m.userId, userName: m.user.name ?? "Unknown",
    })),
    nextCursor,
  });
});
