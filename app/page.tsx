"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

type Mode = "image" | "video";

const SAMPLE_URLS: Record<Mode, string> = {
  image: "https://upload.wikimedia.org/wikipedia/commons/3/3a/Cat03.jpg",
  video:
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
};

interface ResultState {
  objectUrl: string;
  cache: string;
  latencyMs: number;
  bytes: number;
  width: string | null;
  height: string | null;
  contentType: string;
}

function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[var(--bg)]">
      <div className="animate-aurora absolute -top-1/3 -left-1/4 h-[55rem] w-[55rem] rounded-full bg-[radial-gradient(circle,var(--aurora-1),transparent_60%)] blur-3xl" />
      <div className="animate-aurora-slow absolute -top-1/4 right-0 h-[45rem] w-[45rem] rounded-full bg-[radial-gradient(circle,var(--aurora-2),transparent_60%)] blur-3xl [animation-delay:3s]" />
      <div className="animate-aurora absolute bottom-0 left-1/4 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,var(--aurora-3),transparent_60%)] blur-3xl [animation-delay:6s]" />
      {/* faint grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--grid-line)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-line)_1px,transparent_1px)] bg-[length:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_30%,#000_50%,transparent_100%)]" />
      {/* grain */}
      <div className="grain absolute inset-0 mix-blend-overlay" style={{ opacity: "var(--grain-opacity)" }} />
    </div>
  );
}

const NAV = [
  { label: "API Reference", href: "/docs", page: true },
  { label: "OpenAPI", href: "/api/openapi.json", page: false },
  { label: "Status", href: "/api/health", page: false },
];

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function ThemeToggle() {
  // Read the active theme straight from the <html> class so it stays in sync
  // with the no-flash init script without a setState-in-effect.
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.classList.contains("light") ? "light" : "dark"),
    () => "dark" as const,
  );

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
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

