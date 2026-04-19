import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ code: string }> };

// GET /api/rooms/[code]/members — member list (must be a member to see)
export async function GET(_request: Request, { params }: Params) {
  const session = await requireSession();
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      isPublic: true,
      members: {
        select: {
          role: true,
          joinedAt: true,
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const isMember = room.members.some((m) => m.user.id === session.user.id);

  if (!room.isPublic && !isMember) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  return NextResponse.json({
    members: room.members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      image: m.user.image,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
}
