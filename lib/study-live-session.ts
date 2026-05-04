import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getStudyDayStart, STUDY_DAY_RESET_HOUR_UTC } from "@/lib/periods";
import { bumpLeaderboards } from "@/lib/leaderboard";
import { bumpStreak } from "@/lib/streak";

/** Matches `server/src/events.ts` live session JSON. */
export type LiveSessionPayload = {
  startedAt: string;
  roomId: string | null;
};

export function liveSessionRedisKey(userId: string): string {
  return `user:${userId}:liveSession`;
}

export function todayMinutesRedisKey(userId: string): string {
  return `user:${userId}:todayMinutes`;
}

function secondsUntilNextFiveAmUTC(now = new Date()): number {
  const nextReset = new Date(now);
  nextReset.setUTCHours(STUDY_DAY_RESET_HOUR_UTC, 0, 0, 0);
  if (now >= nextReset) nextReset.setUTCDate(nextReset.getUTCDate() + 1);
  return Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 1000));
}

export async function finalizeLiveStudySession(
  userId: string,
  live: LiveSessionPayload,
): Promise<{ durationMin: number; lifetimeFocusMinutes: number }> {
  const completedAt = new Date();
  const startedAt = new Date(live.startedAt);
  const durationMin = Math.max(1, Math.floor((completedAt.getTime() - startedAt.getTime()) / 60_000));
  const studyDayStart = getStudyDayStart(completedAt);
  const roomId = live.roomId ?? null;

  const [, updatedUser] = await prisma.$transaction([
    prisma.focusSession.create({
      data: {
        userId,
        roomId,
        durationMin,
        completedAt,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lifetimeFocusMinutes: { increment: durationMin } },
    }),
    prisma.dailyStats.upsert({
      where: { userId_date: { userId, date: studyDayStart } },
      update: { totalMinutes: { increment: durationMin } },
      create: { userId, date: studyDayStart, totalMinutes: durationMin },
    }),
  ]);

  if (redis) {
    await redis.incrby(todayMinutesRedisKey(userId), durationMin);
    await redis.expire(todayMinutesRedisKey(userId), secondsUntilNextFiveAmUTC());
  }

  await bumpLeaderboards(userId, durationMin, completedAt);
  await bumpStreak(userId, completedAt);

  return { durationMin, lifetimeFocusMinutes: updatedUser.lifetimeFocusMinutes };
}

const LIVE_SESSION_TTL_SEC = 12 * 60 * 60;

async function takeLiveSession(userId: string): Promise<LiveSessionPayload | null> {
  if (!redis) return null;
  const key = liveSessionRedisKey(userId);
  const stale = await redis.get<LiveSessionPayload>(key);
  if (!stale) return null;
  await redis.del(key);
  return stale;
}

export async function startLiveStudySession(userId: string): Promise<{ startedAt: string } | { error: string }> {
  if (!redis) {
    return { error: "Study timer requires Redis in this deployment." };
  }

  const key = liveSessionRedisKey(userId);
  const stale = await takeLiveSession(userId);
  if (stale) {
    try {
      await finalizeLiveStudySession(userId, stale);
    } catch (e) {
      console.error("[study-live-session] failed to finalize stale session", e);
    }
  }

  const startedAt = new Date().toISOString();
  const payload: LiveSessionPayload = { startedAt, roomId: null };
  await redis.set(key, payload, { ex: LIVE_SESSION_TTL_SEC });
  return { startedAt };
}

export async function stopLiveStudySession(
  userId: string,
): Promise<{ durationMin: number; lifetimeFocusMinutes: number } | { error: string }> {
  if (!redis) {
    return { error: "Study timer requires Redis in this deployment." };
  }

  const live = await takeLiveSession(userId);
  if (!live) {
    return { error: "No active session." };
  }

  return finalizeLiveStudySession(userId, live);
}

export async function readLiveStudySession(userId: string): Promise<LiveSessionPayload | null> {
  if (!redis) return null;
  return redis.get<LiveSessionPayload>(liveSessionRedisKey(userId));
}
