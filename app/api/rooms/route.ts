import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { generateRoomCode } from "@/lib/room-code";
import { limiters, enforce } from "@/lib/ratelimit";

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isPublic: z.boolean().default(true),
});

const listRoomsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  const rlHeaders = await enforce(limiters.roomsCreate, session.user.id);

  const parsed = await parseRequestJson(request, createRoomSchema);
  if (!parsed.success) return parsed.response;

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();
    const existing = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (existing) continue;

    const room = await prisma.$transaction(async (tx) => {
      const r = await tx.room.create({
        data: { code, name: parsed.data.name, isPublic: parsed.data.isPublic, hostId: session.user.id },
      });
      await tx.roomMember.create({ data: { userId: session.user.id, roomId: r.id, role: "HOST" } });
      return r;
    });

    return NextResponse.json({ code: room.code }, { status: 201, headers: rlHeaders });
  }

  return NextResponse.json({ error: "Could not generate unique room code. Try again." }, { status: 500 });
});

export const GET = withApi(async (request: Request) => {
  await requireApiSession();
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rlHeaders = await enforce(limiters.roomsList, ip);

  const { searchParams } = new URL(request.url);
  const query = listRoomsSchema.safeParse(Object.fromEntries(searchParams));
  if (!query.success) {
    return NextResponse.json({ error: "Invalid query parameters", issues: query.error.issues }, { status: 400 });
  }
  const { cursor, limit } = query.data;

  const rooms = await prisma.room.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, code: true, name: true, createdAt: true,
      host: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true } },
    },
  });

  const hasMore = rooms.length > limit;
  const items = hasMore ? rooms.slice(0, limit) : rooms;

  return NextResponse.json(
    {
      rooms: items.map((r) => ({
        id: r.id, code: r.code, name: r.name,
        memberCount: r._count.members, host: r.host, createdAt: r.createdAt,
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
    },
    { headers: rlHeaders },
  );
});

// — GET: list rooms; POST: create room.
