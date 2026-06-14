import { afterEach, describe, expect, it, vi } from "vitest";

// respond.ts is tested in isolation: the storage layer is mocked so we only
// assert the cache-aware response strategy (status codes and X-Cache headers).
vi.mock("@/lib/storage", () => ({
  isStorageConfigured: vi.fn(),
  findCachedUrl: vi.fn(),
  putCached: vi.fn(),
}));

import type { TransformResult } from "@/lib/image-pipeline";
import { respondFromCache, respondWithResult } from "@/lib/respond";
import { findCachedUrl, isStorageConfigured, putCached } from "@/lib/storage";

const mockConfigured = vi.mocked(isStorageConfigured);
const mockFind = vi.mocked(findCachedUrl);
const mockPut = vi.mocked(putCached);

function sampleResult(): TransformResult {
  return {
    data: Buffer.from([1, 2, 3, 4]),
    contentType: "image/png",
    format: "png",
    width: 10,
    height: 20,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("respondFromCache", () => {
  it("returns null when storage is not configured", async () => {
    mockConfigured.mockReturnValue(false);
    expect(await respondFromCache("path")).toBeNull();
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("returns null on a cache miss", async () => {
    mockConfigured.mockReturnValue(true);
    mockFind.mockResolvedValue(null);
    expect(await respondFromCache("path")).toBeNull();
  });

  it("redirects to the CDN URL on a cache hit", async () => {
    mockConfigured.mockReturnValue(true);
    mockFind.mockResolvedValue("https://cdn/obj.png");
    const res = await respondFromCache("path");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(302);
    expect(res!.headers.get("location")).toBe("https://cdn/obj.png");
    expect(res!.headers.get("x-cache")).toBe("HIT");
  });
});

describe("respondWithResult", () => {
  it("streams bytes with X-Cache BYPASS when storage is not configured", async () => {
    mockConfigured.mockReturnValue(false);
    const res = await respondWithResult("path", sampleResult());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-cache")).toBe("BYPASS");
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("x-image-width")).toBe("10");
    expect(res.headers.get("x-image-height")).toBe("20");
    expect(res.headers.get("x-image-format")).toBe("png");
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("uploads and reports X-Cache MISS when the upload succeeds", async () => {
    mockConfigured.mockReturnValue(true);
    mockPut.mockResolvedValue("https://cdn/obj.png");
    const res = await respondWithResult("path", sampleResult());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-cache")).toBe("MISS");
    expect(mockPut).toHaveBeenCalledOnce();
  });

  it("falls back to X-Cache BYPASS when the upload fails", async () => {
    mockConfigured.mockReturnValue(true);
    mockPut.mockResolvedValue(null);
    const res = await respondWithResult("path", sampleResult());
    expect(res.headers.get("x-cache")).toBe("BYPASS");
  });
});
