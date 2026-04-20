import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/session";
import { getTopN, getUserRankAndScore } from "@/lib/leaderboard";
import { limiters, enforce } from "@/lib/ratelimit";
import { withApi } from "@/lib/api-session";
import type { Period } from "@/lib/periods";

const querySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

export const GET = withApi(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rlHeaders = await enforce(limiters.leaderboardRead, ip);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    period: url.searchParams.get("period") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { period, limit } = parsed.data as { period: Period; limit: number };

  const [entries, session] = await Promise.all([
    getTopN(period, limit),
    getServerSession(),
  ]);

  let me: { rank: number; totalMinutes: number } | null = null;
  if (session) {
    const myRank = await getUserRankAndScore(period, session.user.id);
    if (myRank) me = myRank;
  }

  return NextResponse.json({ period, entries, me }, { headers: rlHeaders });
});
