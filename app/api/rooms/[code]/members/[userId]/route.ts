import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { requireSession } from "@/lib/session";
import { parseRequestJson } from "@/lib/api";

type Params = { params: Promise<{ code: string; userId: string }> };

const patchSchema = z.object({
  role: z.enum(["MEMBER", "COHOST"]),
});

async function resolveRoom(code: string) {
  return prisma.room.findUnique({
    where: { code },
    select: { id: true, hostId: true },
  });
}

async function getCallerMembership(roomId: string, callerId: string) {
  return prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: callerId, roomId } },
    select: { role: true },
  });
}

// DELETE /api/rooms/[code]/members/[userId] — kick a member
export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSession();
  const { code, userId: targetUserId } = await params;

  const room = await resolveRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  // Cannot kick the room host
  if (room.hostId === targetUserId) {
    return NextResponse.json({ error: "Cannot kick the room host." }, { status: 403 });
  }

  // Cannot kick yourself
  if (session.user.id === targetUserId) {
    return NextResponse.json({ error: "Cannot kick yourself — use leave instead." }, { status: 400 });
  }

  const callerMembership = await getCallerMembership(room.id, session.user.id);
  if (!callerMembership || (callerMembership.role !== "HOST" && callerMembership.role !== "COHOST")) {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  // COHOSTs cannot kick other COHOSTs
  const targetMembership = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: targetUserId, roomId: room.id } },
    select: { role: true },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "User is not a member of this room." }, { status: 404 });
  }

  if (callerMembership.role === "COHOST" && targetMembership.role === "COHOST") {
    return NextResponse.json({ error: "COHOSTs cannot kick other COHOSTs." }, { status: 403 });
  }

  await prisma.roomMember.delete({
    where: { userId_roomId: { userId: targetUserId, roomId: room.id } },
  });

  // Signal socket server to evict the user via Redis key (60s TTL)
  if (redis) {
    await redis.set(`kick:${targetUserId}:${room.id}`, "1", { ex: 60 });
  }

  return NextResponse.json({ kicked: true });
}

// PATCH /api/rooms/[code]/members/[userId] — change role (HOST only)
export async function PATCH(request: Request, { params }: Params) {
  const session = await requireSession();
  const { code, userId: targetUserId } = await params;

  const room = await resolveRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });

  // Only the host can change roles
  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Only the room host can change roles." }, { status: 403 });
  }

  // Cannot change your own role
  if (session.user.id === targetUserId) {
    return NextResponse.json({ error: "Cannot change your own role." }, { status: 400 });
  }

  // Cannot change the role of the host (would be a no-op anyway)
  if (room.hostId === targetUserId) {
    return NextResponse.json({ error: "Cannot change the host's role." }, { status: 400 });
  }

  const body = await parseRequestJson(request, patchSchema);
  if (!body.success) return body.response;

  const membership = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: targetUserId, roomId: room.id } },
    select: { userId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "User is not a member of this room." }, { status: 404 });
  }

  const updated = await prisma.roomMember.update({
    where: { userId_roomId: { userId: targetUserId, roomId: room.id } },
    data: { role: body.data.role },
    select: { userId: true, role: true },
  });

  return NextResponse.json(updated);
}
