import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/process/route";
import { startFixtureServer, type FixtureServer } from "../helpers/fixture-server";

let server: FixtureServer;

beforeAll(async () => {
  // the fixture server runs on loopback, which the SSRF guard would reject
  process.env.SSRF_ALLOW_PRIVATE = "true";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  server = await startFixtureServer();
  server.fixtures.set("/photo.png", {
    body: await sharp({
      create: { width: 200, height: 100, channels: 3, background: { r: 10, g: 120, b: 200 } },
    })
      .png()
      .toBuffer(),
    contentType: "image/png",
  });
  server.fixtures.set("/not-an-image.txt", {
    body: Buffer.from("hello"),
    contentType: "text/plain",
  });
  server.fixtures.set("/redirected.png", {
    body: Buffer.alloc(0),
    contentType: "image/png",
    status: 302,
    headers: { location: "/photo.png" },
  });
});

afterAll(async () => {
  delete process.env.SSRF_ALLOW_PRIVATE;
  await server.close();
});

function request(query: Record<string, string>): NextRequest {
  const url = new URL("http://service.test/api/process");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return new NextRequest(url);
}

describe("GET /api/process", () => {
  it("resizes and converts an image end to end", async () => {
    const response = await GET(
      request({ url: `${server.baseUrl}/photo.png`, width: "50", height: "40", format: "jpeg" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("x-cache")).toBe("BYPASS"); // no Supabase configured
    expect(response.headers.get("x-image-width")).toBe("50");
    expect(response.headers.get("x-image-height")).toBe("40");

    const body = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(body).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(40);
  });

  it("follows source redirects", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/redirected.png`, width: "20" }));
    expect(response.status).toBe(200);
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata.width).toBe(20);
  });

  it("returns 400 with details for invalid params", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/photo.png`, width: "0" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
    expect(body.error.details[0].param).toBe("width");
  });

  it("returns 400 when url is missing", async () => {
    const response = await GET(new NextRequest(new URL("http://service.test/api/process")));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("INVALID_PARAMS");
  });

  it("returns 422 when the source 404s", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/missing.png` }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("SOURCE_FETCH_FAILED");
  });

  it("returns 422 when the source host is unreachable", async () => {
    const response = await GET(request({ url: "http://definitely-not-real.invalid/a.png" }));
    expect(response.status).toBe(422);
  });

  it("returns 415 when the source is not an image", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/not-an-image.txt` }));
    expect(response.status).toBe(415);
    const body = await response.json();
    expect(body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("returns 400 for private hosts when the SSRF guard is active", async () => {
    process.env.SSRF_ALLOW_PRIVATE = "false";
    try {
      const response = await GET(request({ url: `${server.baseUrl}/photo.png` }));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error.code).toBe("FORBIDDEN_HOST");
    } finally {
      process.env.SSRF_ALLOW_PRIVATE = "true";
    }
  });

  it("returns 422 when the source exceeds the size limit", async () => {
    process.env.MAX_IMAGE_BYTES = "100";
    try {
      const response = await GET(request({ url: `${server.baseUrl}/photo.png` }));
      expect(response.status).toBe(422);
      const body = await response.json();
      expect(body.error.message).toMatch(/too large/i);
    } finally {
      delete process.env.MAX_IMAGE_BYTES;
    }
  });
});
