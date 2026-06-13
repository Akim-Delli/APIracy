"use client";

import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const WELCOME =
  "Hi — I'm Akim's digital twin. Ask me anything about APIracy (how to use the API, set it up, the architecture) or software engineering in general.";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);

    function setLastAssistant(content: string) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content };
        return next;
      });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        setLastAssistant(
          data.reply ?? data.error?.message ?? "Sorry — I couldn't process that.",
        );
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setLastAssistant("Sorry — no response. Try again, or email akim_delli@hotmail.com.");
        return;
      }
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setLastAssistant(acc);
      }
      if (!acc.trim()) {
        setLastAssistant("Sorry — I didn't catch that. Try rephrasing, or email akim_delli@hotmail.com.");
      }
    } catch {
      setLastAssistant("Network error — please try again, or email akim_delli@hotmail.com.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 print:hidden">
      {/* Panel */}
      {open && (
        <div className="glass-card animate-rise mb-3 flex h-[32rem] max-h-[calc(100vh-7rem)] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden">
          {/* header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-violet-500 via-blue-500 to-cyan-400 text-white shadow-[0_0_18px_-4px_rgba(59,130,246,0.8)]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold text-[var(--fg)]">Akim&apos;s digital twin</p>
                <p className="text-[11px] text-[var(--fg-subtle)]">Staff engineer · APIracy</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1 text-[var(--fg-subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm leading-relaxed text-[var(--fg-muted)]">
                {WELCOME}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-linear-to-br from-violet-500 to-blue-500 text-white"
                      : "border border-[var(--border)] bg-[var(--field-bg)] text-[var(--fg)]"
                  }`}
                >
                  {m.content || (busy ? "…" : "")}
                </div>
              </div>
            ))}
          </div>

          {/* input */}
          <form
            className="border-t border-[var(--border)] p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about the API, setup, architecture…"
                className="max-h-28 flex-1 resize-none rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-faint)] focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send message"
                className="btn-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
        className="btn-gradient ml-auto flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
