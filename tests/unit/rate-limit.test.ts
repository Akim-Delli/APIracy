import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, clientIp, rateLimitHeaders, rateLimitResponse } from "@/lib/rate-limit";

let key = 0;
beforeEach(() => {
  key += 1; // unique key per test so windows don't bleed across tests
});
afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const k = `t${key}`;
    const results = Array.from({ length: 4 }, () => checkRateLimit(k, 3, 60_000));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
    expect(results[0].limit).toBe(3);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const k = `t${key}`;
    checkRateLimit(k, 1, 1_000);
    expect(checkRateLimit(k, 1, 1_000).allowed).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(checkRateLimit(k, 1, 1_000).allowed).toBe(true);
  });

  it("tracks separate keys independently", () => {
    expect(checkRateLimit(`a${key}`, 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit(`b${key}`, 1, 60_000).allowed).toBe(true);
  });

  it("reports whole seconds until reset", () => {
    const r = checkRateLimit(`t${key}`, 5, 60_000);
    expect(r.resetSeconds).toBeGreaterThan(0);
    expect(r.resetSeconds).toBeLessThanOrEqual(60);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

  it("uses the first x-forwarded-for entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });

  it("falls back to 'unknown' with no proxy headers", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});

describe("rateLimitHeaders / rateLimitResponse", () => {
  it("exposes limit/remaining/reset headers", () => {
    const headers = rateLimitHeaders({ allowed: false, limit: 10, remaining: 0, resetSeconds: 42 });
    expect(headers["ratelimit-limit"]).toBe("10");
    expect(headers["ratelimit-remaining"]).toBe("0");
    expect(headers["ratelimit-reset"]).toBe("42");
  });

  it("returns a 429 with Retry-After and the error envelope", async () => {
    const res = rateLimitResponse({ allowed: false, limit: 10, remaining: 0, resetSeconds: 30 });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("30");
    expect(res.headers.get("ratelimit-remaining")).toBe("0");
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
