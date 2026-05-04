import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import {
  type Period,
  getDailyKey,
  getWeeklyKey,
  getMonthlyKey,
  getPeriodWindow,
  getPeriodTtlSeconds,
} from "@/lib/periods";

export type { Period };

/** Ordered leaderboard row without user profile (safe to `unstable_cache` — avatars hydrate per request). */
export type LeaderboardScoreRow = {
  userId: string;
  totalMinutes: number;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  totalMinutes: number;
};

/** When `entries` is the ordered top-N list, avoids a separate DB rank query for users on the list. */
export function rankFromLeaderboardEntries(
  entries: LeaderboardEntry[],
  userId: string,
): { rank: number; totalMinutes: number } | null {
  const idx = entries.findIndex((e) => e.userId === userId);
  if (idx === -1) return null;
  const row = entries[idx]!;
  return { rank: idx + 1, totalMinutes: row.totalMinutes };
}

type LeaderboardFilter = {
  userIds?: string[];
};

function lbRedisKey(period: Period, date: Date): string {
  switch (period) {
    case "daily":
      return `lb:daily:${getDailyKey(date)}`;
    case "weekly":
      return `lb:weekly:${getWeeklyKey(date)}`;
    case "monthly":
      return `lb:monthly:${getMonthlyKey(date)}`;
  }
}

async function fromDbScores(
  period: Period,
  now: Date,
  limit: number,
  filter?: LeaderboardFilter,
): Promise<LeaderboardScoreRow[]> {
  const { start, end } = getPeriodWindow(period, now);
  const userIds = filter?.userIds;
  if (userIds && userIds.length === 0) return [];

  const rows = await prisma.dailyStats.groupBy({
    by: ["userId"],
    where: {
      date: { gte: start, lt: end },
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    _sum: { totalMinutes: true },
    orderBy: { _sum: { totalMinutes: "desc" } },
    take: limit,
  });

  if (!rows.length) return [];

  return rows.map((r) => ({
    userId: r.userId,
    totalMinutes: r._sum.totalMinutes ?? 0,
  }));
}

async function attachRanksAndUsers(ordered: LeaderboardScoreRow[]): Promise<LeaderboardEntry[]> {
  if (!ordered.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: ordered.map((r) => r.userId) } },
    select: { id: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return ordered.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: userMap.get(r.userId)?.name ?? null,
    image: userMap.get(r.userId)?.image ?? null,
    totalMinutes: r.totalMinutes,
  }));
}

async function seedCache(key: string, scores: LeaderboardScoreRow[], ttl: number): Promise<void> {
  if (!redis || !scores.length) return;
  const [first, ...rest] = scores.map((e) => ({ score: e.totalMinutes, member: e.userId }));
  const pipe = redis.pipeline();
  pipe.zadd(key, first, ...rest);
  pipe.expire(key, ttl);
  await pipe.exec();
}

async function getTopScores(
  period: Period,
  now: Date,
  limit: number,
  filter: LeaderboardFilter | undefined,
  options: { seedRedisIfMissing: boolean },
): Promise<LeaderboardScoreRow[]> {
  const userIds = filter?.userIds;
  if (userIds && userIds.length === 0) return [];
  if (userIds) {
    return fromDbScores(period, now, limit, filter);
  }

  const key = lbRedisKey(period, now);

  if (redis) {
    const raw = (await redis.zrange(key, 0, limit - 1, {
      rev: true,
      withScores: true,
    })) as unknown[];

    if (raw.length > 0) {
      const pairs: LeaderboardScoreRow[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        pairs.push({ userId: raw[i] as string, totalMinutes: Number(raw[i + 1]) });
      }
      return pairs;
    }
  }

  const scores = await fromDbScores(period, now, limit, filter);
  if (options.seedRedisIfMissing && redis && scores.length) {
    const ttl = getPeriodTtlSeconds(period, now);
    await seedCache(key, scores, ttl);
  }
  return scores;
}

export async function getTopN(
  period: Period,
  limit = 50,
  filter?: LeaderboardFilter,
): Promise<LeaderboardEntry[]> {
  const now = new Date();
  const scores = await getTopScores(period, now, limit, filter, { seedRedisIfMissing: true });
  return attachRanksAndUsers(scores);
}

export async function getUserRankAndScore(
  period: Period,
  userId: string,
  filter?: LeaderboardFilter,
): Promise<{ rank: number; totalMinutes: number } | null> {
  const now = new Date();
  const userIds = filter?.userIds;
  if (userIds && !userIds.includes(userId)) return null;
  const key = lbRedisKey(period, now);

  if (redis && !userIds) {
    const [score, revRank] = await Promise.all([
      redis.zscore(key, userId),
      redis.zrevrank(key, userId),
    ]);
    if (score !== null && score !== undefined) {
      return { rank: (revRank ?? 0) + 1, totalMinutes: Number(score) };
    }
  }

  const { start, end } = getPeriodWindow(period, now);
  const myAgg = await prisma.dailyStats.aggregate({
    where: {
      userId,
      date: { gte: start, lt: end },
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    _sum: { totalMinutes: true },
  });
  const totalMinutes = myAgg._sum.totalMinutes ?? 0;

  const aboveRows = await prisma.dailyStats.groupBy({
    by: ["userId"],
    where: {
      date: { gte: start, lt: end },
      NOT: { userId },
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    _sum: { totalMinutes: true },
    having: { totalMinutes: { _sum: { gt: totalMinutes } } },
  });

  return { rank: aboveRows.length + 1, totalMinutes };
}

async function loadGlobalDailyTop100ScoresForPage(): Promise<LeaderboardScoreRow[]> {
  return getTopScores("daily", new Date(), 100, undefined, { seedRedisIfMissing: true });
}

/**
 * SSR leaderboard: caches ordered scores for the study day; name/image always loaded fresh from `users`
 * so avatar updates show immediately (see `attachRanksAndUsers`).
 */
export async function getGlobalDailyLeaderboardTop100Cached(): Promise<LeaderboardEntry[]> {
  const studyDay = getDailyKey(new Date());
  const scores = await unstable_cache(loadGlobalDailyTop100ScoresForPage, ["lb-global-daily-top100-scores", studyDay], {
    revalidate: 30,
  })();
  return attachRanksAndUsers(scores);
}

export async function bumpLeaderboards(
  userId: string,
  durationMin: number,
  completedAt: Date,
): Promise<void> {
  const client = redis;
  if (!client) return;
  const periods: Period[] = ["daily", "weekly", "monthly"];
  await Promise.all(
    periods.map(async (period) => {
      const key = lbRedisKey(period, completedAt);
      const ttl = getPeriodTtlSeconds(period, completedAt);
      await client.zincrby(key, durationMin, userId);
      await client.expire(key, ttl);
    }),
  );
}

// — leaderboard.ts: Period leaderboards via Redis ZSET with DB fallback/seed. getTopN / rank / bumpLeaderboards after sessions.
