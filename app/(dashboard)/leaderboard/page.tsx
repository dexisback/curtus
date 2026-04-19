import { getTopN, getUserRankAndScore } from "@/lib/leaderboard";
import { getServerSession } from "@/lib/session";
import LeaderboardClient from "./leaderboard-client";

export default async function LeaderboardPage() {
  const [initialEntries, session] = await Promise.all([
    getTopN("daily", 50),
    getServerSession(),
  ]);

  let initialMe: { rank: number; totalMinutes: number } | null = null;
  if (session) {
    initialMe = await getUserRankAndScore("daily", session.user.id);
  }

  return (
    <LeaderboardClient
      initialEntries={initialEntries}
      initialMe={initialMe}
      currentUserId={session?.user.id ?? null}
    />
  );
}
