import { describe, expect, it } from "vitest";
import { cacheKey } from "@/lib/cache-key";

describe("cacheKey", () => {
  it("is deterministic", () => {
    const a = cacheKey("images", { url: "https://x.com/a.jpg", width: 100 });
    const b = cacheKey("images", { url: "https://x.com/a.jpg", width: 100 });
    expect(a).toBe(b);
  });

  it("ignores key order", () => {
    const a = cacheKey("images", { url: "https://x.com/a.jpg", width: 100, height: 50 });
    const b = cacheKey("images", { height: 50, width: 100, url: "https://x.com/a.jpg" });
    expect(a).toBe(b);
  });

  it("ignores undefined values", () => {
    const a = cacheKey("images", { url: "https://x.com/a.jpg", width: undefined });
    const b = cacheKey("images", { url: "https://x.com/a.jpg" });
    expect(a).toBe(b);
  });

  it("differs when any parameter differs", () => {
    const base = cacheKey("images", { url: "https://x.com/a.jpg", width: 100 });
    expect(cacheKey("images", { url: "https://x.com/a.jpg", width: 101 })).not.toBe(base);
    expect(cacheKey("images", { url: "https://x.com/b.jpg", width: 100 })).not.toBe(base);
    expect(cacheKey("video-thumbnails", { url: "https://x.com/a.jpg", width: 100 })).not.toBe(base);
  });

  it("prefixes the namespace as a folder", () => {
    expect(cacheKey("images", { url: "u" })).toMatch(/^images\/[a-f0-9]{64}$/);
  });
});
