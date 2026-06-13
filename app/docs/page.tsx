"use client";

import { useEffect, useRef } from "react";
import { AuroraBackground, Header, useTheme } from "../_components/site-chrome";

/* Map Scalar's tokens onto the aurora palette for both light and dark modes. */
const SCALAR_CSS = `
.dark-mode {
  --scalar-background-1: #0a0a12;
  --scalar-background-2: #0f0f1a;
  --scalar-background-3: #15151f;
  --scalar-background-accent: rgba(99, 102, 241, 0.16);
  --scalar-border-color: rgba(255, 255, 255, 0.08);
  --scalar-color-1: #e7e7ef;
  --scalar-color-2: #a1a1aa;
  --scalar-color-3: #71717a;
  --scalar-color-accent: #818cf8;
  --scalar-button-1: #4f46e5;
  --scalar-sidebar-background-1: rgba(6, 6, 10, 0.7);
  --scalar-sidebar-color-1: #e7e7ef;
  --scalar-sidebar-color-2: #a1a1aa;
  --scalar-sidebar-border-color: rgba(255, 255, 255, 0.08);
  --scalar-sidebar-item-hover-background: rgba(99, 102, 241, 0.1);
  --scalar-sidebar-item-active-background: rgba(99, 102, 241, 0.16);
  --scalar-sidebar-color-active: #c7d2fe;
}
.light-mode {
  --scalar-background-1: #ffffff;
  --scalar-background-2: #f4f5fb;
  --scalar-background-3: #eef0f8;
  --scalar-background-accent: rgba(79, 70, 229, 0.1);
  --scalar-border-color: rgba(15, 23, 42, 0.1);
  --scalar-color-1: #18181b;
  --scalar-color-2: #52525b;
  --scalar-color-3: #71717a;
  --scalar-color-accent: #4f46e5;
  --scalar-button-1: #4f46e5;
  --scalar-sidebar-background-1: rgba(255, 255, 255, 0.7);
  --scalar-sidebar-color-1: #18181b;
  --scalar-sidebar-color-2: #52525b;
  --scalar-sidebar-border-color: rgba(15, 23, 42, 0.1);
  --scalar-sidebar-item-hover-background: rgba(79, 70, 229, 0.08);
  --scalar-sidebar-item-active-background: rgba(79, 70, 229, 0.12);
  --scalar-sidebar-color-active: #4338ca;
}`;

interface ScalarGlobal {
  createApiReference: (selector: string, config: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    Scalar?: ScalarGlobal;
  }
}

export default function DocsPage() {
  const theme = useTheme();
  const themeRef = useRef(theme);
  const scriptRequested = useRef(false);

  useEffect(() => {
    themeRef.current = theme;
    function mount() {
      const el = document.getElementById("scalar-docs");
      if (!el || !window.Scalar) return;
      el.innerHTML = ""; // clear any previous instance before re-rendering
      window.Scalar.createApiReference("#scalar-docs", {
        url: "/api/openapi.json",
        theme: "purple",
        hideClientButton: true,
        darkMode: themeRef.current === "dark",
        forceDarkModeState: themeRef.current,
        hideDarkModeToggle: true,
        customCss: SCALAR_CSS,
      });
    }

    if (window.Scalar) {
      mount();
      return;
    }
    if (!scriptRequested.current) {
      scriptRequested.current = true;
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
      script.onload = mount;
      document.body.appendChild(script);
    }
  }, [theme]);

  return (
    <>
      <AuroraBackground />
      <Header />
      <main className="relative mx-auto max-w-6xl px-6">
        <section className="animate-rise pt-14 pb-6 text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="gradient-text">API Reference</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[var(--fg-muted)]">
            Every endpoint and parameter, generated from the OpenAPI 3.1 spec — with a built-in
            request runner.
          </p>
        </section>
        <div
          id="scalar-docs"
          className="glass-card mb-16 min-h-[60vh] overflow-hidden"
        />
      </main>
    </>
  );
}
