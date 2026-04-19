import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { parseRequestJson } from "@/lib/api";
import { generateRoomCode } from "@/lib/room-code";

const createRoomSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isPublic: z.boolean().default(true),
});

// POST /api/rooms — create a room
export async function POST(request: Request) {
  const session = await requireSession();
  const parsed = await parseRequestJson(request, createRoomSchema);
  if (!parsed.success) return parsed.response;

  // Retry up to 3 times in the unlikely event of code collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode();

    const existing = await prisma.room.findUnique({ where: { code }, select: { id: true } });
    if (existing) continue;

    const room = await prisma.$transaction(async (tx) => {
      const r = await tx.room.create({
        data: {
          code,
          name: parsed.data.name,
          isPublic: parsed.data.isPublic,
          hostId: session.user.id,
        },
      });
      await tx.roomMember.create({
        data: { userId: session.user.id, roomId: r.id, role: "HOST" },
      });
      return r;
    });

    return NextResponse.json({ code: room.code }, { status: 201 });
  }

  return NextResponse.json({ error: "Could not generate unique room code. Try again." }, { status: 500 });
}

// GET /api/rooms — list public rooms with member counts
export async function GET(request: Request) {
  await requireSession();

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  const rooms = await prisma.room.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      code: true,
      name: true,
      createdAt: true,
      host: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true } },
    },
  });

  const hasMore = rooms.length > limit;
  const items = hasMore ? rooms.slice(0, limit) : rooms;

  return NextResponse.json({
    rooms: items.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      memberCount: r._count.members,
      host: r.host,
      createdAt: r.createdAt,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
