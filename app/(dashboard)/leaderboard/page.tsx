import { getTopN, getUserRankAndScore } from "@/lib/leaderboard";
import { getServerSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import LeaderboardClient from "./leaderboard-client";

export default async function LeaderboardPage() {
  const [initialEntries, session] = await Promise.all([
    getTopN("daily", 100),
    getServerSession(),
  ]);

  let initialMe: { rank: number; totalMinutes: number } | null = null;
  let rooms: { id: string; name: string }[] = [];
  if (session) {
    const [me, memberships] = await Promise.all([
      getUserRankAndScore("daily", session.user.id),
      prisma.roomMember.findMany({
        where: { userId: session.user.id },
        orderBy: { joinedAt: "desc" },
        select: { room: { select: { id: true, name: true } } },
      }),
    ]);
    initialMe = me;
    rooms = memberships.map((m) => m.room);
  }

  return (
    <LeaderboardClient
      initialEntries={initialEntries}
      initialMe={initialMe}
      currentUserId={session?.user.id ?? null}
      currentUserName={session?.user.name ?? null}
      currentUserImage={session?.user.image ?? null}
      rooms={rooms}
    />
  );
}

// — Leaderboard server page: loads top entries + user rank.
