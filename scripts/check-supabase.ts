/**
 * Supabase cache self-test for APIracy.
 *
 * Exercises the exact storage code path the API uses (lib/storage.ts):
 *   configuration -> bucket exists & public -> upload (cache MISS)
 *   -> lookup (cache HIT) -> public read -> cleanup
 * A passing run means live requests will return `X-Cache: MISS` then `HIT`
 * instead of `BYPASS`.
 *
 * Run from the repo root:
 *   npx tsx scripts/check-supabase.ts
 * with SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (and optional SUPABASE_BUCKET)
 * set in your shell or a local .env / .env.local file.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  bucketName,
  findCachedUrl,
  isStorageConfigured,
  publicUrl,
  putCached,
} from "../lib/storage";

/** Minimal .env loader (no dependency). Does not override existing env vars. */
function loadEnvFile(file: string): void {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return; // file absent — fine
  }
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

const ok = (msg: string) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`);
const fail = (msg: string) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`);

async function cleanup(client: SupabaseClient, bucket: string, path: string): Promise<void> {
  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) console.log(`  (note: couldn't delete test object ${path}: ${error.message})`);
  else console.log(`  cleaned up test object ${path}`);
}

async function main(): Promise<void> {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  console.log("APIracy — Supabase cache self-test\n");

  // [1/5] Configuration -------------------------------------------------------
  console.log("[1/5] Configuration");
  if (!isStorageConfigured()) {
    fail("SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not set.");
    console.log("\n      Set them in your shell or a local .env file, then re-run.");
    process.exit(1);
  }
  const url = process.env.SUPABASE_URL!;
  const bucket = bucketName();
  ok(`SUPABASE_URL set (${new URL(url).host})`);
  ok("SUPABASE_SERVICE_ROLE_KEY set");
  ok(`bucket: ${bucket}`);

  const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // [2/5] Bucket exists & is public ------------------------------------------
  console.log("\n[2/5] Bucket");
  const { data: info, error: bucketErr } = await client.storage.getBucket(bucket);
  if (bucketErr || !info) {
    fail(`bucket "${bucket}" not found: ${bucketErr?.message ?? "unknown error"}`);
    console.log("\n      Create it with: npm run setup:supabase");
    process.exit(1);
  }
  ok(`bucket "${bucket}" exists`);
  if (info.public) ok("bucket is public (required for cache-hit 302 redirects)");
  else fail("bucket is NOT public — cache-hit redirects to the CDN will fail for clients");

  // [3/5] Upload — simulated cache MISS --------------------------------------
  console.log("\n[3/5] Upload (cache write)");
  const path = `healthcheck/${randomUUID()}.txt`;
  const body = Buffer.from(`apiracy-healthcheck ${new Date().toISOString()}`);
  const uploadedUrl = await putCached(path, body, "text/plain");
  if (!uploadedUrl) {
    fail("putCached() returned null — the upload failed (see the error logged above).");
    console.log("      Likely a wrong service-role key or a bucket write policy.");
    process.exit(1);
  }
  ok(`uploaded ${path}`);

  // [4/5] Lookup — simulated cache HIT ---------------------------------------
  console.log("\n[4/5] Lookup (cache read)");
  const hit = await findCachedUrl(path);
  if (!hit) {
    fail("findCachedUrl() returned null right after upload — the API would treat this as a miss.");
    await cleanup(client, bucket, path);
    process.exit(1);
  }
  ok("findCachedUrl() found the object → API would return 302 HIT");

  // [5/5] Public read — what a client following the 302 does -----------------
  console.log("\n[5/5] Public read");
  const cdnUrl = publicUrl(path);
  const res = await fetch(cdnUrl);
  if (!res.ok) {
    fail(`GET public URL -> HTTP ${res.status}. Public read is blocked; 302 redirects won't serve.`);
    await cleanup(client, bucket, path);
    process.exit(1);
  }
  const fetched = Buffer.from(await res.arrayBuffer());
  if (!fetched.equals(body)) {
    fail("fetched bytes did not match what was uploaded.");
    await cleanup(client, bucket, path);
    process.exit(1);
  }
  ok("public URL serves the object (HTTP 200, bytes match)");

  await cleanup(client, bucket, path);

  console.log(
    "\n\x1b[32mAll checks passed.\x1b[0m Caching works — requests will return X-Cache: MISS then HIT.",
  );
}

main().catch((err) => {
  console.error("\nUnexpected error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
