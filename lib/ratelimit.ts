import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * No-op limiter returned when Redis is unavailable (local dev without creds).
 * Always returns success so all routes keep working.
 */
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

// ─── Named limiters ───────────────────────────────────────────────────────────

export const limiters = {
  roomsCreate:    make("1 h",  10),   // per userId
  roomsJoin:      make("1 m",  30),   // per userId
  roomsList:      make("1 m",  60),   // per ip
  roomsRead:      make("1 m", 120),   // per ip
  leaderboardRead:make("1 m", 120),   // per ip
  statsRead:      make("1 m",  60),   // per userId
  tasksWrite:     make("1 m",  30),   // per userId
  profileWrite:   make("1 m",  10),   // per userId
  membersRead:    make("1 m",  60),   // per userId
  sessionsRead:   make("1 m",  60),   // per userId
  messagesRead:   make("1 m",  60),   // per userId
};

/**
 * Checks a limiter and returns the response headers.
 * Throws ApiRateLimitError (imported dynamically to avoid circular deps)
 * so callers can re-throw or handle.
 */
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