function Header() {
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

export default function Home() {
  const [mode, setMode] = useState<Mode>("image");
  const [url, setUrl] = useState(SAMPLE_URLS.image);
  const [width, setWidth] = useState("500");
  const [height, setHeight] = useState("300");
  const [format, setFormat] = useState("");
  const [quality, setQuality] = useState("80");
  const [useQuality, setUseQuality] = useState(false);
  const [crop, setCrop] = useState("");
  const [time, setTime] = useState("2");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const endpoint = mode === "image" ? "/api/process" : "/api/video/thumbnail";

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("url", url);
    if (mode === "video" && time) params.set("time", time);
    if (width) params.set("width", width);
    if (height) params.set("height", height);
    if (format) params.set("format", format);
    if (useQuality && quality) params.set("quality", quality);
    if (crop) params.set("crop", crop);
    return params.toString();
  }, [mode, url, time, width, height, format, useQuality, quality, crop]);

  const requestPath = `${endpoint}?${buildQuery()}`;
  const absoluteUrl =
    typeof window === "undefined" ? requestPath : new URL(requestPath, window.location.origin).href;
  const curlSnippet = `curl -L "${absoluteUrl}" -o output.${format || (mode === "video" ? "jpg" : "img")}`;

  async function run() {
    setLoading(true);
    setError(null);
    const started = performance.now();
    try {
      const response = await fetch(requestPath);
      const latencyMs = Math.round(performance.now() - started);
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          message = JSON.stringify(await response.json(), null, 2);
        } catch {
          /* non-JSON error body */
        }
        setError(message);
        setResult(null);
        return;
      }
      const blob = await response.blob();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objectUrl = URL.createObjectURL(blob);
      objectUrlRef.current = objectUrl;
      setResult({
        objectUrl,
        cache: response.headers.get("x-cache") ?? (response.redirected ? "HIT" : "?"),
        latencyMs,
        bytes: blob.size,
        width: response.headers.get("x-image-width"),
        height: response.headers.get("x-image-height"),
        contentType: blob.type,
      });
    } catch {
      setError("Request failed — check the URL and your connection.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setUrl(SAMPLE_URLS[next]);
    setResult(null);
    setError(null);
  }

  const fieldClass =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--field-bg)] px-3.5 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--fg-faint)] outline-none transition-all focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--fg-subtle)]";

  return (
    <>
      <AuroraBackground />
      <Header />

      <main className="relative mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="animate-rise pt-20 pb-16 text-center sm:pt-28">
          <div className="mx-auto max-w-3xl">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-[var(--fg-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
              OpenAPI 3.1 · no auth · edge-cached
            </span>
            <h1 className="font-display mt-6 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Transform any image
              <br />
              with <span className="gradient-text">one URL</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-[var(--fg-muted)]">
              A Cloudinary-style API to resize, crop and convert any public image — or pull a
              thumbnail from a video — in a single GET request. Results cached on the edge.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/docs" className="btn-gradient rounded-xl px-5 py-3 text-sm font-semibold">
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* Playground */}
        <section id="playground" className="scroll-mt-20 pb-24">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--fg)] sm:text-4xl">
              Playground
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[var(--fg-muted)]">
              Tweak the parameters and watch the transform happen in real time.
            </p>
          </div>

          {/* tabs */}
          <div className="mb-6 flex justify-center">
            <div className="glass inline-flex rounded-2xl p-1">
              {(["image", "video"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${
                    mode === m ? "btn-gradient" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {m === "image" ? "Image" : "Video thumbnail"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            {/* controls */}
            <div className="glass-card p-6">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run();
                }}
              >
                <div className="mb-4">
                  <label htmlFor="url" className={labelClass}>
                    Source {mode === "image" ? "image" : "video"} URL
                  </label>
                  <input
                    id="url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className={fieldClass}
                    placeholder={`https://example.com/${mode === "image" ? "image.jpg" : "video.mp4"}`}
                  />
                </div>

                {mode === "video" && (
                  <div className="mb-4">
                    <label htmlFor="time" className={labelClass}>Timestamp</label>
                    <input
                      id="time"
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className={fieldClass}
                      placeholder="seconds or mm:ss"
                    />
                  </div>
                )}

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="width" className={labelClass}>Width</label>
                    <input id="width" type="number" min={1} max={4096} value={width} onChange={(e) => setWidth(e.target.value)} className={fieldClass} placeholder="auto" />
                  </div>
                  <div>
                    <label htmlFor="height" className={labelClass}>Height</label>
                    <input id="height" type="number" min={1} max={4096} value={height} onChange={(e) => setHeight(e.target.value)} className={fieldClass} placeholder="auto" />
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="format" className={labelClass}>Format</label>
                    <select id="format" value={format} onChange={(e) => setFormat(e.target.value)} className={fieldClass}>
                      <option value="">{mode === "image" ? "keep original" : "jpeg (default)"}</option>
                      <option value="jpeg">jpeg</option>
                      <option value="png">png</option>
                      <option value="webp">webp</option>
                      <option value="avif">avif</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="crop" className={labelClass}>Crop mode</label>
                    <select id="crop" value={crop} onChange={(e) => setCrop(e.target.value)} className={fieldClass}>
                      <option value="">fill (default)</option>
                      <option value="fit">fit</option>
                      <option value="scale">scale</option>
                      <option value="crop">crop</option>
                    </select>
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="quality" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--fg-subtle)]">
                    <input type="checkbox" checked={useQuality} onChange={(e) => setUseQuality(e.target.checked)} className="h-3.5 w-3.5 accent-blue-500" />
                    Quality: {useQuality ? quality : "default"}
                  </label>
                  <input id="quality" type="range" min={1} max={100} value={quality} disabled={!useQuality} onChange={(e) => setQuality(e.target.value)} className="w-full" />
                </div>

                <button type="submit" disabled={loading} className="btn-gradient flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-70">
                  {loading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    "Process image"
                  )}
                </button>
              </form>
            </div>

            {/* result */}
            <div className="flex flex-col gap-4">
              <div className="glass-card p-5">
                {result && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge label="cache" value={result.cache} tone={result.cache === "HIT" ? "emerald" : "amber"} />
                    <Badge label="" value={`${result.latencyMs} ms`} />
                    <Badge label="" value={`${(result.bytes / 1024).toFixed(1)} KB`} />
                    {result.width && result.height && <Badge label="" value={`${result.width}×${result.height}`} />}
                    {result.contentType && <Badge label="" value={result.contentType} />}
                  </div>
                )}
                {error ? (
                  <pre className="overflow-x-auto rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 font-mono text-xs leading-relaxed text-rose-400">
                    {error}
                  </pre>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-[var(--border)] bg-[repeating-conic-gradient(var(--checker-a)_0%_25%,var(--checker-b)_0%_50%)] bg-[length:22px_22px]">
                    {result ? (
                      // eslint-disable-next-line @next/next/no-img-element -- previewing a transient blob URL
                      <img src={result.objectUrl} alt="Processed result" className="max-h-[480px] max-w-full rounded-lg shadow-2xl" />
                    ) : (
                      <p className="px-8 text-center text-sm text-[var(--fg-subtle)]">
                        Hit <span className="font-semibold text-[var(--fg)]">Process</span> to see the
                        transformed result here.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--fg-subtle)]">REQUEST</span>
                  <CopyButton text={absoluteUrl} label="Copy URL" />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-[var(--code-accent)]">
                  GET {requestPath}
                </pre>
                <div className="my-3 h-px bg-[var(--border)]" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--fg-subtle)]">cURL</span>
                  <CopyButton text={curlSnippet} />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-[var(--fg-muted)]">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-[var(--hairline)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-[var(--fg-subtle)] sm:flex-row">
          <p>
            API<span className="gradient-text font-semibold">racy</span> — cached in Supabase, deployed on Vercel.
          </p>
          <div className="flex gap-6">
            <Link href="/docs" className="transition-colors hover:text-[var(--fg)]">API Reference</Link>
            <a href="/api/openapi.json" className="transition-colors hover:text-[var(--fg)]">OpenAPI</a>
            <a href="/api/health" className="transition-colors hover:text-[var(--fg)]">Status</a>
          </div>
        </div>
      </footer>
    </>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded-lg border border-[var(--border)] bg-[var(--field-bg)] px-2.5 py-1 text-xs font-medium text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function Badge({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const valueColor = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-[var(--fg)]";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--field-bg)] px-2.5 py-1 font-mono text-xs text-[var(--fg-subtle)]">
      {label && <span>{label}</span>}
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </span>
  );
}
