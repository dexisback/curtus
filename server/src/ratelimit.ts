import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis.js";

function make(window: Parameters<typeof Ratelimit.slidingWindow>[1], max: number): Pick<Ratelimit, "limit"> {
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    analytics: false,
  });
}

export const socketLimiters = {
  chatSend:       make("10 s", 20),  // 20 messages per 10s per user
  pingSend:       make("60 s", 10),  // 10 pings per 60s per user
  roomJoin:       make("60 s", 30),  // 30 joins per 60s per user
  sessionStarted: make("60 s",  6),  // 6 starts per 60s per user (accidental double-tap guard)
};

/**
 * Returns true if the action is allowed, false if rate-limited.
 * Key is scoped to the event + userId so limiters are fully independent.
 */
export async function socketAllow(
  limiter: Pick<Ratelimit, "limit">,
  key: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    // If Redis is down, fail open so legitimate activity isn't blocked
    return true;
  }
}
