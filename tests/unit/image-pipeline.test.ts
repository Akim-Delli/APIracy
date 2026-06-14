import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { transformImage } from "@/lib/image-pipeline";

/** 200x100 red png generated in-memory. */
async function testImage(width = 200, height = 100): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 220, g: 30, b: 30 } },
  })
    .png()
    .toBuffer();
}

describe("transformImage", () => {
  it("resizes to exact dimensions with the default fill mode", async () => {
    const result = await transformImage(await testImage(), { width: 50, height: 50 });
    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
    expect(result.format).toBe("png"); // source format kept
  });

  it("preserves aspect ratio when only width is given", async () => {
    const result = await transformImage(await testImage(200, 100), { width: 100 });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it("fits inside the box with crop=fit", async () => {
    const result = await transformImage(await testImage(200, 100), {
      width: 100,
      height: 100,
      crop: "fit",
    });
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it("stretches with crop=scale", async () => {
    const result = await transformImage(await testImage(200, 100), {
      width: 80,
      height: 80,
      crop: "scale",
    });
    expect(result.width).toBe(80);
    expect(result.height).toBe(80);
  });

  it("extracts a centered region with crop=crop", async () => {
    const result = await transformImage(await testImage(200, 100), {
      width: 60,
      height: 40,
      crop: "crop",
    });
    expect(result.width).toBe(60);
    expect(result.height).toBe(40);
  });

  it("clamps crop=crop to the source dimensions", async () => {
    const result = await transformImage(await testImage(200, 100), {
      width: 500,
      height: 500,
      crop: "crop",
    });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it("converts png to jpeg", async () => {
    const result = await transformImage(await testImage(), { format: "jpeg" });
    expect(result.contentType).toBe("image/jpeg");
    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("jpeg");
  });

  it("converts to webp and avif", async () => {
    // sharp reports avif files as "heif" (avif is an AV1-in-HEIF container)
    for (const [format, reported] of [["webp", "webp"], ["avif", "heif"]] as const) {
      const result = await transformImage(await testImage(), { format });
      expect(result.contentType).toBe(`image/${format}`);
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe(reported);
    }
  });

  it("lower quality produces smaller output", async () => {
    // a noisy image so jpeg quality actually matters
    const noise = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
        noise: { type: "gaussian", mean: 128, sigma: 60 },
      },
    })
      .png()
      .toBuffer();
    const high = await transformImage(noise, { format: "jpeg", quality: 95 });
    const low = await transformImage(noise, { format: "jpeg", quality: 10 });
    expect(low.data.byteLength).toBeLessThan(high.data.byteLength);
  });

  it("applies quality to png via palette quantization", async () => {
    const result = await transformImage(await testImage(), { format: "png", quality: 50 });
    expect(result.format).toBe("png");
    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("png");
  });

  it("re-encodes without any options (proxy mode)", async () => {
    const result = await transformImage(await testImage(), {});
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it("falls back to png for sources sharp cannot re-encode (gif)", async () => {
    const gif = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .gif()
      .toBuffer();
    const result = await transformImage(gif, { width: 5 });
    expect(result.format).toBe("png");
  });

  it("rejects non-image input with a 415", async () => {
    try {
      await transformImage(Buffer.from("this is not an image"), { width: 10 });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(415);
    }
  });
});
