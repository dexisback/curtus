import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import RoomClient from "@/components/room/room-client";

type RoomPageProps = {
  params: Promise<{ code: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const session = await requireSession();
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      isPublic: true,
      hostId: true,
      host: { select: { id: true, name: true, image: true } },
      members: {
        select: {
          role: true,
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
        select: {
          id: true,
          content: true,
          clientNonce: true,
          createdAt: true,
          userId: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!room) notFound();

  const isMember = room.members.some((m) => m.user.id === session.user.id);

  // Private rooms: non-members get redirected to rooms list
  if (!room.isPublic && !isMember) {
    redirect("/rooms");
  }

  // Public rooms: auto-join so socket room:join can verify membership
  if (!isMember) {
    await prisma.roomMember.upsert({
      where: { userId_roomId: { userId: session.user.id, roomId: room.id } },
      update: {},
      create: { userId: session.user.id, roomId: room.id, role: "MEMBER" },
    });
    // Reload to get updated member list
    redirect(`/room/${code}`);
  }

  return (
    <RoomClient
      roomId={room.id}
      code={room.code}
      name={room.name}
      currentUserId={session.user.id}
      isHost={room.hostId === session.user.id}
      initialMembers={room.members.map((m) => ({
        id: m.user.id,
        name: m.user.name ?? "Unknown",
        image: m.user.image ?? null,
        role: m.role,
      }))}
      initialMessages={room.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        clientNonce: msg.clientNonce,
        userId: msg.userId,
        userName: msg.user.name ?? "Unknown",
        createdAt: msg.createdAt.toISOString(),
      }))}
    />
  );
}

// — Room page: study timer, presence, chat, member list.
