import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Supabase client so storage logic can be tested without a real
// backend. The fake storage API methods are configured per-test.
const mock = vi.hoisted(() => {
  const exists = vi.fn();
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({ exists, upload, getPublicUrl }));
  const createClient = vi.fn(() => ({ storage: { from } }));
  return { exists, upload, getPublicUrl, from, createClient };
});

vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));

import { bucketName, findCachedUrl, isStorageConfigured, publicUrl, putCached } from "@/lib/storage";

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  delete process.env.SUPABASE_BUCKET;
  mock.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn/test.png" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("isStorageConfigured", () => {
  it("is true when both URL and service-role key are set", () => {
    expect(isStorageConfigured()).toBe(true);
  });

  it("is false when the service-role key is missing", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(isStorageConfigured()).toBe(false);
  });
});

describe("bucketName", () => {
  it("defaults to processed-media", () => {
    expect(bucketName()).toBe("processed-media");
  });

  it("honours SUPABASE_BUCKET when set", () => {
    process.env.SUPABASE_BUCKET = "my-bucket";
    expect(bucketName()).toBe("my-bucket");
  });
});

describe("publicUrl", () => {
  it("returns the CDN URL for an object path", () => {
    expect(publicUrl("a/b.png")).toBe("https://cdn/test.png");
    expect(mock.getPublicUrl).toHaveBeenCalledWith("a/b.png");
  });
});

describe("findCachedUrl", () => {
  it("returns the public URL on a cache hit", async () => {
    mock.exists.mockResolvedValue({ data: true, error: null });
    await expect(findCachedUrl("x.png")).resolves.toBe("https://cdn/test.png");
  });

  it("returns null on a cache miss", async () => {
    mock.exists.mockResolvedValue({ data: false, error: null });
    await expect(findCachedUrl("x.png")).resolves.toBeNull();
  });

  it("returns null when the existence check errors", async () => {
    mock.exists.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(findCachedUrl("x.png")).resolves.toBeNull();
  });

  it("returns null when the client throws (treated as a miss)", async () => {
    mock.exists.mockRejectedValue(new Error("network down"));
    await expect(findCachedUrl("x.png")).resolves.toBeNull();
  });
});

describe("putCached", () => {
  const body = Buffer.from([1, 2, 3]);

  it("returns the public URL on a successful upload", async () => {
    mock.upload.mockResolvedValue({ error: null });
    await expect(putCached("x.png", body, "image/png")).resolves.toBe("https://cdn/test.png");
    expect(mock.upload).toHaveBeenCalledWith(
      "x.png",
      body,
      expect.objectContaining({ contentType: "image/png", upsert: true }),
    );
  });

  it("returns null and logs when the upload errors", async () => {
    mock.upload.mockResolvedValue({ error: { message: "denied" } });
    await expect(putCached("x.png", body, "image/png")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("returns null when the upload throws", async () => {
    mock.upload.mockRejectedValue(new Error("network down"));
    await expect(putCached("x.png", body, "image/png")).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });
});
