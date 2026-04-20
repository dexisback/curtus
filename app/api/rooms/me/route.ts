import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";

export const GET = withApi(async () => {
  const session = await requireApiSession();
  const rlHeaders = await enforce(limiters.roomsList, session.user.id);

  const memberships = await prisma.roomMember.findMany({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "desc" },
    select: {
      role: true,
      joinedAt: true,
      room: {
        select: {
          id: true, code: true, name: true, isPublic: true,
          host: { select: { id: true, name: true, image: true } },
          _count: { select: { members: true } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      rooms: memberships.map((m) => ({
        code: m.room.code, name: m.room.name, isPublic: m.room.isPublic,
        role: m.role, memberCount: m.room._count.members, host: m.room.host, joinedAt: m.joinedAt,
      })),
    },
    { headers: rlHeaders },
  );
});
