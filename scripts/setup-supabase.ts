/**
 * One-time Supabase bootstrap: creates the public storage bucket the API
 * caches processed media in.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run setup:supabase
 */
import { createClient } from "@supabase/supabase-js";

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "processed-media";

  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
    process.exit(1);
  }

  const client = createClient(url, key, { auth: { persistSession: false } });

  const { error } = await client.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: "50MB",
  });

  if (error) {
    if (/already exists/i.test(error.message)) {
      console.log(`Bucket "${bucket}" already exists — nothing to do.`);
      return;
    }
    console.error(`Failed to create bucket "${bucket}": ${error.message}`);
    process.exit(1);
  }

  console.log(`Created public bucket "${bucket}". The API will now cache processed media there.`);
}

main();
