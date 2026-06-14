import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { ApiError } from "@/lib/errors";
import { config } from "@/lib/config";

const MAX_REDIRECTS = 5;

/**
 * Returns true for addresses that an open proxy must never reach:
 * loopback, RFC1918, link-local, CGNAT, unspecified and multicast ranges.
 */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
    if (a >= 224) return true; // multicast + reserved + broadcast
    return false;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return true; // link-local fe80::/10
    }
    // IPv4-mapped (::ffff:a.b.c.d) — check the embedded IPv4 address
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isPrivateAddress(mapped[1]);
    return false;
  }
  return true; // not a valid IP — treat as unsafe
}

/**
 * Rejects URLs whose host resolves to a private/internal address (SSRF guard).
 * Can be disabled with SSRF_ALLOW_PRIVATE=true for local development.
 */
export async function assertPublicHost(url: URL): Promise<void> {
  if (config.allowPrivateHosts) return;

  const hostname = url.hostname.replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw ApiError.forbiddenHost(`Refusing to fetch from "${url.hostname}"`);
  }

  if (isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw ApiError.forbiddenHost(`Refusing to fetch from private address "${hostname}"`);
    }
    return;
  }

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw ApiError.sourceFetchFailed(`Could not resolve host "${hostname}"`);
  }
  if (addresses.length === 0) {
    throw ApiError.sourceFetchFailed(`Could not resolve host "${hostname}"`);
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw ApiError.forbiddenHost(`Refusing to fetch from "${hostname}" (resolves to a private address)`);
    }
  }
}

export interface FetchedSource {
  buffer: Buffer;
  contentType: string | null;
}

/**
 * Downloads a source asset with SSRF protection, redirect validation,
 * a download timeout and a hard size cap (enforced while streaming, so a
 * missing/lying Content-Length header cannot bypass it).
 */
export async function fetchSource(
  sourceUrl: string,
  { maxBytes }: { maxBytes: number },
): Promise<FetchedSource> {
  let current = new URL(sourceUrl);
  const deadline = AbortSignal.timeout(config.fetchTimeoutMs);

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    await assertPublicHost(current);

    let response: globalThis.Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: deadline,
        headers: { "user-agent": "apiracy/1.0 (+image-processing-service)" },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw ApiError.sourceFetchFailed(
          `Timed out fetching source after ${config.fetchTimeoutMs}ms`,
        );
      }
      throw ApiError.sourceFetchFailed(`Could not connect to "${current.hostname}"`);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) {
        throw ApiError.sourceFetchFailed("Source returned a redirect without a Location header");
      }
      current = new URL(location, current);
      if (current.protocol !== "http:" && current.protocol !== "https:") {
        throw ApiError.sourceFetchFailed("Source redirected to a non-http(s) URL");
      }
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw ApiError.sourceFetchFailed(`Source responded with HTTP ${response.status}`);
    }

    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      await response.body?.cancel();
      throw ApiError.sourceFetchFailed(
        `Source is too large (${declaredLength} bytes, limit is ${maxBytes})`,
      );
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    if (response.body) {
      try {
        for await (const chunk of response.body as AsyncIterable<Uint8Array>) {
          received += chunk.byteLength;
          if (received > maxBytes) {
            await response.body.cancel().catch(() => {});
            throw ApiError.sourceFetchFailed(`Source is too large (limit is ${maxBytes} bytes)`);
          }
          chunks.push(chunk);
        }
      } catch (err) {
        if (err instanceof ApiError) throw err;
        if (err instanceof Error && err.name === "TimeoutError") {
          throw ApiError.sourceFetchFailed(
            `Timed out fetching source after ${config.fetchTimeoutMs}ms`,
          );
        }
        throw ApiError.sourceFetchFailed("Source download was interrupted");
      }
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: response.headers.get("content-type"),
    };
  }

  throw ApiError.sourceFetchFailed(`Source redirected too many times (limit is ${MAX_REDIRECTS})`);
}
