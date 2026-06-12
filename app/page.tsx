"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Playground() {
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
          const body = await response.json();
          message = JSON.stringify(body, null, 2);
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
        // a followed 302 lands on the Supabase CDN, which has no X-Cache header
        cache: response.headers.get("x-cache") ?? (response.redirected ? "HIT" : "?"),
        latencyMs,
        bytes: blob.size,
        width: response.headers.get("x-image-width"),
        height: response.headers.get("x-image-height"),
        contentType: blob.type,
      });
    } catch {
      setError("Request failed — is the dev server running?");
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

  return (
    <div className="container">
      <header className="site">
        <h1>
          API<span>racy</span> 🏴‍☠️
        </h1>
        <nav className="links">
          <a href="/docs">API Reference</a>
          <a href="/api/openapi.json">OpenAPI Spec</a>
          <a href="/api/health">Health</a>
        </nav>
      </header>
      <p className="subtitle">
        Cloudinary-style image processing: resize, crop and convert any public image — or pull a
        thumbnail out of a video — with a single GET request.
      </p>

      <div className="tabs">
        <button className={mode === "image" ? "active" : ""} onClick={() => switchMode("image")}>
          Image
        </button>
        <button className={mode === "video" ? "active" : ""} onClick={() => switchMode("video")}>
          Video thumbnail
        </button>
      </div>

      <div className="panel">
        <form
          className="card"
          onSubmit={(event) => {
            event.preventDefault();
            run();
          }}
        >
          <div className="field">
            <label htmlFor="url">Source {mode === "image" ? "image" : "video"} URL</label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={`https://example.com/${mode === "image" ? "image.jpg" : "video.mp4"}`}
            />
          </div>

          {mode === "video" && (
            <div className="field">
              <label htmlFor="time">Time</label>
              <input
                id="time"
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="seconds or mm:ss"
              />
              <div className="hint">Seconds (&quot;15&quot;, &quot;12.5&quot;) or &quot;mm:ss&quot;</div>
            </div>
          )}

          <div className="field-row">
            <div className="field">
              <label htmlFor="width">Width</label>
              <input
                id="width"
                type="number"
                min={1}
                max={4096}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="auto"
              />
            </div>
            <div className="field">
              <label htmlFor="height">Height</label>
              <input
                id="height"
                type="number"
                min={1}
                max={4096}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="auto"
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="format">Format</label>
              <select id="format" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="">{mode === "image" ? "keep original" : "jpeg (default)"}</option>
                <option value="jpeg">jpeg</option>
                <option value="png">png</option>
                <option value="webp">webp</option>
                <option value="avif">avif</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="crop">Crop mode</label>
              <select id="crop" value={crop} onChange={(e) => setCrop(e.target.value)}>
                <option value="">fill (default)</option>
                <option value="fit">fit</option>
                <option value="scale">scale</option>
                <option value="crop">crop</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="quality">
              <input
                type="checkbox"
                checked={useQuality}
                onChange={(e) => setUseQuality(e.target.checked)}
                style={{ marginRight: "0.4rem", verticalAlign: "-1px" }}
              />
              Quality: {useQuality ? quality : "default"}
            </label>
            <input
              id="quality"
              type="range"
              min={1}
              max={100}
              value={quality}
              disabled={!useQuality}
              onChange={(e) => setQuality(e.target.value)}
            />
          </div>

          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Processing…" : "Process"}
          </button>
        </form>

        <div>
          <div className="card">
            {result && (
              <div className="result-meta">
                <span className={`badge ${result.cache === "HIT" ? "hit" : "miss"}`}>
                  cache <strong>{result.cache}</strong>
                </span>
                <span className="badge">
                  <strong>{result.latencyMs} ms</strong>
                </span>
                <span className="badge">
                  <strong>{(result.bytes / 1024).toFixed(1)} KB</strong>
                </span>
                {result.width && result.height && (
                  <span className="badge">
                    <strong>
                      {result.width}×{result.height}
                    </strong>
                  </span>
                )}
                {result.contentType && (
                  <span className="badge">
                    <strong>{result.contentType}</strong>
                  </span>
                )}
              </div>
            )}
            {error ? (
              <div className="error-box">{error}</div>
            ) : (
              <div className="preview">
                {result ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- previewing a blob URL */
                  <img src={result.objectUrl} alt="Processed result" />
                ) : (
                  <div className="placeholder">
                    Hit <b>Process</b> to see the transformed result here.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="snippet">
            <pre>{`GET ${requestPath}`}</pre>
            <CopyButton text={absoluteUrl} />
          </div>
          <div className="snippet">
            <pre>{`curl -L "${absoluteUrl}" -o output.${format || (mode === "video" ? "jpeg" : "img")}`}</pre>
            <CopyButton
              text={`curl -L "${absoluteUrl}" -o output.${format || (mode === "video" ? "jpeg" : "img")}`}
            />
          </div>
        </div>
      </div>

      <footer className="site">
        Responses are cached in Supabase Storage — the first request processes the media
        (X-Cache: MISS), repeat requests 302-redirect to the CDN (X-Cache: HIT). Explore every
        parameter in the <a href="/docs">interactive API reference</a>.
      </footer>
    </div>
  );
}
