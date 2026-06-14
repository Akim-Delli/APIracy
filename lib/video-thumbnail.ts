import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { ApiError } from "@/lib/errors";

const execFileAsync = promisify(execFile);

/**
 * Extracts a single frame from a video at the given timestamp and returns it
 * as a PNG buffer (callers run it through the image pipeline afterwards).
 *
 * ffmpeg needs a seekable input for fast `-ss` seeking, so the video is
 * written to a temp file first; the frame itself is read from stdout.
 */
export async function extractFrame(video: Buffer, timeSeconds: number): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new ApiError(500, "INTERNAL_ERROR", "ffmpeg binary is not available");
  }

  const dir = await mkdtemp(path.join(tmpdir(), "apiracy-"));
  const inputPath = path.join(dir, `${randomUUID()}.video`);
  try {
    await writeFile(inputPath, video);
    const { stdout } = await execFileAsync(
      ffmpegPath,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-ss", timeSeconds.toString(),
        "-i", inputPath,
        "-frames:v", "1",
        "-f", "image2pipe",
        "-c:v", "png",
        "pipe:1",
      ],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
    );

    if (stdout.length === 0) {
      throw ApiError.processingFailed(
        `No frame found at ${timeSeconds}s — the video is likely shorter than that`,
      );
    }
    return stdout;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unsupportedMediaType("The source could not be decoded as a video");
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
