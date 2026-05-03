import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";

const joinRoomSchema = z.object({
  code: z.string().trim().min(1).max(12),
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  const rlHeaders = await enforce(limiters.roomsJoin, session.user.id);

  const parsed = await parseRequestJson(request, joinRoomSchema);
  if (!parsed.success) return parsed.response;

  const room = await prisma.room.findUnique({
    where: { code: parsed.data.code },
    select: { id: true, code: true },
  });

  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
    update: {},
    create: { userId: session.user.id, roomId: room.id, role: "MEMBER" },
  });

  return NextResponse.json({ code: room.code }, { headers: rlHeaders });
});

// — POST: join a room by code (membership row).
