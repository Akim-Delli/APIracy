"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

export type Theme = "light" | "dark";

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Reads the active theme from the <html> class, kept in sync with the no-flash init script. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.classList.contains("light") ? "light" : "dark"),
    () => "dark" as const,
  );
}

export function setTheme(next: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(next);
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* storage unavailable */
  }
}

export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg)]">
      <div className="animate-aurora absolute -top-1/3 -left-1/4 h-[55rem] w-[55rem] rounded-full bg-[radial-gradient(circle,var(--aurora-1),transparent_60%)] blur-3xl" />
      <div className="animate-aurora-slow absolute -top-1/4 right-0 h-[45rem] w-[45rem] rounded-full bg-[radial-gradient(circle,var(--aurora-2),transparent_60%)] blur-3xl [animation-delay:3s]" />
      <div className="animate-aurora absolute bottom-0 left-1/4 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,var(--aurora-3),transparent_60%)] blur-3xl [animation-delay:6s]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] bg-[length:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_30%,#000_50%,transparent_100%)]" />
      <div className="grain absolute inset-0 mix-blend-overlay" style={{ opacity: "var(--grain-opacity)" }} />
    </div>
  );
}

const NAV = [
  { label: "API Reference", href: "/docs", page: true },
  { label: "OpenAPI", href: "/api/openapi.json", page: false },
  { label: "Status", href: "/api/health", page: false },
];

function ThemeToggle() {
  const theme = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-tight text-[var(--fg)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 via-blue-500 to-cyan-400 shadow-[0_0_24px_-4px_rgba(59,130,246,0.8)]">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l5-5 4 4 3-3 4 4M4 8h.01" />
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
            </svg>
          </span>
          <span>API<span className="gradient-text">racy</span></span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-[var(--fg-muted)] sm:gap-7">
          {NAV.map((item) =>
            item.page ? (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-[var(--fg)]">
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="transition-colors hover:text-[var(--fg)]">
                {item.label}
              </a>
            ),
          )}
          <a
            href="https://github.com/Akim-Delli/APIracy"
            target="_blank"
            rel="noopener noreferrer"
            title="Opens GitHub in a new tab"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-[var(--fg)]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.6 8.21 11.16.6.11.82-.25.82-.56 0-.28-.01-1.02-.02-2-3.34.72-4.04-1.59-4.04-1.59-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.22 1.84 1.22 1.07 1.8 2.81 1.28 3.5.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.24-3.17-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 016 0c2.29-1.53 3.3-1.21 3.3-1.21.66 1.66.25 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.54-2.81 5.54-5.49 5.83.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .31.21.68.83.56A12.02 12.02 0 0024 12.29C24 5.78 18.63.5 12 .5z" />
            </svg>
            GitHub
            <svg viewBox="0 0 24 24" className="h-3 w-3 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
