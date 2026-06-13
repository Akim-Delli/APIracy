import { ApiError } from "@/lib/errors";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const MAX_MESSAGES = 20;
export const MAX_CHARS_PER_MESSAGE = 4000;
export const MAX_TOTAL_CHARS = 12000;

/**
 * Validates the chat request body into a clean message list.
 * Throws a 400 ApiError on anything malformed — the endpoint is public, so we
 * are strict about shape, roles, sizes and ordering.
 */
export function parseChatMessages(body: unknown): ChatMessage[] {
  if (typeof body !== "object" || body === null || !("messages" in body)) {
    throw ApiError.invalidParams("Request body must include a 'messages' array");
  }
  const raw = (body as { messages: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw ApiError.invalidParams("'messages' must be a non-empty array");
  }
  if (raw.length > MAX_MESSAGES) {
    throw ApiError.invalidParams(`Too many messages (max ${MAX_MESSAGES})`);
  }

  let total = 0;
  const messages: ChatMessage[] = raw.map((item, i) => {
    if (typeof item !== "object" || item === null) {
      throw ApiError.invalidParams(`messages[${i}] must be an object`);
    }
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      throw ApiError.invalidParams(`messages[${i}].role must be 'user' or 'assistant'`);
    }
    if (typeof content !== "string" || content.trim() === "") {
      throw ApiError.invalidParams(`messages[${i}].content must be a non-empty string`);
    }
    if (content.length > MAX_CHARS_PER_MESSAGE) {
      throw ApiError.invalidParams(`messages[${i}].content is too long (max ${MAX_CHARS_PER_MESSAGE} chars)`);
    }
    total += content.length;
    return { role, content };
  });

  if (total > MAX_TOTAL_CHARS) {
    throw ApiError.invalidParams(`Conversation is too long (max ${MAX_TOTAL_CHARS} chars)`);
  }
  if (messages[messages.length - 1].role !== "user") {
    throw ApiError.invalidParams("The last message must be from the user");
  }
  return messages;
}
