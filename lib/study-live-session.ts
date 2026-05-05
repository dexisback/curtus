import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { getStudyDayStart, STUDY_DAY_RESET_HOUR_LOCAL } from "@/lib/periods";
import { bumpLeaderboards } from "@/lib/leaderboard";
import { bumpStreak } from "@/lib/streak";
import { buildTimerState, type TimerState } from "@/lib/timer-state";

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

export function todaySecondsRedisKey(userId: string): string {
  return `user:${userId}:todaySeconds`;
}

export async function readTodaySeconds(userId: string): Promise<number> {
  if (!redis) return 0;
  const raw = await redis.get<unknown>(todaySecondsRedisKey(userId));
  const parsed = Number(raw ?? 0);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.max(0, Math.floor(parsed));
  }
  // One-time bootstrap for users who only have legacy minute counters.
  const legacyMinRaw = await redis.get<unknown>(todayMinutesRedisKey(userId));
  const legacyMin = Number(legacyMinRaw ?? 0);
  if (Number.isFinite(legacyMin) && legacyMin > 0) {
    const seconds = Math.max(0, Math.floor(legacyMin * 60));
    await redis.set(todaySecondsRedisKey(userId), seconds, {
      ex: secondsUntilNextFiveAmLocal(),
    });
    return seconds;
  }
  return 0;
}

function secondsUntilNextFiveAmLocal(now = new Date()): number {
  const nextReset = new Date(now);
  nextReset.setHours(STUDY_DAY_RESET_HOUR_LOCAL, 0, 0, 0);
  if (now >= nextReset) nextReset.setDate(nextReset.getDate() + 1);
  return Math.max(1, Math.ceil((nextReset.getTime() - now.getTime()) / 1000));
}

export async function finalizeLiveStudySession(
  userId: string,
  live: LiveSessionPayload,
): Promise<{ durationMin: number; durationSec: number; lifetimeFocusMinutes: number }> {
  const completedAt = new Date();
  const startedAt = new Date(live.startedAt);
  const durationSec = Math.max(1, Math.floor((completedAt.getTime() - startedAt.getTime()) / 1_000));
  const durationMin = Math.max(1, Math.floor(durationSec / 60));
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
    await redis.incrby(todaySecondsRedisKey(userId), durationSec);
    await redis.expire(todayMinutesRedisKey(userId), secondsUntilNextFiveAmLocal());
    await redis.expire(todaySecondsRedisKey(userId), secondsUntilNextFiveAmLocal());
  }

  await bumpLeaderboards(userId, durationMin, completedAt);
  await bumpStreak(userId, completedAt);

  return { durationMin, durationSec, lifetimeFocusMinutes: updatedUser.lifetimeFocusMinutes };
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
): Promise<{ durationSec: number; durationMin: number; lifetimeFocusMinutes: number } | { error: string }> {
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

export async function readTimerState(userId: string): Promise<TimerState> {
  if (!redis) {
    return buildTimerState({
      active: false,
      startedAt: null,
      todaySeconds: 0,
      redisAvailable: false,
    });
  }
  const [live, todaySeconds] = await Promise.all([
    readLiveStudySession(userId),
    readTodaySeconds(userId),
  ]);
  return buildTimerState({
    active: live !== null,
    startedAt: live?.startedAt ?? null,
    todaySeconds,
    redisAvailable: true,
  });
}
