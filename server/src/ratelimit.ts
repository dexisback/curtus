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
  chatSend: make("10 s", 20),
  pingSend: make("60 s", 10),
  roomJoin: make("60 s", 30),
  sessionStarted: make("60 s", 6),
  presenceRefresh: make("10 s", 30),
};

export async function socketAllow(
  limiter: Pick<Ratelimit, "limit">,
  key: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch {
    return true;
  }
}

// — ratelimit.ts: Upstash sliding windows for hot socket events; socketAllow fails open if limiter errors.

