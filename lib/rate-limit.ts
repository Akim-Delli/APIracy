import { ApiError } from "@/lib/errors";

/**
 * Lightweight, dependency-free per-IP rate limiter (fixed window).
 *
 * State lives in process memory, so on a serverless platform it is enforced
 * per warm instance rather than globally — best-effort abuse/cost protection,
 * not a hard quota. For a strict global limit, back it with a shared store
 * (Upstash Redis / Vercel KV) behind the same interface.
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Whole seconds until the current window resets. */
  resetSeconds: number;
}

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_TRACKED_KEYS = 50_000;

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let window = windows.get(key);
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + windowMs };
    windows.set(key, window);
  }
  window.count += 1;

  // Opportunistic sweep so abandoned keys can't grow memory without bound.
  if (windows.size > MAX_TRACKED_KEYS) {
    for (const [k, w] of windows) {
      if (w.resetAt <= now) windows.delete(k);
    }
  }

  return {
    allowed: window.count <= limit,
    limit,
    remaining: Math.max(0, limit - window.count),
    resetSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
  };
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "ratelimit-limit": String(result.limit),
    "ratelimit-remaining": String(result.remaining),
    "ratelimit-reset": String(result.resetSeconds),
  };
}

/**
 * Adds the RateLimit-* headers to an already-built response, so well-behaved
 * clients can see their remaining budget on success — not just on a 429.
 */
export function withRateLimitHeaders(response: Response, result: RateLimitResult): Response {
  for (const [name, value] of Object.entries(rateLimitHeaders(result))) {
    response.headers.set(name, value);
  }
  return response;
}

/** Standard 429 response sharing the API's JSON error envelope. */
export function rateLimitResponse(result: RateLimitResult): Response {
  const body = ApiError.rateLimited(
    "Rate limit exceeded — please slow down and try again shortly.",
  ).toBody();
  return Response.json(body, {
    status: 429,
    headers: {
      "retry-after": String(result.resetSeconds),
      "cache-control": "no-store",
      ...rateLimitHeaders(result),
    },
  });
}
