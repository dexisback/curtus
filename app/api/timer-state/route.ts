import { NextResponse } from "next/server";
import { requireApiSession, withApi } from "@/lib/api-session";
import { limiters, enforce } from "@/lib/ratelimit";
import { readTimerState } from "@/lib/study-live-session";
import { buildTimerState } from "@/lib/timer-state";

export const GET = withApi(async () => {
  const session = await requireApiSession();
  await enforce(limiters.sessionsRead, session.user.id);
  let timer;
  try {
    timer = await readTimerState(session.user.id);
  } catch (err) {
    console.warn("[timer-state] read failed; returning deterministic safe payload", err);
    timer = buildTimerState({
      active: false,
      startedAt: null,
      todaySeconds: 0,
      redisAvailable: false,
    });
  }
  return NextResponse.json({ timer });
});

// — GET canonical timer state: active, startedAt, todaySeconds, dayKey.

