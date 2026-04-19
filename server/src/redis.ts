import "dotenv/config";

import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_URL;
const redisToken = process.env.UPSTASH_REDIS_TOKEN;

if (!redisUrl || !redisToken) {
  throw new Error("Missing Upstash Redis credentials for socket server.");
}

export const redis = new Redis({
  url: redisUrl,
  token: redisToken,
});
