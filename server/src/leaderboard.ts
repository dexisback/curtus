import { redis } from "./redis.js";
import { type Period, getDailyKey, getWeeklyKey, getMonthlyKey, getPeriodTtlSeconds } from "./periods.js";

function lbRedisKey(period: Period, date: Date): string {
  if (period === "daily") return `lb:daily:${getDailyKey(date)}`;
  if (period === "weekly") return `lb:weekly:${getWeeklyKey(date)}`;
  if (period === "monthly") return `lb:monthly:${getMonthlyKey(date)}`;
  return `lb:daily:${getDailyKey(date)}`;
}

/**
 * Atomically increments the three period ZSET keys after a session is logged.
 * Uses the server's non-nullable Redis client.
 */
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
