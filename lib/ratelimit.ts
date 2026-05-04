import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

const noop: Pick<Ratelimit, "limit"> = {
  limit: async () => ({
    success: true,
    limit: 0,
    remaining: 0,
    reset: 0,
    pending: Promise.resolve(),
  }),
};

function make(window: Parameters<typeof Ratelimit.slidingWindow>[1], max: number): Pick<Ratelimit, "limit"> {
  if (!redis) return noop;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    analytics: false,
  });
}

export const limiters = {
  studyTimer: make("1 m", 45),
  roomsCreate: make("1 h", 10),
  roomsJoin: make("1 m", 30),
  roomsList: make("1 m", 60),
  roomsRead: make("1 m", 120),
  leaderboardRead: make("1 m", 120),
  statsRead: make("1 m", 60),
  tasksWrite: make("1 m", 30),
  profileWrite: make("1 m", 10),
  settingsWrite: make("1 m", 30),
  membersRead: make("1 m", 60),
  sessionsRead: make("1 m", 60),
  messagesRead: make("1 m", 60),
};

export async function enforce(
  limiter: Pick<Ratelimit, "limit">,
  key: string,
): Promise<Record<string, string>> {
  const result = await limiter.limit(key);
  const headers: Record<string, string> = {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.reset),
  };
  if (!result.success) {
    const { ApiRateLimitError } = await import("./api-session");
    throw new ApiRateLimitError();
  }
  return headers;
}

// — ratelimit.ts: Upstash sliding-window limiters per route concern; noop when Redis absent; enforce throws ApiRateLimitError.

