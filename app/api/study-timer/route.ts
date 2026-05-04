import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";
import {
  readLiveStudySession,
  startLiveStudySession,
  stopLiveStudySession,
} from "@/lib/study-live-session";
import { redis } from "@/lib/redis";

export const GET = withApi(async () => {
  const session = await requireApiSession();
  await enforce(limiters.sessionsRead, session.user.id);

  if (!redis) {
    return NextResponse.json({
      active: false,
      startedAt: null,
      roomId: null,
      redisAvailable: false,
    });
  }

  const live = await readLiveStudySession(session.user.id);
  return NextResponse.json({
    active: live !== null,
    startedAt: live?.startedAt ?? null,
    roomId: live?.roomId ?? null,
    redisAvailable: true,
  });
});

const postSchema = z.object({
  action: z.enum(["start", "stop"]),
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.studyTimer, session.user.id);

  const parsed = await parseRequestJson(request, postSchema);
  if (!parsed.success) return parsed.response;

  if (!redis) {
    return NextResponse.json(
      { error: "Study timer is unavailable (Redis not configured)." },
      { status: 503 },
    );
  }

  if (parsed.data.action === "start") {
    const result = await startLiveStudySession(session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      active: true,
      startedAt: result.startedAt,
      roomId: null,
    });
  }

  const stopped = await stopLiveStudySession(session.user.id);
  if ("error" in stopped) {
    return NextResponse.json({ error: stopped.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    active: false,
    durationMin: stopped.durationMin,
    lifetimeFocusMinutes: stopped.lifetimeFocusMinutes,
  });
});

// — GET: active solo study timer from Redis; POST: start/stop (matches Socket.IO live session key).
