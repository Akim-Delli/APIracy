import { isStorageConfigured } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return Response.json({
    status: "ok",
    cache: isStorageConfigured() ? "supabase" : "bypass",
    timestamp: new Date().toISOString(),
  });
}
