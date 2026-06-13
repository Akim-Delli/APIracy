import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { CHAT_DISABLED_MESSAGE, SYSTEM_PROMPT } from "@/lib/assistant-prompt";
import { clientIp, parseChatMessages, rateLimit } from "@/lib/chat";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MODEL = "claude-haiku-4-5";

export async function POST(request: NextRequest): Promise<Response> {
  let messages;
  try {
    messages = parseChatMessages(await request.json().catch(() => null));
  } catch (err) {
    return errorResponse(err);
  }

  if (!rateLimit(clientIp(request.headers))) {
    return Response.json(
      { error: { code: "RATE_LIMITED", message: "Too many messages — please slow down a moment." } },
      { status: 429 },
    );
  }

  // Graceful degradation: no key configured -> friendly fallback, never a 500.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ disabled: true, reply: CHAT_DISABLED_MESSAGE });
  }

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error("Chat stream error:", err);
        controller.enqueue(
          encoder.encode("\n\n_Sorry — something went wrong. Try again, or email akim_delli@hotmail.com._"),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
