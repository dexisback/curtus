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
  switch (period) {
    case "daily":
      return `lb:daily:${getDailyKey(date)}`;
    case "weekly":
      return `lb:weekly:${getWeeklyKey(date)}`;
    case "monthly":
      return `lb:monthly:${getMonthlyKey(date)}`;
  }
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

  const entries = await fromDb(period, now, limit);
  const ttl = getPeriodTtlSeconds(period, now);
  await seedCache(key, entries, ttl);
  return entries;
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
    if (score !== null) {
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
  if (!totalMinutes) return null;

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
