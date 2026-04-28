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

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string | null;
  image: string | null;
  totalMinutes: number;
};

type LeaderboardFilter = {
  userIds?: string[];
};

function lbRedisKey(period: Period, date: Date): string {
  if (period === "daily") return `lb:daily:${getDailyKey(date)}`;
  if (period === "weekly") return `lb:weekly:${getWeeklyKey(date)}`;
  if (period === "monthly") return `lb:monthly:${getMonthlyKey(date)}`;
  return `lb:daily:${getDailyKey(date)}`;
}

async function fromDb(
  period: Period,
  now: Date,
  limit: number,
  filter?: LeaderboardFilter,
): Promise<LeaderboardEntry[]> {
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

  const users = await prisma.user.findMany({
    where: { id: { in: rows.map((r) => r.userId) } },
    select: { id: true, name: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.userId,
    name: userMap.get(r.userId)?.name ?? null,
    image: userMap.get(r.userId)?.image ?? null,
    totalMinutes: r._sum.totalMinutes ?? 0,
  }));
}

async function seedCache(
  key: string,
  entries: LeaderboardEntry[],
  ttl: number,
): Promise<void> {
  if (!redis || !entries.length) return;
  const [first, ...rest] = entries.map((e) => ({ score: e.totalMinutes, member: e.userId }));
  await redis.zadd(key, first, ...rest);
  await redis.expire(key, ttl);
}

/**
 * Returns the top N entries for the given period.
 * Reads from the Redis ZSET if populated; falls back to DB and seeds the cache.
 */
export async function getTopN(
  period: Period,
  limit = 50,
  filter?: LeaderboardFilter,
): Promise<LeaderboardEntry[]> {
  const now = new Date();
  const userIds = filter?.userIds;
  if (userIds) {
    return fromDb(period, now, limit, { userIds });
  }
  const key = lbRedisKey(period, now);

  if (redis) {
    const count = await redis.zcard(key);
    if (count > 0) {
      // ZRANGE 0 limit-1 REV WITHSCORES → flat [member, score, ...] array
      const raw = (await redis.zrange(key, 0, limit - 1, {
        rev: true,
        withScores: true,
      })) as unknown[];

      const pairs: { userId: string; score: number }[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        pairs.push({ userId: raw[i] as string, score: Number(raw[i + 1]) });
      }

      const users = await prisma.user.findMany({
        where: { id: { in: pairs.map((p) => p.userId) } },
        select: { id: true, name: true, image: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));

      return pairs.map((p, i) => ({
        rank: i + 1,
        userId: p.userId,
        name: userMap.get(p.userId)?.name ?? null,
        image: userMap.get(p.userId)?.image ?? null,
        totalMinutes: p.score,
      }));
    }
  }

  // DB fallback — also seeds the cache
  const entries = await fromDb(period, now, limit);
  const ttl = getPeriodTtlSeconds(period, now);
  await seedCache(key, entries, ttl);
  return entries;
}

/**
 * Returns the calling user's rank and total for the period.
 * Uses Redis ZREVRANK if available, otherwise falls back to a DB count.
 * Returns null if the user has no minutes recorded for the period.
 */
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
    if (score !== null) {
      return { rank: (revRank ?? 0) + 1, totalMinutes: Number(score) };
    }
  }

  // DB fallback: get user's total and count those ahead
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
  if (!totalMinutes) return null;

  // Count distinct users with a strictly higher total
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

/**
 * Atomically increments the three period ZSET keys after a session is logged.
 * No-op when Redis is not configured.
 */
export async function bumpLeaderboards(
  userId: string,
  durationMin: number,
  completedAt: Date,
): Promise<void> {
  if (!redis) return;
  const periods: Period[] = ["daily", "weekly", "monthly"];
  await Promise.all(
    periods.map(async (period) => {
      const key = lbRedisKey(period, completedAt);
      const ttl = getPeriodTtlSeconds(period, completedAt);
      await redis!.zincrby(key, durationMin, userId);
      await redis!.expire(key, ttl);
    }),
  );
}
