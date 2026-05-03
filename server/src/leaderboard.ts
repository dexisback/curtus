import { redis } from "./redis.js";
import { type Period, getDailyKey, getWeeklyKey, getMonthlyKey, getPeriodTtlSeconds } from "./periods.js";

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

export async function bumpLeaderboards(
  userId: string,
  durationMin: number,
  completedAt: Date,
): Promise<void> {
  const periods: Period[] = ["daily", "weekly", "monthly"];
  await Promise.all(
    periods.map(async (period) => {
      const key = lbRedisKey(period, completedAt);
      const ttl = getPeriodTtlSeconds(period, completedAt);
      await redis.zincrby(key, durationMin, userId);
      await redis.expire(key, ttl);
    }),
  );
}

// — leaderboard.ts: Increments daily/weekly/monthly Redis leaderboard ZSETs when a focus session ends.
