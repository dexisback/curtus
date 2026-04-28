import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/session";
import { getTopN, getUserRankAndScore } from "@/lib/leaderboard";
import { limiters, enforce } from "@/lib/ratelimit";
import { withApi } from "@/lib/api-session";
import type { Period } from "@/lib/periods";
import { prisma } from "@/lib/db";

const querySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  scope: z.enum(["global", "room"]).default("global"),
  roomId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
});

export const GET = withApi(async (request: Request) => {
  const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
  const rlHeaders = await enforce(limiters.leaderboardRead, ip);

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    period: url.searchParams.get("period") ?? undefined,
    scope: url.searchParams.get("scope") ?? undefined,
    roomId: url.searchParams.get("roomId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query params", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { period, scope, roomId, limit } = parsed.data as {
    period: Period;
    scope: "global" | "room";
    roomId?: string;
    limit: number;
  };

  const session = await getServerSession();

  let filterUserIds: string[] | undefined;
  if (scope === "room") {
    if (!session || !roomId) {
      return NextResponse.json({ error: "Room scope requires auth and roomId" }, { status: 400, headers: rlHeaders });
    }
    const membership = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: session.user.id, roomId } },
      select: { userId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this room" }, { status: 403, headers: rlHeaders });
    }
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      select: { userId: true },
    });
    filterUserIds = members.map((m) => m.userId);
  }

  const [entries, me] = await Promise.all([
    getTopN(period, scope === "global" ? 100 : limit, { userIds: filterUserIds }),
    session
      ? getUserRankAndScore(period, session.user.id, { userIds: filterUserIds })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({ period, scope, roomId: roomId ?? null, entries, me }, { headers: rlHeaders });
});
