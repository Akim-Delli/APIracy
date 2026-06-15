import type { NextRequest } from "next/server";
import { cacheKey } from "@/lib/cache-key";
import { config } from "@/lib/config";
import { errorResponse } from "@/lib/errors";
import { fetchSource } from "@/lib/fetch-source";
import { transformImage } from "@/lib/image-pipeline";
import { checkRateLimit, clientIp, rateLimitResponse, withRateLimitHeaders } from "@/lib/rate-limit";
import { respondFromCache, respondWithResult } from "@/lib/respond";
import { parseQuery, processQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  const limit = checkRateLimit(
    `process:${clientIp(request)}`,
    config.rateLimits.process,
    config.rateLimits.windowMs,
  );
  if (!limit.allowed) return rateLimitResponse(limit);

  try {
    const params = parseQuery(processQuerySchema, request.nextUrl.searchParams);
    const objectPath = cacheKey("images", params);

    const cached = await respondFromCache(objectPath);
    if (cached) return withRateLimitHeaders(cached, limit);

    const source = await fetchSource(params.url, { maxBytes: config.maxImageBytes });
    const result = await transformImage(source.buffer, params);
    return withRateLimitHeaders(await respondWithResult(objectPath, result), limit);
  } catch (err) {
    return errorResponse(err);
  }
}
