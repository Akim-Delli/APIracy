import type { NextRequest } from "next/server";
import { cacheKey } from "@/lib/cache-key";
import { config } from "@/lib/config";
import { errorResponse } from "@/lib/errors";
import { fetchSource } from "@/lib/fetch-source";
import { transformImage } from "@/lib/image-pipeline";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { respondFromCache, respondWithResult } from "@/lib/respond";
import { parseQuery, videoThumbnailQuerySchema } from "@/lib/schemas";
import { extractFrame } from "@/lib/video-thumbnail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const limit = checkRateLimit(
    `video:${clientIp(request)}`,
    config.rateLimits.video,
    config.rateLimits.windowMs,
  );
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    const params = parseQuery(videoThumbnailQuerySchema, request.nextUrl.searchParams);
    const objectPath = cacheKey("video-thumbnails", params);

    const cached = await respondFromCache(objectPath);
    if (cached) return cached;

    const source = await fetchSource(params.url, { maxBytes: config.maxVideoBytes });
    const frame = await extractFrame(source.buffer, params.time);
    const result = await transformImage(frame, {
      ...params,
      // thumbnails default to jpeg: small and universally embeddable
      format: params.format ?? "jpeg",
    });
    return await respondWithResult(objectPath, result);
  } catch (err) {
    return errorResponse(err);
  }
}
