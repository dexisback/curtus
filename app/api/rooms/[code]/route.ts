import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ code: string }> };

// GET /api/rooms/[code] — room metadata + membership check
export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      isPublic: true,
      createdAt: true,
      host: { select: { id: true, name: true, image: true } },
      _count: { select: { members: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const membership = room.members[0] ?? null;

  // Private rooms: only members can see metadata
  if (!room.isPublic && !membership) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: room.id,
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    memberCount: room._count.members,
    host: room.host,
    createdAt: room.createdAt,
    membership: membership ? { role: membership.role } : null,
  });
}

// DELETE /api/rooms/[code] — leave (member) or delete (host)
export async function DELETE(_request: Request, { params }: Params) {
  const session = await requireSession();
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, hostId: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  if (room.hostId === session.user.id) {
    // Host deletes the room entirely (cascades members, messages)
    await prisma.room.delete({ where: { id: room.id } });
    return NextResponse.json({ deleted: true });
  }

  const membership = await prisma.roomMember.findUnique({
    where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
    select: { userId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this room." }, { status: 403 });
  }

  await prisma.roomMember.delete({
    where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
  });

  return NextResponse.json({ left: true });
}
