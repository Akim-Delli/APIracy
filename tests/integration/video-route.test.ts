import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/video/thumbnail/route";
import { startFixtureServer, type FixtureServer } from "../helpers/fixture-server";

const execFileAsync = promisify(execFile);

let server: FixtureServer;
let tempDir: string;

/** Synthesizes a 2-second 64x48 test video with ffmpeg's lavfi color source. */
async function makeTestVideo(): Promise<Buffer> {
  tempDir = await mkdtemp(path.join(tmpdir(), "apiracy-test-"));
  const out = path.join(tempDir, "test.mp4");
  await execFileAsync(ffmpegPath!, [
    "-hide_banner",
    "-loglevel", "error",
    "-f", "lavfi",
    "-i", "color=c=red:size=64x48:duration=2:rate=10",
    "-pix_fmt", "yuv420p",
    out,
  ]);
  return readFile(out);
}

beforeAll(async () => {
  process.env.SSRF_ALLOW_PRIVATE = "true";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  server = await startFixtureServer();
  server.fixtures.set("/clip.mp4", { body: await makeTestVideo(), contentType: "video/mp4" });
  server.fixtures.set("/not-a-video.txt", { body: Buffer.from("nope"), contentType: "text/plain" });
});

afterAll(async () => {
  delete process.env.SSRF_ALLOW_PRIVATE;
  await server.close();
  await rm(tempDir, { recursive: true, force: true });
});

function request(query: Record<string, string>): NextRequest {
  const url = new URL("http://service.test/api/video/thumbnail");
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return new NextRequest(url);
}

describe("GET /api/video/thumbnail", () => {
  it("extracts a frame as jpeg by default", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/clip.mp4`, time: "1" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");

    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(64);
    expect(metadata.height).toBe(48);
  });

  it("applies image transformations to the frame", async () => {
    const response = await GET(
      request({ url: `${server.baseUrl}/clip.mp4`, time: "0.5", width: "32", format: "webp" }),
    );
    expect(response.status).toBe(200);
    const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(32);
    expect(metadata.height).toBe(24);
  });

  it("returns 422 when time is past the end of the video", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/clip.mp4`, time: "60" }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("PROCESSING_FAILED");
  });

  it("returns 400 for an invalid time", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/clip.mp4`, time: "abc" }));
    expect(response.status).toBe(400);
  });

  it("returns 415 when the source is not a video", async () => {
    const response = await GET(request({ url: `${server.baseUrl}/not-a-video.txt` }));
    expect(response.status).toBe(415);
  });
});
