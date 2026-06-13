"use client";

import { useEffect, useRef } from "react";
import { SpaceBackground } from "../_components/space-background";
import { SiteHeader } from "../_components/site-header";

/* Re-skin Scalar's reference to match the Stellar palette (indigo accent, deep space bg). */
const SCALAR_CSS = `
.scalar-app, .scalar-api-reference {
  --scalar-background-1: #0e0c15;
  --scalar-background-2: #14111f;
  --scalar-background-3: #1a1726;
  --scalar-background-accent: rgba(99, 102, 241, 0.16);
  --scalar-border-color: rgba(63, 63, 70, 0.45);
  --scalar-color-1: #e4e4e7;
  --scalar-color-2: #a1a1aa;
  --scalar-color-3: #71717a;
  --scalar-color-accent: #818cf8;
  --scalar-button-1: #4f46e5;
  --scalar-sidebar-background-1: rgba(10, 8, 19, 0.65);
  --scalar-sidebar-color-1: #e4e4e7;
  --scalar-sidebar-color-2: #a1a1aa;
  --scalar-sidebar-border-color: rgba(63, 63, 70, 0.45);
  --scalar-sidebar-item-hover-background: rgba(99, 102, 241, 0.1);
  --scalar-sidebar-item-active-background: rgba(99, 102, 241, 0.16);
  --scalar-sidebar-color-active: #c7d2fe;
}
`;

interface ScalarGlobal {
  createApiReference: (selector: string, config: Record<string, unknown>) => void;
}
declare global {
  interface Window {
    Scalar?: ScalarGlobal;
  }
}

export default function DocsPage() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const mount = () =>
      window.Scalar?.createApiReference("#scalar-docs", {
        url: "/api/openapi.json",
        theme: "purple",
        hideClientButton: true,
        darkMode: true,
        forceDarkModeState: "dark",
        hideDarkModeToggle: true,
        customCss: SCALAR_CSS,
      });

    if (window.Scalar) {
      mount();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
    script.onload = mount;
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <SpaceBackground />
      <SiteHeader />
      <main className="relative mx-auto max-w-6xl px-6">
        <section className="animate-rise pt-16 pb-8 text-center">
          <span className="inline-block bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-sm font-semibold text-transparent">
            Reference
          </span>
          <h1 className="font-display mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-shimmer">API Reference</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Every endpoint, parameter and response — generated from the OpenAPI 3.1 spec, with a
            built-in request runner.
          </p>
        </section>
        <div
          id="scalar-docs"
          className="mb-16 min-h-[60vh] overflow-hidden rounded-2xl border border-zinc-800/60 bg-space-900/60 backdrop-blur"
        />
      </main>
    </>
  );
}
