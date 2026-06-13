"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { SpaceBackground } from "./_components/space-background";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";

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

function StellarOrb() {
  return (
    <div aria-hidden className="pointer-events-none relative mx-auto mt-14 h-60 w-60 sm:h-72 sm:w-72">
      <div className="animate-pulse-glow absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_40%,#818cf8_0%,#4f46e5_35%,transparent_70%)] blur-xl" />
      <div className="animate-float absolute inset-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#c7d2fe,#4338ca_60%,#1e1b4b)] shadow-[0_0_80px_-10px_rgba(99,102,241,0.8)]" />
      <div className="absolute inset-0 rounded-full border border-indigo-400/20" />
      <div className="absolute -inset-6 rounded-full border border-indigo-400/10" />
      <div className="absolute -inset-14 rounded-full border border-indigo-400/5" />
    </div>
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
      className="rounded-md border border-zinc-700/60 bg-space-850/80 px-2.5 py-1 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

function SpotlightCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--y", `${e.clientY - rect.top}px`);
  }
  return (
    <div onMouseMove={onMouseMove} className={`spotlight-card rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-sm font-semibold text-transparent">
      {children}
    </span>
  );
}

const FEATURES = [
  {
    title: "Resize & crop",
    body: "Scale to any dimension up to 4096px with fill, fit, scale or centered-crop modes. Aspect ratio preserved automatically.",
    icon: "M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4",
  },
  {
    title: "Format conversion",
    body: "Convert on the fly between JPEG, PNG, WebP and AVIF, with per-request quality control for lossy formats.",
    icon: "M4 7l8-4 8 4M4 7v10l8 4 8-4V7M4 7l8 4 8-4M12 11v10",
  },
  {
    title: "Video thumbnails",
    body: "Pull a frame from any video at a given timestamp, then run it through the same transform pipeline.",
    icon: "M15 10l4.55-2.28A1 1 0 0121 8.6v6.8a1 1 0 01-1.45.88L15 14M4 6h9a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z",
  },
];

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
    "w-full rounded-lg border border-zinc-700/60 bg-space-950/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20";
  const labelClass = "mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500";

  return (
    <>
      <SpaceBackground />
      <SiteHeader />

      <main className="relative mx-auto max-w-6xl px-6">
        {/* Hero */}
        <section className="animate-rise pt-20 pb-10 text-center sm:pt-28">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-space-850/60 px-3 py-1 text-xs font-medium text-zinc-400 backdrop-blur transition-colors hover:text-zinc-200"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            OpenAPI 3.1 documented · no auth required
          </Link>
          <h1 className="font-display mx-auto mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            <span className="text-shimmer">Image processing</span>
            <br />
            at the speed of light
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            A Cloudinary-style API to resize, crop and convert any public image — or pull a
            thumbnail from a video — with a single GET request. Results are cached on the edge.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a href="#playground" className="btn-primary rounded-lg px-5 py-2.5 text-sm font-semibold text-white">
              Open the playground
            </a>
            <Link href="/docs" className="btn-ghost rounded-lg border border-zinc-700/60 px-5 py-2.5 text-sm font-semibold text-zinc-200">
              Read the docs
            </Link>
          </div>
          <StellarOrb />
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-16">
          <div className="mb-10 text-center">
            <SectionLabel>Built for developers</SectionLabel>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you&apos;d expect, on the edge
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <SpotlightCard key={f.title} className="p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </span>
                <h3 className="font-display mt-4 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
              </SpotlightCard>
            ))}
          </div>
        </section>

        {/* Playground */}
        <section id="playground" className="scroll-mt-20 pb-24">
          <div className="mb-8 text-center">
            <SectionLabel>Try it live</SectionLabel>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Live playground
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-zinc-400">
              Tweak the parameters and watch the transform happen in real time.
            </p>
          </div>

          {/* tabs */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-xl border border-zinc-700/60 bg-space-850/60 p-1 backdrop-blur">
              {(["image", "video"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                    mode === m
                      ? "bg-linear-to-t from-indigo-600 to-indigo-500 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {m === "image" ? "Image" : "Video thumbnail"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
            {/* controls */}
            <SpotlightCard className="p-6">
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
                  <label htmlFor="quality" className="mb-1.5 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <input type="checkbox" checked={useQuality} onChange={(e) => setUseQuality(e.target.checked)} className="h-3.5 w-3.5 accent-indigo-500" />
                    Quality: {useQuality ? quality : "default"}
                  </label>
                  <input id="quality" type="range" min={1} max={100} value={quality} disabled={!useQuality} onChange={(e) => setQuality(e.target.value)} className="w-full" />
                </div>

                <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-70">
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
            </SpotlightCard>

            {/* result */}
            <div className="flex flex-col gap-4">
              <SpotlightCard className="p-5">
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
                  <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-zinc-800/60 bg-[repeating-conic-gradient(#16131f_0%_25%,#0f0d17_0%_50%)] bg-[length:22px_22px]">
                    {result ? (
                      // eslint-disable-next-line @next/next/no-img-element -- previewing a transient blob URL
                      <img src={result.objectUrl} alt="Processed result" className="max-h-[460px] max-w-full rounded-md" />
                    ) : (
                      <p className="px-8 text-center text-sm text-zinc-500">
                        Hit <span className="font-semibold text-zinc-300">Process</span> to see the
                        transformed result here.
                      </p>
                    )}
                  </div>
                )}
              </SpotlightCard>

              <SpotlightCard className="p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-zinc-500">REQUEST</span>
                  <CopyButton text={absoluteUrl} label="Copy URL" />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-indigo-200/90">
                  GET {requestPath}
                </pre>
                <div className="my-3 h-px bg-zinc-800/70" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-zinc-500">cURL</span>
                  <CopyButton text={curlSnippet} />
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-zinc-400">
                  {curlSnippet}
                </pre>
              </SpotlightCard>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function Badge({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const valueColor = tone === "emerald" ? "text-emerald-400" : tone === "amber" ? "text-amber-400" : "text-zinc-200";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700/60 bg-space-950/60 px-2.5 py-1 font-mono text-xs text-zinc-500">
      {label && <span>{label}</span>}
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </span>
  );
}
