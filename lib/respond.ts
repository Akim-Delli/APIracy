import type { TransformResult } from "@/lib/image-pipeline";
import { findCachedUrl, isStorageConfigured, putCached } from "@/lib/storage";

/**
 * Cache-aware response strategy shared by the media endpoints:
 *  - cache HIT  -> 302 redirect to the Supabase CDN URL
 *  - cache MISS -> upload, then stream the freshly processed bytes
 *  - storage unavailable/unconfigured -> stream bytes (X-Cache: BYPASS)
 */
export async function respondFromCache(objectPath: string): Promise<Response | null> {
  if (!isStorageConfigured()) return null;
  const cachedUrl = await findCachedUrl(objectPath);
  if (!cachedUrl) return null;
  return redirectResponse(cachedUrl, "HIT");
}

function redirectResponse(url: string, cacheStatus: "HIT" | "MISS"): Response {
  return new Response(null, {
    status: 302,
    headers: {
      location: url,
      "cache-control": "public, max-age=86400",
      "x-cache": cacheStatus,
    },
  });
}

export async function respondWithResult(
  objectPath: string,
  result: TransformResult,
): Promise<Response> {
  let cacheStatus: "MISS" | "BYPASS" = "BYPASS";
  if (isStorageConfigured()) {
    const uploadedUrl = await putCached(objectPath, result.data, result.contentType);
    if (uploadedUrl) cacheStatus = "MISS";
  }
  return new Response(new Uint8Array(result.data), {
    status: 200,
    headers: {
      "content-type": result.contentType,
      "content-length": result.data.byteLength.toString(),
      "cache-control": "public, max-age=31536000, immutable",
      "x-cache": cacheStatus,
      "x-image-width": result.width.toString(),
      "x-image-height": result.height.toString(),
      "x-image-format": result.format,
    },
  });
}
