import { env } from "@/lib/env";
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

export function getRedisClient() {
  if (redis) {
    return redis;
  }

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });

  return redis;
}
