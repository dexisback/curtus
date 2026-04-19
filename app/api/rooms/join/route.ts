import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { parseRequestJson } from "@/lib/api";

const joinRoomSchema = z.object({
  code: z.string().trim().min(1).max(12),
});

// POST /api/rooms/join — join a room by code
export async function POST(request: Request) {
  const session = await requireSession();
  const parsed = await parseRequestJson(request, joinRoomSchema);
  if (!parsed.success) return parsed.response;

  const room = await prisma.room.findUnique({
    where: { code: parsed.data.code },
    select: { id: true, code: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  // Upsert — idempotent; already a member is fine
  await prisma.roomMember.upsert({
    where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
    update: {},
    create: { userId: session.user.id, roomId: room.id, role: "MEMBER" },
  });

  return NextResponse.json({ code: room.code });
}
