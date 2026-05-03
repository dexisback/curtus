import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_URL;
const token = process.env.UPSTASH_REDIS_TOKEN;

if (!url || !token) {
  console.warn(
    "[redis] UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN not set — " +
      "rate limiting and session cache will fall back to in-memory.",
  );
}

export const redis = url && token ? new Redis({ url, token }) : null;

// — redis.ts: Optional Upstash client; null when env missing (in-memory fallbacks elsewhere).

