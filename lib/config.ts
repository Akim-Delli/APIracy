function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  get maxImageBytes(): number {
    return intFromEnv("MAX_IMAGE_BYTES", 20 * 1024 * 1024);
  },
  get maxVideoBytes(): number {
    return intFromEnv("MAX_VIDEO_BYTES", 50 * 1024 * 1024);
  },
  get fetchTimeoutMs(): number {
    return intFromEnv("FETCH_TIMEOUT_MS", 15_000);
  },
  get allowPrivateHosts(): boolean {
    return process.env.SSRF_ALLOW_PRIVATE === "true";
  },
  /** Per-IP request budgets (generous defaults; tune via env). */
  get rateLimits() {
    return {
      windowMs: intFromEnv("RATE_LIMIT_WINDOW_MS", 60_000),
      process: intFromEnv("RATE_LIMIT_PROCESS", 100),
      video: intFromEnv("RATE_LIMIT_VIDEO", 30),
      chat: intFromEnv("RATE_LIMIT_CHAT", 20),
    };
  },
};
