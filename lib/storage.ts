import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function bucketName(): string {
  return process.env.SUPABASE_BUCKET ?? "processed-media";
}

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function publicUrl(path: string): string {
  return getClient().storage.from(bucketName()).getPublicUrl(path).data.publicUrl;
}

/**
 * Returns the public CDN URL for a cached object, or null on a cache miss.
 * Storage failures are treated as misses so the API stays available even if
 * the cache is down.
 */
export async function findCachedUrl(path: string): Promise<string | null> {
  try {
    const { data: exists, error } = await getClient().storage.from(bucketName()).exists(path);
    if (error || !exists) return null;
    return publicUrl(path);
  } catch {
    return null;
  }
}

/**
 * Uploads a processed result to the cache. Returns its public URL, or null
 * if the upload failed (callers then fall back to streaming the bytes).
 */
export async function putCached(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  try {
    const { error } = await getClient()
      .storage.from(bucketName())
      .upload(path, body, {
        contentType,
        cacheControl: "31536000",
        upsert: true,
      });
    if (error) {
      console.error(`Cache upload failed for ${path}:`, error.message);
      return null;
    }
    return publicUrl(path);
  } catch (err) {
    console.error(`Cache upload failed for ${path}:`, err);
    return null;
  }
}
