/**
 * Rate limiter for login endpoint.
 * Uses Upstash Redis in production when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-memory store in development.
 */
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
} from "./securityConfig";

const WINDOW_MS = RATE_LIMIT_WINDOW_MS;
const MAX_ATTEMPTS = RATE_LIMIT_MAX_ATTEMPTS;

interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

// In-memory fallback (development)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimitRedis(identifier: string): Promise<RateLimitResult> {
  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "1 m"),
      analytics: false,
    });

    const { success, remaining, reset } = await ratelimit.limit(`login:${identifier}`);
    const retryAfter = success ? undefined : Math.ceil((reset - Date.now()) / 1000);
    return { success, remaining, reset, retryAfter };
  } catch {
    // Redis unavailable: fall through to in-memory
    return checkRateLimitMemory(identifier);
  }
}

function checkRateLimitMemory(identifier: string): RateLimitResult {
  const now = Date.now();
  const key = `login:${identifier}`;
  const entry = memoryStore.get(key);

  if (!entry) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return {
      success: true,
      remaining: MAX_ATTEMPTS - 1,
      reset: now + WINDOW_MS,
    };
  }

  if (now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return {
      success: true,
      remaining: MAX_ATTEMPTS - 1,
      reset: now + WINDOW_MS,
    };
  }

  entry.count++;
  if (entry.count > MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      remaining: 0,
      reset: entry.resetAt,
      retryAfter,
    };
  }

  return {
    success: true,
    remaining: MAX_ATTEMPTS - entry.count,
    reset: entry.resetAt,
  };
}

export async function checkLoginRateLimit(req: Request): Promise<RateLimitResult> {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const identifier = (forwarded?.split(",")[0]?.trim() || realIp || "unknown").slice(0, 100);

  const useRedis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

  if (useRedis) {
    return checkRateLimitRedis(identifier);
  }
  return checkRateLimitMemory(identifier);
}
