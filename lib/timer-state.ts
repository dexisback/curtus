import { getDailyKey } from "@/lib/periods";

export type TimerState = {
  active: boolean;
  startedAt: string | null;
  todaySeconds: number;
  dayKey: string;
  redisAvailable: boolean;
};

export function buildTimerState(params: {
  active: boolean;
  startedAt: string | null;
  todaySeconds: number;
  redisAvailable?: boolean;
  now?: Date;
}): TimerState {
  const now = params.now ?? new Date();
  return {
    active: params.active,
    startedAt: params.startedAt,
    todaySeconds: Math.max(0, Math.floor(params.todaySeconds)),
    dayKey: getDailyKey(now),
    redisAvailable: params.redisAvailable !== false,
  };
}

