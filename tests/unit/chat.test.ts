import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { MAX_MESSAGES, parseChatMessages } from "@/lib/chat";

describe("parseChatMessages", () => {
  it("accepts a valid conversation ending with a user message", () => {
    const msgs = parseChatMessages({
      messages: [
        { role: "user", content: "How do I resize an image?" },
        { role: "assistant", content: "Use /api/process with width." },
        { role: "user", content: "And convert to webp?" },
      ],
    });
    expect(msgs).toHaveLength(3);
    expect(msgs[2]).toEqual({ role: "user", content: "And convert to webp?" });
  });

  it.each([
    ["non-object", null],
    ["missing messages", {}],
    ["empty array", { messages: [] }],
    ["not an array", { messages: "hi" }],
  ])("rejects %s", (_desc, body) => {
    expect(() => parseChatMessages(body)).toThrowError(ApiError);
  });

  it("rejects an invalid role", () => {
    expect(() =>
      parseChatMessages({ messages: [{ role: "system", content: "x" }] }),
    ).toThrowError(ApiError);
  });

  it("rejects empty content", () => {
    expect(() =>
      parseChatMessages({ messages: [{ role: "user", content: "   " }] }),
    ).toThrowError(ApiError);
  });

  it("rejects when the last message is not from the user", () => {
    expect(() =>
      parseChatMessages({
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello" },
        ],
      }),
    ).toThrowError(ApiError);
  });

  it("rejects too many messages", () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, () => ({
      role: "user" as const,
      content: "hi",
    }));
    expect(() => parseChatMessages({ messages })).toThrowError(ApiError);
  });

  it("rejects an over-long message", () => {
    expect(() =>
      parseChatMessages({ messages: [{ role: "user", content: "x".repeat(5000) }] }),
    ).toThrowError(ApiError);
  });

  it("surfaces a 400 status on the ApiError", () => {
    try {
      parseChatMessages({ messages: [{ role: "user", content: "" }] });
      expect.unreachable();
    } catch (err) {
      expect((err as ApiError).status).toBe(400);
    }
  });
});
