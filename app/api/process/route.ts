import type { NextRequest } from "next/server";
import { cacheKey } from "@/lib/cache-key";
import { config } from "@/lib/config";
import { errorResponse } from "@/lib/errors";
import { fetchSource } from "@/lib/fetch-source";
import { transformImage } from "@/lib/image-pipeline";
import { respondFromCache, respondWithResult } from "@/lib/respond";
import { parseQuery, processQuerySchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const params = parseQuery(processQuerySchema, request.nextUrl.searchParams);
    const objectPath = cacheKey("images", params);

    const cached = await respondFromCache(objectPath);
    if (cached) return cached;

    const source = await fetchSource(params.url, { maxBytes: config.maxImageBytes });
    const result = await transformImage(source.buffer, params);
    return await respondWithResult(objectPath, result);
  } catch (err) {
    return errorResponse(err);
  }
}
