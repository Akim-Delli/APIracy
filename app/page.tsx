"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <div className="animate-aurora absolute -top-1/3 -left-1/4 h-[55rem] w-[55rem] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.35),transparent_60%)] blur-3xl" />
      <div className="animate-aurora-slow absolute -top-1/4 right-0 h-[45rem] w-[45rem] rounded-full bg-[radial-gradient(circle,rgba(217,70,239,0.28),transparent_60%)] blur-3xl [animation-delay:3s]" />
      <div className="animate-aurora absolute bottom-0 left-1/4 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.25),transparent_60%)] blur-3xl [animation-delay:6s]" />
      {/* faint grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:56px_56px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_30%,#000_50%,transparent_100%)]" />
      {/* grain */}
      <div className="grain absolute inset-0 opacity-[0.15] mix-blend-overlay" />
    </div>
  );
}

const NAV = [
  { label: "API Reference", href: "/docs", page: true },
  { label: "OpenAPI", href: "/api/openapi.json", page: false },
  { label: "Status", href: "/api/health", page: false },
];

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-display flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 via-fuchsia-500 to-cyan-400 shadow-[0_0_24px_-4px_rgba(217,70,239,0.8)]">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l5-5 4 4 3-3 4 4M4 8h.01" />
              <rect x="3" y="4" width="18" height="16" rx="2.5" />
            </svg>
          </span>
          API<span className="gradient-text">racy</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-zinc-400 sm:gap-7">
          {NAV.map((item) =>
            item.page ? (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </Link>
            ) : (
              <a key={item.href} href={item.href} className="transition-colors hover:text-white">
                {item.label}
              </a>
            ),
          )}
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
    "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-all focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500";

  return (
    <>
      <AuroraBackground />
      <Header />

      <main className="relative mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="animate-rise pt-20 pb-16 text-center sm:pt-28">
          <div className="mx-auto max-w-3xl">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
              OpenAPI 3.1 · no auth · edge-cached
            </span>
            <h1 className="font-display mt-6 text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Transform any image
              <br />
              with <span className="gradient-text">one URL</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-zinc-400">
              A Cloudinary-style API to resize, crop and convert any public image — or pull a
              thumbnail from a video — in a single GET request. Results cached on the edge.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <a href="#playground" className="btn-gradient rounded-xl px-5 py-3 text-sm font-semibold">
                Open the playground
              </a>
              <Link
                href="/docs"
                className="glass rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Read the docs
              </Link>
            </div>
          </div>
        </section>

        {/* Playground */}
        <section id="playground" className="scroll-mt-20 pb-24">
          <div className="mb-8 text-center">
            <span className="gradient-text text-sm font-semibold">Try it live</span>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Playground
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-zinc-400">
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
                    mode === m
                      ? "btn-gradient"
                      : "text-zinc-400 hover:text-white"
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
                  <label htmlFor="quality" className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    <input type="checkbox" checked={useQuality} onChange={(e) => setUseQuality(e.target.checked)} className="h-3.5 w-3.5 accent-fuchsia-500" />
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
                  <pre className="overflow-x-auto rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 font-mono text-xs leading-relaxed text-rose-300">
                    {error}
                  </pre>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-white/10 bg-[repeating-conic-gradient(#13131d_0%_25%,#0c0c14_0%_50%)] bg-[length:22px_22px]">
                    {result ? (
                      // eslint-disable-next-line @next/next/no-img-element -- previewing a transient blob URL
                      <img src={result.objectUrl} alt="Processed result" className="max-h-[480px] max-w-full rounded-lg shadow-2xl" />
                    ) : (
                      <p className="px-8 text-center text-sm text-zinc-500">
                        Hit <span className="font-semibold text-zinc-300">Process</span> to see the
                        transformed result here.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-card p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-zinc-500">REQUEST</span>
                  <CopyButton text={absoluteUrl} label="Copy URL" />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-fuchsia-200/90">
                  GET {requestPath}
                </pre>
                <div className="my-3 h-px bg-white/10" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-zinc-500">cURL</span>
                  <CopyButton text={curlSnippet} />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-zinc-400">
                  {curlSnippet}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-zinc-500 sm:flex-row">
          <p>
            API<span className="gradient-text font-semibold">racy</span> — cached in Supabase, deployed on Vercel.
          </p>
          <div className="flex gap-6">
            <Link href="/docs" className="transition-colors hover:text-white">API Reference</Link>
            <a href="/api/openapi.json" className="transition-colors hover:text-white">OpenAPI</a>
            <a href="/api/health" className="transition-colors hover:text-white">Status</a>
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
      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-white"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function Badge({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const valueColor = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-zinc-100";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-zinc-500">
      {label && <span>{label}</span>}
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </span>
  );
}
