import { openApiDocument } from "@/lib/openapi";

export async function GET(): Promise<Response> {
  return Response.json(openApiDocument, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
