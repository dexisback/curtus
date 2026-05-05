import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession, withApi } from "@/lib/api-session";
import { parseRequestJson } from "@/lib/api";
import { limiters, enforce } from "@/lib/ratelimit";
import {
  readTimerState,
  startLiveStudySession,
  stopLiveStudySession,
} from "@/lib/study-live-session";

export const GET = withApi(async () => {
  const session = await requireApiSession();
  await enforce(limiters.sessionsRead, session.user.id);
  const timer = await readTimerState(session.user.id);
  return NextResponse.json({ timer });
});

const postSchema = z.object({
  action: z.enum(["start", "stop"]),
});

export const POST = withApi(async (request: Request) => {
  const session = await requireApiSession();
  await enforce(limiters.studyTimer, session.user.id);

  const parsed = await parseRequestJson(request, postSchema);
  if (!parsed.success) return parsed.response;

  if (parsed.data.action === "start") {
    const result = await startLiveStudySession(session.user.id);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 503 });
    }
    const timer = await readTimerState(session.user.id);
    return NextResponse.json({
      ok: true,
      timer,
    });
  }

  const stopped = await stopLiveStudySession(session.user.id);
  if ("error" in stopped) {
    return NextResponse.json({ error: stopped.error }, { status: 400 });
  }
  const timer = await readTimerState(session.user.id);

  return NextResponse.json({
    ok: true,
    timer,
    session: {
      durationSec: stopped.durationSec,
      durationMin: stopped.durationMin,
      lifetimeFocusMinutes: stopped.lifetimeFocusMinutes,
    },
  });
});

// — GET: active solo study timer from Redis; POST: start/stop (matches Socket.IO live session key).
