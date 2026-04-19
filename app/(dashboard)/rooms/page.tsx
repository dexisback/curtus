import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import RoomsClient from "./rooms-client";

export default async function RoomsPage() {
  const session = await requireSession();

  const [publicRooms, myMemberships] = await Promise.all([
    prisma.room.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        code: true,
        name: true,
        host: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    }),
    prisma.roomMember.findMany({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "desc" },
      select: {
        role: true,
        room: {
          select: {
            code: true,
            name: true,
            host: { select: { id: true, name: true } },
            _count: { select: { members: true } },
          },
        },
      },
    }),
  ]);

  return (
    <RoomsClient
      publicRooms={publicRooms.map((r) => ({
        code: r.code,
        name: r.name,
        memberCount: r._count.members,
        hostName: r.host.name ?? "Unknown",
      }))}
      myRooms={myMemberships.map((m) => ({
        code: m.room.code,
        name: m.room.name,
        role: m.role,
        memberCount: m.room._count.members,
        hostName: m.room.host.name ?? "Unknown",
      }))}
    />
  );
}
